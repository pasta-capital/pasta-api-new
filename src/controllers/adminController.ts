import { CookieOptions, Request, Response } from "express";
import bcrypt from "bcrypt";
import asyncHandler from "../common/asyncHandler";
import Admin from "../models/admin";
import { Status } from "../models/types";
import jwt, { SignOptions } from "jsonwebtoken";
import * as helper from "../common/helper";
import * as env from "../config/env.config";
import * as authHelper from "../common/authHelper";
import Token from "../models/Token";
import * as mailHelper from "../common/mailHelper";
import * as logger from "../common/logger";
import {
  forgotPasswordAdminTemplate,
  registerAdminTemplate,
} from "../common/templates";
import { fileURLToPath } from "url";
import path from "path";
import mongoose, { Types } from "mongoose";
import PushToken from "../models/PushToken";
import Operation from "../models/operation";
import { syncDebtPayments } from "../services/operationService";
import * as loggers from "../common/logger";
import {
  getActiveBankSettings,
  setActiveBank,
} from "../services/bankProviders";

/**
 * Login
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Correo y contraseña son requeridos.",
      code: "field_missing",
    });
  }

  const user = await Admin.findOne({ email }).populate({
    path: "roles", // El campo en tu modelo Admin que contiene los ObjectId de los roles
    select: "code modules", // Asegúrate de seguir seleccionando el campo 'nombre'
    populate: {
      path: "modules", // El campo en tu modelo Role que contiene los ObjectId de los módulos
      select: "code", // O los campos que quieras proyectar del modelo de Módulo
    },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "El correo ingresado no esta registrado.",
      code: "user_not_found",
    });
  }

  if (user.status !== Status.Active) {
    return res.status(401).json({
      success: false,
      message:
        "El usuario ha sido desactivado, por favor contacte con el administrador.",
      code: "user_not_active",
    });
  }

  if (!(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({
      success: false,
      message: "La contraseña ingresada es incorrecta.",
      code: "invalid_password",
    });
  }

  let options: SignOptions;
  const cookieOptions: CookieOptions = helper.clone(env.COOKIE_OPTIONS);
  if (rememberMe) {
    options = {
      expiresIn: env.JWT_EXPIRE_AT,
      algorithm: "HS256",
      issuer: "Pasta",
    };
    cookieOptions.maxAge = 400 * 24 * 60 * 60 * 1000;
  } else {
    options = {
      expiresIn: env.JWT_EXPIRE_AT,
      algorithm: "HS256",
      issuer: "Pasta",
    };
    cookieOptions.maxAge = env.JWT_EXPIRE_AT * 1000;
  }

  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      roles: user.roles.map((role) => role.code),
      modules: user.roles.flatMap((role) =>
        role.modules.map((module) => module.code),
      ),
    },
    env.JWT_SECRET,
    options,
  );

  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      id: user._id,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
    },
    token,
  });
});

export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await Admin.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "user_not_found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "User retrieved successfully",
      data: user,
    });
  },
);

export const logout = asyncHandler(async (req: Request, res: Response) => {
  res.clearCookie(env.X_ACCESS_TOKEN);
  return res.status(200).json({ success: true, message: "Logout successful" });
});

export const createAdmin = asyncHandler(async (req: Request, res: Response) => {
  const { body } = req;
  if (!body.name || !body.lastname || !body.email) {
    return res.status(400).send("name, lastname, email are required");
  }

  body.email = helper.trim(body.email, " ").toLowerCase();

  const user = await Admin.findOne({ email: body.email });
  if (user) {
    return res.status(400).send("Correo ya esta registrado.");
  }

  const admin = new Admin({
    name: body.name,
    lastname: body.lastname,
    email: body.email,
    roles: body.roles ?? [],
    status: "active",
  });
  await admin.save();

  //
  // Send confirmation email
  //
  try {
    // generate token and save
    const token = new Token({
      user: admin._id,
      token: helper.generateToken(),
      expireAt: Date.now() + env.TOKEN_EXPIRE_AT * 1000,
      type: "password-admin-reset",
    });

    await token.save();

    // Send email
    const mailOptions = {
      from: env.SMTP_FROM,
      to: body.email,
      subject: "Completa tu registro en Pasta Admin",
      html: registerAdminTemplate(
        `${env.ADMIN_URL}/users/confirm-email/${admin._id}/${token.token}`,
      ),
    };

    await mailHelper.sendMail(mailOptions);
    return res
      .status(201)
      .json({ success: true, message: "Admin created successfully" });
  } catch (err) {
    try {
      //
      // Delete user in case of smtp failure
      //
      await admin.deleteOne();
    } catch (deleteErr) {
      logger.error(
        `Error deleting user ${admin._id} after SMTP failure`,
        deleteErr,
      );
    }
    logger.error(`Error sending SMTP for user ${admin.email}`, err);
    return res
      .status(400)
      .send("Hubo un error enviando el correo de confirmación");
  }
});

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { body } = req;
    if (!body.email) {
      return res.status(400).send("email is required");
    }

    body.email = helper.trim(body.email, " ").toLowerCase();

    const admin = await Admin.findOne({ email: body.email });
    if (!admin) {
      return res.status(400).send("Correo no registrado");
    }

    //
    // Send confirmation email
    //
    try {
      // generate token and save
      const token = new Token({
        user: admin._id,
        token: helper.generateToken(),
        expireAt: new Date(Date.now() + env.TOKEN_EXPIRE_AT * 1000),
        type: "password-admin-reset",
      });

      await token.save();

      // Send email
      const mailOptions = {
        from: env.SMTP_FROM,
        to: body.email,
        subject: "Recupera tu contraseña en Pasta Admin",
        html: forgotPasswordAdminTemplate(
          `${env.ADMIN_URL}/users/confirm-email/${admin._id}/${token.token}`,
        ),
      };

      mailHelper.sendMail(mailOptions);
      return res
        .status(201)
        .json({ success: true, message: "Email sent successfully" });
    } catch (err) {
      logger.error(`Error sending SMTP for user ${admin.email}`, err);
      return res
        .status(400)
        .send("Hubo un error enviando el correo de confirmación");
    }
  },
);

export const confirmEmail = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, token, password } = req.body;
    const user = await Admin.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "user_not_found",
      });
    }

    const tokendb = await Token.findOne({
      user: userId,
      type: "password-admin-reset",
      token,
    });
    if (!tokendb) {
      return res.status(404).json({
        success: false,
        message:
          "Token es incorrecto o ha expirado. Por favor, contacte con el administrador para volver a enviar el correo de confirmación.",
        code: "token_not_found",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    user.password = passwordHash;
    await user.save();
    await Token.deleteMany({ user: userId, type: "password-admin-reset" });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
      data: { userId: user._id },
    });
  },
);

export const verifySession = async (req: Request, res: Response) => {
  return res.status(200).json({ success: true, message: "Session verified" });
};

export const refreshToken = async (req: Request, res: Response) => {
  const { user } = req;
  const cookieName = authHelper.getAuthCookieName(req);
  const options = {
    expiresIn: env.JWT_EXPIRE_AT,
    algorithm: "HS256",
    issuer: "Pasta",
  } as SignOptions;
  const token = jwt.sign(
    { id: user?.id, email: user?.email, roles: user?.roles },
    env.JWT_SECRET,
    options,
  );
  res.cookie(cookieName, token, env.COOKIE_OPTIONS);
  return res
    .status(200)
    .json({ success: true, message: "Token refreshed successfully" });
};

/**
 * Get users
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const results = await Admin.find({}).populate({
    path: "roles",
    select: "_id name",
  });

  return res.status(200).json({
    success: true,
    message: "Users retrieved successfully",
    data: results,
  });
});

/**
 * Get user
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await Admin.findById(req.user!.id);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
      code: "user_not_found",
    });
  }
  return res.status(200).json({
    success: true,
    message: "User retrieved successfully",
    data: user,
  });
});

/**
 * Get user by id
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const results = await Admin.findById(id).populate("roles");
  if (!results) {
    return res.status(404).json({
      success: false,
      message: "User not found",
      code: "user_not_found",
    });
  }
  return res.status(200).json({
    success: true,
    message: "User retrieved successfully",
    data: results,
  });
});

/**
 * Edit user
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const editUser = asyncHandler(async (req: Request, res: Response) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const { id } = req.params;
  console.log(__dirname);
  const filteredBody = helper.filterObj(
    req.body,
    "name",
    "lastname",
    "email",
    "roles",
    "status",
  );
  try {
    const user = await Admin.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    Object.assign(user, filteredBody);
    await user!.save();
  } catch (error: any) {
    if (error.code === 11000) {
      let message = "Error: Ya existe un registro con ";

      if (error.keyPattern && error.keyValue) {
        if (error.keyPattern.email) {
          message += `este correo electrónico (${error.keyValue.email}).`;
        } else {
          message = "Error: Ya existe un registro con valores duplicados.";
        }
      } else {
        message = "Error: Ya existe un registro con valores duplicados.";
      }

      return res.status(400).json({
        success: false,
        code: "user_exists",
        message,
      });
    }
    return res.status(400).json({ success: false, message: error.message });
  }

  return res
    .status(200)
    .json({ success: true, message: "User updated successfully" });
});

export const subscribePush = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = req.user!.id as unknown as Types.ObjectId;
    const { token } = req.body as { token: string };
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "user_not_found",
      });
    }
    // Upsert in PushToken collection
    await PushToken.findOneAndUpdate(
      { token },
      {
        $set: {
          token,
          ownerType: "ADMIN",
          adminId: admin._id,
          userId: null,
          status: "active",
          lastUsedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    // Keep last token for compatibility
    (admin as any).pushToken = token;
    const current: string[] = Array.isArray((admin as any).pushTokens)
      ? ((admin as any).pushTokens as string[])
      : [];
    if (!current.includes(token)) current.push(token);
    (admin as any).pushTokens = current;
    await admin.save();

    const activeCount = await PushToken.countDocuments({
      ownerType: "ADMIN",
      adminId: admin._id,
      status: "active",
    });
    return res.json({
      success: true,
      message: "Push token subscribed successfully",
      data: { tokens: activeCount },
    });
  },
);

export const unsubscribePush = asyncHandler(
  async (req: Request, res: Response) => {
    const adminId = req.user!.id as unknown as Types.ObjectId;
    const { token } = req.body as { token: string };
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "user_not_found",
      });
    }
    // Mark token as inactive in PushToken collection
    await PushToken.updateOne(
      { token },
      { $set: { status: "inactive", lastUsedAt: new Date() } },
    );

    const current: string[] = Array.isArray((admin as any).pushTokens)
      ? ((admin as any).pushTokens as string[])
      : [];
    const next = current.filter((t) => t !== token);
    (admin as any).pushTokens = next;
    if ((admin as any).pushToken === token) {
      (admin as any).pushToken = next[0] || undefined;
    }
    await admin.save();

    const activeCount = await PushToken.countDocuments({
      ownerType: "ADMIN",
      adminId: admin._id,
      status: "active",
    });
    return res.json({
      success: true,
      message: "Push token unsubscribed successfully",
      data: { tokens: activeCount },
    });
  },
);

export const generateToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { roles } = req.body;
    const token = jwt.sign({ modules: roles }, env.JWT_SECRET, {
      issuer: "Pasta",
    });
    return res.status(200).json({
      success: true,
      message: "Token generated successfully",
      data: { token },
    });
  },
);

export const manualSyncOperation = asyncHandler(
  async (req: Request, res: Response) => {
    const { operationId } = req.body;

    // Try finding WITHOUT populate first to see if the operation itself exists
    const rawOperation = await Operation.findById(operationId);

    if (!rawOperation) {
      loggers.error("Manual Sync - Operación no encontrada", { operationId });
      return res.status(404).json({
        success: false,
        message: `La operación con ID ${operationId} no existe en la base de datos.`,
      });
    }

    // Now try to populate
    const operation = await rawOperation.populate("user");
    if (!operation.user) {
      loggers.error("Manual Sync - Usuario no encontrado para esta operación", {
        userId: rawOperation.user,
      });
      return res.status(400).json({
        success: false,
        message: "El usuario asociado a la operación no existe.",
      });
    }

    const rif =
      (operation.user as any).identificationType +
      (operation.user as any).document;
    const reference = operation.reference || operation.internalReference;

    loggers.operation("Manual Sync - [STEP 2] Data Validation", {
      operationId: operation._id,
      rif,
      reference,
      user: operation.user,
    });

    if (!rif || !reference) {
      loggers.error(
        "Manual Sync - [ERROR] Missing RIF or Reference for external lookup",
        { rif, reference },
      );
      return res.status(400).json({
        success: false,
        message: "Datos de operación incompletos (RIF o Referencia faltante).",
      });
    }

    // STEP 3: Execute Sync Logic
    loggers.operation(
      "Manual Sync - [STEP 3] Calling syncDebtPayments Service",
      { operationId: operation._id },
    );

    try {
      const success = await syncDebtPayments(String(operation._id), rif);

      if (success) {
        loggers.operation(
          "Manual Sync - [SUCCESS] Synchronization Finished Successfully",
          {
            operationId: operation._id,
            rif,
          },
        );

        return res.status(200).json({
          success: true,
          message: "Sincronización completada exitosamente.",
          data: {
            operationId: operation._id,
            reference: reference,
          },
        });
      } else {
        // STEP 4: Handle Logical Failure (e.g., LA Sistemas didn't have the record yet)
        loggers.info("Manual Sync - [FAILED] Service returned false", {
          operationId: operation._id,
        });

        return res.status(500).json({
          success: false,
          message:
            "La sincronización falló. Es posible que el registro aún no aparezca en LA Sistemas.",
          code: "sync_service_returned_false",
        });
      }
    } catch (error: any) {
      // STEP 5: Handle Unexpected Errors
      loggers.error(
        "Manual Sync - [CRITICAL ERROR] Exception during manual sync",
        {
          operationId: operation._id,
          error: error.message,
          stack: error.stack,
        },
      );

      return res.status(500).json({
        success: false,
        message: "Error interno durante la sincronización.",
        error: error.message,
      });
    }
  },
);

export const setActiveBankProvider = asyncHandler(
  async (req: Request, res: Response) => {
    const { bankCode } = req.body;

    if (!bankCode || typeof bankCode !== "string") {
      return res.status(400).json({
        success: false,
        message: "El campo bankCode es requerido.",
        code: "field_missing",
      });
    }

    try {
      const result = await setActiveBank(bankCode);

      loggers.info("Admin - Active bank provider updated", {
        adminId: req.user?.id,
        bankCode: result.code,
      });

      return res.status(200).json({
        success: true,
        message: "Proveedor bancario activo actualizado correctamente.",
        data: {
          bankCode: result.code,
        },
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: "invalid_bank_code",
      });
    }
  },
);

export const getActiveBankProviderSettings = asyncHandler(
  async (_req: Request, res: Response) => {
    const data = await getActiveBankSettings();

    return res.status(200).json({
      success: true,
      message: "Proveedor bancario activo obtenido correctamente.",
      data,
    });
  },
);
