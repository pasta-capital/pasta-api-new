import express from "express";
import { triggerOverdueNotifications } from "../controllers/overduePaymentController";
import { verifyToken, authorizeModules } from "../middlewares/authJwt";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: OverduePayments
 *   description: Pagos vencidos y notificaciones
 */

router.use(verifyToken);
router.use(authorizeModules("operations"));

/**
 * @swagger
 * /overdue-payments/check-and-notify:
 *   post:
 *     tags: [OverduePayments]
 *     summary: Verificar y notificar pagos vencidos
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
router.post("/check-and-notify", triggerOverdueNotifications);

export default router;
