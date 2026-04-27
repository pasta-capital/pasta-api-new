import express from "express";
import {
  auth,
  forgotPassword,
  login,
  register,
  preRegisterDomiciliation,
  resetPassword,
  sendRegisterToken,
  validateToken,
  webhook,
  editProfile,
  changePassword,
  unregister,
  changePasswordConfirmation,
  validateDocument,
  getUser,
  getAllUsers,
  updateProfile,
  getUserById,
  editUser,
  getAccounts,
  getDocuments,
  downloadDocument,
  updateProfiles,
  subscribePush,
  unsubscribePush,
  deleteUser,
  getList,
  verifySession,
  getTermsAndConditions,
  changeStatus,
  createDiditSession,
  getFrequentQuestions,
  getProfile,
  editProfileConfirmation,
  testSms,
  updateFees,
  refreshToken,
  updateCountry,
  testClientUpdate,
  getClientStatistics,
  getNotificationsConfig,
  editNotificationsConfig,
} from "../controllers/userController";
import { authorizeModules, verifyToken } from "../middlewares/authJwt";
import {
  createAccountForUser,
  deleteAccountForUser,
} from "../controllers/accountController";

const routes = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Autenticación, registro y gestión de usuarios/clientes
 */

/**
 * @swagger
 * /users/login:
 *   post:
 *     tags: [Users]
 *     summary: Login de usuario
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
 *       400:
 *         description: Campos requeridos faltantes
 *       401:
 *         description: Credenciales inválidas
 */
routes.route("/login").post(login);

/**
 * @swagger
 * /users/register:
 *   post:
 *     tags: [Users]
 *     summary: Registrar usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name, lastname, document, phone]
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombres
 *                 example: "María Alejandra"
 *               lastname:
 *                 type: string
 *                 description: Apellidos
 *                 example: "González Rodríguez"
 *               document:
 *                 type: string
 *                 description: Número de documento
 *                 example: "12345678"
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 description: Fecha de nacimiento
 *                 example: "1990-05-15"
 *               gender:
 *                 type: string
 *                 description: Género (M/F)
 *                 example: "F"
 *               maritalStatus:
 *                 type: string
 *                 description: Estado civil
 *                 example: "married"
 *               selfEmployed:
 *                 type: boolean
 *                 description: Si es autoempleado
 *                 example: false
 *               enterprise:
 *                 type: object
 *                 description: Datos de empresa
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: Nombre de empresa
 *                   address:
 *                     type: string
 *                     description: Dirección de empresa
 *                   phone:
 *                     type: string
 *                     description: Teléfono de empresa
 *                   position:
 *                     type: string
 *                     description: Posición laboral
 *               occupation:
 *                 type: string
 *                 description: Ocupación
 *                 example: "Ingeniera"
 *               dependents:
 *                 type: integer
 *                 description: Dependientes (seleccionador)
 *                 example: 2
 *               seniority:
 *                 type: integer
 *                 description: Antigüedad de empleo (seleccionador)
 *                 example: 2
 *               income:
 *                 type: integer
 *                 description: Ingresos (seleccionador)
 *                 example: 3
 *               otherIncome:
 *                 type: integer
 *                 description: Otros ingresos (seleccionador)
 *                 example: 0
 *               education:
 *                 type: string
 *                 description: Nivel educativo
 *                 example: "bachelor"
 *               phone:
 *                 type: object
 *                 description: Datos de teléfono
 *                 properties:
 *                   countryCode:
 *                     type: string
 *                     description: Código de país
 *                     example: "58"
 *                   areaCode:
 *                     type: string
 *                     description: Código de área
 *                     example: "212"
 *                   number:
 *                     type: string
 *                     description: Número de teléfono
 *                     example: "5551234"
 *               email:
 *                 type: string
 *                 example: "maria.gonzalez@ejemplo.com"
 *               password:
 *                 type: string
 *                 example: "Secret123!"
 *               sessionId:
 *                 type: string
 *                 description: ID de sesión
 *                 example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *               account:
 *                 type: object
 *                 description: Datos de cuenta bancaria
 *                 properties:
 *                   type:
 *                     type: string
 *                     description: Tipo de cuenta (checking/savings)
 *                     example: "checking"
 *                   code:
 *                     type: string
 *                     description: Código de banco
 *                     example: "0102"
 *                   number:
 *                     type: string
 *                     description: Número de cuenta
 *                     example: "01020123456789012345"
 *               token:
 *                 type: string
 *                 description: Token de verificación
 *                 example: "4567"
 *               pep:
 *                 type: boolean
 *                 description: Si el cliente conoce un PEP
 *                 example: false
 *               pepInfo:
 *                 type: object
 *                 description: Datos del PEP si aplican
 *                 properties:
 *                   relationship:
 *                     type: string
 *                     description: Relación con el PEP
 *                   entity:
 *                     type: string
 *                     description: Entidad donde trabaja el PEP
 *                   name:
 *                     type: string
 *                     description: Nombre del PEP
 *                   occupation:
 *                     type: string
 *                     description: Ocupación del PEP
 *                   identification:
 *                     type: string
 *                     description: Número de documento del PEP
 *               country:
 *                 type: integer
 *                 description: País
 *                 example: 721
 *               state:
 *                 type: integer
 *                 description: Estado
 *                 example: 3014
 *               municipality:
 *                 type: integer
 *                 description: Municipio
 *                 example: 3015
 *               parish:
 *                 type: integer
 *                 description: Parroquia
 *                 example: 3027
 *               street:
 *                 type: string
 *                 description: Calle
 *                 example: "Av Principal"
 *               housingType:
 *                 type: string
 *                 description: Tipo de vivienda
 *                 example: "Casa"
 *               housingName:
 *                 type: string
 *                 description: Nombre de vivienda
 *                 example: "Residencia Norte"
 *     responses:
 *       201:
 *         description: Usuario registrado
 *       400:
 *         description: Error de validación
 */
