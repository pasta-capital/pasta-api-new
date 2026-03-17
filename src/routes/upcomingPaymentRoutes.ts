import express from "express";
import { triggerUpcomingNotifications } from "../controllers/upcomingPaymentController";
import { verifyToken, authorizeModules } from "../middlewares/authJwt";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: UpcomingPayments
 *   description: Pagos próximos y notificaciones
 */

router.use(verifyToken);
router.use(authorizeModules("operations"));

/**
 * @swagger
 * /upcoming-payments/check-and-notify:
 *   post:
 *     tags: [UpcomingPayments]
 *     summary: Verificar y notificar pagos próximos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Verificación y notificaciones procesadas
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos operations
 */
router.post("/check-and-notify", triggerUpcomingNotifications);

export default router;
