import express from "express";
import {
  getModules,
  getRoles,
  createRole,
  getRole,
  editRole,
  deleteRole,
} from "../controllers/roleController";
import { verifyToken, authorizeModules } from "../middlewares/authJwt";

const routes = express.Router();

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Roles y permisos
 */

routes.use(verifyToken, authorizeModules("roles"));

/**
 * @swagger
 * /roles/modules:
 *   get:
 *     tags: [Roles]
 *     summary: Listar módulos disponibles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de módulos
 */
routes.route("/modules").get(getModules);

/**
 * @swagger
 * /roles:
 *   get:
 *     tags: [Roles]
 *     summary: Listar roles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de roles
 *   post:
 *     tags: [Roles]
 *     summary: Crear rol
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Rol creado
 */
routes.route("/").get(getRoles).post(createRole);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     tags: [Roles]
 *     summary: Obtener rol por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rol obtenido
 *   put:
 *     tags: [Roles]
 *     summary: Actualizar rol
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Rol actualizado
 *   delete:
 *     tags: [Roles]
 *     summary: Eliminar rol
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rol eliminado
 */
routes.route("/:id").get(getRole).put(editRole).delete(deleteRole);

export default routes;
