import axios from "axios";
import https from "https";
import mongoose from "mongoose";
import AgileCheckToken from "../models/agileCheckToken";
import User from "../models/User";
import * as env from "../config/env.config";
import {
  getClienteByDocIdentidadValidationSchema,
  type GetClienteByDocIdentidad,
} from "../validations/agileCheck/getClienteByDocIdentidadValidation";

const agent = new https.Agent({
  rejectUnauthorized: env.AGILE_CHECK_API_VALIDATE_CERT === "true", // Desactiva la validación de certificados
});

const getTokenFromDB = async () => {
  try {
    const tokenRecord = await AgileCheckToken.findOne({
      //order: [["expireAt", "DESC"]], // Ordena por la fecha de expiración más reciente
    }).sort({ expireAt: -1 });

    if (tokenRecord) {
      // Verificar si el token ha expirado
      const expirationTime = tokenRecord.expireAt!.getTime();
      const currentTime = new Date().getTime();

      // Si el token no ha expirado
      if (currentTime < expirationTime) {
        return {
          success: true,
          message: "Se ha obtenido un nuevo token exitosamente",
          data: tokenRecord,
        };
      }
    }

    // Si no hay token activo o si ha expirado, retorna null
    return {
      success: false,
      message: "No se ha obtenido un token de agile check",
      data: tokenRecord,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocurrió un error al obtener el token de agile check",
      data: null,
      error: error,
    };
  }
};

