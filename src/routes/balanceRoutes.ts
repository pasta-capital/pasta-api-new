import { Router } from "express";
import {
  getBalanceList,
  getBalanceTotalsInWeek,
} from "../controllers/balanceController";
import { authorizeModules, verifyToken } from "../middlewares/authJwt";

const balanceRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Balance
 *   description: Balance y totales
 */

balanceRoutes.use(verifyToken);
balanceRoutes.use(authorizeModules("balance"));

/**
 * @swagger
 * /balance:
 *   get:
 *     tags: [Balance]
 *     summary: Listar balance
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de balance
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
balanceRoutes.get("/", getBalanceList);

/**
 * @swagger
 * /balance/totals:
 *   get:
 *     tags: [Balance]
 *     summary: Obtener totales de la semana
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Totales obtenidos
 */
balanceRoutes.get("/totals", getBalanceTotalsInWeek);

export default balanceRoutes;
