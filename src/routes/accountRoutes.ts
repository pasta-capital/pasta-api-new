import { Router } from "express";
import {
  createAccount,
  deleteAccount,
  getAccount,
  getAccounts,
  getBanks,
  updateAccount,
  getAccountUnmasked,
} from "../controllers/accountController";
import { verifyToken, authorizeRoles } from "../middlewares/authJwt";

const routes = Router();

/**
 * @swagger
 * tags:
 *   name: Accounts
 *   description: Cuentas bancarias del usuario
 */

/**
 * @swagger
 * /accounts/banks:
 *   get:
 *     tags: [Accounts]
 *     summary: Listar bancos disponibles
 *     description: Obtiene el listado de bancos para asociar cuentas
 *     responses:
 *       200:
 *         description: Lista de bancos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       code:
 *                         type: string
 *                       name:
 *                         type: string
 */
routes.route("/banks").get(getBanks);

routes.use(verifyToken, authorizeRoles("user"));

/**
 * @swagger
 * /accounts/create:
 *   post:
 *     tags: [Accounts]
 *     summary: Crear cuenta
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type, number, bank]
 *             properties:
 *               type:
 *                 type: string
 *               number:
 *                 type: string
 *               bankCode:
 *                 type: string
 *     responses:
 *       201:
 *         description: Cuenta creada
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 */
routes.post("/create", createAccount);

/**
 * @swagger
 * /accounts:
 *   get:
 *     tags: [Accounts]
 *     summary: Listar cuentas del usuario
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cuentas obtenidas correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *       401:
 *         description: No autorizado
 */
routes.get("/", getAccounts);

/**
 * @swagger
 * /accounts/{id}:
 *   get:
 *     tags: [Accounts]
 *     summary: Obtener cuenta por ID
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
 *         description: Cuenta obtenida
 *       404:
 *         description: Cuenta no encontrada
 *       401:
 *         description: No autorizado
 *   put:
 *     tags: [Accounts]
 *     summary: Actualizar cuenta
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
 *             properties:
 *               type:
 *                 type: string
 *               number:
 *                 type: string
 *               bankCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cuenta actualizada
 *       404:
 *         description: Cuenta no encontrada
 *       401:
 *         description: No autorizado
 *   delete:
 *     tags: [Accounts]
 *     summary: Eliminar cuenta
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
 *         description: Cuenta eliminada
 *       404:
 *         description: Cuenta no encontrada
 *       401:
 *         description: No autorizado
 */
routes.route("/:id").get(getAccount).put(updateAccount).delete(deleteAccount);

/**
 * @swagger
 * /accounts/{id}/unmasked:
 *   get:
 *     tags: [Accounts]
 *     summary: Obtener cuenta sin enmascarar (número completo)
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
 *         description: Cuenta con número completo
 *       404:
 *         description: Cuenta no encontrada
 *       401:
 *         description: No autorizado
 */
routes.route("/:id/unmasked").get(getAccountUnmasked);

export default routes;
