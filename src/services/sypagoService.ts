import axios from "axios";
import { creditValidationSchema } from "../validations/sypago/creditValidation";
import * as env from "../config/env.config";
import { requestOtpValidationSchema } from "../validations/sypago/requestOtpValidation";
import { debitOtpValidationSchema } from "../validations/sypago/debitOtpValidation";
import { domiciliationValidationSchema } from "../validations/sypago/domiciliationValidation";

/**
 * Enum para los códigos de estado
 */
export enum TransactionStatusCode {
  ACCP = "ACCP", // Aceptado
  AC00 = "AC00", // En proceso
  RJCT = "RJCT", // Rechazado
}

/**
 * Mapeo de códigos a descripciones
 */
export const STATUS_CODES: Record<TransactionStatusCode, string> = {
  [TransactionStatusCode.ACCP]: "Aceptado",
  [TransactionStatusCode.AC00]: "En proceso",
  [TransactionStatusCode.RJCT]: "Rechazado",
};

/**
 * Función para obtener la descripción del código de estado
 * @param code - Código de estado (ACCP, AC00, RJCT)
 * @returns Descripción del estado
 */
export function getStatusDescription(
  code: TransactionStatusCode | string,
): string {
  return STATUS_CODES[code as TransactionStatusCode] || "Desconocido";
}

/**
 * Enum para los códigos de rechazo
 */
export enum RejectedCode {
  ACCP = "ACCP", // Operación aceptada
  RJCT = "RJCT", // Operación rechazada
  WAIT = "WAIT", // Operación en espera de validación de código
  AG09 = "AG09", // Pago no recibido
  AC00 = "AC00", // Operación en espera de respuesta del receptor
  AB01 = "AB01", // Tiempo de espera agotado
  AB07 = "AB07", // Agente fuera de línea
  AC01 = "AC01", // Número de cuenta incorrecto
  AC04 = "AC04", // Cuenta cancelada
  AC06 = "AC06", // Cuenta bloqueada
  AC09 = "AC09", // Moneda no válida
  AG10 = "AG10", // Agente suspendido o excluido
  AM02 = "AM02", // Monto de la transacción no permitido
  AM03 = "AM03", // Moneda no permitida
  AM04 = "AM04", // Saldo insuficiente
  AM05 = "AM05", // Operación duplicada
  BE01 = "BE01", // Datos del cliente no corresponden a la cuenta
  BE20 = "BE20", // Longitud del nombre inválida
  CH20 = "CH20", // Número de decimales incorrecto
  DU01 = "DU01", // Identificación de mensaje duplicado
  ED05 = "ED05", // Liquidación fallida
  FF05 = "FF05", // Código del producto incorrecto
  FF07 = "FF07", // Código del subproducto incorrecto
  RC08 = "RC08", // Código del banco no existe en el sistema de compensación / liquidación
  TKCM = "TKCM", // Código único de operación de débito incorrecto
  TM01 = "TM01", // Fuera del horario permitido
  VE01 = "VE01", // Rechazo técnico
  DT03 = "DT03", // Fecha de procesamiento no bancaria no válida
  TECH = "TECH", // Error técnico al procesar liquidación
  AG01 = "AG01", // Transacción restringida
  MD09 = "MD09", // Afiliación inactiva
  MD15 = "MD15", // Monto incorrecto
  MD21 = "MD21", // Cobro no permitido
  CUST = "CUST", // Cancelación solicitada por el deudor
  DS02 = "DS02", // Operación cancelada
  MD01 = "MD01", // No posee afiliación
  MD22 = "MD22", // Afiliación suspendida
}

/**
 * Mapeo de códigos de rechazo a descripciones
 */
