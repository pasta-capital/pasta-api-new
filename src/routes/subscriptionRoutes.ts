import express from "express";
import {
  chargeSubscriptions,
  createSubscriptionHandler,
  generateDomiciliationFileHandler,
  readDomiciliationFileResponse,
  subscribeUsers,
} from "../controllers/subscriptionController";
import { authorizeModules } from "../middlewares/authJwt";

const routes = express.Router();

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Suscripciones y domiciliación
 */

/**
 * @swagger
 * /subscriptions/create:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Crear suscripción
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Suscripción creada
 */
routes.route("/create").post(createSubscriptionHandler);

/**
 * @swagger
 * /subscriptions/generate-domiciliation-file:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Generar archivo de domiciliación
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Archivo generado
 */
routes
  .route("/generate-domiciliation-file")
  .post(generateDomiciliationFileHandler);

/**
 * @swagger
 * /subscriptions/read-domiciliation-file-response:
 *   get:
 *     tags: [Subscriptions]
 *     summary: Leer respuesta de archivo de domiciliación
 *     responses:
 *       200:
 *         description: Respuesta del archivo
 */
routes
  .route("/read-domiciliation-file-response")
  .get(readDomiciliationFileResponse);

/**
 * @swagger
 * /subscriptions/subscribe-users:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Suscribir usuarios
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Usuarios suscritos
 */
routes.route("/subscribe-users").post(subscribeUsers);

/**
 * @swagger
 * /subscriptions/charge-subscriptions:
 *   post:
 *     tags: [Subscriptions]
 *     summary: Cobrar suscripciones
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Cobros procesados
 */
routes.route("/charge-subscriptions").post(chargeSubscriptions);

export default routes;
