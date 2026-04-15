import { postToBvc } from "./bvc-base";
import { BVC_ENDPOINTS } from "../config/bvc.endpoints";
import {
  BvcP2CValidate,
  BvcP2CValidateSchema,
} from "../interfaces/bvc-methods/validations";
import { BankOperation } from "../models/operation";
import { BANK_CODE } from "../config/env.config";
import { getBankRef } from "../utils/helper";
import { UniversalSchema } from "../interfaces/proxy-methods/request-bvc";
/**
 * Valida y/o Procesa una operación de Pago Móvil
 */
export const validateP2C = async (rawData: any) => {
  const universal = UniversalSchema.parse(rawData);
  const bcvPassThrough = {
    referencia: universal.bankReference,
    fecha: universal.date,
    banco: universal.bankCode,
    identificacion: `${universal.idType}${universal.idNumber}`,
    telefonoP: universal.phone,
    monto: universal.amount,
    pagador: universal.name,
  };
  console.log("BVC P2C Payload:", bcvPassThrough);
  const result = BvcP2CValidateSchema.safeParse(bcvPassThrough);
  if (!result.success) throw result.error;

  const { data } = result;
  const internalRef = `VAL_P2C_${data.banco}_${data.referencia}_${data.monto.replace(".", "")}`;

  const bankId = await getBankRef(BANK_CODE);
  let txRecord: any;

  try {
    txRecord = await BankOperation.create({
      bankId,
      bankCode: BANK_CODE,
      internalRef,
      status: "PENDING",
      operationType: "MOBILE_VALIDATE",
      bankReference: data.referencia,
      amount: parseFloat(data.monto),
    });
  } catch (error: any) {
    if (error.code === 11000) {
      const existingTx = await BankOperation.findOne({ internalRef });
      console.log("Registro existente encontrado para validación P2C.");
      if (existingTx?.status === "PAGADO") {
        return {
          status: "PAGADO",
          data: existingTx.rawResponse,
          message: "Pago ya procesado previamente.",
        };
      }

      if (existingTx?.status === "VERIFICADO" && data.processPayment !== true) {
        return { status: "VERIFICADO", data: existingTx.rawResponse };
      }
      console.log(
        "Reintentando validación para registro pendiente:",
        internalRef,
      );
    } else {
      throw error;
    }
  }

  if (!txRecord) {
    throw new Error("No transaction found or created for this request.");
  }

  try {
    const payload: BvcP2CValidate = {
      referencia: data.referencia,
      fecha: data.fecha,
      banco: data.banco,
      telefonoP: data.telefonoP,
      identificacion: data.identificacion,
      monto: data.monto,
    };

    //FOR DEV ONLY.
    if (data.processPayment === true) {
      payload.processPayment = true;
    }
    //SHOULD BE ALWAYS TRUE IN PROD ENVIRONMENTS
    //payload.processPayment = true;
    console.log(`BVC: Validando Pago Móvil P2C - Ref: ${data.referencia}`);

    const response = await postToBvc(
      BVC_ENDPOINTS.VALIDATION.PAGO_MOVIL,
      payload,
      txRecord._id,
    );

    // Mapeo de estados del BVC
    // A = Aprobado (Cobrado ahora), V = Verificado (Existe en banco)
    txRecord.status =
      response.status === "A"
        ? "PAGADO"
        : response.status === "V"
          ? "VERIFICADO"
          : "KO";

    txRecord.bankReference = response.referenciaBVC || txRecord.bankReference;
    txRecord.rawResponse = response;
    await txRecord.save();

    return {
      status: txRecord.status,
      message:
        response.status === "A"
          ? "Pago procesado exitosamente"
          : "Pago verificado",
      data: response,
    };
  } catch (error: any) {
    // Si el error indica que ya existe en el banco, actualizamos a VERIFICADO en lugar de dejarlo en KO
    if (error.message.includes("Pago ya existente")) {
      txRecord.status = "VERIFICADO";
      txRecord.rawResponse = {
        ...txRecord.rawResponse,
        info: "Banco indica pago ya existente",
      };
      await txRecord.save();

      return {
        status: "VERIFICADO",
        message: "El pago ya consta como procesado en el banco.",
      };
    }

    txRecord.status = "KO";
    txRecord.rawResponse = { error: error.message };
    await txRecord.save();

    throw error;
  }
};