routes.route("/register").post(register);
/**
 * @swagger
 * /users/forgot-password:
 *   post:
 *     tags: [Users]
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
routes.route("/forgot-password").post(forgotPassword);

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     tags: [Users]
 *     summary: Restablecer contraseña con token
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 description: ID del usuario
 *               token:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 */
routes.route("/reset-password").post(resetPassword);

/**
 * @swagger
 * /users/validate-document:
 *   post:
 *     tags: [Users]
 *     summary: Validar documento de identidad
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [document]
 *             properties:
 *               document:
 *                 type: string
 *                 example: "12345679"
 *     responses:
 *       200:
 *         description: Documento validado
 */
routes.route("/validate-document").post(validateDocument);

/**
 * @swagger
 * /users/verify-session:
 *   post:
 *     tags: [Users]
 *     summary: Verificar sesión
 *     responses:
 *       200:
 *         description: Sesión verificada
 */
routes.route("/verify-session").post(verifySession);

/**
 * @swagger
 * /users/pre-register-domiciliation:
 *   post:
 *     tags: [Users]
 *     summary: Pre-registro de domiciliación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, identification, identificationType, bankCode, accountNumber]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "María González"
 *               identification:
 *                 type: string
 *                 example: "14567890"
 *               identificationType:
 *                 type: string
 *                 example: "V"
 *               bankCode:
 *                 type: string
 *                 example: "0102"
 *               accountNumber:
 *                 type: string
 *                 example: "01020123456789012345"
 *     responses:
 *       200:
 *         description: Pre-registro procesado
 */
routes.route("/pre-register-domiciliation").post(preRegisterDomiciliation);

/**
 * @swagger
 * /users/send-register-token:
 *   post:
 *     tags: [Users]
 *     summary: Enviar token de registro
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "usuario@ejemplo.com"
 *     responses:
 *       200:
 *         description: Token enviado
 */
routes.route("/send-register-token").post(sendRegisterToken);

