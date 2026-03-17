import express from "express";
import { verifyToken, authorizeModules } from "../middlewares/authJwt";
import {
  createCampaign,
  listCampaigns,
  sendCampaignNow,
  listDeliveries,
  getMyNotifications,
  markMyAsRead,
  cancelCampaign,
  getCampaignReadCount,
  getUpcomingPaymentNotificationDaysHandler,
  replaceUpcomingPaymentNotificationDaysHandler,
  addUpcomingPaymentNotificationDayHandler,
  removeUpcomingPaymentNotificationDayHandler,
} from "../controllers/notificationV2Controller";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: NotificationsV2
 *   description: Campaigns and user inbox
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Campaign:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         audience:
 *           type: string
 *           enum: [USER, ADMIN]
 *         type:
 *           type: string
 *           enum: [MOBILE, EMAIL, INTERNAL, SMS]
 *         infoType:
 *           type: string
 *           enum: [NEUTRAL, SUCCESS, WARNING, ERROR, BAN]
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         imageUrl:
 *           type: string
 *           nullable: true
 *         link:
 *           type: string
 *           nullable: true
 *         users:
 *           type: array
 *           items:
 *             type: string
 *         group:
 *           type: string
 *           nullable: true
 *         sendAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [draft, scheduled, processing, sent, failed, cancelled]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateCampaignRequest:
 *       type: object
 *       required: [type, title, description]
 *       properties:
 *         audience:
 *           type: string
 *           enum: [USER, ADMIN]
 *           default: USER
 *         type:
 *           type: string
 *           enum: [MOBILE, EMAIL, INTERNAL, SMS]
 *         infoType:
 *           type: string
 *           enum: [NEUTRAL, SUCCESS, WARNING, ERROR, BAN]
 *           default: NEUTRAL
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         imageUrl:
 *           type: string
 *         link:
 *           type: string
 *         users:
 *           type: array
 *           items:
 *             type: string
 *         group:
 *           type: string
 *         sendAt:
 *           type: string
 *           format: date-time
 *       example:
 *         type: EMAIL
 *         title: "Hola {{name}}"
 *         description: "Tu documento: {{document}}"
 *         imageUrl: "https://cdn.example.com/image.jpg"
 *         link: "https://example.com/action"
 *         users: ["665e3e2f2a9bd8c4b2c11111"]
 *         group: "665e3e2f2a9bd8c4b2c99999"
 *         sendAt: "2025-09-25T17:00:00-04:00"
 *     Delivery:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         campaignId:
 *           type: string
 *         recipientType:
 *           type: string
 *           enum: [USER, ADMIN]
 *         type:
 *           type: string
 *           enum: [MOBILE, EMAIL, INTERNAL, SMS]
 *         infoType:
 *           type: string
 *           enum: [NEUTRAL, SUCCESS, WARNING, ERROR, BAN]
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         imageUrl:
 *           type: string
 *           nullable: true
 *         link:
 *           type: string
 *           nullable: true
 *         userId:
 *           type: string
 *           nullable: true
 *         adminId:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [queued, sent, failed, read]
 *         readAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         recipient:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             lastname:
 *               type: string
 *             email:
 *               type: string
 *             document:
 *               type: string
 *       example:
 *         _id: "665e3e2f2a9bd8c4b2caaaaa"
 *         campaignId: "665e3e2f2a9bd8c4b2cbbbb"
 *         type: EMAIL
 *         title: "Hola Juan"
 *         description: "Tu documento: V12345678"
 *         link: "https://example.com/action"
 *         userId: "665e3e2f2a9bd8c4b2c11111"
 *         status: "sent"
 *         createdAt: "2025-09-25T16:10:00.000Z"
 *         updatedAt: "2025-09-25T16:10:02.000Z"
 *     MarkAsReadRequest:
 *       type: object
 *       required: [ids]
 *       properties:
 *         ids:
 *           type: array
 *           items:
 *             type: string
 */

router.use(verifyToken);

/**
 * @swagger
 * /notifications-v2/me:
 *   get:
 *     tags: [NotificationsV2]
 *     summary: List logged-in user's notifications
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [queued, sent, failed, read]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: infoType
 *         schema:
 *           type: string
 *           enum: [NEUTRAL, SUCCESS, WARNING, ERROR, BAN]
 *     responses:
 *       200:
 *         description: Notifications retrieved
 *       401:
 *         description: Unauthorized
 */
