import { Router } from "express";
import { getIndicators } from "../controllers/dashboardController";
import { verifyToken, authorizeModules } from "../middlewares/authJwt";
import {
  getStats,
  getAmountStats,
  getArrearsHistoryStats,
  getPaymentDelayHistoryStats,
  getPaymentsAndLiquidationsHistoryStats,
  getRecurringClientsIndicatorStats,
  getLiquidatedAmountsIndicatorStats,
} from "../controllers/customerHistoryController";

const dashboardRoutes = Router();

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Indicadores y estadísticas del dashboard
 */

dashboardRoutes.use(verifyToken);
dashboardRoutes.use(authorizeModules("dashboard"));

/**
 * @swagger
 * /dashboard/indicators:
 *   get:
 *     tags: [Dashboard]
 *     summary: Obtener indicadores
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Indicadores obtenidos
 */
dashboardRoutes.get("/indicators", getIndicators);

/**
 * @swagger
 * /dashboard/customer-history:
 *   get:
 *     tags: [Dashboard]
 *     summary: Estadísticas de historial de clientes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas
 */
dashboardRoutes.get("/customer-history", getStats);

/**
 * @swagger
 * /dashboard/amount-history:
 *   get:
 *     tags: [Dashboard]
 *     summary: Historial de montos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial obtenido
 */
dashboardRoutes.get("/amount-history", getAmountStats);

/**
 * @swagger
 * /dashboard/arrears-history:
 *   get:
 *     tags: [Dashboard]
 *     summary: Historial de mora
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial obtenido
 */
dashboardRoutes.get("/arrears-history", getArrearsHistoryStats);

/**
 * @swagger
 * /dashboard/payment-delay-history:
 *   get:
 *     tags: [Dashboard]
 *     summary: Historial de retraso de pagos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial obtenido
 */
dashboardRoutes.get("/payment-delay-history", getPaymentDelayHistoryStats);

/**
 * @swagger
 * /dashboard/payments-liquidations-history:
 *   get:
 *     tags: [Dashboard]
 *     summary: Historial de pagos y liquidaciones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Historial obtenido
 */
dashboardRoutes.get(
  "/payments-liquidations-history",
  getPaymentsAndLiquidationsHistoryStats,
);

/**
 * @swagger
 * /dashboard/recurring-clients-indicator:
 *   get:
 *     tags: [Dashboard]
 *     summary: Indicador de clientes recurrentes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Indicador obtenido
 */
dashboardRoutes.get(
  "/recurring-clients-indicator",
  getRecurringClientsIndicatorStats,
);

/**
 * @swagger
 * /dashboard/liquidated-amounts-indicator:
 *   get:
 *     tags: [Dashboard]
 *     summary: Indicador de montos liquidados
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Indicador obtenido
 */
dashboardRoutes.get(
  "/liquidated-amounts-indicator",
  getLiquidatedAmountsIndicatorStats,
);

export default dashboardRoutes;
