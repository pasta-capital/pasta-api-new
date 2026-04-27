import * as loggers from "../../common/logger";
import * as env from "../../config/env.config";
import { executeImmediateCredit } from "../../BVC/services/bvc-credit";
import {
  confirmDebitToken,
  initiateImmediateDebit,
} from "../../BVC/services/bvc-debit";
import {
  getSingularTx,
  searchInternalRef,
} from "../../BVC/services/bvc-lookups";
import { validateP2C } from "../../BVC/services/bvc-validation";
import { createReference } from "../../BVC/utils/crypto";

const getOperationReceiverData = (operation: env.Operation) => {
  const accountType = !operation.isThirdParty ? "CNTA" : "CELE";
  const accountNumber = !operation.isThirdParty
    ? operation.account.number
    : operation.beneficiary?.phone;
  const bankCode = !operation.isThirdParty
    ? operation.account.bank.code
    : operation.beneficiary?.bankCode;

  const identificationType = !operation.isThirdParty
    ? operation.account.number === "00017495563424733075"
      ? "V"
      : operation.user.identificationType
    : operation.beneficiary?.identificationType;
  const document = !operation.isThirdParty
    ? operation.account.number === "00017495563424733075"
      ? "15854963"
      : operation.user.document
    : operation.beneficiary?.identificationNumber;

  return {
    name: operation.isThirdParty
      ? operation.beneficiary?.name ||
        `${operation.user.name} ${operation.user.lastname}`
      : `${operation.user.name} ${operation.user.lastname}`,
    accountType,
    accountNumber,
    bankCode,
    identificationType,
    document,
  };
};

const formatDdMmYyyy = (date: Date) => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
};

const normalizeBvcPhone = (phone?: string) => {
  if (!phone) {
    return phone;
  }

  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("58")) {
    return digits;
  }

  return `58${digits.replace(/^0+/, "")}`;
};

const getBvcDebitTrackingId = (payment: any) => String(payment._id);

const getBvcDebitInternalRef = (payment: any) => {
  const identificationType = payment.debitorAccount?.identificationType;
  const identificationNumber = payment.debitorAccount?.identificationNumber;

  if (!identificationType || !identificationNumber) {
    return null;
  }

  return createReference(
    `${identificationType}${identificationNumber}`,
    payment.amountVef,
    getBvcDebitTrackingId(payment),
  );
};

const resolveLookupMessage = (lookupResponse: any) =>
  lookupResponse?.mensaje ||
  lookupResponse?.descripcion ||
  lookupResponse?.statusDescription ||
  "Transacción rechazada por BVC";

const resolveBvcLookupStatus = async (
  operation: env.Operation,
  bankReference: string,
  transactionDate: string,
) => {
  const lookupResponse = await getSingularTx({
    date: transactionDate,
    bankReference,
    operationType: "CTI",
  });

  const lookupStatus = String(lookupResponse?.estatus || "").toUpperCase();

  if (operation.reference !== bankReference) {
    operation.reference = bankReference;
    await operation.save();
  }

  if (lookupStatus === "PAGADO") {
    return {
      success: true,
      refIbp:
        bankReference || operation.reference || operation.internalReference,
    };
  }

  if (lookupStatus === "RECHAZADO" || lookupStatus === "KO") {
    return {
      success: false,
      isRejected: true,
      message: resolveLookupMessage(lookupResponse),
    };
  }

  return {
    success: false,
    message: "Esperando confirmación de pago anterior",
  };
};

