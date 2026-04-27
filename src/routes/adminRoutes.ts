import express from "express";
import multer from "multer";
import path from "path";
import {
  login,
  createAdmin,
  verifySession,
  getCurrentUser,
  refreshToken,
  logout,
  getUsers,
  getUserById,
  confirmEmail,
  editUser,
  forgotPassword,
  subscribePush,
  unsubscribePush,
  generateToken,
  manualSyncOperation,
} from "../controllers/adminController";
import { authorizeModules, verifyToken } from "../middlewares/authJwt";
import { fileURLToPath } from "url";
import * as env from "../config/env.config";

const routes = express.Router();

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Autenticación y gestión de administradores
 */

// Configuración de almacenamiento
// 1. Updated Storage with Absolute Path
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    // This points to /app/pasta/pasta-dashboard-new/cdn/users
    const dest =
      env.CDN_USERS || path.join(process.cwd(), "public/profile-pics");
    cb(null, dest);
  },
  filename: (req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname);
    cb(null, `user-${Date.now()}${ext}`);
  },
});

// 2. Updated Upload Middleware
const upload = multer({
  storage, // This now points to your updated storage above
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req: any, file: any, cb: any) => {
    if (/^image\/(jpeg|png|gif)$/.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Solo JPG, PNG o GIF"));
    }
  },
});

/**
 * @swagger
 * /admin/login:
 *   post:
 *     tags: [Admin]
 *     summary: Login de administrador
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               rememberMe:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Login exitoso
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
 *         description: Campos requeridos faltantes
 *       401:
 *         description: Credenciales inválidas
 */
routes.route("/login").post(login);

/**
 * @swagger
 * /admin/logout:
 *   post:
 *     tags: [Admin]
 *     summary: Cerrar sesión
 *     responses:
 *       200:
 *         description: Sesión cerrada
 */
routes.route("/logout").post(logout);

/**
 * @swagger
 * /admin/users/confirm-email:
 *   post:
 *     tags: [Admin]
 *     summary: Confirmar email de usuario
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Email confirmado
 */
routes.route("/users/confirm-email").post(confirmEmail);

/**
 * @swagger
 * /admin/users/forgot-password:
 *   post:
 *     tags: [Admin]
 *     summary: Solicitar recuperación de contraseña
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Correo enviado
 */
routes.route("/users/forgot-password").post(forgotPassword);

routes.use(verifyToken);

/**
 * @swagger
 * /admin/verify-session:
 *   get:
 *     tags: [Admin]
 *     summary: Verificar sesión activa
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sesión válida
 *       401:
 *         description: No autorizado
 */
routes.route("/verify-session").get(verifySession);

/**
 * @swagger
 * /admin/refresh-token:
 *   post:
 *     tags: [Admin]
 *     summary: Refrescar token
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token actualizado
 *       401:
 *         description: No autorizado
 */
routes.route("/refresh-token").post(refreshToken);

/**
 * @swagger
 * /admin/current-user:
 *   get:
 *     tags: [Admin]
 *     summary: Obtener usuario actual
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario actual
 *       401:
 *         description: No autorizado
 */
routes.route("/current-user").get(getCurrentUser);

/**
 * @swagger
 * /admin/subscribe-push:
 *   post:
 *     tags: [Admin]
 *     summary: Suscribir push notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Suscripción registrada
 */
routes.route("/subscribe-push").post(subscribePush);

/**
 * @swagger
 * /admin/unsubscribe-push:
 *   post:
 *     tags: [Admin]
 *     summary: Desuscribir push notifications
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Desuscripción registrada
 */
routes.route("/unsubscribe-push").post(unsubscribePush);

routes.use(authorizeModules("users"));

/**
 * @swagger
 * /admin/create:
 *   post:
 *     tags: [Admin]
 *     summary: Crear administrador
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Administrador creado
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
routes.route("/create").post(createAdmin);

/**
 * @swagger
 * /admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: Listar administradores
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de administradores
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
routes.route("/users").get(getUsers);

/**
 * @swagger
 * /admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     summary: Obtener administrador por ID
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
 *         description: Datos del administrador
 *       404:
 *         description: No encontrado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 *   patch:
 *     tags: [Admin]
 *     summary: Editar administrador
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
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Administrador actualizado
 *       404:
 *         description: No encontrado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
routes
  .route("/users/:id")
  .get(getUserById)
  .patch(upload.single("profilePicture"), editUser);

routes.use(authorizeModules("all"));

/**
 * @swagger
 * /admin/generate-token:
 *   post:
 *     tags: [Admin]
 *     summary: Generar token (admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Token generado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
routes.route("/generate-token").post(generateToken);

/**
 * @swagger
 * /admin/manual-sync:
 *   post:
 *     tags: [Admin]
 *     summary: Sincronización manual de operaciones
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [operationId]
 *             properties:
 *               operationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sincronización completada exitosamente
 *       400:
 *         description: Datos de operación incompletos
 *       404:
 *         description: Operación no encontrada
 *       500:
 *         description: Error interno durante la sincronización
 */
routes.route("/manual-sync").post(manualSyncOperation);
export default routes;