/**
 * @swagger
 * /users/validate-token:
 *   post:
 *     tags: [Users]
 *     summary: Validar token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, token]
 *             properties:
 *               email:
 *                 type: string
 *                 example: "usuario@dominio.com"
 *               token:
 *                 type: string
 *                 example: "789012"
 *     responses:
 *       200:
 *         description: Token validado
 */
routes.route("/validate-token").post(validateToken);

/**
 * @swagger
 * /users/terms-and-conditions:
 *   get:
 *     tags: [Users]
 *     summary: Obtener términos y condiciones
 *     responses:
 *       200:
 *         description: Términos y condiciones
 */
routes.route("/terms-and-conditions").get(getTermsAndConditions);

/**
 * @swagger
 * /users/didit-session:
 *   post:
 *     tags: [Users]
 *     summary: Crear sesión Didit (verificación de identidad)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Sesión creada
 */
routes.route("/didit-session").post(createDiditSession);

/**
 * @swagger
 * /users/frequent-questions:
 *   get:
 *     tags: [Users]
 *     summary: Obtener preguntas frecuentes
 *     responses:
 *       200:
 *         description: Lista de preguntas frecuentes
 */
routes.route("/frequent-questions").get(getFrequentQuestions);

routes.route("/test-auth").post(auth);
routes.route("/test-sms").post(testSms);
routes.route("/update-fees").post(updateFees);
routes.route("/update-country").post(updateCountry);

/**
 * @swagger
 * /users/webhook:
 *   post:
 *     tags: [Users]
 *     summary: Webhook (integraciones externas)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook procesado
 */
routes.route("/webhook").post(webhook);

/**
 * @swagger
 * /users/update-profile:
 *   post:
 *     tags: [Users]
 *     summary: Actualizar perfil (sin auth)
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Perfil actualizado
 */
routes.route("/update-profile").post(updateProfile);

/**
 * @swagger
 * /users/update-profiles:
 *   post:
 *     tags: [Users]
 *     summary: Actualizar perfiles en lote
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Perfiles actualizados
 */
routes.route("/update-profiles").post(updateProfiles);

if (process.env.NODE_ENV === "development") {
  routes.route("/:userId").delete(deleteUser);
  routes.route("/list").get(getList);
}

routes.use(verifyToken);

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Obtener usuario actual
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario
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
 *                   example: "User retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "697a3444cbaf4353acfa0132"
 *                     document:
 *                       type: string
 *                       example: "14567890"
 *                     identificationType:
 *                       type: string
 *                       example: "V"
 *                     name:
 *                       type: string
 *                       example: "María Alejandra"
 *                     lastname:
 *                       type: string
 *                       example: "González"
 *                     email:
 *                       type: string
 *                       example: "maria@ejemplo.com"
 *                     level:
 *                       type: integer
 *                       example: 1
 *                     levelName:
 *                       type: string
 *                       example: "Basic"
 *                     maxAmount:
 *                       type: number
 *                       example: 100
 *                     points:
 *                       type: number
 *                       example: 107.44
 *                     allowedFeeCount:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       example: [6]
 *                     nextLevelPoints:
 *                       type: number
 *                       example: 250
 *                     nextLevelName:
 *                       type: string
 *                       example: "Silver"
 *                     availableAmount:
 *                       type: number
 *                       example: 99.16
 *       401:
 *         description: No autorizado
 */
routes.route("/").get(getUser);