export const REJECTED_CODE_DESCRIPTIONS: Record<RejectedCode, string> = {
  [RejectedCode.ACCP]: "Operación aceptada",
  [RejectedCode.RJCT]: "Operación rechazada",
  [RejectedCode.WAIT]: "Operación en espera de validación de código",
  [RejectedCode.AG09]: "Pago no recibido",
  [RejectedCode.AC00]: "Operación en espera de respuesta del receptor",
  [RejectedCode.AB01]: "Tiempo de espera agotado",
  [RejectedCode.AB07]: "Agente fuera de línea",
  [RejectedCode.AC01]: "Número de cuenta incorrecto",
  [RejectedCode.AC04]: "Cuenta cancelada",
  [RejectedCode.AC06]: "Cuenta bloqueada",
  [RejectedCode.AC09]: "Moneda no válida",
  [RejectedCode.AG10]: "Agente suspendido o excluido",
  [RejectedCode.AM02]: "Monto de la transacción no permitido",
  [RejectedCode.AM03]: "Moneda no permitida",
  [RejectedCode.AM04]: "Saldo insuficiente",
  [RejectedCode.AM05]: "Operación duplicada",
  [RejectedCode.BE01]: "Datos del cliente no corresponden a la cuenta",
  [RejectedCode.BE20]: "Longitud del nombre inválida",
  [RejectedCode.CH20]: "Número de decimales incorrecto",
  [RejectedCode.DU01]: "Identificación de mensaje duplicado",
  [RejectedCode.ED05]: "Liquidación fallida",
  [RejectedCode.FF05]: "Código del producto incorrecto",
  [RejectedCode.FF07]: "Código del subproducto incorrecto",
  [RejectedCode.RC08]:
    "Código del banco no existe en el sistema de compensación / liquidación",
  [RejectedCode.TKCM]: "Código único de operación de débito incorrecto",
  [RejectedCode.TM01]: "Fuera del horario permitido",
  [RejectedCode.VE01]: "Rechazo técnico",
  [RejectedCode.DT03]: "Fecha de procesamiento no bancaria no válida",
  [RejectedCode.TECH]: "Error técnico al procesar liquidación",
  [RejectedCode.AG01]: "Transacción restringida",
  [RejectedCode.MD09]: "Afiliación inactiva",
  [RejectedCode.MD15]: "Monto incorrecto",
  [RejectedCode.MD21]: "Cobro no permitido",
  [RejectedCode.CUST]: "Cancelación solicitada por el deudor",
  [RejectedCode.DS02]: "Operación cancelada",
  [RejectedCode.MD01]: "No posee afiliación",
  [RejectedCode.MD22]: "Afiliación suspendida",
};

/**
 * Función para obtener la descripción de un código de rechazo
 * @param code - Código de rechazo
 * @returns Descripción del código
 */
export function getRejectedCodeDescription(
  code: RejectedCode | string,
): string {
  return (
    REJECTED_CODE_DESCRIPTIONS[code as RejectedCode] || "Código desconocido"
  );
}

