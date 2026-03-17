import { Router } from "express";
import { buscar, getPerfilRiesgo } from "../controllers/agileCheckController";
import { authorizeModules, verifyToken } from "../middlewares/authJwt";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: AgileCheck
 *   description: Consulta AgileCheck y perfil de riesgo
 */

/**
 * @swagger
 * /agile-check/buscar:
 *   post:
 *     tags: [AgileCheck]
 *     summary: Buscar cliente (AgileCheck)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *     responses:
 *       200:
 *         description: Resultado de búsqueda
 */
router.post("/buscar", buscar);

/**
 * @swagger
 * /agile-check/perfil-riesgo/{userId}:
 *   get:
 *     tags: [AgileCheck]
 *     summary: Obtener perfil de riesgo del usuario
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
 *         description: Perfil de riesgo
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos clients
 */
router.get(
  "/perfil-riesgo/:userId",
  verifyToken,
  authorizeModules("clients"),
  getPerfilRiesgo,
);

export default router;