/**
 * @swagger
 * /users/refresh-token:
 *   post:
 *     tags: [Users]
 *     summary: Refrescar token JWT
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
 * /users/profile:
 *   get:
 *     tags: [Users]
 *     summary: Obtener perfil del usuario
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
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
 *                   example: "User profile retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "697a3444cbaf4353acfa0132"
 *                     document:
 *                       type: string
 *                       example: "14567890"
 *                     identificationType:
 *                       type: string
 *                       example: "V"
 *                     name:
 *                       type: string
 *                       example: "María Alejandra"
 *                     lastname:
 *                       type: string
 *                       example: "González"
 *                     gender:
 *                       type: string
 *                       example: "F"
 *                     birthDate:
 *                       type: string
 *                       format: date-time
 *                       example: "1990-05-15T00:00:00.000Z"
 *                     email:
 *                       type: string
 *                       example: "maria@ejemplo.com"
 *                     phone:
 *                       type: object
 *                       properties:
 *                         countryCode:
 *                           type: string
 *                           example: "+58"
 *                         areaCode:
 *                           type: string
 *                           example: "212"
 *                         number:
 *                           type: string
 *                           example: "5551234"
 *                     notificationsConfig:
 *                       type: object
 *                       properties:
 *                         email:
 *                           type: boolean
 *                         sms:
 *                           type: boolean
 *                         push:
 *                           type: boolean
 *                         promotions:
 *                           type: boolean
 *                         _id:
 *                           type: string
 *                     image:
 *                       type: string
 *                       example: "697a3444cbaf4353acfa0132_1769616456647.jpg"
 *                     profileImagePath:
 *                       type: string
 *                       example: "https://apipasta.legendsoft.com/cdn/users/697a3444cbaf4353acfa0132_1769616456647.jpg"
 *                     country:
 *                       type: string
 *                       example: "721"
 *                     state:
 *                       type: string
 *                       example: "3014"
 *                     municipality:
 *                       type: string
 *                       example: "3015"
 *                     parish:
 *                       type: string
 *                       example: "3030"
 *                     street:
 *                       type: string
 *                       example: "Av Principal"
 *                     housingType:
 *                       type: string
 *                       example: "Casa"
 *                     housingName:
 *                       type: string
 *                       example: "Residencia Norte"
 *                     zipCode:
 *                       type: string
 *                       example: "1010"
 *       401:
 *         description: No autorizado
 */
routes.route("/profile").get(getProfile);

/**
 * @swagger
 * /users/notifications-config:
 *   get:
 *     tags: [Users]
 *     summary: Obtener configuración de notificaciones
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuración de notificaciones
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
 *                   example: "User notifications config retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: boolean
 *                       example: true
 *                     sms:
 *                       type: boolean
 *                       example: true
 *                     push:
 *                       type: boolean
 *                       example: true
 *                     promotions:
 *                       type: boolean
 *                       example: true
 *                     _id:
 *                       type: string
 *                       example: "697a3444cbaf4353acfa0131"
 *   post:
 *     tags: [Users]
 *     summary: Editar configuración de notificaciones
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - enabled
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [email, sms, push, promotions]
 *                 description: Tipo de canal de notificación
 *               enabled:
 *                 type: boolean
 *                 description: Si el canal está habilitado o no
 *             example:
 *               type: "email"
 *               enabled: true
 *     responses:
 *       200:
 *         description: Configuración actualizada
 */
routes.route("/notifications-config").get(getNotificationsConfig);
routes.route("/notifications-config").post(editNotificationsConfig);

/**
 * @swagger
 * /users/edit-profile:
 *   post:
 *     tags: [Users]
 *     summary: Editar perfil
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Perfil actualizado
 */
routes.route("/edit-profile").post(editProfile);

/**
 * @swagger
 * /users/edit-profile-confirmation:
 *   post:
 *     tags: [Users]
 *     summary: Confirmar edición de perfil
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - address
 *               - phone
 *               - email
 *               - token
 *             properties:
 *               address:
 *                 type: string
 *                 example: "Caracas"
 *               phone:
 *                 type: object
 *                 required:
 *                   - countryCode
 *                   - areaCode
 *                   - number
 *                 properties:
 *                   countryCode:
 *                     type: string
 *                     example: "58"
 *                   areaCode:
 *                     type: string
 *                     example: "414"
 *                   number:
 *                     type: string
 *                     example: "1234567"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "user@gmail.com"
 *               token:
 *                 type: string
 *                 example: "0926"
 *     responses:
 *       200:
 *         description: Edición confirmada
 */
