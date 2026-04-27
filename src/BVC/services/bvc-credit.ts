import { postToBvc } from "./bvc-base";
import { BVC_ENDPOINTS } from "../config/bvc.endpoints";
import { BvcCreditRequestSchema } from "../interfaces/bvc-methods/immediate";
import { UniversalSchema } from "../interfaces/proxy-methods/request-bvc";
import { BankOperation } from "../models/operation";
import { createReference } from "../utils/crypto";
import { BVC_BANK_ACCOUNT_CODE } from "../../config/env.config";
import { getBankRef } from "../utils/helper";

/**
 * Servicio para ejecutar un Crédito Inmediato (Envío de dinero)
 */
export const executeImmediateCredit = async (rawData: any) => {
  const universalChecker = UniversalSchema.parse(rawData);
  const bcvPassThrough = {
    monto: universalChecker.amount,
    nombreBen: universalChecker.name,
    cirifBen: universalChecker.idNumber,
    tipoPersonaBen: universalChecker.idType,
    tipoDatoCuentaBen: universalChecker.accountType,
    cuentaBen: universalChecker.accountNumber,
    codBancoBen: universalChecker.bankCode,
    concepto: universalChecker.concept || "Credito Inmediato",
    transactionID: universalChecker.transactionId,
  };
  // Valida Schema
  const result = BvcCreditRequestSchema.parse(bcvPassThrough);

  // Separar Referencia del payload bancario
  const { transactionID, ...bankPayload } = result;

  // ID Hash
  const uniqueInternalRef = createReference(
    bankPayload.cirifBen,
    bankPayload.monto,
    transactionID,
  );

  const bankId = await getBankRef(BVC_BANK_ACCOUNT_CODE);
  //Revisar Duplicados
  let txRecord;
  try {
    txRecord = await BankOperation.create({
      bankId,
      bankCode: BVC_BANK_ACCOUNT_CODE,
      internalRef: uniqueInternalRef,
      amount: parseFloat(bankPayload.monto),
      status: "PENDING",
      operationType: "IMMEDIATE_CREDIT",
    });
  } catch (error: any) {
    // Handle Duplicate Key (Operation already exists in DB)
    if (error.code === 11000) {
      const existingTx = await BankOperation.findOne({
        internalRef: uniqueInternalRef,
      });

      //Retry if previous attempt is INCIERTO or PENDING
      if (
        existingTx?.status === "INCIERTO" ||
        existingTx?.status === "PENDING"
      ) {
        txRecord = existingTx;
      } else {
        return {
          status: "DUPLICATED",
          data: {
            status: existingTx?.status,
            referenciaBVC: existingTx?.rawResponse?.referenciaBVC,
            bankResponse: existingTx?.rawResponse,
          },
        };
      }
    } else {
      throw error;
    }
  }

  if (!txRecord) {
    throw new Error("No transaction found or created for this request.");
  }

  try {
    console.log(
      `BVC: Ejecutando Crédito Inmediato - Tracking: ${uniqueInternalRef}`,
    );

    const response = await postToBvc(
      BVC_ENDPOINTS.TRANSACTION.IMMEDIATE.CREDIT,
      { ...bankPayload },
      String(txRecord._id),
    );

    /**
     * El BVC responde inicialmente con estatus "Cargado"
     *
     */
    txRecord.bankReference = response.referenciaBVC;
    txRecord.status = response.estatus === "Cargado" ? "CARGADO" : "KO";
    txRecord.rawResponse = response;

    await txRecord.save();

    return {
      status: txRecord.status,
      bankResponse: response,
      referenciaBVC: response.referenciaBVC,
    };
  } catch (error: any) {
    if (error.message.includes("BVC_HTTP")) {
      txRecord.status = "KO";
      txRecord.rawResponse = { error: error.message };
      await txRecord.save();

      throw error;
    }

    // 2. Caso: Incertidumbre (Timeout, red caída)
    txRecord.status = "INCIERTO";
    await txRecord.save();

    // Retornamos INCIERTO para que el controlador responda 202
    return {
      status: "INCIERTO",
    };
  }
};