export const getToken = async () => {
  try {
    const accessToken = env.SYPAGO_ACCESS_TOKEN;
    if (accessToken) {
      return {
        success: true,
        message: "Se ha obtenido el token exitosamente",
        data: { access_token: accessToken },
      };
    }
    // Obtenemos las credenciales desde la configuración
    const url = env.SYPAGO_API_URL!;
    const client_id = env.SYPAGO_CLIENT_ID!;
    const secret = env.SYPAGO_API_KEY!;

    // Construimos los headers básicos
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Hacemos la petición
    const response = await axios.post(
      url + "/auth/token",
      { client_id, secret },
      {
        headers,
        validateStatus: () => true,
      },
    );

    if (response.status === 200) {
      return {
        success: true,
        message: "Se ha obtenido un nuevo token exitosamente",
        data: response.data,
      };
    } else {
      return {
        success: false,
        message: "No se pudo obtener el token.",
        data: response.data,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Ocurrió un error al procesar la solicitud.",
      data: null,
      error,
    };
  }
};

/**
 * Obtener transaccion
 *
 * @param transactionId
 * @returns
 */
export const getTransaction = async (transactionId: string) => {
  try {
    //Obtengo el token de acceso
    const token = await getToken();

    if (!token.success) {
      return {
        success: false,
        message: "No se pudo obtener un token",
        data: token,
      };
    }

    const url = env.SYPAGO_API_URL! + "/transaction/" + transactionId;

    const headers = {
      Authorization: `Bearer ${token.data.access_token}`,
    };

    const response = await axios.get(url, {
      headers,
      validateStatus: () => true,
    });

    if (response.status == 200) {
      return {
        success: true,
        message: "Se ha obtenido la transacción exitosamente",
        data: response.data,
      };
    } else {
      return {
        success: false,
        message: "No se pudo obtener la transacción.",
        data: response.data,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Ocurrió un error al solicitar la transacción.",
      data: null,
      error: error,
    };
  }
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const getTransactionResult = async (transactionId: string) => {
  let attempt = 0;

  while (attempt < 10) {
    console.log("Intentando obtener la transacción... " + attempt);
    const transaction = await getTransaction(transactionId);

    if (!transaction.success) {
      throw new Error(
        "Error al obtener la transacción: " + transaction.message,
      );
    }

    const status = transaction.data.status;

    // Si está aprobada o rechazada, salimos del bucle
    if (
      status === TransactionStatusCode.ACCP ||
      status === TransactionStatusCode.RJCT
    ) {
      return transaction;
    }

    // Esperar antes de volver a consultar
    await delay(1000);
    attempt++;
  }

  throw new Error(
    "Tiempo de espera agotado. La transacción no cambió de estado.",
  );
};

/**
 * Credito inmediato
 * @param data
 * @returns
 */
export const credit = async (data: any) => {
  try {
    // Validar los filtros con Joi
    const { error, value } = creditValidationSchema.validate(data, {
      abortEarly: false,
    });

    // Si hay errores de validación, lanzar una excepción
    if (error) {
      return {
        success: false,
        message: `Error de validación: ${error.details
          .map((d) => d.message)
          .join(", ")}`,
        data: null,
        error: error,
      };
    }

    //Obtengo el token de acceso
    const token = await getToken();

    if (!token.success) {
      return {
        success: false,
        message: "No se pudo obtener un token",
        data: token,
      };
    }

    const url = env.SYPAGO_API_URL! + "/transaction/credit";

    const headers = {
      Authorization: `Bearer ${token.data.access_token}`,
    };

    const response = await axios.post(url, data, {
      headers,
      validateStatus: () => true,
    });

    if (response.status !== 200) {
      return {
        success: false,
        message: response.data?.message,
        data: response.data,
      };
    }

    return {
      success: true,
      message: "Transacción creada exitosamente",
      data: response.data,
    };
  } catch (error) {
    // console.log(error);
    return {
      success: false,
      message: "Ocurrió un error al procesar la solicitud.",
      data: null,
      error: error,
    };
  }
};

export const requestOtp = async (data: env.SypagoRequestOtpBody) => {
  try {
    const { error, value } = requestOtpValidationSchema.validate(data, {
      abortEarly: false,
    });

    if (error) {
      return {
        success: false,
        message: `Error de validación: ${error.details
          .map((d) => d.message)
          .join(", ")}`,
        data: null,
        error: error,
      };
    }

    //Obtengo el token de acceso
    const token = await getToken();

    if (!token.success) {
      return {
        success: false,
        message: "No se pudo obtener un token",
        data: token,
      };
    }

    const url = env.SYPAGO_API_URL! + "/request/otp";

    const headers = {
      Authorization: `Bearer ${token.data.access_token}`,
    };

    const response = await axios.post(url, data, {
      headers,
      validateStatus: () => true,
    });

    if (response.status !== 200) {
      return {
        success: false,
        message: response.data?.message,
        data: response.data,
      };
    }

    return {
      success: true,
      message: "OTP enviado exitosamente",
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocurrió un error al procesar la solicitud.",
      data: null,
      error: error,
    };
  }
};

export const debitOtp = async (data: env.SypagoDebitOtpBody) => {
  try {
    const { error, value } = debitOtpValidationSchema.validate(data, {
      abortEarly: false,
    });

    if (error) {
      return {
        success: false,
        message: `Error de validación: ${error.details
          .map((d) => d.message)
          .join(", ")}`,
        data: null,
        error: error,
      };
    }

    //Obtengo el token de acceso
    const token = await getToken();

    if (!token.success) {
      return {
        success: false,
        message: "No se pudo obtener un token",
        data: token,
      };
    }

    const url = env.SYPAGO_API_URL! + "/transaction/otp";

    const headers = {
      Authorization: `Bearer ${token.data.access_token}`,
    };

    const response = await axios.post(url, data, {
      headers,
      validateStatus: () => true,
    });

    if (response.status !== 200) {
      return {
        success: false,
        message: response.data?.message,
        data: response.data,
      };
    }

    return {
      success: true,
      message: "Débito ejecutado exitosamente",
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocurrió un error al procesar la solicitud.",
      data: null,
      error: error,
    };
  }
};

export const domiciliation = async (data: env.SypagoDomiciliationBody) => {
  try {
    const { error, value } = domiciliationValidationSchema.validate(data, {
      abortEarly: false,
    });

    if (error) {
      return {
        success: false,
        message: `Error de validación: ${error.details
          .map((d) => d.message)
          .join(", ")}`,
        data: null,
        error: error,
      };
    }

    //Obtengo el token de acceso
    const token = await getToken();

    if (!token.success) {
      return {
        success: false,
        message: "No se pudo obtener un token",
        data: token,
      };
    }

    const url = env.SYPAGO_API_URL! + "/transaction/dom";

    const headers = {
      Authorization: `Bearer ${token.data.access_token}`,
    };

    const response = await axios.post(url, data, {
      headers,
      validateStatus: () => true,
    });

    if (response.status !== 200) {
      return {
        success: false,
        message: response.data?.message,
        data: response.data,
      };
    }

    return {
      success: true,
      message: "Débito ejecutado exitosamente",
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocurrió un error al procesar la solicitud.",
      data: null,
      error: error,
    };
  }
};
