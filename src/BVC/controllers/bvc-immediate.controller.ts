import { Request, Response, NextFunction } from "express";
import { executeImmediateCredit } from "../services/bvc-credit";
import {
  initiateImmediateDebit,
  confirmDebitToken,
} from "../services/bvc-debit";

/**
 * Credito Inmediato al Beneficiario (Pagar)
 */
export const handleImmediateCredit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await executeImmediateCredit(req.body);

    if (result.status === "DUPLICATED") {
      return res.status(200).json({
        success: false,
        status: result.status,
        reference: result.referenciaBVC,
        message: "Operación previamente registrada",
        data: result.data,
      });
    }

    if (result.status === "INCIERTO") {
      return res.status(200).json({
        success: false,
        status: result.status,
        message:
          "Fallo en la comunicación con el banco. Por favor verifique el estatus de la transacción con el endpoint de consulta.",
      });
    }

    return res.status(200).json({
      success: true,
      status: result.status,
      reference: result.referenciaBVC,
      message: "Operación enviada al banco exitosamente.",
      data: result.bankResponse,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PASO 1: Solicitar el cobro al cliente
 */
export const handleRequestDebit = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await initiateImmediateDebit(req.body);

    if (result.status === "DUPLICATED") {
      return res.status(200).json({
        success: false,
        message: "Ya existe una solicitud para esta referencia.",
        data: result.data,
      });
    }

    if (result.status === "RECHAZADO") {
      return res.status(200).json({
        success: false,
        status: "RECHAZADO",
        message:
          result.message ||
          "La solicitud de débito fue rechazada por el banco. Verifique los datos.",
        data: result.data,
      });
    }

    const finalMessage =
      result.message ||
      "Solicitud de débito iniciada. Se requiere token para confirmar.";
    return res.status(200).json({
      success: true,
      status: result.status,
      reference: result.bankReference,
      idPago: result.idPago,
      message: finalMessage,
      data: result.data,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * PASO 2: Confirmar con el Token recibido (SMS/Email)
 */
export const handleDebitToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await confirmDebitToken(req.body);

    return res.status(200).json({
      success: true,
      status: result.status,
      bankReference: result.bankReference,
      message: result.message || "Token procesado exitosamente.",
      data: result.data,
    });
  } catch (error: any) {
    next(error);
  }
};
