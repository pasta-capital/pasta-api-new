import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { NODE_ENV } from "../../config/env.config";

export const bvcErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const message = err.message || "Unknown Error";
  const isDev = NODE_ENV === "development";

  // 1. Manejo de Errores de Validación (Zod)
  if (err instanceof ZodError || err.name === "ZodError" || err.issues) {
    const simplified = err.issues
      ? err.issues
          .map((i: any) => `${i.path.join(".")}: ${i.message}`)
          .join(", ")
      : message;

    return res.status(400).json({
      success: false,
      status: "KO",
      message: `Error de validación: ${simplified}`,
      code: "VALIDATION_ERROR",
    });
  }

  if (message.includes("No transaction found or created")) {
    console.warn(`[DATA ERROR]: ${message}`);
    return res.status(404).json({
      success: false,
      status: "KO",
      message: "La operación solicitada no existe o no pudo ser recuperada.",
      code: "RECORD_NOT_FOUND",
    });
  }

  // 2. Manejo de Errores BVC (Prefijo BVC_)
  if (message.includes("BVC_")) {
    // Regex: Busca lo que está entre [ ] para HTTP y para CODE
    const matches = message.match(/BVC_HTTP\[(\d{3})\]_CODE\[(.*?)\]/);

    const bankStatus = matches ? parseInt(matches[1]) : 500;
    const bankInternalCode = matches ? matches[2] : "UNKNOWN";

    // Determinamos el status real que enviamos a la App Principal
    const finalHttpStatus = [200, 205, 400, 404].includes(bankStatus)
      ? 400
      : 500;

    console.warn(
      `[BANK ERROR] HTTP: ${bankStatus} | InternalCode: ${bankInternalCode}`,
    );

    return res.status(finalHttpStatus).json({
      success: false,
      httpStatus: bankStatus,
      bankInternalCode: bankInternalCode,
      message: message.split("]: ")[1]?.trim() || message, // Extrae solo el mensaje final
      code:
        bankStatus === 500
          ? "BANK_CONNECTION_ERROR"
          : "BANK_BUSINESS_REJECTION",
    });
  }

  // 3. Errores Crudos de Axios (DNS, SSL, Timeout no capturado)
  if (err.isAxiosError) {
    console.error("[AXIOS CRITICAL]:", err.code, err.message);
    return res.status(502).json({
      success: false,
      message: "Error de comunicación externa con el banco.",
      code: "GATEWAY_ERROR",
    });
  }

  // 4. Error Genérico de Programación (Failsafe)
  console.error("[CRITICAL ERROR]:", err);
  res.status(500).json({
    success: false,
    message: isDev ? message : "Ocurrió un error inesperado en el servidor.",
    code: "INTERNAL_SERVER_ERROR",
    stack: isDev ? err.stack : undefined, // Vital para debugear en local
  });
};
