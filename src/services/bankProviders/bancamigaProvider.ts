import * as loggers from "../../common/logger";
import * as env from "../../config/env.config";
import { findPaymentMobile } from "../bancamigaService";
import {
  credit,
  debitOtp,
  getRejectedCodeDescription,
  getStatusDescription,
  getTransactionResult,
  requestOtp,
  TransactionStatusCode,
} from "../sypagoService";

export const bancamigaProvider = {
  immediateCredit: async (operation: env.Operation) => {
    if (operation.bankTxId) {
      loggers.operation(
        "Guard: Sypago ID already exists. Skipping credit request, verifying status.",
        {
          operationId: operation._id,
          bankTxId: operation.bankTxId,
        },
      );

      try {
        // We skip the credit() call and go straight to checking the result
        const transaction = await getTransactionResult(operation.bankTxId);
        const transactionStatus = transaction.data?.status;

        if (
          transaction.success &&
          transactionStatus === TransactionStatusCode.ACCP
        ) {
          loggers.operation(
            "Guard: Previous transaction confirmed as SUCCESS.",
            {
              operationId: operation._id,
            },
          );
          return {
            success: true,
            refIbp: transaction.data.ref_ibp || operation.internalReference,
          };
        }

        if (
          transaction.success &&
          transactionStatus === TransactionStatusCode.RJCT
        ) {
          return {
            success: false,
            isRejected: true,
            message: getRejectedCodeDescription(
              transaction.data?.rejected_code,
            ),
          };
        }

        // If it is still pending, we return false so the loop retries later.
        return {
          success: false,
          message: "Esperando confirmación de pago anterior",
        };
      } catch (error: any) {
        return { success: false, message: `Error en Guard: ${error.message}` };
      }
    }
    const type = !operation.isThirdParty ? "CNTA" : "CELE";
    const number = !operation.isThirdParty
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

    const sypagoCreditBody = {
      internal_id: operation.internalReference,
      account: {
        bank_code: env.SYPAGO_BANK_ACCOUNT_CODE!,
        type: "CNTA",
        number: env.SYPAGO_BANK_ACCOUNT_NUMBER!,
      },
      sub_product: env.SYPAGO_CREDIT_SUBPRODUCT_ID!,
      amount: {
        amt: operation.settledAmount,
        currency: "VES",
      },
      notification_urls: {
        web_hook_endpoint: env.SYPAGO_WEBHOOK_URL!,
      },
      receiving_user: {
        name: operation.user.name + " " + operation.user.lastname,
        document_info: {
          type: identificationType,
          number: document,
        },
        account: {
          bank_code: bankCode,
          type: type,
          number: number,
        },
      },
      concept: "Pago movil",
    };

    loggers.operation("Confirm Operation - Iniciando crédito Sypago", {
      action: "confirm_operation",
      step: "sypago_credit_start",
      userId: operation.user._id,
      operationId: operation._id,
      reference: operation.internalReference,
      sypagoCreditBody: {
        internal_id: sypagoCreditBody.internal_id,
        amount: sypagoCreditBody.amount,
        receiving_user: {
          document_info: sypagoCreditBody.receiving_user.document_info,
          account: {
            bank_code: sypagoCreditBody.receiving_user.account.bank_code,
            type: sypagoCreditBody.receiving_user.account.type,
          },
        },
      },
    });
    try {
      const creditTransaction = await credit(sypagoCreditBody);

      loggers.operation("Confirm Operation - Respuesta crédito Sypago", {
        action: "confirm_operation",
        step: "sypago_credit_response",
        userId: operation.user._id,
        operationId: operation._id,
        success: creditTransaction.success,
        transactionId: creditTransaction.data?.transaction_id,
        message: creditTransaction.message,
      });

      if (
        !creditTransaction.success ||
        !creditTransaction.data?.transaction_id
      ) {
        loggers.operation("Confirm Operation - Error en crédito Sypago", {
          action: "confirm_operation",
          step: "sypago_credit_error",
          userId: operation.user._id,
          operationId: operation._id,
          error: creditTransaction.message,
          data: creditTransaction.data,
        });
        return {
          success: false,
          isRejected: true,
          message: "Error inicial Sypago",
        };
      }

      operation.bankTxId = creditTransaction.data.transaction_id;
      await operation.save();

      loggers.operation(
        "Confirm Operation - Obteniendo resultado de transacción",
        {
          action: "confirm_operation",
          step: "get_transaction_result_start",
          userId: operation.user._id,
          operationId: operation._id,
          transactionId: creditTransaction.data.transaction_id,
        },
      );

      /**GET SYPAGO TRANSACTION RESULT */
      const transaction = await getTransactionResult(
        creditTransaction.data.transaction_id,
      );

      loggers.operation(
        "Confirm Operation - Resultado de transacción obtenido",
        {
          action: "confirm_operation",
          step: "get_transaction_result_response",
          userId: operation.user._id,
          operationId: operation._id,
          success: transaction.success,
          status: transaction.data?.status,
          rejectedCode: transaction.data?.rejected_code,
        },
      );

      if (!transaction.success || !transaction.data) {
        loggers.operation("Confirm Operation - Error obteniendo transacción", {
          action: "confirm_operation",
          step: "get_transaction_result_error",
          userId: operation.user._id,
          operationId: operation._id,
          error: transaction.message,
        });
        return {
          success: false,
          isRejected: true,
          message: "Error verificando resultado",
        };
      }

      if (transaction.data.status !== TransactionStatusCode.ACCP) {
        loggers.operation("Confirm Operation - Transacción rechazada", {
          action: "confirm_operation",
          step: "transaction_rejected",
          userId: operation.user._id,
          operationId: operation._id,
          status: transaction.data.status,
          rejectedCode: transaction.data.rejected_code,
          statusDescription: getStatusDescription(transaction.data.status),
          rejectedDescription: getRejectedCodeDescription(
            transaction.data.rejected_code,
          ),
        });
        return {
          success: false,
          message: getRejectedCodeDescription(transaction.data.rejected_code),
          isRejected: true, // This tells the loop to call rejectOperation()
        };
      }
      operation.reference = transaction.data.ref_ibp;
      await operation.save();
      return {
        success: true,
        refIbp: transaction.data.ref_ibp || operation.internalReference,
      };
    } catch (error: any) {
      return { success: false, message: error.message, isRejected: true };
    }
  },
  debitRequest: async (body: any, payment: any) => {
    const requestOtpBody: env.SypagoRequestOtpBody = {
      creditor_account: {
        bank_code: env.SYPAGO_BANK_ACCOUNT_CODE!,
        type: "CNTA",
        number: env.SYPAGO_BANK_ACCOUNT_NUMBER!,
      },
      debitor_document_info: {
        type: body.identificationType,
        number: body.identificationNumber,
      },
      debitor_account: {
        bank_code: body.bankCode,
        type: "CELE",
        number: body.phone,
      },
      amount: {
        amt: payment.amountVef,
        currency: "VES",
      },
    };
    // console.log("Requesting OTP with body", requestOtpBody);
    const respRequestOtp = await requestOtp(requestOtpBody);
    // console.log("OTP Response", respRequestOtp);
    return respRequestOtp;
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

    const debitOtpBody: env.SypagoDebitOtpBody = {
      internal_id: payment.internalReference,
      account: {
        bank_code: env.SYPAGO_BANK_ACCOUNT_CODE!,
        type: "CNTA",
        number: env.SYPAGO_BANK_ACCOUNT_NUMBER!,
      },
      receiving_user: {
        name: "Débito OTP",
        otp: body.otp,
        document_info: {
          type: payment.debitorAccount.identificationType,
          number: payment.debitorAccount.identificationNumber,
        },
        account: {
          bank_code: payment.debitorAccount.bankCode,
          type: "CELE",
          number: payment.debitorAccount.phone,
        },
      },
      amount: {
        amt: payment.amountVef,
        currency: "VES",
      },
      concept: "pago de cuota por debito OTP",
      notification_urls: {
        web_hook_endpoint: env.SYPAGO_WEBHOOK_URL!,
      },
    };

    loggers.operation("Pay Debt Confirmation - Iniciando débito OTP", {
      action: "pay_debt_confirmation",
      step: "debit_otp_start",
      userId,
      paymentId: body.id,
      internalReference: payment.internalReference,
      debitOtpBody: {
        internal_id: debitOtpBody.internal_id,
        amount: debitOtpBody.amount,
        receiving_user: {
          document_info: debitOtpBody.receiving_user.document_info,
          account: {
            bank_code: debitOtpBody.receiving_user.account.bank_code,
            type: debitOtpBody.receiving_user.account.type,
          },
        },
      },
    });

    const respDebitOtp = await debitOtp(debitOtpBody);

    loggers.operation("Pay Debt Confirmation - Respuesta débito OTP", {
      action: "pay_debt_confirmation",
      step: "debit_otp_response",
      userId,
      paymentId: body.id,
      success: respDebitOtp.success,
      transactionId: respDebitOtp.data?.transaction_id,
      message: respDebitOtp.message,
    });

    if (!respDebitOtp.success) {
      loggers.operation("Pay Debt Confirmation - Error en débito OTP", {
        action: "pay_debt_confirmation",
        step: "debit_otp_error",
        userId,
        paymentId: body.id,
        error: respDebitOtp.message,
      });
      return {
        success: false,
        message: `Error al ejecutar el pago - ${respDebitOtp.message}`,
        code: "payment_error",
      };
    }

    loggers.operation(
      "Pay Debt Confirmation - Obteniendo resultado transacción",
      {
        action: "pay_debt_confirmation",
        step: "get_transaction_result_start",
        userId,
        paymentId: body.id,
        transactionId: respDebitOtp.data.transaction_id,
      },
    );

    const transaction = await getTransactionResult(
      respDebitOtp.data.transaction_id,
    );

    loggers.operation(
      "Pay Debt Confirmation - Resultado transacción obtenido",
      {
        action: "pay_debt_confirmation",
        step: "get_transaction_result_response",
        userId,
        paymentId: body.id,
        success: transaction.success,
        status: transaction.data?.status,
        rejectedCode: transaction.data?.rejected_code,
      },
    );

    if (!transaction.success || !transaction.data) {
      loggers.operation(
        "Pay Debt Confirmation - Error obteniendo transacción",
        {
          action: "pay_debt_confirmation",
          step: "get_transaction_result_error",
          userId,
          paymentId: body.id,
          error: transaction.message,
        },
      );
      return {
        success: false,
        message: "Error al obtener la transacción de pago",
        code: "error",
        error: transaction.message,
        reference: respDebitOtp.data.transaction_id,
      };
    }

    if (transaction.data.status !== TransactionStatusCode.ACCP) {
      const rejectedMsg =
        "La transacción de pago no está aprobada - " +
        getRejectedCodeDescription(transaction.data.rejected_code);

      loggers.operation("Pay Debt Confirmation - Transacción rechazada", {
        action: "pay_debt_confirmation",
        step: "transaction_rejected",
        userId,
        paymentId: body.id,
        status: transaction.data.status,
        rejectedCode: transaction.data.rejected_code,
        statusDescription: getStatusDescription(transaction.data.status),
        rejectedDescription: getRejectedCodeDescription(
          transaction.data.rejected_code,
        ),
      });

      return {
        success: false,
        message: rejectedMsg,
        code: "error",
        error: getStatusDescription(transaction.data.status),
        reference: respDebitOtp.data.transaction_id,
      };
    }

    return {
      success: true,
      reference: transaction.data.ref_ibp,
      referenceSmall: transaction.data.ref_ibp.slice(-6),
    };
  },
  checkStatusMobilePayment: async (body: any, payment: any) => {
    const phone = body.phone.startsWith("58")
      ? body.phone
      : `58${body.phone.replace(/^0+/, "")}`;

    loggers.bancamiga("Pay Debt Confirmation - Phone AFTER CLEANUP", {
      action: "pay_debt_confirmation",
      step: "phone_cleanup",
      phone,
    });

    const data = {
      phone,
      bank: body.bankCode,
      date: body.date,
      reference: body.reference,
      amount: payment.amountVef,
    } as env.BancamigaFindPaymentMobileBody;

    return findPaymentMobile(data);
  },
};
