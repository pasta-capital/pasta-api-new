import express from "express";
import {
  importLocations,
  getStates,
  getCountries,
  getMunicipalities,
  getParishes,
} from "../controllers/locationController";

const routes = express.Router();

/**
 * @swagger
 * tags:
 *   name: Locations
 *   description: Ubicaciones geográficas (países, estados, municipios, parroquias)
 */

/**
 * @swagger
 * /locations/countries:
 *   get:
 *     tags: [Locations]
 *     summary: Listar países
 *     responses:
 *       200:
 *         description: Lista de países
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
 *                   example: "Consulta exitosa"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Aragua de Barcelona"
 *                       code:
 *                         type: string
 *                         example: "1578"
 */
routes.route("/countries").get(getCountries);

/**
 * @swagger
 * /locations/states:
 *   get:
 *     tags: [Locations]
 *     summary: Listar estados
 *     parameters:
 *       - in: query
 *         name: country
 *         schema:
 *           type: number
 *         description: ID del país
 *     responses:
 *       200:
 *         description: Lista de estados
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
 *                   example: "Consulta exitosa"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Aragua de Barcelona"
 *                       code:
 *                         type: string
 *                         example: "1578"
 */
routes.route("/states").get(getStates);

/**
 * @swagger
 * /locations/municipalities:
 *   get:
 *     tags: [Locations]
 *     summary: Listar municipios
 *     parameters:
 *       - in: query
 *         name: state
 *         schema:
 *           type: number
 *         description: ID del estado
 *     responses:
 *       200:
 *         description: Lista de municipios
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
 *                   example: "Consulta exitosa"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Aragua de Barcelona"
 *                       code:
 *                         type: string
 *                         example: "1578"
 */
routes.route("/municipalities").get(getMunicipalities);

/**
 * @swagger
 * /locations/parishes:
 *   get:
 *     tags: [Locations]
 *     summary: Listar parroquias
 *     parameters:
 *       - in: query
 *         name: municipality
 *         schema:
 *           type: number
 *         description: ID del municipio
 *     responses:
 *       200:
 *         description: Lista de parroquias
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
 *                   example: "Consulta exitosa"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         example: "Aragua de Barcelona"
 *                       code:
 *                         type: string
 *                         example: "1578"
 */
routes.route("/parishes").get(getParishes);

export default routes;
