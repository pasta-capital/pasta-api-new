import { Router } from "express";
import { getRate, getRateHistories } from "../controllers/rateController";
import { verifyToken, authorizeModules } from "../middlewares/authJwt";

const routes = Router();

/**
 * @swagger
 * tags:
 *   name: Rate
 *   description: Tasas de cambio
 */

/**
 * @swagger
 * /rate:
 *   get:
 *     tags: [Rate]
 *     summary: Obtener tasa de cambio actual
 *     responses:
 *       200:
 *         description: Tasa obtenida
 */
routes.get("/", getRate);

routes.use(verifyToken, authorizeModules("rates"));

/**
 * @swagger
 * /rate/history:
 *   get:
 *     tags: [Rate]
 *     summary: Obtener historial de tasas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial de tasas
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
routes.get("/history", getRateHistories);

export default routes;
