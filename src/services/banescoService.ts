import { Request, Response } from "express";
import axios from "axios";
import https from "https";
import {
  banescoConfirmacionTransaccion,
  banescoConfirmacionTransaccionValidationSchema,
} from "../validations/banescoConfirmacionTransaccionValidation";
import {
  banescoVueltoP2P,
  banescoVueltoP2PValidationSchema,
} from "../validations/banescoVueltoP2PValidation";
import {
  banescoConsultaCuenta,
  banescoConsultaCuentaValidationSchema,
} from "../validations/banescoConsultaCuentaValidation";
import {
  banescoCargoEnCuentaPago,
  banescoCargoEnCuentaPagoValidationSchema,
} from "../validations/banescoCargoEnCuentaPagoValidation";
import {
  banescoConsultaTransaccion,
  banescoConsultaTransaccionValidationSchema,
} from "../validations/banescoConsultaTransaccionValidation";
import {
  banescoCargoEnCuentaLink,
  banescoCargoEnCuentaLinkValidationSchema,
} from "../validations/banescoCargoEnCuentaLinkValidation";
import * as env from "../config/env.config";
import User from "../models/User";
import BanescoVuelto from "../models/banescoVuelto";

const agent = new https.Agent({
  rejectUnauthorized: env.BANESCO_VALIDATE_CERT === "true", // Desactiva la validación de certificados
});