export const bvcProvider = {
  immediateCredit: async (operation: env.Operation) => {
    const {
      name,
      accountType,
      accountNumber,
      bankCode,
      identificationType,
      document,
    } = getOperationReceiverData(operation);

    if (!accountNumber || !bankCode || !identificationType || !document) {
      return {
        success: false,
        isRejected: true,
        message: "Datos incompletos para procesar el pago con BVC",
      };
    }

    const beneficiaryId = `${identificationType}${document}`;
    const bvcInternalRef = createReference(
      beneficiaryId,
      operation.settledAmount,
      operation.internalReference,
    );
    const transactionDate = formatDdMmYyyy(operation.createdAt || new Date());

    if (operation.bankTxId) {
      loggers.bvc(
        "Guard: Bank reference already exists. Skipping credit request, verifying status.",
        {
          operationId: operation._id,
          bankTxId: operation.bankTxId,
        },
      );

      try {
        return await resolveBvcLookupStatus(
          operation,
          operation.bankTxId,
          transactionDate,
        );
      } catch (error: any) {
        return {
          success: false,
          isRejected: true,
          message: `Error en Guard: ${error.message}`,
        };
      }
    }

    try {
      const storedTx = await searchInternalRef(bvcInternalRef);
      const storedStatus = String(storedTx.status || "").toUpperCase();
      const storedBankReference = storedTx.rawInternalDoc?.bankReference;

      if (storedBankReference && operation.bankTxId !== storedBankReference) {
        operation.bankTxId = storedBankReference;
        if (operation.reference !== storedBankReference) {
          operation.reference = storedBankReference;
        }
        await operation.save();
      }

      if (storedStatus === "PAGADO") {
        return {
          success: true,
          refIbp: storedBankReference || operation.reference || bvcInternalRef,
        };
      }

      if (storedStatus === "RECHAZADO" || storedStatus === "KO") {
        return {
          success: false,
          isRejected: true,
          message:
            storedTx.rawInternalDoc?.rawResponse?.mensaje ||
            "Transacción rechazada por BVC",
        };
      }

      if (storedBankReference) {
        return await resolveBvcLookupStatus(
          operation,
          storedBankReference,
          transactionDate,
        );
      }
    } catch (error: any) {
      if (!String(error.message || "").includes("No transaction found")) {
        loggers.bvc("BVC Flow - Error consultando tracking interno", {
          action: "confirm_operation",
          step: "bvc_internal_ref_lookup_error",
          operationId: operation._id,
          internalReference: bvcInternalRef,
          error: error.message,
        });
      }
    }

    loggers.bvc("Confirm Operation - Iniciando crédito BVC", {
      action: "confirm_operation",
      step: "bvc_credit_start",
      userId: operation.user._id,
      operationId: operation._id,
      reference: operation.internalReference,
      beneficiaryBankCode: bankCode,
      accountType,
    });

    try {
      const creditTransaction = await executeImmediateCredit({
        transactionId: operation.internalReference,
        amount: operation.settledAmount,
        name,
        idType: identificationType,
        idNumber: document,
        accountType,
        accountNumber,
        bankCode,
        concept: "Pago movil",
      });

      const bankReference =
        creditTransaction.referenciaBVC ||
        creditTransaction.data?.referenciaBVC;

      loggers.bvc("Confirm Operation - Respuesta crédito BVC", {
        action: "confirm_operation",
        step: "bvc_credit_response",
        userId: operation.user._id,
        operationId: operation._id,
        status: creditTransaction.status,
        bankReference,
      });

      if (bankReference && operation.bankTxId !== bankReference) {
        operation.bankTxId = bankReference;
        operation.reference = bankReference;
        await operation.save();
      }

      if (creditTransaction.status === "DUPLICATED") {
        const duplicatedStatus = String(
          creditTransaction.data?.status || "",
        ).toUpperCase();

        if (duplicatedStatus === "PAGADO") {
          return {
            success: true,
            refIbp: bankReference || operation.reference || bvcInternalRef,
          };
        }

        if (duplicatedStatus === "RECHAZADO" || duplicatedStatus === "KO") {
          return {
            success: false,
            isRejected: true,
            message: "Transacción rechazada por BVC",
          };
        }

        if (bankReference) {
          return await resolveBvcLookupStatus(
            operation,
            bankReference,
            transactionDate,
          );
        }

        return {
          success: false,
          message: "Esperando confirmación de pago anterior",
        };
      }

      if (creditTransaction.status === "INCIERTO") {
        return {
          success: false,
          message: "Esperando confirmación de pago anterior",
        };
      }

      if (creditTransaction.status !== "CARGADO") {
        return {
          success: false,
          isRejected: true,
          message: "Error inicial BVC",
        };
      }

      if (!bankReference) {
        return {
          success: false,
          message: "Esperando confirmación de pago anterior",
        };
      }

      return await resolveBvcLookupStatus(
        operation,
        bankReference,
        transactionDate,
      );
    } catch (error: any) {
      return { success: false, message: error.message, isRejected: true };
    }
  },
  debitRequest: async (body: any, payment: any) => {
    const phone = normalizeBvcPhone(body.phone);

    loggers.bvc("Pay Debt Request - Iniciando débito BVC", {
      action: "request_sypago_otp",
      step: "bvc_debit_request_start",
      paymentId: body.id,
      trackingId: getBvcDebitTrackingId(payment),
      bankCode: body.bankCode,
      phone,
    });

    try {
      const response = await initiateImmediateDebit({
        transactionId: getBvcDebitTrackingId(payment),
        amount: payment.amountVef,
        name: body.name || "Débito OTP",
        idType: body.identificationType,
        idNumber: body.identificationNumber,
        accountType: "CELE",
        accountNumber: phone,
        bankCode: body.bankCode,
        concept: "pago de cuota por debito OTP",
      });

      loggers.bvc("Pay Debt Request - Respuesta débito BVC", {
        action: "request_sypago_otp",
        step: "bvc_debit_request_response",
        paymentId: body.id,
        status: response.status,
        idPago: response.idPago,
        bankReference: response.bankReference,
      });

      if (response.status === "CARGADO") {
        return {
          success: true,
          message:
            response.message ||
            "Solicitud cargada. Cliente debe ingresar el token recibido.",
          data: response.data,
        };
      }

      return {
        success: false,
        message:
          response.message || "No fue posible generar el código OTP con BVC",
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  },
  debitConfirm: async (body: any, payment: any, userId?: string) => {
    if (
      !payment.debitorAccount?.bankCode ||
      !payment.debitorAccount?.identificationNumber ||
      !payment.debitorAccount?.phone
    ) {
      return {
        success: false,
        message: "No se ha generado el código de OTP",
        code: "otp_error",
      };
    }

    const internalRef = getBvcDebitInternalRef(payment);

    if (!internalRef) {
      return {
        success: false,
        message: "No se ha generado el código de OTP",
        code: "otp_error",
      };
    }

    try {
      const storedTx = await searchInternalRef(internalRef);
      const idPago = body.idPago || storedTx.rawInternalDoc?.idPago;
      const bankReference = storedTx.rawInternalDoc?.bankReference;

      if (!idPago) {
        return {
          success: false,
          message: "No se ha generado el código de OTP",
          code: "otp_error",
        };
      }

      loggers.bvc("Pay Debt Confirmation - Iniciando débito BVC", {
        action: "pay_debt_confirmation",
        step: "bvc_debit_confirm_start",
        userId,
        paymentId: body.id,
        idPago,
        bankReference,
      });

      const response = await confirmDebitToken({
        idPago,
        token: body.otp,
      });

      const finalReference = response.bankReference || bankReference || "";

      loggers.bvc("Pay Debt Confirmation - Respuesta débito BVC", {
        action: "pay_debt_confirmation",
        step: "bvc_debit_confirm_response",
        userId,
        paymentId: body.id,
        status: response.status,
        bankReference: finalReference,
      });

      if (response.status !== "VERIFICADO" && response.status !== "PAGADO") {
        return {
          success: false,
          message: "La transacción de pago no está aprobada",
          code: "payment_error",
          reference: finalReference || undefined,
        };
      }

      return {
        success: true,
        reference: finalReference,
        referenceSmall: finalReference.slice(-6),
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Error al ejecutar el pago - ${error.message}`,
        code: "payment_error",
      };
    }
  },
  checkStatusMobilePayment: async (body: any, payment: any) => {
    const phone = normalizeBvcPhone(
      body.phone || payment.debitorAccount?.phone,
    );
    const identificationType =
      body.identificationType || payment.debitorAccount?.identificationType;
    const identificationNumber =
      body.identificationNumber || payment.debitorAccount?.identificationNumber;

    if (
      !phone ||
      !body.bankCode ||
      !body.date ||
      !body.reference ||
      !identificationType ||
      !identificationNumber
    ) {
      return {
        success: false,
        message: "Datos incompletos para validar el pago móvil con BVC",
      };
    }

    try {
      const response = await validateP2C({
        bankReference: body.reference,
        date: body.date,
        bankCode: body.bankCode,
        idType: identificationType,
        idNumber: identificationNumber,
        phone,
        amount: payment.amountVef,
      });

      const bankReference =
        response.data?.referenciaBVC ||
        response.data?.referencia ||
        body.reference;
      const shortReference = bankReference.slice(-6);
      const isSuccess =
        response.status === "PAGADO" || response.status === "VERIFICADO";

      return {
        success: isSuccess,
        message:
          response.message ||
          (isSuccess
            ? "Transacción confirmada exitosamente"
            : "No se pudo validar el pago móvil"),
        data: {
          ...(response.data || {}),
          NroReferencia: bankReference,
          NroReferenciaCorto: shortReference,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message,
      };
    }
  },
};
