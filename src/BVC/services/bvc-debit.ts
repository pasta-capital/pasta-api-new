import { postToBvc } from "./bvc-base";
import { BVC_ENDPOINTS } from "../config/bvc.endpoints";
import {
  BvcDebitRequestSchema,
  BvcDebitTokenRequestSchema,
} from "../interfaces/bvc-methods/immediate";
import { BankOperation } from "../models/operation";
import { createReference } from "../utils/crypto";
import { BVC_BANK_ACCOUNT_CODE } from "../../config/env.config";
import { getBankRef } from "../utils/helper";
import { UniversalSchema } from "../interfaces/proxy-methods/request-bvc";
/**
 * Iniciar Débito Inmediato (Paso 1: Solicitar débito y enviar token al cliente)
 */
export const initiateImmediateDebit = async (rawData: any) => {
  const universal = UniversalSchema.parse(rawData);
  const bcvPassThrough = {
    monto: universal.amount,
    nombreBen: universal.name,
    cirifBen: universal.idNumber,
    tipoPersonaBen: universal.idType,
    tipoDatoCuentaBen: universal.accountType,
    cuentaBen: universal.accountNumber,
    codBancoBen: universal.bankCode,
    concepto: universal.concept || "Debito Inmediato",
    transactionID: universal.transactionId,
  };
  const result = BvcDebitRequestSchema.safeParse(bcvPassThrough);
  if (!result.success) throw result.error;

  const { transactionID, ...bankPayload } = result.data;

  // unique Internal Reference
  const uniqueInternalRef = createReference(
    bankPayload.cirifBen,
    parseFloat(bankPayload.monto),
    transactionID,
  );

  // Clean cuentaBen si es celular
  let finalCuentaBen = bankPayload.cuentaBen;
  if (bankPayload.tipoDatoCuentaBen === "CELE") {
    finalCuentaBen = bankPayload.cuentaBen.replace(/^58/, "");
  }

  //Bank info
  const bankId = await getBankRef(BVC_BANK_ACCOUNT_CODE);
  // --- Mongo Search or create record ---
  let txRecord;
  let isRetry = false;
  try {
    txRecord = await BankOperation.create({
      bankId,
      bankCode: BVC_BANK_ACCOUNT_CODE,
      internalRef: uniqueInternalRef,
      amount: parseFloat(bankPayload.monto), // Guardamos el número puro en DB
      status: "PENDING",
      operationType: "IMMEDIATE_DEBIT",
    });
  } catch (error: any) {
    if (error.code === 11000) {
      isRetry = true;
      const existingTx = await BankOperation.findOne({
        internalRef: uniqueInternalRef,
      });

      if (
        existingTx?.status === "VERIFICADO" ||
        existingTx?.status === "PAGADO" ||
        existingTx?.status === "RECHAZADO"
      ) {
        return { status: "DUPLICATED", data: existingTx };
      }

      // If not VERIFICADO: Allow the flow to continue to request a new SMS from the bank
      console.log(
        "Reintentando solicitud de débito para tracking:",
        uniqueInternalRef,
      );
      txRecord = existingTx; // Usamos el registro que ya existía
    } else {
      throw error;
    }
  }
  if (!txRecord) {
    throw new Error("No transaction found or created for this request.");
  }
  try {
    console.log(
      `BVC: Solicitando Débito Inmediato - Reference: ${uniqueInternalRef}`,
    );

    const payloadBank = {
      trackingId: uniqueInternalRef,
      monto: bankPayload.monto,
      nombreBen: bankPayload.nombreBen.trim(),
      cirifBen: bankPayload.cirifBen,
      tipoPersonaBen: bankPayload.tipoPersonaBen,
      tipoDatoCuentaBen: bankPayload.tipoDatoCuentaBen,
      cuentaBen: finalCuentaBen,
      codBancoBen: bankPayload.codBancoBen,
      concepto: bankPayload.concepto || "DEBITO",
      token: "1",
    };

    const response = await postToBvc(
      BVC_ENDPOINTS.TRANSACTION.IMMEDIATE.DEBIT.DEBIT_REQUEST,
      payloadBank,
      String(txRecord._id),
    );

    txRecord.status = response.statusCode === "C" ? "CARGADO" : "KO";
    txRecord.idPago = response.idPago;
    txRecord.bankReference = response.referenciaBVC;
    txRecord.rawResponse = response;
    await txRecord.save();

    const finalMessage = isRetry
      ? "Reintento: El cliente recibirá un nuevo token."
      : "Solicitud cargada. Cliente debe ingresar el token recibido.";

    return {
      status: txRecord.status,
      idPago: txRecord.idPago,
      bankReference: txRecord.bankReference,
      internalRef: uniqueInternalRef,
      message: finalMessage,
      data: response,
    };
  } catch (error: any) {
    txRecord.status = "KO";
    await txRecord.save();
    throw error;
  }
};

/**
 * PASO 2: Confirmar Débito con el Token (OTP)
 */
export const confirmDebitToken = async (rawData: any) => {
  try {
    //Validar data
    const universal = UniversalSchema.parse(rawData);
    const bcvPassThrough = {
      idPago: universal.idPago,
      token: universal.token,
    };
    const result = BvcDebitTokenRequestSchema.safeParse(bcvPassThrough);
    if (!result.success) throw result.error;

    const { idPago, token } = result.data;

    // Buscar en DB
    const txRecord = await BankOperation.findOne({ idPago });
    if (!txRecord) {
      throw new Error("No transaction found or created for this request.");
    }
    // Opcional: Evitar re-procesar si ya está VERIFICADO
    if (txRecord.status === "VERIFICADO" || txRecord.status === "PAGADO") {
      return {
        success: true,
        status: txRecord.status,
        referencia: txRecord.bankReference || "",
        data: txRecord.rawResponse,
        message: "Esta transacción ya fue verificada o pagada previamente.",
      };
    }

    const payload = {
      idPago: idPago, // Aseguramos que sea string por si acaso
      token: token,
    };

    console.log("BVC: Confirmando débito con OTP:", idPago);
    console.log("Payload enviado al banco:", payload);
    // 3. Enviar al banco
    const response = await postToBvc(
      BVC_ENDPOINTS.TRANSACTION.IMMEDIATE.DEBIT.TOKEN_REQUEST,
      payload,
      String(txRecord._id),
    );

    if (response.statusCode === "C") {
      txRecord.status = "VERIFICADO";
    } else if (response.statusCode === "A") {
      txRecord.status = "PAGADO";
    }
    txRecord.rawResponse = response;
    txRecord.bankReference =
      response.referenciaBVC || response.referencia || txRecord.bankReference;
    await txRecord.save();

    return {
      success: true,
      status: txRecord.status,
      bankReference: txRecord.bankReference,
      data: response,
    };
  } catch (error: any) {
    // Es mejor no cambiar el status a RECHAZADO aquí porque el cliente
    // puede haber escrito mal el token y tiene más intentos.
    throw error;
  }
};
