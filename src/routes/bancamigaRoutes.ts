import { Router } from "express";
import {
  webHook,
  sypagoWebhook,
  refreshTokenBancamiga,
} from "../controllers/bancamigaController";
import { authorizeModules, verifyToken } from "../middlewares/authJwt";
import { validateBancamigaWebhook } from "../middlewares/webhookValidator";

const bancamigaRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Bancamiga
 *   description: Integración Bancamiga y Sypago
 */

/**
 * @swagger
 * /bancamiga/sypago-webhook:
 *   post:
 *     tags: [Bancamiga]
 *     summary: Webhook Sypago
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook procesado
 */
bancamigaRouter.post(
  "/sypago-webhook",
  sypagoWebhook,
);

/**
 * @swagger
 * /bancamiga/refresh-token:
 *   post:
 *     tags: [Bancamiga]
 *     summary: Refrescar token Bancamiga
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Token actualizado
 */
bancamigaRouter.post("/refresh-token", refreshTokenBancamiga);

bancamigaRouter.use(verifyToken, authorizeModules("webhook"));

/**
 * @swagger
 * /bancamiga/webhook:
 *   post:
 *     tags: [Bancamiga]
 *     summary: Webhook Bancamiga
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook procesado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
bancamigaRouter.post("/webhook", webHook);

export default bancamigaRouter;
