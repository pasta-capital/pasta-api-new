import axios from "axios";
import * as env from "../config/env.config";
import { ClientUpdateData } from "../models/la/clientUpdateData";
import { GetPlanData } from "../models/la/getPlanData";
import { SimulateCreditData } from "../models/la/simulateCreditData";
import { InsertOperationData } from "../models/la/insertOperationData";
import { ConsultDebtData } from "../models/la/consultDebtData";
import { InsertPaymentData } from "../models/la/insertPaymentData";
import * as loggers from "../common/logger";

export const getMaritalStatus = (maritalStatus: string) => {
  switch (maritalStatus) {
    case "single":
      return "Soltero";
    case "married":
      return "Casado";
    case "divorced":
      return "Divorciado";
    case "widowed":
      return "Viudo";
    default:
      return "Soltero";
  }
};

export const getGender = (gender: string) => {
  switch (gender) {
    case "M":
      return "Masculino";
    case "F":
      return "Femenino";
    default:
      return "Desconocido";
  }
};

/**
 * Interfaz para la respuesta estándar de LA Sistemas
 */
interface LASistemasResponse {
  Status: number;
  Mensaje: string;
  Cadjson: any;
}

/**
 * Helper para procesar la respuesta estándar de LA Sistemas
 * Formato: { Status: 0, Mensaje: " ", Cadjson: {} }
 */
const processLASistemasResponse = (
  response: any,
): {
  success: boolean;
  message: string;
  data: any;
  error: any;
} => {
  // Si la respuesta ya tiene el formato estándar
  if (response && typeof response.Status === "number") {
    const laResponse = response as any;
    const isSuccess = laResponse.Status === 0;

    // Buscar Cadjson o CadJson (puede venir con diferentes mayúsculas)
    const cadJsonData = laResponse.Cadjson || laResponse.CadJson || null;

    return {
      success: isSuccess,
      message:
        laResponse.Mensaje ||
        (isSuccess ? "Operación exitosa" : "Error en la operación"),
      data: cadJsonData,
      error: isSuccess ? null : laResponse,
    };
  }

  // Si la respuesta no tiene el formato estándar, retornar como está
  return {
    success: true,
    message: "Operación exitosa",
    data: response,
    error: null,
  };
};

