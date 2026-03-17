import axios from "axios";
import Config from "../models/config";
import * as env from "../config/env.config";
import * as loggers from "../common/logger";
import BancamigaPagoMovil from "../models/bancamigaPagoMovil";
import jwt, { JwtPayload } from "jsonwebtoken";

interface TokenResult {
  success: boolean;
  message: string;
  data: string | null | unknown;
  error?: unknown;
}

const accessTokenDefault =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE4MDYyNDE4MjcsImlhdCI6MTc0NDAzMzgyN30.tCe4aaOapv43ni5K1KfR9qPLajYl0_dxwYQlF9KEwOg";

const bancamigaApiUrl = env.BANCAMIGA_API_URL;
const bancamigaUsername = env.BANCAMIGA_USER;
const bancamigaPassword = env.BANCAMIGA_PASSWORD;

export const getToken = async (): Promise<TokenResult> => {
  try {
    const accessToken = await Config.findOne({ key: "bancamiga-access-token" });

    if (accessToken) {
      const expirationDate = getExpirationDate(accessToken?.value || "");

      if (expirationDate && expirationDate < new Date()) {
        return await refreshToken();
      }

      return {
        success: true,
        message: "Se ha obtenido un nuevo token exitosamente",
        data: accessToken.value,
      };
    }
    // Hacemos la petición
    const response = await axios.post(
      bancamigaApiUrl + "/public/auth/security/users/token",
      { Dni: bancamigaUsername, Pass: bancamigaPassword },
      {
        headers: {
          Authorization: `Bearer ${accessTokenDefault}`,
        },
        validateStatus: () => true,
      },
    );

    if (response.status === 200) {
      const tokenConfig = {
        key: "bancamiga-access-token",
        description: "Bancamiga Access Token",
        value: response.data.token,
        type: "string",
      };
      await Config.create(tokenConfig);

      const refreshTokenConfig = {
        key: "bancamiga-refresh-token",
        description: "Bancamiga Refresh Token",
        value: response.data.refresToken,
        type: "string",
      };

      await Config.create(refreshTokenConfig);

      return {
        success: true,
        message: "Se ha obtenido un nuevo token exitosamente",
        data: response.data.token,
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
      message: "Ocurrió un error al obtener el token.",
      data: null,
      error,
    };
  }
};

export const refreshToken = async (): Promise<TokenResult> => {
  try {
    const accessTokenConfig = await Config.findOne({
      key: "bancamiga-access-token",
    });
    const refreshTokenConfig = await Config.findOne({
      key: "bancamiga-refresh-token",
    });

    if (!refreshTokenConfig || !accessTokenConfig) {
      return await getToken();
    }

    const response = await axios.post(
      bancamigaApiUrl + "/public/re/refresh",
      { refresh_token: refreshTokenConfig.value },
      {
        headers: {
          Authorization: `Bearer ${accessTokenConfig.value}`,
        },
        validateStatus: () => true,
      },
    );

    if (response.status !== 200) {
      return {
        success: false,
        message: "No se pudo refrescar el token.",
        data: response.data,
      };
    }

    accessTokenConfig.value = response.data.token;
    await accessTokenConfig.save();

    refreshTokenConfig.value = response.data.refresToken;
    await refreshTokenConfig.save();

    return {
      success: true,
      message: "Se ha refrescado el token exitosamente",
      data: response.data.token,
    };
  } catch (error) {
    return {
      success: false,
      message: "Ocurrió un error al refrescar el token.",
      data: null,
      error,
    };
  }
};

export const findPaymentMobile = async (
  body: env.BancamigaFindPaymentMobileBody,
) => {
  const resultToken = await getToken();
  if (!resultToken.success) {
    return resultToken;
  }

  const token = resultToken.data;

  loggers.bancamiga(`Request Pago movil: ${JSON.stringify(body)}`);
  const response = await axios.post(
    bancamigaApiUrl + "/public/protected/pm/find",
    {
      Phone: body.phone,
      Bank: body.bank,
      Date: body.date,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      validateStatus: () => true,
    },
  );
  loggers.bancamiga(`Respuesta Pago movil: ${JSON.stringify(response.data)}`);

  if (response.status !== 200 || !response.data) {
    return {
      success: false,
      message: "No se pudo confirmar la transacción.",
      data: response.data,
    };
  }

  const transaction = response.data.lista.find(
    (t: env.BancamigaPagoMovil) =>
      t.NroReferenciaCorto === body.reference &&
      (t.Amount === body.amount || env.TESTING),
  ) as env.BancamigaPagoMovil | undefined;

  if (!transaction) {
    return {
      success: false,
      message: "No se encontró la transacción.",
      data: response.data,
    };
  }

  const config = await Config.findOne({ key: "ignore-payment-exists" })
    .lean()
    .exec();

  if (!config?.value) {
    const existsTransaction = await BancamigaPagoMovil.exists({
      ID: transaction.ID,
    });

    if (existsTransaction) {
      return {
        success: false,
        message: "La transacción ya se encuentra registrada.",
        data: null,
      };
    }
  }

  await BancamigaPagoMovil.create(transaction);

  return {
    success: true,
    message: "Transacción confirmada exitosamente",
    data: transaction,
  };
};

export interface BancamigaWebhookBody {
  BancoOrig: string;
  FechaMovimiento: string;
  HoraMovimiento: string;
  NroReferencia: string;
  PhoneOrig: string;
  PhoneDest: string;
  Status: string;
  Descripcion: string;
  Amount: string;
  Refpk: string;
  Dni?: string;
}

export const webhookHandler = async (body: BancamigaWebhookBody) => {
  try {
    loggers.bancamiga(`Webhook recibido: ${JSON.stringify(body)}`);

    // Buscar si existe la transacción por Refpk
    const existingTransaction = await BancamigaPagoMovil.findOne({
      Refpk: body.Refpk,
    });

    if (existingTransaction) {
      // Si existe, actualizar el Status
      existingTransaction.Status = body.Status;
      await existingTransaction.save();

      loggers.bancamiga(
        `Transacción actualizada - Refpk: ${body.Refpk}, Status: ${body.Status}`,
      );

      return {
        Code: 200,
        Refpk: body.Refpk,
      };
    }

    // Si no existe, crear nueva transacción
    // Mapear los campos del webhook al modelo
    const now = new Date();
    const amount = parseFloat(body.Amount);

    // NroReferenciaCorto: usar los últimos 6 dígitos de NroReferencia o el mismo si es más corto
    const nroReferenciaCorto =
      body.NroReferencia.length > 6
        ? body.NroReferencia.slice(-6)
        : body.NroReferencia;

    // Generar Ref basado en timestamp (últimos 10 dígitos del timestamp)
    const ref = parseInt(now.getTime().toString().slice(-10));

    // Usar Dni del body si existe, sino usar valor por defecto
    const dni = body.Dni || "00000000";

    const newTransaction = {
      ID: body.Refpk, // Usar Refpk como ID
      created_at: now,
      Dni: dni,
      PhoneDest: body.PhoneDest,
      PhoneOrig: body.PhoneOrig,
      Amount: amount,
      BancoOrig: body.BancoOrig,
      NroReferenciaCorto: nroReferenciaCorto,
      NroReferencia: body.NroReferencia,
      HoraMovimiento: body.HoraMovimiento,
      FechaMovimiento: body.FechaMovimiento,
      Descripcion: body.Descripcion || "",
      Status: body.Status,
      Refpk: body.Refpk,
      Ref: ref,
    };

    await BancamigaPagoMovil.create(newTransaction);

    loggers.bancamiga(`Transacción creada exitosamente - Refpk: ${body.Refpk}`);

    return {
      Code: 200,
      Refpk: body.Refpk,
    };
  } catch (error) {
    loggers.bancamiga(`Error en webhook: ${JSON.stringify(error)}`);
    throw error;
  }
};

const getExpirationDate = (token: string) => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    if (decoded && decoded.exp) {
      // exp está en segundos, convertimos a milisegundos para Date()
      const expirationDate = new Date(decoded.exp * 1000);
      return expirationDate;
    }
    return null;
  } catch (error) {
    console.error("Error al decodificar el token:", error);
    return null;
  }
};
