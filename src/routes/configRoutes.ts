import express from "express";
import { authorizeModules, verifyToken } from "../middlewares/authJwt";
import { addConfig } from "../controllers/configController";

const routes = express.Router();

/**
 * @swagger
 * tags:
 *   name: Config
 *   description: Configuración del sistema
 */

routes.use(verifyToken);
routes.use(authorizeModules("config"));

/**
 * @swagger
 * /config:
 *   post:
 *     tags: [Config]
 *     summary: Agregar o actualizar configuración
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               key:
 *                 type: string
 *               value:
 *                 description: Valor de configuración
 *     responses:
 *       200:
 *         description: Configuración guardada
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
routes.route("/").post(addConfig);

export default routes;
