import { Request, Response, NextFunction } from "express";
import { validateP2C } from "../services/bvc-validation";

/**
 * Endpoint para validar y procesar un Pago Móvil P2C.
 * Recibe los datos del pago (referencia, banco, monto, etc.)
 */
export const handleP2PValidation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const response = await validateP2C(req.body);

    const isSuccess =
      response.status === "PAGADO" || response.status === "VERIFICADO";

    const finalMessage =
      response.message ||
      (isSuccess
        ? "Operación realizada exitosamente."
        : "No se pudo validar el pago móvil.");

    return res.status(200).json({
      success: isSuccess,
      status: response.status,
      reference: response.data?.referencia,
      message: finalMessage,
      data: response.data,
    });
  } catch (error: any) {
    next(error);
  }
};
