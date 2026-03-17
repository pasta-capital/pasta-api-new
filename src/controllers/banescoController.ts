import { Request, Response } from "express";
import {
  cargoEnCuentaLink,
  cargoEnCuentaPago,
  confirmarTransaccion,
  consultaCuenta,
} from "../services/banescoService";
import * as env from "../config/env.config";

export const accountChargeLink = async (req: Request, res: Response) => {
  try {
    const { body } = req;

    const accountChargeLink = await cargoEnCuentaLink();

    return res.status(200).json({
      success: true,
      message: "Enlace generado correctamente",
      data: accountChargeLink,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al generar el enlace de carga",
      code: "error",
      error: error,
    });
  }
};

export const accountConsult = async (req: Request, res: Response) => {
  try {
    const { body } = req;

    const accountChargeLink = await consultaCuenta(body);

    return res.status(200).json({
      success: true,
      message: "Consulta generada correctamente",
      data: accountChargeLink,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al generar la consulta",
      code: "error",
      error: error,
    });
  }
};

export const accountChargePayment = async (req: Request, res: Response) => {
  try {
    const { body } = req;

    const resp = await cargoEnCuentaPago(body);

    return res.status(resp.success ? 200 : 400).json(resp);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al confirmar el pago",
      code: "error",
      error: error,
    });
  }
};

export const transactionConfirm = async (req: Request, res: Response) => {
  try {
    const { body } = req;

    const resp = await confirmarTransaccion(body);

    return res.status(resp.success ? 200 : 400).json(resp);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error al confirmar la transacción",
      code: "error",
      error: error,
    });
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
          <img class="logo" src="${API_WEBSITE_URL}/public/img/logo_pasta.png" alt="PASTA Logo">
          <div class="message">Redirigiendo a la app de PASTA...</div>
        `;

    const htmlContent = generateHtml(successContent);
    res.status(200).send(htmlContent);
  } catch (error) {
    // Contenido para el caso de error
    const errorContent = `
          <p class="error-message">Ha ocurrido un error: ${
            error || "Error desconocido"
          }</p>
        `;

    const htmlContent = generateHtml(errorContent);

    res.status(400).json({
      success: false,
      message: "Error al generar la página de redirección.",
      data: {
        htmlContent: htmlContent,
      },
      error,
    });
  }
};
