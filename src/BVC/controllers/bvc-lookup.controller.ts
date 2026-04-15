import { Request, Response, NextFunction } from "express";
import { searchInternalRef, getSingularTx } from "../services/bvc-lookups";

/**
 * Consulta el estatus de una transacción específica.
 * El frontend envía la fecha y la referenciaBVC.
 */
export const handleCheckStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await getSingularTx(req.body);

    /**
     * Respuesta esperada del banco según manual:
     * status: "PAGADO", "RECHAZADO", "CARGADO"
     */
    return res.status(200).json({
      success: true,
      status: result.estatus.toUpperCase(),
      data: result,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 *
 * @param req
 * @param res
 * @param next
 * @returns
 */
export const handleInternalRefCheck = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const result = await searchInternalRef(req.body.internalRef);

    return res.status(200).json({
      success: true,
      status: result.status,
      data: result.rawInternalDoc,
    });
  } catch (error: any) {
    next(error);
  }
};
