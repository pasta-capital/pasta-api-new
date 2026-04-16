import { postToBvc } from "./bvc-base";
import { BankOperation } from "../models/operation";
import {
  BvcGetInternalRefSchema,
  BvcGetSingularTxSchema,
} from "../interfaces/bvc-methods/lookup";
import { BVC_ENDPOINTS } from "../config/bvc.endpoints";
import { UniversalSchema } from "../interfaces/proxy-methods/request-bvc";
/**
 * Consulta el estado actual de una transacción específica en el BVC.
 * Se usa para confirmar si una transacción "Cargada" pasó a "Pagada" o "Rechazada".
 */
export const getSingularTx = async (rawData: any) => {
  const universal = UniversalSchema.parse(rawData);
  const bcvPassThrough = {
    fecha: universal.date,
    referencia: universal.bankReference,
    modalidad: universal.operationType,
  };
  const validation = BvcGetSingularTxSchema.safeParse(bcvPassThrough);
  if (!validation.success) {
    throw validation.error;
  }

  try {
    // Buscamos por trackingId o por referenciaBVC
    const txRecord = await BankOperation.findOne({
      bankReference: validation.data.referencia,
    });

    if (!txRecord) {
      throw new Error("No transaction found or created for this request.");
    }

    console.log(
      "No error here - transaction found for singular lookup with id",
      txRecord?._id,
    );
    const response = await postToBvc(
      BVC_ENDPOINTS.LOOKUP.SINGULAR_TX,
      validation.data,
      String(txRecord?._id),
    );

    txRecord.status = response.estatus.toUpperCase();
    txRecord.rawResponse = response;
    await txRecord.save();

    return response;
  } catch (error: any) {
    console.error("Error en getSingularTx:", error.message);
    throw error;
  }
};

export const searchInternalRef = async (internalRef: string) => {
  const validation = BvcGetInternalRefSchema.safeParse({ internalRef });
  if (!validation.success) {
    throw validation.error;
  }
  try {
    const txRecord = await BankOperation.findOne({ internalRef });
    if (!txRecord) {
      throw new Error("No transaction found or created for this request.");
    }
    return {
      status: txRecord.status,
      rawInternalDoc: txRecord,
    };
  } catch (error) {
    throw error;
  }
};