router.route("/me").get(getMyNotifications);
/**
 * @swagger
 * /notifications-v2/me/mark-as-read:
 *   post:
 *     tags: [NotificationsV2]
 *     summary: Mark user's notifications as read by ids
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAsReadRequest'
 *     responses:
 *       200:
 *         description: Notifications marked as read
 */
router.route("/me/mark-as-read").post(markMyAsRead);

// Admin/manager endpoints
router.use(authorizeModules("notifications"));
/**
 * @swagger
 * /notifications-v2:
 *   post:
 *     tags: [NotificationsV2]
 *     summary: Create a campaign
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCampaignRequest'
 *     responses:
 *       201:
 *         description: Campaign created
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   get:
 *     tags: [NotificationsV2]
 *     summary: List campaigns
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, scheduled, processing, sent, failed, cancelled]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Campaigns retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.route("/").post(createCampaign).get(listCampaigns);
/**
 * @swagger
 * /notifications-v2/{id}/send:
 *   post:
 *     tags: [NotificationsV2]
 *     summary: Force send a campaign immediately
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
 *         description: Campaign processed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.route("/:id/send").post(sendCampaignNow);
/**
 * @swagger
 * /notifications-v2/{id}/read-count:
 *   get:
 *     tags: [NotificationsV2]
 *     summary: Get read notifications count for a campaign
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
 *         description: Read count retrieved
 *       400:
 *         description: Invalid id
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.route("/:id/read-count").get(getCampaignReadCount);
/**
 * @swagger
 * /notifications-v2/{id}/cancel:
 *   post:
 *     tags: [NotificationsV2]
 *     summary: Cancel a scheduled or draft campaign
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
 *         description: Campaign cancelled
 *       400:
 *         description: Invalid status transition
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.route("/:id/cancel").post(cancelCampaign);
/**
 * @swagger
 * /notifications-v2/deliveries:
 *   get:
 *     tags: [NotificationsV2]
 *     summary: List deliveries across campaigns
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: campaignId
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [queued, sent, failed, read]
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: infoType
 *         schema:
 *           type: string
 *           enum: [NEUTRAL, SUCCESS, WARNING, ERROR, BAN]
 *     responses:
 *       200:
 *         description: Deliveries retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.route("/deliveries").get(listDeliveries);

/**
 * @swagger
 * /notifications-v2/settings/upcoming-payment-days:
 *   get:
 *     tags: [NotificationsV2]
 *     summary: Get configured days for upcoming payment notifications
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification days retrieved
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   put:
 *     tags: [NotificationsV2]
 *     summary: Replace the entire list of notification days
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [days]
 *             properties:
 *               days:
 *                 type: array
 *                 items:
 *                   type: integer
 *                   minimum: 0
 *                 minItems: 1
 *           example:
 *             days: [7, 3, 1, 0]
 *     responses:
 *       200:
 *         description: Notification days updated
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   post:
 *     tags: [NotificationsV2]
 *     summary: Add a new day to the notification days list
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [day]
 *             properties:
 *               day:
 *                 type: integer
 *                 minimum: 0
 *           example:
 *             day: 14
 *     responses:
 *       200:
 *         description: Notification day added
 *       400:
 *         description: Invalid payload or day already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router
  .route("/settings/upcoming-payment-days")
  .get(getUpcomingPaymentNotificationDaysHandler)
  .put(replaceUpcomingPaymentNotificationDaysHandler)
  .post(addUpcomingPaymentNotificationDayHandler);

/**
 * @swagger
 * /notifications-v2/settings/upcoming-payment-days/{day}:
 *   delete:
 *     tags: [NotificationsV2]
 *     summary: Remove a day from the notification days list
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: day
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 0
 *         example: 7
 *     responses:
 *       200:
 *         description: Notification day removed
 *       400:
 *         description: Invalid day or cannot remove last day
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router
  .route("/settings/upcoming-payment-days/:day")
  .delete(removeUpcomingPaymentNotificationDayHandler);

export default router;
