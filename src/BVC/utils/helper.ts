import { BankLog } from "../models/logs";
import Bank from "../../models/Bank";
import { BVC_BANK_ACCOUNT_CODE } from "../../config/env.config";
import { Types } from "mongoose";
/**
 * Busca el ID interno de la base de datos usando el código bancario oficial
 */
const bankIdCache = new Map<string, Types.ObjectId>();

export const getBankRef = async (bankCode: string) => {
  const cachedId = bankIdCache.get(bankCode);
  if (cachedId) return cachedId;

  const bank = await Bank.findOne({ code: bankCode }).select("_id");
  if (!bank) {
    throw new Error(
      `Configuración para el banco ${bankCode} no encontrada en la DB.`,
    );
  }

  bankIdCache.set(bankCode, bank._id as any);
  return bank._id;
};

//string as boolean formatter
export const parseBoolean = (value: string): boolean => {
  return value.toLowerCase() === "true";
};

/**
 * Logging function to save request and response payloads to MongoDB
 * @param endpoint API endpoint being called
 * @param operationId Unique reference for the transaction
 * @param statusCode HTTP status code of the response
 * @param requestPayload Payload sent in the request
 * @param responsePayload Payload received in the response
 *
 */
export const saveLog = async (
  endpoint: string,
  requestPayload: any,
  responsePayload: any,
  statusCode: number,
  operationId?: Types.ObjectId | string,
  bankCode: string = BVC_BANK_ACCOUNT_CODE,
) => {
  try {
    const bankId = await getBankRef(bankCode);
    await BankLog.create({
      bankId,
      bankCode,
      endpoint,
      operationId,
      requestPayload,
      responsePayload,
      statusCode,
      timestamp: new Date(),
    });
  } catch (logError) {
    // We console.error but don't THROW, so a DB logging failure
    // doesn't kill the actual bank transaction.
    console.error("Critical: Failed to save log to MongoDB", logError);
  }
};