export const updateClientData = async (data: ClientUpdateData) => {
  try {
    // --- helpers internos (solo en este método) ---
    // Limpieza profunda: elimina undefined/null en objetos y arrays
    const pruneDeep = (input: any): any => {
      if (Array.isArray(input)) {
        return input
          .filter((v) => v !== undefined && v !== null)
          .map((v) => pruneDeep(v));
      }
      if (input && typeof input === "object") {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(input)) {
          if (v === undefined || v === null) continue;
          out[k] = pruneDeep(v);
        }
        return out;
      }
      return input;
    };

    // Normaliza estructura: acepta {Json, Param} o {Json, Valor:{Param}}
    const ParamOriginal = data as any;

    if (!ParamOriginal || !ParamOriginal.Rif) {
      return {
        success: false,
        message: "Parámetros inválidos: se requiere Param con Rif.",
        data: null,
        error: null,
      };
    }

    const url = `${env.LA_SISTEMAS_API_URL}/WActualiza_DatosM`;
    const headers = {
      "Content-Type": "application/json",
      "API-Token-LA": `${env.LA_SISTEMAS_API_KEY}`,
    };

    // Elimina null/undefined recursivamente
    const Param = pruneDeep(ParamOriginal);

    // Body final que espera la API (sin "Valor")
    const body = {
      Json: true, // respeta el flag que envías
      Param: Param, // ya limpio
    };

    loggers.operation("LA Sistemas - updateClientData Request", {
      action: "update_client_data",
      step: "request",
      url,
      body,
    });

    const response = await axios.post(url, body, {
      headers,
      validateStatus: () => true,
    });

    loggers.operation("LA Sistemas - updateClientData Response", {
      action: "update_client_data",
      step: "response",
      status: response.status,
      data: response.data,
    });

    if (response.status === 200) {
      return processLASistemasResponse(response.data);
    } else {
      return {
        success: false,
        message: `No se pudo obtener la información (HTTP ${response.status}).`,
        data: null,
        error: response.data ?? null,
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

export const getPlan = async (data: GetPlanData) => {
  try {
    // Validación de parámetros requeridos
    if (!data || !data.Plan || !data.Subplan) {
      return {
        success: false,
        message: "Parámetros inválidos: se requiere Plan y Subplan.",
        data: null,
        error: null,
      };
    }

    const url = `${env.LA_SISTEMAS_API_URL}/WDame_subplan`;
    const headers = {
      "Content-Type": "application/json",
      "API-Token-LA": `${env.LA_SISTEMAS_API_KEY}`,
    };

    // Body con los parámetros
    const body = {
      Json: true,
      Param: {
        Plan: data.Plan,
        Subplan: data.Subplan,
      },
    };

    const response = await axios.post(url, body, {
      headers,
      validateStatus: () => true,
    });

    if (response.status === 200) {
      return processLASistemasResponse(response.data);
    } else {
      return {
        success: false,
        message: `No se pudo obtener la información del plan (HTTP ${response.status}).`,
        data: null,
        error: response.data ?? null,
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

export const simulateCredit = async (data: SimulateCreditData) => {
  try {
    // Validación de parámetros requeridos
    if (
      !data ||
      !data.NuContrato ||
      !data.SubPlan ||
      !data.Valor ||
      !data.Financiar ||
      !data.Ini ||
      !data.Plazo ||
      !data.Tasa ||
      !data.DiaMes
    ) {
      return {
        success: false,
        message:
          "Parámetros inválidos: se requieren todos los campos (NuContrato, SubPlan, Valor, Financiar, Ini, Plazo, Tasa, DiaMes).",
        data: null,
        error: null,
      };
    }

    const url = `${env.LA_SISTEMAS_API_URL}/WSimulaCredNew`;
    const headers = {
      "Content-Type": "application/json",
      "API-Token-LA": `${env.LA_SISTEMAS_API_KEY}`,
    };

    // Body con los parámetros
    const body = {
      Json: true,
      Param: {
        NuContrato: data.NuContrato,
        SubPlan: data.SubPlan,
        Valor: data.Valor,
        Financiar: data.Financiar,
        Ini: data.Ini,
        Plazo: data.Plazo,
        Tasa: data.Tasa,
        DiaMes: data.DiaMes,
      },
    };

    loggers.operation("LA Sistemas - simulateCredit Request", {
      action: "simulate_credit",
      step: "request",
      url,
      body,
    });

    const response = await axios.post(url, body, {
      headers,
      validateStatus: () => true,
    });

    if (response.status === 200) {
      const respData = processLASistemasResponse(response.data);
      return respData;
    } else {
      return {
        success: false,
        message: `No se pudo simular el crédito (HTTP ${response.status}).`,
        data: null,
        error: response.data ?? null,
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

export const InsertOperation = async (data: InsertOperationData) => {
  try {
    // Validación de parámetros requeridos
    if (
      !data ||
      !data.Rif ||
      !data.Validagraba ||
      !data.Producto ||
      !data.Moneda ||
      !data.Inicio ||
      !data.Venc ||
      !data.Monto ||
      !data.Tasa ||
      !data.Fpago ||
      !data.Refer ||
      !data.Tpint
    ) {
      return {
        success: false,
        message:
          "Parámetros inválidos: se requieren los campos obligatorios (Rif, Validagraba, Producto, Moneda, Inicio, Venc, Monto, Tasa, Fpago, Refer, Tpint).",
        data: null,
        error: null,
      };
    }

    const url = `${env.LA_SISTEMAS_API_URL}/WInserta_transacMMCred`;
    const headers = {
      "Content-Type": "application/json",
      "API-Token-LA": `${env.LA_SISTEMAS_API_KEY}`,
    };

    // Body con los parámetros
    const body = {
      Json: true,
      Param: data,
    };

    loggers.operation("LA Sistemas - InsertOperation Request", {
      action: "insert_operation",
      step: "request",
      url,
      body,
    });

    const response = await axios.post(url, body, {
      headers,
      validateStatus: () => true,
    });

    loggers.operation("LA Sistemas - InsertOperation Response", {
      action: "insert_operation",
      step: "response",
      status: response.status,
      data: response.data,
    });

    if (response.status === 200) {
      return processLASistemasResponse(response.data);
    } else {
      return {
        success: false,
        message: `No se pudo insertar la operación (HTTP ${response.status}).`,
        data: null,
        error: response.data ?? null,
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

export const InsertPayment = async (data: InsertPaymentData) => {
  try {
    const url = `${env.LA_SISTEMAS_API_URL}/WInserta_PaboCred`;
    const headers = {
      "Content-Type": "application/json",
      "API-Token-LA": `${env.LA_SISTEMAS_API_KEY}`,
    };

    // Body con los parámetros
    const body = {
      Json: true,
      Param: data,
    };

    loggers.operation("LA Sistemas - InsertPayment Request", {
      action: "insert_payment",
      step: "request",
      url,
      body,
    });

    const response = await axios.post(url, body, {
      headers,
      validateStatus: () => true,
    });

    loggers.operation("LA Sistemas - InsertPayment Response", {
      action: "insert_payment",
      step: "response",
      status: response.status,
      data: response.data,
    });

    if (response.status === 200) {
      return processLASistemasResponse(response.data);
    } else {
      return {
        success: false,
        message: `No se pudo insertar el pago (HTTP ${response.status}).`,
        data: null,
        error: response.data ?? null,
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

export const consultDebt = async (data: ConsultDebtData) => {
  try {
    // Validación de parámetros requeridos
    if (!data || !data.Rif) {
      return {
        success: false,
        message: "Parámetros inválidos: se requiere Rif.",
        data: null,
        error: null,
      };
    }

    const url = `${env.LA_SISTEMAS_API_URL}/WEdoCtaMMCred`;
    const headers = {
      "Content-Type": "application/json",
      "API-Token-LA": `${env.LA_SISTEMAS_API_KEY}`,
    };

    // Body con los parámetros
    const body = {
      Json: true,
      Param: {
        Rif: data.Rif,
        ...(data.Fecha && { Fecha: data.Fecha }),
        Canceladas: "N",
      },
    };

    const response = await axios.post(url, body, {
      headers,
      validateStatus: () => true,
    });

    if (response.status === 200) {
      return processLASistemasResponse(response.data);
    } else {
      return {
        success: false,
        message: `No se pudo consultar la deuda (HTTP ${response.status}).`,
        data: null,
        error: response.data ?? null,
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

export const buscarCuotaPorCopasocuota = (
  data: any, // Usamos la interfaz ApiResponse para tipar 'data'
  copasocuotaBuscado: string,
): {
  cuota: any | undefined;
  posicionIndex: number | undefined; // Índice de la Posicion que contiene la cuota
  cuotaNumber: number | undefined; // Índice de la cuota dentro de Cuota[]
} => {
  const posiciones = data.Posiciones?.Posicion ?? [];

  for (let i = 0; i < posiciones.length; i++) {
    const posicion = posiciones[i];

    // Verificar si 'Cuotas' no es una cadena vacía y si 'Cuota' es un array
    if (posicion.Cuotas !== "" && Array.isArray(posicion.Cuotas.Cuota)) {
      const cuotasDelArray = posicion.Cuotas.Cuota;

      for (let j = 0; j < cuotasDelArray.length; j++) {
        const cuota = cuotasDelArray[j];
        if (cuota.Copasocuota === copasocuotaBuscado) {
          return {
            cuota: cuota,
            posicionIndex: i, // Índice de la Posicion en Posiciones[]
            cuotaNumber: j + 1, // Numero de la cuota en Cuotas.Cuota[]
          };
        }
      }
    }
  }

  return { cuota: undefined, posicionIndex: undefined, cuotaNumber: undefined };
};

export const getTxt = async (fileName: string) => {
  try {
    const url = `${env.LA_SISTEMAS_API_URL}/WDame_txt`;
    const headers = {
      "Content-Type": "application/json",
      "API-Token-LA": `${env.LA_SISTEMAS_API_KEY}`,
    };

    const body = {
      Json: true,
      Param: { Nmtxt: fileName },
    };

    const response = await axios.post(url, body, {
      headers,
      validateStatus: () => true,
    });

    if (response.status === 200) {
      return processLASistemasResponse(response.data);
    } else {
      return {
        success: false,
        message: `No se pudo obtener el txt (HTTP ${response.status}).`,
        data: null,
        error: response.data ?? null,
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

export const getStatus = (status: string) => {
  switch (status) {
    case "Pendiente":
      return "pending";
    case "Pagado":
      return "paid";
    case "Vencido":
      return "overdue";
    default:
      return "pending";
  }
};
