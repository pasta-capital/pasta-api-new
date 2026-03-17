import express from "express";
import {
  getCreditScore,
  updateCreditScore,
} from "../controllers/creditScoreController";
import {
  authorizeModules,
  authorizeRoles,
  verifyToken,
} from "../middlewares/authJwt";

const routes = express.Router();

/**
 * @swagger
 * tags:
 *   name: CreditScore
 *   description: Puntuación de crédito
 */

routes.use(verifyToken, authorizeModules("credit-score"));

/**
 * @swagger
 * /credit-score:
 *   get:
 *     tags: [CreditScore]
 *     summary: Obtener puntuación de crédito
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Puntuación obtenida
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 *   put:
 *     tags: [CreditScore]
 *     summary: Actualizar puntuación de crédito
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Puntuación actualizada
 */
routes.route("/").get(getCreditScore).put(updateCreditScore);

export default routes;
