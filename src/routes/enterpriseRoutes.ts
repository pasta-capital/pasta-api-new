import { Router } from "express";
import {
  getEnterprises,
  getEnterpriseById,
  createEnterprise,
  updateEnterprise,
  deleteEnterprise,
  uploadEmployeePayroll,
} from "../controllers/enterpriseController";
import { verifyToken, authorizeModules } from "../middlewares/authJwt";

const routes = Router();

/**
 * @swagger
 * tags:
 *   name: Enterprise
 *   description: Empresas y nómina
 */

routes.use(verifyToken, authorizeModules("enterprise"));

/**
 * @swagger
 * /enterprise:
 *   get:
 *     tags: [Enterprise]
 *     summary: Listar empresas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de empresas
 *   post:
 *     tags: [Enterprise]
 *     summary: Crear empresa
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Empresa creada
 */
routes.route("/").get(getEnterprises).post(createEnterprise);

/**
 * @swagger
 * /enterprise/{id}:
 *   get:
 *     tags: [Enterprise]
 *     summary: Obtener empresa por ID
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
 *         description: Empresa obtenida
 *   put:
 *     tags: [Enterprise]
 *     summary: Actualizar empresa
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
 *     responses:
 *       200:
 *         description: Empresa actualizada
 *   delete:
 *     tags: [Enterprise]
 *     summary: Eliminar empresa
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
 *         description: Empresa eliminada
 */
routes
  .route("/:id")
  .get(getEnterpriseById)
  .put(updateEnterprise)
  .delete(deleteEnterprise);

/**
 * @swagger
 * /enterprise/upload-employee-payroll:
 *   post:
 *     tags: [Enterprise]
 *     summary: Subir nómina de empleados
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Nómina procesada
 */
routes.post("/upload-employee-payroll", uploadEmployeePayroll);

export default routes;