const getLista = async () => {
  try {
    let token = await getTokenFromDB();
    if (token.success === false) {
      const AGILE_CHECK_API_USER = env.AGILE_CHECK_API_USER!;
      const AGILE_CHECK_API_PASSWORD = env.AGILE_CHECK_API_PASSWORD!;
      token = await login(AGILE_CHECK_API_USER, AGILE_CHECK_API_PASSWORD);
    }

    if (token.success == true) {
      const url = `${env.AGILE_CHECK_API_URL}/api/Lista/GetLista`;
      const headers = {
        "Content-Type": "application/json",
        Authorization: `${token.data?.tokenType} ${token.data?.accessToken}`,
      };
      const response = await axios.get(url, {
        headers,
        httpsAgent: agent,
        validateStatus: () => true, // Permitir que Axios maneje respuestas con códigos de estado no 2xx
      });

      if (response.status == 200) {
        return {
          success: true,
          message: "Se han obtenido las listas exitosamente",
          data: response.data,
          error: null,
        };
      } else {
        return {
          success: false,
          message: "No se pudieron obtener las listas.",
          data: null,
          error: null,
        };
      }
    } else {
      return {
        success: false,
        message: "No se ha obtenido un token de agile check",
        data: token,
        error: null,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Ocurrió un error al procesar la solicitud.",
      data: null,
      error: error,
    };
  }
};

const validarListas = async (
  listas: number[],
): Promise<{ success: boolean; message: string; listasValidas?: number[] }> => {
  try {
    // Obtener la lista de valores válidos desde el endpoint
    const listaResponse = await getLista();
    if (!listaResponse.success) {
      return {
        success: false,
        message: "No se pudo obtener la lista de valores válidos.",
      };
    }

    // Extraer los IDs de listas válidas desde la respuesta
    const listasValidasAPI = listaResponse.data.map(
      (item: { id: number }) => item.id,
    );

    // Convertir la entrada de listas a números y filtrar solo los válidos
    const listasNumericas = listas
      .map((item) => item)
      .filter((num) => !isNaN(num));
    const listasValidas = listasNumericas.filter((id) =>
      listasValidasAPI.includes(id),
    );

    if (listasValidas.length === 0) {
      return {
        success: false,
        message: "Ninguna de las listas enviadas es válida.",
      };
    }

    return {
      success: true,
      message: "Las listas son válidas.",
      listasValidas,
    };
  } catch (error) {
    return {
      success: false,
      message: "Error al validar las listas.",
    };
  }
};

export const login = async (username: string, password: string) => {
  try {
    const url = `${env.AGILE_CHECK_API_URL}/api/oauth2/token`;
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };

    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);
    body.append("grant_type", "password");

    try {
      // Enviar solicitud de autenticación
      const response = await axios.post(url, body.toString(), {
        headers,
        httpsAgent: agent,
        validateStatus: () => true, // Permitir que Axios maneje respuestas con códigos de estado no 2xx
      });

      if (response.status !== 200) {
        return {
          success: false,
          message: `Autenticación fallida (${response.status})`,
          data: response.data,
          status: response.status,
        };
      }

      const { access_token, token_type, expires_in } = response.data;

      if (!access_token || !token_type || !expires_in) {
        return {
          success: false,
          message:
            "La respuesta del servidor no contiene la información esperada.",
          data: null,
        };
      }

      // Calcular la expiración del token
      const expiration = new Date();
      expiration.setSeconds(expiration.getSeconds() + parseInt(expires_in));

      // Guardar el token en la base de datos
      const new_agile_check_token = await AgileCheckToken.create({
        accessToken: access_token,
        tokenType: token_type,
        expiresIn: expires_in,
        expireAt: expiration,
      });

      return {
        success: true,
        message: "Se ha obtenido un nuevo token exitosamente",
        data: new_agile_check_token,
      };
    } catch (error: any) {
      // Capturar errores específicos de Axios
      if (error.response) {
        return {
          success: false,
          message: "Error en la autenticación",
          data: error.response.data,
          status: error.response.status,
        };
      } else if (error.request) {
        return {
          success: false,
          message: "No se recibió respuesta del servidor",
          data: null,
          error: error.message,
        };
      } else {
        return {
          success: false,
          message: "Error desconocido en la autenticación",
          data: null,
          error: error.message,
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      message: "Ocurrió un error al procesar la solicitud.",
      data: null,
      error: error,
    };
  }
};

export const buscar = async (
  nombres: string,
  apellidos: string,
  es_juridico: boolean,
  numero_id: string,
  listas: number[],
  pais: string,
  pais_id: number,
  query_mode: number,
  language: string,
) => {
  try {
    // Validar listas
    const validacion = await validarListas(listas);
    if (!validacion.success) {
      return {
        success: false,
        message: validacion.message,
        data: null,
        error: null,
      };
    }

    // Obtener el token
    let token = await getTokenFromDB();

    if (!token.success) {
      const AGILE_CHECK_API_USER = env.AGILE_CHECK_API_USER!;
      const AGILE_CHECK_API_PASSWORD = env.AGILE_CHECK_API_PASSWORD!;
      token = await login(AGILE_CHECK_API_USER, AGILE_CHECK_API_PASSWORD);
    }

    if (!token.success) {
      return {
        success: false,
        message: "No se ha obtenido un token de agile check",
        data: token,
        error: null,
      };
    }

    // Preparar la solicitud
    const url = `${env.AGILE_CHECK_API_URL}/api/Consulta/Buscar`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `${token.data?.tokenType} ${token.data?.accessToken}`,
    };

    const body = {
      Nombres: nombres,
      Apellidos: apellidos,
      EsJuridico: es_juridico,
      NumeroId: numero_id,
      Listas: validacion.listasValidas,
      Pais: pais,
      PaisId: pais_id,
      queryMode: query_mode,
      phonetic: { language },
    };

    try {
      // Enviar solicitud a la API
      const response = await axios.post(url, body, {
        headers,
        httpsAgent: agent,
        validateStatus: () => true, // Permitir que Axios maneje respuestas con códigos de estado no 2xx
      });
      // console.log(response);
      return {
        success: true,
        message: "Búsqueda exitosa",
        data: response.data,
        error: null,
      };
    } catch (error: any) {
      // Capturar errores de Axios (respuestas con estatus no 200)
      if (error.response) {
        return {
          success: false,
          message: "Error en la respuesta del API",
          data: error.response.data,
          status: error.response.status,
          error: null,
        };
      } else if (error.request) {
        return {
          success: false,
          message: "No se recibió respuesta del API",
          data: null,
          error: error.message,
        };
      } else {
        return {
          success: false,
          message: "Error desconocido en la solicitud",
          data: null,
          error: error.message,
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      message: "Ocurrió un error al procesar la solicitud",
      data: null,
      error: error,
    };
  }
};

export const getClienteByDocIdentidad = async (
  data: GetClienteByDocIdentidad,
) => {
  try {
    const { error } = getClienteByDocIdentidadValidationSchema.validate(data, {
      abortEarly: false,
    });
    if (error) {
      return {
        success: false,
        message: `Agile Check: Error de validación getClienteByDocIdentidad: ${error.details.map((d) => d.message).join(", ")}`,
        data: null,
        error: error,
      };
    }

    let token = await getTokenFromDB();
    if (token.success === false) {
      const AGILE_CHECK_API_USER = env.AGILE_CHECK_API_USER!;
      const AGILE_CHECK_API_PASSWORD = env.AGILE_CHECK_API_PASSWORD!;
      token = await login(AGILE_CHECK_API_USER, AGILE_CHECK_API_PASSWORD);
    }

    if (token.success !== true) {
      return {
        success: false,
        message: "Agile Check: No se ha obtenido un token de agile check",
        data: token,
        error: null,
      };
    }

    const url = `${env.AGILE_CHECK_API_URL}/api/Cliente/GetClienteByDocIdentidad`;
    const headers = {
      Authorization: `${token.data?.tokenType} ${token.data?.accessToken}`,
    };

    const response = await axios.get(url, {
      headers,
      httpsAgent: agent,
      validateStatus: () => true,
      params: {
        tipoIdentificacion: data.tipoIdentificacion,
        nroIdentificacion: data.nroIdentificacion,
      },
    });

    console.log(url, {
      tipoIdentificacion: data.tipoIdentificacion,
      nroIdentificacion: data.nroIdentificacion,
    });
    console.log(response);

    if (response.status === 200) {
      return {
        success: true,
        message: "Se ha obtenido la información exitosamente",
        data: response.data,
        error: null,
      };
    }

    return {
      success: false,
      message: "Agile Check: No se pudo obtener la información.",
      data: null,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      message: "Agile Check: Ocurrió un error al procesar la solicitud.",
      data: null,
      error: error,
    };
  }
};

export const getPerfilRiesgo = async (userId: string) => {
  try {
    if (!mongoose.isValidObjectId(userId)) {
      return {
        success: false,
        message: "userId no válido",
        data: null,
        error: null,
      };
    }

    const user = await User.findById(userId).select(
      "document identificationType",
    );

    if (!user) {
      return {
        success: false,
        message: "Usuario no válido",
        data: null,
        error: null,
      };
    }

    const tipoIdentificacion =
      user.identificationType?.toUpperCase() === "J" ? "0" : "1";

    const data: GetClienteByDocIdentidad = {
      tipoIdentificacion,
      nroIdentificacion: user.document ?? "",
    };

    const clienteRes = await getClienteByDocIdentidad(data);

    if (!clienteRes.success || !clienteRes.data) {
      return {
        success: false,
        message: "Agile Check: No se pudo obtener el cliente por documento.",
        data: clienteRes.data ?? null,
        error: clienteRes.error ?? null,
      };
    }

    let nivel_riesgo = "Sin Referencia";
    if (clienteRes.success === true && clienteRes.data?.NivelRiesgo?.nombre) {
      nivel_riesgo = String(clienteRes.data.NivelRiesgo.nombre);
    }

    let valor_riesgo = "0";
    if (clienteRes.success === true && clienteRes.data?.riesgo != null) {
      valor_riesgo = String(clienteRes.data.riesgo);
    }

    return {
      success: true,
      message: "Nivel y Valor de Riesgo obtenidos correctamente",
      data: {
        nivel_riesgo,
        valor_riesgo,
      },
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      message:
        "Agile Check: Ocurrió un error al procesar la solicitud (getPerfilRiesgo).",
      data: null,
      error: error,
    };
  }
};

export const getEstadoCivil = async () => {
  try {
    // Obtener el token
    let token = await getTokenFromDB();
    if (!token.success) {
      const AGILE_CHECK_API_USER = env.AGILE_CHECK_API_USER!;
      const AGILE_CHECK_API_PASSWORD = env.AGILE_CHECK_API_PASSWORD!;
      token = await login(AGILE_CHECK_API_USER, AGILE_CHECK_API_PASSWORD);
    }

    if (!token.success) {
      return {
        success: false,
        message: "No se ha obtenido un token de Agile Check",
        data: token,
        error: null,
      };
    }

    // Preparar la solicitud
    const url = `${env.AGILE_CHECK_API_URL}/api/EstadoCivil/GetEstadoCivil`;
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.data?.accessToken}`,
    };

    try {
      // Enviar solicitud a la API
      const response = await axios.get(url, {
        headers,
        httpsAgent: agent,
        validateStatus: () => true, // Permitir que Axios maneje respuestas con códigos de estado no 2xx
      });

      return {
        success: true,
        message: "Se ha obtenido el estado civil exitosamente",
        data: response.data,
        error: null,
      };
    } catch (error: any) {
      // Capturar errores específicos de Axios
      if (error.response) {
        return {
          success: false,
          message: "Error en la respuesta del API",
          data: error.response.data,
          status: error.response.status,
          error: null,
        };
      } else if (error.request) {
        return {
          success: false,
          message: "No se recibió respuesta del API",
          data: null,
          error: error.message,
        };
      } else {
        return {
          success: false,
          message: "Error desconocido en la solicitud",
          data: null,
          error: error.message,
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      message: "Ocurrió un error al procesar la solicitud",
      data: null,
      error: error,
    };
  }
};
