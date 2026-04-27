import { Router } from "express";
import {
  confirmOperation,
  requestOperation,
  getCompletedOperations,
  getActiveOperations,
  getOperationDetails,
  getOperationPaymentsWithTotal,
  // getAccountChargeLink, // Banesco - ya no integrado
  payDebt,
  payDebtConfirmation,
  checkLatePayments,
  getAllOperations,
  getOperationDetailsById,
  getOperationPayments,
  getAllPayments,
  getPaymentDetailsById,
  requestSypagoOtp,
  getInstallmentSimulation,
  getTreasuryData,
  getMovements,
  getTasaFinanciera,
} from "../controllers/operationController";
import { authorizeModules, verifyToken } from "../middlewares/authJwt";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Operations
 *   description: Operaciones de crédito, pagos y consultas
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     RequestOperationBody:
 *       type: object
 *       required: [currency, amount, feeCount, account]
 *       properties:
 *         currency:
 *           type: string
 *           enum: [USD, VEF]
 *         amount:
 *           type: number
 *         feeCount:
 *           type: integer
 *         isThirdParty:
 *           type: boolean
 *           optional: true
 *         account:
 *           type: string
 *         beneficiary:
 *           type: object
 *           properties:
 *             identificationType:
 *               type: string
 *             identificationNumber:
 *               type: string
 *             phone:
 *               type: string
 *             bankCode:
 *               type: string
 *     PayDebtBody:
 *       type: object
 *       required: [payments]
 *       properties:
 *         payments:
 *           type: array
 *           items:
 *             type: string
 *     PayDebtConfirmationBody:
 *       type: object
 *       required: [id, paymentType]
 *       properties:
 *         id:
 *           type: string
 *         paymentType:
 *           type: string
 *           enum: [mobile, transfer, debit]
 *         phone:
 *           type: string
 *         date:
 *           type: string
 *           format: date-time
 *         reference:
 *           type: string
 *         bankCode:
 *           type: string
 *         otp:
 *           type: string
 *         device:
 *           type: object
 *           properties:
 *             type:
 *               type: string
 *             description:
 *               type: string
 *             ipAddress:
 *               type: string
 *     RequestOtpBody:
 *       type: object
 *       required: [id, phone, bankCode, identificationType, identificationNumber]
 *       properties:
 *         id:
 *           type: string
 *         phone:
 *           type: string
 *         bankCode:
 *           type: string
 *         identificationType:
 *           type: string
 *           enum: [V, E, J, P]
 *         identificationNumber:
 *           type: string
 *           minLength: 5
 *           maxLength: 15
 */

/**
 * @swagger
 * /operation/check-late-payments:
 *   post:
 *     tags: [Operations]
 *     summary: Verificar pagos vencidos
 *     description: Endpoint para verificar y actualizar pagos vencidos
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Pagos vencidos actualizados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *       400:
 *         description: Error en la solicitud
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

router.post("/check-late-payments", checkLatePayments);

/**
 * @swagger
 * /operation/simulate:
 *   get:
 *     tags: [Operations]
 *     summary: Simular cuotas de crédito
 *     description: Obtiene la simulación de cuotas según monto y número de cuotas
 *     parameters:
 *       - in: query
 *         name: amountUsd
 *         schema:
 *           type: number
 *         required: true
 *       - in: query
 *         name: feeCount
 *         schema:
 *           type: integer
 *         required: true
 *     responses:
 *       200:
 *         description: Simulación obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-03-20T04:00:00.000Z"
 *                       amountUsd:
 *                         type: number
 *                         example: 19.17
 *                 message:
 *                   type: string
 *                   example: "Plan de cuotas simulado"
 *       400:
 *         description: Parámetros requeridos faltantes
 */
router.get("/simulate", getInstallmentSimulation);

/**
 * @swagger
 * /operation/annual-interest-rate:
 *   get:
 *     tags: [Operations]
 *     summary: Obtener tasa de interés anual
 *     description: Devuelve la tasa financiera anual configurada
 *     responses:
 *       200:
 *         description: Tasa obtenida correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: number
 *       404:
 *         description: Tasa no encontrada
 *       500:
 *         description: Error al obtener la tasa
 */
router.get("/annual-interest-rate", getTasaFinanciera);

router.use(verifyToken);

