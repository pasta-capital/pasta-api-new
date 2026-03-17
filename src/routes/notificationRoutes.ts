import express from "express";
import {
  deleteNotifications,
  getNotificationCounter,
  getNotifications,
  markAsRead,
  markAsUnRead,
  editConfiguration,
  getConfiguration,
} from "../controllers/notificationController";
import { verifyToken } from "../middlewares/authJwt";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notificaciones v1 (legacy)
 */

router.use(verifyToken);

/**
 * @swagger
 * /notifications/counter:
 *   get:
 *     tags: [Notifications]
 *     summary: Obtener contador de notificaciones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contador obtenido
 *       401:
 *         description: No autorizado
 */
router.get("/counter", getNotificationCounter);

/**
 * @swagger
 * /notifications/{page}/{size}:
 *   get:
 *     tags: [Notifications]
 *     summary: Listar notificaciones paginadas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: page
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: size
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de notificaciones
 *       401:
 *         description: No autorizado
 */
router.get("/:page/:size", getNotifications);

/**
 * @swagger
 * /notifications/mark-as-read:
 *   post:
 *     tags: [Notifications]
 *     summary: Marcar notificaciones como leídas
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Marcadas como leídas
 */
router.post("/mark-as-read", markAsRead);

/**
 * @swagger
 * /notifications/mark-as-unread:
 *   post:
 *     tags: [Notifications]
 *     summary: Marcar notificaciones como no leídas
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Marcadas como no leídas
 */
router.post("/mark-as-unread", markAsUnRead);

/**
 * @swagger
 * /notifications/delete:
 *   post:
 *     tags: [Notifications]
 *     summary: Eliminar notificaciones
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Notificaciones eliminadas
 */
router.post("/delete", deleteNotifications);

/**
 * @swagger
 * /notifications/configuration:
 *   get:
 *     tags: [Notifications]
 *     summary: Obtener configuración de notificaciones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración obtenida
 *   patch:
 *     tags: [Notifications]
 *     summary: Editar configuración de notificaciones
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Configuración actualizada
 */
router.route("/configuration").get(getConfiguration).patch(editConfiguration);

export default router;
