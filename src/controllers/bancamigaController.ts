import { Request, Response } from "express";
import * as loggers from "../common/logger";
import {
  webhookHandler,
  BancamigaWebhookBody,
  refreshToken,
} from "../services/bancamigaService";

export const sypagoWebhook = async (req: Request, res: Response) => {
  try {
    loggers.bancamiga(`Sypago Webhook recibido: ${JSON.stringify(req.body)}`);

    // El cobro de membresía (PASTAMEMBRESIA) se procesa en el flujo de registro
    // una vez verificada la pre-suscripción: InsertOperation y SubscriptionPayment
    // se crean en userController.register.

    return res.status(200).json({
      Code: 200,
      message: "Webhook procesado correctamente",
    });
  } catch (error) {
    loggers.bancamiga(
      `Error en sypagoWebhook controller: ${JSON.stringify(error)}`,
    );
    return res.status(500).json({
      Code: 500,
      message: "Error al procesar el webhook",
    });
  }
};

export const webHook = async (req: Request, res: Response) => {
  try {
    const body = req.body as BancamigaWebhookBody;

    // Validar que Refpk esté presente
    if (!body.Refpk) {
      return res.status(400).json({
        Code: 400,
        message: "Refpk es requerido",
      });
    }

    const result = await webhookHandler(body);

    return res.status(200).json(result);
  } catch (error) {
    loggers.bancamiga(`Error en webhook controller: ${JSON.stringify(error)}`);
    return res.status(500).json({
      Code: 500,
      message: "Error al procesar el webhook",
    });
  }
};

export const refreshTokenBancamiga = async (req: Request, res: Response) => {
  try {
    const result = await refreshToken();
    return res.status(200).json(result);
  } catch (error) {
    loggers.bancamiga(
      `Error en refreshToken controller: ${JSON.stringify(error)}`,
    );
    return res.status(500).json({
      Code: 500,
      message: "Error al refrescar el token",
    });
  }
};
