import axios, { AxiosError } from "axios";
import https from "https";
import {
  BVC_API_KEY,
  BVC_AES_KEY,
  BVC_AES_IV,
  BVC_BASE_URL,
  NODE_ENV,
} from "../config/env.config";
import { bvcEncrypt, bvcDecrypt } from "../utils/crypto";
import {
  BvcErrorResponseSchema,
  BvcRequestEnvelope,
} from "../interfaces/proxy-methods/request-bvc";
import { saveLog } from "../utils/helper";
import { Types } from "mongoose";
import { translateBvcCode } from "../utils/codes";

// Agente para ignorar certificados en desarrollo (IPs privadas 172.x)
const agent = new https.Agent({
  rejectUnauthorized: NODE_ENV === "production",
});

export const postToBvc = async <T = any>(
  endpoint: string,
  payload: any,
  operationId?: Types.ObjectId,
  timeoutMs?: number,
): Promise<T> => {
  const encryptedDt = bvcEncrypt(payload, BVC_AES_KEY, BVC_AES_IV);
  const body: BvcRequestEnvelope = { hs: BVC_API_KEY, dt: encryptedDt };
  const url = `${BVC_BASE_URL}${endpoint}`;

  try {
    const { data, status } = await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      httpsAgent: agent, //PARA IGNORAR SSL EN DEV
      timeout: timeoutMs || 15000,
    });

    const encryptedRes = data.dt || data.response;
    const decrypted = bvcDecrypt<any>(encryptedRes, BVC_AES_KEY, BVC_AES_IV);

    saveLog(endpoint, payload, decrypted, status, operationId);

    const errorCheck = BvcErrorResponseSchema.safeParse(decrypted);
    if (errorCheck.success && errorCheck.data.codError !== "00") {
      const bankCode =
        errorCheck.data.codError ||
        errorCheck.data.codigoErrorCCE ||
        "UNKNOWN_CODE";
      const cleanMessage =
        translateBvcCode(bankCode) || errorCheck.data.mensaje || "No message";
      throw new Error(`BVC_HTTP[${status}]_CODE[${bankCode}]: ${cleanMessage}`);
    }

    return decrypted as T;
  } catch (error: any) {
    let status = 0;
    let logData: any = { message: error.message };
    let errorMessage = error.message;

    if (axios.isAxiosError(error)) {
      status = error.response?.status || 0;
      const responseData = error.response?.data;

      if (responseData) {
        const cipherText =
          responseData.dt || responseData.response || responseData.data;

        // Attempt Decryption of Error Body
        if (typeof cipherText === "string" && !cipherText.includes("<html>")) {
          try {
            const decryptedError = bvcDecrypt<any>(
              cipherText,
              BVC_AES_KEY,
              BVC_AES_IV,
            );
            logData = decryptedError;

            const schemaCheck =
              BvcErrorResponseSchema.safeParse(decryptedError);
            const bvcCode = schemaCheck.success
              ? schemaCheck.data.codError ||
                schemaCheck.data.codigoErrorCCE ||
                "UNKNOWN_CODE"
              : "UNKNOWN_CODE";
            const bvcMsg =
              translateBvcCode(bvcCode) ||
              decryptedError.mensaje ||
              decryptedError.message ||
              "No message";

            errorMessage = `BVC_HTTP[${status}]_CODE[${bvcCode}]: ${bvcMsg}`;
          } catch (decryptionError) {
            logData = { raw: cipherText, parseError: "Decryption failed" };
          }
        } else {
          // Handle Plain JSON or HTML
          logData = responseData;
          if (
            typeof responseData === "string" &&
            responseData.includes("<html>")
          ) {
            errorMessage = `BVC_SERVER_${status}: HTML Error (Gateway/Proxy Issue)`;
          }
        }
      }
    }

    // Centralized Error Logging
    await saveLog(endpoint, payload, logData, status, operationId);

    if (errorMessage.includes("BVC_")) throw new Error(errorMessage);
    throw error;
  }
};