routes.route("/edit-profile-confirmation").post(editProfileConfirmation);

/**
 * @swagger
 * /users/change-password:
 *   post:
 *     tags: [Users]
 *     summary: Cambiar contraseña
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: "password"
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 */
routes.route("/change-password").post(changePassword);

/**
 * @swagger
 * /users/change-password-confirmation:
 *   post:
 *     tags: [Users]
 *     summary: Confirmar cambio de contraseña
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: "5960"
 *               newPassword:
 *                 type: string
 *                 example: "password"
 *     responses:
 *       200:
 *         description: Cambio confirmado
 */
routes.route("/change-password-confirmation").post(changePasswordConfirmation);

/**
 * @swagger
 * /users/unregister:
 *   post:
 *     tags: [Users]
 *     summary: Darse de baja
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Usuario dado de baja
 */
routes.route("/unregister").post(unregister);

/**
 * @swagger
 * /users/subscribe-push:
 *   post:
 *     tags: [Users]
 *     summary: Suscribir notificaciones push
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
 * /users/unsubscribe-push:
 *   post:
 *     tags: [Users]
 *     summary: Desuscribir notificaciones push
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

routes.use(authorizeModules("clients"));

/**
 * @swagger
 * /users/statistics:
 *   get:
 *     tags: [Users]
 *     summary: Estadísticas de clientes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Estadísticas obtenidas
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos clients
 */
routes.route("/statistics").get(getClientStatistics);

/**
 * @swagger
 * /users/get-all:
 *   get:
 *     tags: [Users]
 *     summary: Listar todos los usuarios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Sin permisos
 */
routes.route("/get-all").get(getAllUsers);

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     tags: [Users]
 *     summary: Obtener usuario por ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario obtenido
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
 *                   example: "User retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     document:
 *                       type: string
 *                     identificationType:
 *                       type: string
 *                     name:
 *                       type: string
 *                     lastname:
 *                       type: string
 *                     email:
 *                       type: string
 *                     level:
 *                       type: integer
 *                     levelName:
 *                       type: string
 *                     maxAmount:
 *                       type: number
 *                     points:
 *                       type: number
 *                     allowedFeeCount:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     nextLevelPoints:
 *                       type: number
 *                     nextLevelName:
 *                       type: string
 *                     availableAmount:
 *                       type: number
 *       404:
 *         description: No encontrado
 *   patch:
 *     tags: [Users]
 *     summary: Editar usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *         description: Usuario actualizado
 */
routes.route("/:userId").get(getUserById).patch(editUser);

/**
 * @swagger
 * /users/{userId}/accounts:
 *   get:
 *     tags: [Users]
 *     summary: Listar cuentas del usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cuentas del usuario
 *   post:
 *     tags: [Users]
 *     summary: Crear cuenta para usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Cuenta creada
 */
routes.route("/:userId/accounts").get(getAccounts).post(createAccountForUser);

/**
 * @swagger
 * /users/{userId}/accounts/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Eliminar cuenta del usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cuenta eliminada
 */
routes.route("/:userId/accounts/:id").delete(deleteAccountForUser);

/**
 * @swagger
 * /users/{userId}/documents:
 *   get:
 *     tags: [Users]
 *     summary: Listar documentos del usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de documentos
 */
routes.route("/:userId/documents").get(getDocuments);

/**
 * @swagger
 * /users/{userId}/documents/{image}:
 *   get:
 *     tags: [Users]
 *     summary: Descargar documento
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: image
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archivo del documento
 */
routes.route("/:userId/documents/:image").get(downloadDocument);

/**
 * @swagger
 * /users/{userId}/status:
 *   patch:
 *     tags: [Users]
 *     summary: Cambiar estatus del usuario
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Estatus actualizado
 */
routes.route("/:userId/status").patch(changeStatus);

export default routes;