export const getToken = async (
  url: string,
  client_id: string,
  client_secret: string,
  username: string,
  password: string,
  grant_type: string,
  code?: string,
  redirect_uri?: string,
) => {
  try {
    // Construimos los headers básicos
    const headers: Record<string, string> = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    // Si es grant_type authorization_code, agregamos Authorization Basic
    if (grant_type === "authorization_code") {
      const creds = Buffer.from(`${client_id}:${client_secret}`).toString(
        "base64",
      );
      headers["Authorization"] = `Basic ${creds}`;
    }

    // Preparamos el cuerpo en x-www-form-urlencoded
    const params = new URLSearchParams();
    if (grant_type === "password") {
      params.append("grant_type", grant_type);
      params.append("username", client_id);
      params.append("password", client_secret);
      params.append("client_id", username);
      params.append("client_secret", password);
    } else if (grant_type === "authorization_code") {
      params.append("grant_type", grant_type);
      params.append("code", code!);
      params.append("redirect_uri", redirect_uri!);
    }

    // Hacemos la petición
    const response = await axios.post(url, params.toString(), {
      headers,
      httpsAgent: agent,
      validateStatus: () => true,
    });

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

//CONFIRMACION DE TRANSACCIONES
export const confirmarTransaccion = async (
  data: banescoConfirmacionTransaccion,
) => {
  try {
    // Validar los filtros con Joi
    const { error, value } =
      banescoConfirmacionTransaccionValidationSchema.validate(data, {
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
    const token = await getToken(
      env.BANESCO_CONSULTA_API_SSO!,
      env.BANESCO_CONSULTA_API_CLIENT_ID!,
      env.BANESCO_CONSULTA_API_CLIENT_SECRET!,
      env.BANESCO_CONSULTA_API_USER!,
      env.BANESCO_CONSULTA_API_PASSWORD!,
      "password",
      undefined,
      undefined,
    );

    if (!token.success) {
      return {
        success: false,
        message: "No se pudo obtener un token",
        data: token,
      };
    }

    const url = env.BANESCO_CONSULTA_API_URL!;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.data.access_token}`,
    };

    const body = data;

    const response = await axios.post(url, body, {
      headers,
      httpsAgent: agent,
      validateStatus: () => true,
    });

    // console.log('consultar_transaccion');
    // console.log(response);

    if (response.status == 200) {
      return {
        success: true,
        message: "Exitoso",
        data: response.data,
      };
    } else {
      return {
        success: false,
        message: "Fallido",
        data: response.data,
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

//VUELTO
export const vueltoP2p = async (data: banescoVueltoP2P) => {
  try {
    // Validar los filtros con Joi
    const { error, value } = banescoVueltoP2PValidationSchema.validate(data, {
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
    const token = await getToken(
      env.BANESCO_VUELTO_API_SSO!,
      env.BANESCO_VUELTO_API_CLIENT_ID!,
      env.BANESCO_VUELTO_API_CLIENT_SECRET!,
      env.BANESCO_VUELTO_API_USER!,
      env.BANESCO_VUELTO_API_PASSWORD!,
      "password",
      undefined,
      undefined,
    );

    if (!token.success) {
      return {
        success: false,
        message: "No se pudo obtener un token",
        data: token,
      };
    }

    const url = env.BANESCO_VUELTO_API_URL!;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.data.access_token}`,
    };

    const body = data;

    const response = await axios.post(url, body, {
      headers,
      httpsAgent: agent,
      validateStatus: () => true,
    });

    // console.log("vuelto_p2p");
    // console.log(response);

    if (response.status == 200) {
      const banescoVuelto = new BanescoVuelto({
        ...data.dataRequest,
        referenceNumber: response.data.dataResponse?.referenceNumber,
      });
      // console.log(banescoVuelto);
      const savedVuelto = await banescoVuelto.save();

      return {
        success: true,
        message: "Exitoso",
        data: savedVuelto,
      };
    } else {
      console.log(response);
      return {
        success: false,
        message: "Fallido",
        data: response.data,
      };
    }
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

//CARGO EN CUENTA
export const cargoEnCuentaLink = async () => {
  try {
    const proxy_url = env.BANESCO_CARGO_EN_CUENTA_API_PROXY_URL!;
    const response_type = env.BANESCO_CARGO_EN_CUENTA_API_RESPONSE_TYPE!;
    const client_id = env.BANESCO_CARGO_EN_CUENTA_API_CLIENT_ID!;
    const redirect_uri = env.BANESCO_CARGO_EN_CUENTA_API_CALLBACK_URL!;
    const scope = env.BANESCO_CARGO_EN_CUENTA_API_SCOPE!;

    const url =
      proxy_url +
      "?response_type=" +
      encodeURIComponent(response_type) +
      "&client_id=" +
      encodeURIComponent(client_id) +
      "&redirect_uri=" +
      encodeURIComponent(redirect_uri) +
      "&scope=" +
      encodeURIComponent(scope);

    return {
      success: true,
      message: "Link generado correctamente",
      data: {
        url: url,
      },
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

export const callback = async (req: Request, res: Response) => {
  const API_WEBSITE_URL = env.API_WEBSITE_URL!;

  const generateHtml = (bodyContent: string) => `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirigiendo...</title>
      <link rel="icon" href="${API_WEBSITE_URL}/public/img/logo_pasta.png" type="image/x-icon">
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 50px;
          background-color: #ffffff;
        }
        .logo {
          width: 150px;
          margin-bottom: 20px;
        }
        .message {
          font-size: 16px;
          color: #333;
        }
        .error-message {
          font-size: 24px;
          color: red;
        }
         
      </style>
    </head>
    <body>
      ${bodyContent}
    </body>
    </html>
  `;

  try {
    // Contenido para el caso exitoso
    const successContent = `
          <img class="logo" src="${API_WEBSITE_URL}/public/img/logo_pasta.png" alt="PER CAPITAL Logo">
          <div class="message">Redirigiendo a la app de PASTA...</div>
        `;

    const htmlContent = generateHtml(successContent);

    return {
      success: true,
      message: "Callback ejecutado correctamente",
      data: {
        htmlContent: htmlContent,
      },
      error: null,
    };
  } catch (error) {
    // Contenido para el caso de error
    const errorContent = `
          <p class="error-message">Ha ocurrido un error: ${
            error || "Error desconocido"
          }</p>
        `;

    const htmlContent = generateHtml(errorContent);

    return {
      success: false,
      message: "Error al generar la página de redirección.",
      data: {
        htmlContent: htmlContent,
      },
      error,
    };
  }
};

export const consultaCuenta = async (data: banescoConsultaCuenta) => {
  try {
    // Validar los filtros con Joi
    const { error, value } = banescoConsultaCuentaValidationSchema.validate(
      data,
      { abortEarly: false },
    );

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
    const token = await getToken(
      env.BANESCO_CARGO_EN_CUENTA_API_SSO!,
      env.BANESCO_CARGO_EN_CUENTA_API_CLIENT_ID!,
      env.BANESCO_CARGO_EN_CUENTA_API_CLIENT_SECRET!,
      env.BANESCO_CARGO_EN_CUENTA_API_USER!,
      env.BANESCO_CARGO_EN_CUENTA_API_PASSWORD!,
      "authorization_code",
      data.dataRequest.auth.code,
      env.BANESCO_CARGO_EN_CUENTA_API_CALLBACK_URL!,
    );

    if (!token.success) {
      return {
        success: false,
        message: "No se pudo obtener un token",
        data: null,
        error: token.message,
      };
    }

    const url = env.BANESCO_CARGO_EN_CUENTA_API_CONSULTA_DE_CUENTA_URL!;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.data.access_token}`,
    };

    const body = data;
    // console.log(body);
    const response = await axios.post(url, body, {
      headers,
      httpsAgent: agent,
      validateStatus: () => true,
    });

    if (response.status == 200) {
      response.data.token = token.data.access_token;

      return {
        success: true,
        message: "Exitoso",
        data: response.data,
      };
    } else {
      return {
        success: false,
        message: "Fallido",
        data: response.data,
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

export const cargoEnCuentaPago = async (data: banescoCargoEnCuentaPago) => {
  try {
    // Validar los filtros con Joi
    const { error, value } = banescoCargoEnCuentaPagoValidationSchema.validate(
      data,
      { abortEarly: false },
    );

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
    let token_used = "";
    if (data.dataRequest.auth?.token) {
      token_used = data.dataRequest.auth.token;
    } else {
      const token = await getToken(
        env.BANESCO_CARGO_EN_CUENTA_API_SSO!,
        env.BANESCO_CARGO_EN_CUENTA_API_CLIENT_ID!,
        env.BANESCO_CARGO_EN_CUENTA_API_CLIENT_SECRET!,
        env.BANESCO_CARGO_EN_CUENTA_API_USER!,
        env.BANESCO_CARGO_EN_CUENTA_API_PASSWORD!,
        "authorization_code",
        data.dataRequest.auth!.code,
        env.BANESCO_CARGO_EN_CUENTA_API_CALLBACK_URL!,
      );

      if (!token.success) {
        return {
          success: false,
          message: "No se pudo obtener un token banesco",
          data: token,
        };
      }

      token_used = token.data.access_token;
    }

    const url = env.BANESCO_CARGO_EN_CUENTA_API_CARGO_EN_CUENTA_PAGO_URL!;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token_used}`,
    };

    console.log(headers);

    if (data.dataRequest.auth) {
      //este campo se lo agrego yo, no va
      delete data.dataRequest.auth;
    }

    const body = data;

    const response = await axios.post(url, body, {
      headers,
      httpsAgent: agent,
      validateStatus: () => true,
    });

    if (response.status == 200) {
      return {
        success: true,
        message: "Exitoso",
        data: response.data,
      };
    } else {
      return {
        success: false,
        message: "Fallido",
        data: response.data,
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

export const consultarTransaccion = async (
  data: banescoConsultaTransaccion,
) => {
  try {
    // Validar los filtros con Joi
    const { error, value } =
      banescoConsultaTransaccionValidationSchema.validate(data, {
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
    const token = await getToken(
      env.BANESCO_CARGO_EN_CUENTA_API_SSO!,
      env.BANESCO_CARGO_EN_CUENTA_API_CLIENT_ID!,
      env.BANESCO_CARGO_EN_CUENTA_API_CLIENT_SECRET!,
      env.BANESCO_CARGO_EN_CUENTA_API_USER!,
      env.BANESCO_CARGO_EN_CUENTA_API_PASSWORD!,
      "authorization_code",
      data.dataRequest.auth.code,
      env.BANESCO_CARGO_EN_CUENTA_API_CALLBACK_URL!,
    );

    if (!token.success) {
      return {
        success: false,
        message: "No se pudo obtener un token",
        data: token,
      };
    }

    const url = env.BANESCO_CARGO_EN_CUENTA_API_CONSULTA_DE_TRANSACCION_URL!;

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token.data.access_token}`,
    };

    const body = data;

    const response = await axios.post(url, body, {
      headers,
      httpsAgent: agent,
      validateStatus: () => true,
    });

    // console.log('consulta_cuenta');
    // console.log(response);

    if (response.status == 200) {
      return {
        success: true,
        message: "Exitoso",
        data: response.data,
      };
    } else {
      return {
        success: false,
        message: "Fallido",
        data: response.data,
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