/**
 * @swagger
 * /operation/completed:
 *   get:
 *     tags: [Operations]
 *     summary: Listar operaciones completadas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operaciones finalizadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Operaciones finalizadas"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "69810a5ab2c46a1ae1434635"
 *                       reference:
 *                         type: string
 *                         example: "02939145"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-02-02T20:34:34.435Z"
 *                       amount:
 *                         type: number
 *                         example: 1
 *                       status:
 *                         type: string
 *                         example: "completed"
 *                       statusName:
 *                         type: string
 *                         example: "Finalizado"
 *                       iconUrl:
 *                         type: string
 *                         example: "https://apipasta.legendsoft.com/public/icons/fusilli-white.png"
 *       401:
 *         description: No autorizado
 */
router.get("/completed", getCompletedOperations);

/**
 * @swagger
 * /operation/active:
 *   get:
 *     tags: [Operations]
 *     summary: Listar operaciones activas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operaciones activas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Operaciones activas"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "6985e71e419b87de4f61db64"
 *                       reference:
 *                         type: string
 *                         example: "22131598"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-02-06T13:05:34.329Z"
 *                       amount:
 *                         type: number
 *                         example: 1
 *                       status:
 *                         type: string
 *                         example: "approved"
 *                       iconUrl:
 *                         type: string
 *                         example: "https://apipasta.legendsoft.com/public/icons/sticks-white.png"
 *                       statusName:
 *                         type: string
 *                         example: "Aprobado"
 *                 totalCount:
 *                   type: number
 *                   example: 1
 *       401:
 *         description: No autorizado
 */
router.get("/active", getActiveOperations);

/**
 * @swagger
 * /operation/request:
 *   post:
 *     tags: [Operations]
 *     summary: Solicitar operación de crédito
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RequestOperationBody'
 *     responses:
 *       201:
 *         description: Operación creada exitosamente
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
 *                   type: object
 *       400:
 *         description: Error de validación o requisitos no cumplidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 code:
 *                   type: string
 *       401:
 *         description: No autorizado
 */
router.post("/request-v2", requestOperation);

/**
 * @swagger
 * /operation/confirm:
 *   post:
 *     tags: [Operations]
 *     summary: Confirmar operación
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [operationId]
 *             properties:
 *               operationId:
 *                 type: string
 *                 example: "6941b9cf429b137e4d5795bb"
 *               comment:
 *                 type: string
 *                 example: "comentario"
 *               deviceType:
 *                 type: string
 *                 example: "Celular"
 *               deviceDescription:
 *                 type: string
 *                 example: "Samsung Galaxy S22"
 *               ipAddress:
 *                 type: string
 *                 example: "0.0.0.1"
 *     responses:
 *       200:
 *         description: Operación confirmada
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 */
router.post("/confirm-v2", confirmOperation);

/**
 * @swagger
 * /operation/details/{operationId}:
 *   get:
 *     tags: [Operations]
 *     summary: Detalles de una operación
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalles de la operación
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Detalles de la operación"
 *                 data:
 *                   type: object
 *                   properties:
 *                     reference:
 *                       type: string
 *                       example: "02939145"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-02-02T20:34:34.435Z"
 *                     amountUsd:
 *                       type: number
 *                       example: 1
 *                     amountVef:
 *                       type: number
 *                       example: 369.14
 *                     rate:
 *                       type: number
 *                       example: 370.25
 *                     feeCount:
 *                       type: number
 *                       example: 6
 *                     account:
 *                       type: string
 *                       example: "Bancamiga Banco Universal, C.A. 0608"
 *                     paymentPlan:
 *                       type: array
 *                       items: {}
 *       400:
 *         description: operationId requerido
 *       404:
 *         description: Operación no encontrada
 *       401:
 *         description: No autorizado
 */
router.get("/details/:operationId", getOperationDetails);

/**
 * @swagger
 * /operation/payments:
 *   get:
 *     tags: [Operations]
 *     summary: Listar deudas del usuario y total pendiente
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Listado de deudas y total pendiente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Listado de deudas del usuario y total pendiente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     operationPayments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "0126C21003721"
 *                           date:
 *                             type: string
 *                             format: date-time
 *                             example: "2026-03-08T04:00:00.000Z"
 *                           status:
 *                             type: string
 *                             example: "pending"
 *                           statusName:
 *                             type: string
 *                             example: "Pendiente"
 *                           amountUsd:
 *                             type: number
 *                             example: 0.19
 *                           iconUrl:
 *                             type: string
 *                             example: "https://apipasta.legendsoft.com/public/icons/sticks-white.png"
 *                           operationReference:
 *                             type: string
 *                             example: "22131598"
 *                           points:
 *                             type: number
 *                             example: 0.19
 *       401:
 *         description: No autorizado
 */
