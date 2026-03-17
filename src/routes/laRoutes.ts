import express from "express";
import {
  getLaModelByType,
  getLaModelByCode,
  getLaModelTypes,
  getOcupaciones,
  getSituacionesLaborales,
  getNiveles,
  getTiposCuentas,
  getCiudades,
  getEstados,
  getCodigosPostales,
  getOcupacionByCode,
  getSituacionLaboralByCode,
  getNivelByCode,
  getTipoCuentaByCode,
  getCiudadByCode,
  getEstadoByCode,
  getCodigoPostalByCode,
  updateLaModels,
  clientUpdate,
} from "../controllers/laController";
import {
  authorizeModules,
  authorizeRoles,
  verifyToken,
} from "../middlewares/authJwt";

const routes = express.Router();

/**
 * @swagger
 * tags:
 *   name: LA
 *   description: Modelos LA (ocupaciones, niveles, ciudades, etc.)
 */

/**
 * @swagger
 * /la/types:
 *   get:
 *     tags: [LA]
 *     summary: Listar tipos disponibles
 *     responses:
 *       200:
 *         description: Lista de tipos
 */
routes.route("/types").get(getLaModelTypes);

/**
 * @swagger
 * /la/types/{type}:
 *   get:
 *     tags: [LA]
 *     summary: Obtener elementos por tipo
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Elementos del tipo
 */
routes.route("/types/:type").get(getLaModelByType);

/**
 * @swagger
 * /la/types/{type}/code/{code}:
 *   get:
 *     tags: [LA]
 *     summary: Obtener elemento por tipo y código
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Elemento obtenido
 */
routes.route("/types/:type/code/:code").get(getLaModelByCode);

routes.route("/occupations").get(getOcupaciones);
routes.route("/labor-situations").get(getSituacionesLaborales);
routes.route("/educational-levels").get(getNiveles);
routes.route("/account-types").get(getTiposCuentas);
routes.route("/cities").get(getCiudades);
routes.route("/states").get(getEstados);
routes.route("/postal-codes").get(getCodigosPostales);

routes.route("/occupations/:code").get(getOcupacionByCode);
routes.route("/labor-situations/:code").get(getSituacionLaboralByCode);
routes.route("/educational-levels/:code").get(getNivelByCode);
routes.route("/account-types/:code").get(getTipoCuentaByCode);
routes.route("/cities/:code").get(getCiudadByCode);
routes.route("/states/:code").get(getEstadoByCode);
routes.route("/postal-codes/:code").get(getCodigoPostalByCode);

/**
 * @swagger
 * /la/update:
 *   post:
 *     tags: [LA]
 *     summary: Actualizar modelos LA
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Modelos actualizados
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos la-db
 */
routes
  .route("/update")
  .post(verifyToken, authorizeModules("la-db"), updateLaModels);

/**
 * @swagger
 * /la/client-update:
 *   post:
 *     tags: [LA]
 *     summary: Actualizar datos de clientes
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Datos actualizados
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos la-db
 */
routes
  .route("/client-update")
  .post(verifyToken, authorizeModules("la-db"), clientUpdate);

export default routes;
