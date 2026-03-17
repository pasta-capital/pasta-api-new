import { Router } from "express";
import {
  triggerMonthlyHistory,
  getUserHistory,
  getStats,
} from "../controllers/customerHistoryController";
import { authorizeModules, verifyToken } from "../middlewares/authJwt";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: CustomerHistory
 *   description: Historial de clientes
 */

router.use(verifyToken);
router.use(authorizeModules("dashboard"));

/**
 * @swagger
 * /customer-history/trigger:
 *   post:
 *     tags: [CustomerHistory]
 *     summary: Disparar generación de historial mensual
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Historial generado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos dashboard
 */
router.post("/trigger", triggerMonthlyHistory);

/**
 * @swagger
 * /customer-history/user/{userId}:
 *   get:
 *     tags: [CustomerHistory]
 *     summary: Obtener historial de un usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Historial del usuario
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
router.get("/user/:userId", getUserHistory);

export default router;