router.get("/payments", getOperationPaymentsWithTotal);

/**
 * @swagger
 * /operation/movements:
 *   get:
 *     tags: [Operations]
 *     summary: Obtener movimientos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Movimientos obtenidos correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Movimientos obtenidos correctamente"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2026-02-06T20:10:25.198Z"
 *                       id:
 *                         type: string
 *                         example: "69864ab103d5a2078dc4a857"
 *                       amountUsd:
 *                         type: number
 *                         example: 0.57
 *                       amountVef:
 *                         type: number
 *                         example: 217.23
 *                       amountVefBase:
 *                         type: number
 *                         example: 217.23
 *                       commission:
 *                         type: number
 *                         example: 0
 *                       reference:
 *                         type: string
 *                         example: "16872724"
 *                       movementType:
 *                         type: string
 *                         example: "payment"
 *                       description:
 *                         type: string
 *                         example: "Pago"
 *                       iconUrl:
 *                         type: string
 *                         nullable: true
 *                         example: null
 *                       status:
 *                         type: string
 *                         example: "received"
 *       401:
 *         description: No autorizado
 */
router.get("/movements", getMovements);

/**
 * @swagger
 * /operation/pay-debt:
 *   post:
 *     tags: [Operations]
 *     summary: Registrar pago de deuda
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PayDebtBody'
 *     responses:
 *       200:
 *         description: Operación creada en espera de confirmación
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
 *                   type: object
 *       400:
 *         description: Error de validación o cuota no encontrada
 *       404:
 *         description: Operaciones no encontradas
 *       401:
 *         description: No autorizado
 */
router.post("/pay-debt", payDebt);

/**
 * @swagger
 * /operation/pay-debt-confirmation:
 *   post:
 *     tags: [Operations]
 *     summary: Confirmar pago de deuda
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PayDebtConfirmationBody'
 *     responses:
 *       200:
 *         description: Operación confirmada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Error de validación o pago
 *       404:
 *         description: Operación no encontrada
 *       401:
 *         description: No autorizado
 */
router.post("/pay-debt-confirmation", payDebtConfirmation);

/**
 * @swagger
 * /operation/request-otp:
 *   post:
 *     tags: [Operations]
 *     summary: Solicitar código OTP
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RequestOtpBody'
 *     responses:
 *       200:
 *         description: Código OTP enviado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Error al generar OTP
 *       404:
 *         description: Operación no encontrada
 *       401:
 *         description: No autorizado
 */
router.post("/request-otp", requestSypagoOtp);
// router.get("/account-charge-link", getAccountChargeLink); // Banesco - ya no integrado

router.use(authorizeModules("operations"));

/**
 * @swagger
 * /operation/all:
 *   get:
 *     tags: [Operations]
 *     summary: Listar todas las operaciones (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Operaciones obtenidas correctamente
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
 *       403:
 *         description: Sin permisos de módulo operations
 */
router.get("/all", getAllOperations);

/**
 * @swagger
 * /operation/get/{operationId}:
 *   get:
 *     tags: [Operations]
 *     summary: Obtener detalle de operación por ID (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: operationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalles de la operación
 *       404:
 *         description: Operación o usuario no encontrado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
router.get("/get/:operationId", getOperationDetailsById);

/**
 * @swagger
 * /operation/all-payments:
 *   get:
 *     tags: [Operations]
 *     summary: Listar pagos de operaciones (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pagos obtenidos correctamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
router.get("/all-payments", getOperationPayments);

/**
 * @swagger
 * /operation/payments-list:
 *   get:
 *     tags: [Operations]
 *     summary: Listar todos los pagos (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pagos obtenida correctamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
router.get("/payments-list", getAllPayments);

/**
 * @swagger
 * /operation/payment/{paymentId}:
 *   get:
 *     tags: [Operations]
 *     summary: Obtener detalle de un pago (admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalle del pago obtenido correctamente
 *       404:
 *         description: Pago no encontrado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
router.get("/payment/:paymentId", getPaymentDetailsById);

/**
 * @swagger
 * /operation/treasury:
 *   get:
 *     tags: [Operations]
 *     summary: Obtener datos de tesorería (admin)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos de tesorería obtenidos correctamente
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
 *                   type: object
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
router.get("/treasury", getTreasuryData);

export default router;
