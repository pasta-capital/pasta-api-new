import { CookieOptions, Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcrypt";
import * as helper from "../common/helper";
import * as authHelper from "../common/authHelper";
import * as env from "../config/env.config";
import { Status, UserRegisterPayload } from "../models/types";
import asyncHandler from "../common/asyncHandler";
import { createSession, getSessionDecision } from "../services/didit";
import * as mailHelper from "../common/mailHelper";
import {
  changePasswordTemplate,
  editProfileTemplate,
  forgotPasswordTemplate,
  registerTemplate,
} from "../common/templates";
import crypto from "crypto";
import { generateDbToken } from "../common/databaseHelper";
import User from "../models/User";
import Token from "../models/Token";
import Account from "../models/Account";
import Bank from "../models/Bank";
import Level from "../models/level";
import Subscription from "../models/subscription";
import SubscriptionPayment from "../models/subscriptionPayment";
import { padNumber } from "../common/helper";
import * as loggers from "../common/logger";
import Operation from "../models/operation";
import mongoose from "mongoose";
import { downloadImage } from "../common/fileHelper";
import path from "path";
import OperationPayment from "../models/operationPayment";
import { readFileSync } from "fs";
import Config from "../models/config";
import { buscar } from "../services/agileCheckService";
import FrequentQuestion from "../models/frequentQuestion";
import { getOperationPaymentsWithTotalService } from "../services/operationService";
import { sendSms } from "../common/messageHelper";
import PushToken from "../models/PushToken";
import Location from "../models/location";
import UserAddress from "../models/UserAddress";
import {
  getGender,
  getMaritalStatus,
  updateClientData,
  consultDebt,
  InsertOperation,
} from "../services/la";
import { ClientUpdateData } from "../models/la/clientUpdateData";
import LaModel from "../models/laModel";
import {
  getTransactionResult,
  TransactionStatusCode,
} from "../services/sypagoService";
import {
  processRegistrationDomiciliation,
  processPreRegistrationDomiciliation,
  getPreSubscription,
  consumePreSubscription,
} from "../services/subscriptionService";
import { type } from "os";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Test auth.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const auth = async (req: Request, res: Response) => {
  const cookieName = authHelper.getAuthCookieName(req);
  const cookieOptions: CookieOptions = helper.clone(env.COOKIE_OPTIONS);

  let options = {
    expiresIn: env.JWT_EXPIRE_AT,
    algorithm: "HS256",
    issuer: "Pasta",
  } as SignOptions;
  cookieOptions.maxAge = env.JWT_EXPIRE_AT * 1000;

  const token = jwt.sign(
    { email: "edgar@gmail.com", roles: ["admin"] },
    env.JWT_SECRET,
    options,
  );
  //res.cookie(cookieName, token, cookieOptions);

  return res
    .cookie(cookieName, token, cookieOptions)
    .status(200)
    .json({ message: "Login successful" });
};

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

  const user = await User.findOne({
    email,
    status: { $nin: [Status.Deleted] },
  });

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "El correo ingresado no esta registrado en Pasta.",
      code: "user_not_found",
    });
  }

  if (!user.isVerified) {
    return res.status(401).json({
      success: false,
      message: "El usuario no ha sido verificado.",
      code: "user_not_verified",
    });
  }

  if (!(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({
      success: false,
      message: "La contraseña ingresada es incorrecta.",
      code: "invalid_password",
    });
  }

  if (user.status === Status.Pending) {
    return res.status(401).json({
      success: false,
      message: "El estatus del usuario esta pendiente por aprobación",
      code: "user_pending",
    });
  }

  if (user.status === Status.Inactive) {
    return res.status(401).json({
      success: false,
      message: "El usuario está inactivo.",
      code: "user_inactive",
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

  // GENERACIÓN DE TOKENS
  const accessToken = jwt.sign(
    { id: user._id, email: user.email, roles: user.roles },
    env.JWT_SECRET,
    options,
  );

  // Generar Refresh Token (ejemplo, 7 días de expiración)
  const refreshToken = jwt.sign(
    { id: user._id, email: user.email },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRE_AT,
      algorithm: "HS256",
      issuer: "Pasta",
    },
  );

  // Resetear tokens anteriores para evitar acumulación
  (user as any).refreshTokens = [refreshToken];
  await user.save();

  const nextLevel = await Level.findOne({ level: user.level + 1 });

  const amountPending = await OperationPayment.aggregate([
    {
      $match: {
        user: user._id,
        status: { $nin: ["void", "paid"] },
      },
    },
    {
      $group: {
        _id: null, // Agrupa todos los documentos en un solo grupo para sumar todos los montos
        totalAmount: { $sum: "$amountUsd" }, // Calcula la suma de amountUsd
      },
    },
  ]).exec();

  const totalPendingAmount =
    amountPending.length > 0 ? amountPending[0].totalAmount : 0;

  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      id: user._id,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      level: user.level,
      points: parseFloat(user.points.toFixed(2)),
      maxAmount: user.maxAmount,
      availableAmount: user.maxAmount - totalPendingAmount,
      allowedFeeCount: user.allowedFeeCount,
      nextLevelPoints: nextLevel?.pointsRequired,
      accessToken,
      refreshToken,
    },
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
  const userId = new mongoose.Types.ObjectId(req.user!.id);
  const results = await User.aggregate([
    {
      $match: {
        _id: userId,
      },
    },
    {
      $lookup: {
        from: "Level", // Debe coincidir con el nombre de la colección en MongoDB
        let: { currentLevel: "$level" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$level", { $add: ["$$currentLevel", 1] }],
              },
            },
          },
          {
            $project: {
              _id: 0,
              pointsRequired: 1,
              name: 1,
            },
          },
        ],
        as: "nextLevelData",
      },
    },
    {
      $unwind: {
        path: "$nextLevelData",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        lastname: 1,
        email: 1,
        level: 1,
        levelName: 1,
        points: 1,
        maxAmount: 1,
        allowedFeeCount: 1,
        nextLevelPoints: "$nextLevelData.pointsRequired",
        nextLevelName: "$nextLevelData.name",
        document: 1,
        identificationType: 1,
      },
    },
  ]);

  // Obtener el total pendiente desde LA Sistemas consultDebt
  const rif =
    (results[0]?.identificationType ?? "") + (results[0]?.document ?? "");
  const debtResult = await consultDebt({ Rif: rif });
  loggers.operation(
    "Resultado de consultDebt para getUser:" + JSON.stringify(debtResult),
  );
  let totalPendingAmount = 0;
  if (debtResult.success && debtResult.data?.Totales?.Totalpendiente) {
    totalPendingAmount = parseFloat(
      debtResult.data.Totales.Totalpendiente.replace(/[^\d.-]/g, "").trim(),
    );
  }

  const resultData = {
    ...results[0],
    points: parseFloat(results[0].points.toFixed(2)),
    availableAmount: results[0].maxAmount - totalPendingAmount,
  };

  return res.status(200).json({
    success: true,
    message: "User retrieved successfully",
    data: resultData,
  });
});

/**
 * Get profile
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const userId = new mongoose.Types.ObjectId(req.user!.id);

  const user = await User.findById(userId).select(
    "name lastname email document identificationType email phone birthDate address gender notificationsConfig image",
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
      code: "user_not_found",
    });
  }

  // Obtener UserAddress si existe
  const userAddress = await UserAddress.findOne({ user: userId })
    .populate("country", "name code")
    .populate("state", "name code")
    .populate("municipality", "name code")
    .populate("parish", "name code")
    .select(
      "country state municipality parish street housingType housingName zipCode createdAt updatedAt",
    )
    .lean();

  // Convertir usuario a objeto plano y agregar UserAddress si existe
  const userData = user.toObject() as any;

  console.log(userData.image);
  if (userData.image) {
    let imageFileName = userData.image as string;
    if (imageFileName.includes("\\"))
      imageFileName = imageFileName.split("\\").pop() as string;
    else if (imageFileName.includes("/"))
      imageFileName = imageFileName.split("/").pop() as string;
    userData.profileImagePath = `${env.CDN_URL}/cdn/users/${imageFileName}`;
  } else {
    userData.profileImagePath = null;
  }

  if (userAddress) {
    const address = userAddress as any;
    userData.country = address.country?.code ?? null;
    userData.state = address.state?.code ?? null;
    userData.municipality = address.municipality?.code ?? null;
    userData.parish = address.parish?.code ?? null;
    userData.street = address.street ?? null;
    userData.housingType = address.housingType ?? null;
    userData.housingName = address.housingName ?? null;
    userData.zipCode = address.zipCode ?? null;
  }

  return res.status(200).json({
    success: true,
    message: "User profile retrieved successfully",
    data: userData,
  });
});

/**
 * Get user notifications config
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getNotificationsConfig = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = new mongoose.Types.ObjectId(req.user!.id);

    const user = await User.findById(userId).select("notificationsConfig");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "user_not_found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User notifications config retrieved successfully",
      data: user.notificationsConfig,
    });
  },
);

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
  const { userId } = req.params;
  console.log(userId);
  const results = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "levels", // Debe coincidir con el nombre de la colección en MongoDB
        let: { currentLevel: "$level" },
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$level", { $add: ["$$currentLevel", 1] }],
              },
            },
          },
          {
            $project: {
              _id: 0,
              pointsRequired: 1,
              name: 1,
            },
          },
        ],
        as: "nextLevelData",
      },
    },
    {
      $unwind: {
        path: "$nextLevelData",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        lastname: 1,
        email: 1,
        level: 1,
        levelName: 1,
        points: 1,
        maxAmount: 1,
        allowedFeeCount: 1,
        document: 1,
        identificationType: 1,
        phone: 1,
        birthDate: 1,
        gender: 1,
        maritalStatus: 1,
        nextLevelPoints: "$nextLevelData.pointsRequired",
        nextLevelName: "$nextLevelData.name",
        selfEmployed: 1,
        enterprise: 1,
        dependents: 1,
        seniority: 1,
        income: 1,
        otherIncome: 1,
        education: 1,
        status: 1,
        verificationStatus: 1,
        notificationsConfig: 1,
        image: 1,
        documentImages: 1,
        agileCheckLists: 1,
        pep: 1,
        pepInfo: 1,
      },
    },
  ]);

  return res.status(200).json({
    success: true,
    message: "User retrieved successfully",
    data: results[0],
  });
});

/**
 * Get accounts for userId
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 *
 */
export const getAccounts = asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const accounts = await Account.find({ user: userId }, "_id type number")
    .populate<{
      bank: env.Bank;
    }>({
      path: "bank",
      select: "code name",
    })
    .lean();

  return res.status(200).json({
    success: true,
    message: "Accounts retrieved successfully",
    data: accounts,
  });
});

/**
 * Get documents for user
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getDocuments = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const results = await User.findById(userId);

    return res.status(200).json({
      success: true,
      message: "Documents retrieved successfully",
      data: results?.documentImages,
    });
  },
);

const VALID_STATES = ["vigente", "vencido", "moroso", "inactivo"] as const;

/**
 * Get all users
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getAllUsers = asyncHandler(async (req: Request, res: Response) => {
  const stateParam = req.query.state as string | undefined;
  const state =
    stateParam &&
    stateParam.trim() !== "" &&
    stateParam.toLowerCase() !== "null"
      ? stateParam.trim().toLowerCase()
      : null;

  if (state !== null && !VALID_STATES.includes(state as any)) {
    return res.status(400).json({
      success: false,
      message: `state must be one of: ${VALID_STATES.join(", ")} or null`,
    });
  }

  // 1. Fetch Users
  const results = await User.find({ status: { $ne: Status.Deleted } }).select(
    "_id name lastname email document status identificationType image maxAmount",
  );

  const userIds = results.map((u) => u._id);

  // 2. Fetch Unpaid Payments for these users
  const unpaidPayments = await OperationPayment.find({
    user: { $in: userIds },
    status: { $in: ["pending", "overdue", "inArrears"] },
  })
    .select("user date amountUsd amountUsdTotal")
    .lean();

  // 3. Process totals using Maps (More efficient than multiple DB calls)
  const creditoUsadoByUser = new Map<string, number>();
  let totalPendingAmountAcrossAllUsers = 0;

  for (const p of unpaidPayments) {
    const userId = String(p.user);
    // Logic: Use amountUsdTotal if available, else amountUsd
    const amount = p.amountUsd ?? 0;

    // Add to specific user map
    creditoUsadoByUser.set(
      userId,
      (creditoUsadoByUser.get(userId) ?? 0) + amount,
    );

    // Add to global counter
    totalPendingAmountAcrossAllUsers += amount;
  }

  // 4. Map the User Data
  let resultData = results.map((user) => {
    const creditoUsado = creditoUsadoByUser.get(String(user._id)) ?? 0;
    const maxAmount = user.maxAmount ?? 0;
    const creditoDisponible = Math.max(0, maxAmount - creditoUsado);

    return {
      _id: user._id,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      document: user.document,
      status: user.status,
      statusName: helper.getUserStatusName(user.status),
      identificationType: user.identificationType,
      image: user.image,
      maxAmount,
      creditoDisponible,
      creditoUsado, // This is your "amountPending" per user
    };
  });

  // 5. Apply State Filtering (Vigente, Moroso, etc.)
  if (state !== null) {
    const VENEZUELA_TZ = "America/Caracas";
    const dayMs = 24 * 60 * 60 * 1000;
    const todayVEStr = formatInTimeZone(new Date(), VENEZUELA_TZ, "yyyy-MM-dd");
    const startOfTodayVE = fromZonedTime(
      `${todayVEStr}T00:00:00`,
      VENEZUELA_TZ,
    );

    const maxAtrasoByUser = new Map<string, number>();
    for (const p of unpaidPayments) {
      const userId = String(p.user);
      const dueDateVEStr = formatInTimeZone(
        new Date(p.date),
        VENEZUELA_TZ,
        "yyyy-MM-dd",
      );
      const startOfDueDateVE = fromZonedTime(
        `${dueDateVEStr}T00:00:00`,
        VENEZUELA_TZ,
      );

      const atraso = Math.floor(
        (startOfTodayVE.getTime() - startOfDueDateVE.getTime()) / dayMs,
      );
      const current = maxAtrasoByUser.get(userId);
      if (current === undefined || atraso > current) {
        maxAtrasoByUser.set(userId, atraso);
      }
    }

    const getUserState = (userId: string) => {
      const atraso = maxAtrasoByUser.get(userId);
      if (atraso === undefined) return "inactivo";
      if (atraso > 2) return "moroso";
      if (atraso >= 1) return "vencido";
      return "vigente";
    };

    resultData = resultData.filter(
      (u) => getUserState(String(u._id)) === state,
    );
  }

  // 6. Return response with global total
  return res.status(200).json({
    success: true,
    message: "Users retrieved successfully",
    totalPendingAmount: Number(totalPendingAmountAcrossAllUsers.toFixed(2)),
    data: resultData,
  });
});
export const getList = asyncHandler(async (req: Request, res: Response) => {
  const results = await User.find(
    { status: Status.Active },
    "_id name lastname email identificationType document",
  );

  return res.status(200).json({
    success: true,
    message: "Users retrieved successfully",
    data: results,
  });
});

/**
 * Send token
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const sendRegisterToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, phone } = req.body;

    if (!email) {
      return res
        .status(400)
        .json({ message: "Correo y teléfono son requeridos" });
    }

    const user = await User.findOne({ email, status: Status.Active });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "El correo ingresado ya esta registrado en Pasta.",
        code: "user_exists",
      });
    }

    const token = await generateDbToken(email, "register-email");
    // Send email with the token
    const mailOptions = {
      from: env.SMTP_FROM,
      to: email,
      subject: "Completa tu registro en Pasta",
      html: registerTemplate(token.token),
    };

    mailHelper.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: "Token enviado" });
  },
);

/**
 * Validate Token
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const validateToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, email }: { token: string; email: string } = req.body;

    // Excepción para ambiente de desarrollo: si el token es "0000", no validar
    if (!(process.env.NODE_ENV === "development" && token === "0000")) {
      const tokenUser = await Token.findOne({ token, email });

      if (!tokenUser) {
        return res
          .status(400)
          .json({ success: false, message: "Token no válido" });
      }
    }

    return res.status(200).json({ success: true, message: "Token válido" });
  },
);

/**
 * Validate document
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const validateDocument = asyncHandler(
  async (req: Request, res: Response) => {
    const { document } = req.body;
    const documentNumber = document?.replace(/[^0-9]/g, "");

    if (!documentNumber) {
      return res.status(400).json({
        success: false,
        message: "Falta el documento",
        code: "field_missing",
      });
    }

    const userExists = await User.exists({
      $expr: {
        $eq: [
          {
            $reduce: {
              input: {
                $regexFindAll: {
                  input: "$document",
                  regex: "[0-9]",
                },
              },
              initialValue: "",
              in: { $concat: ["$$value", "$$this.match"] },
            },
          },
          documentNumber,
        ],
      },
      status: { $ne: "deleted" },
    });

    if (userExists) {
      return res
        .status(400)
        .json({ success: false, message: "Documento ya esta registrado" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Documento válido para registro" });
  },
);

/**
 * Pre-register domiciliation
 * Procesa la domiciliación antes del registro del usuario.
 * Solo crea la pre-suscripción si SyPago retorna estado ACCP.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const preRegisterDomiciliation = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      name,
      identification,
      bankCode,
      accountNumber,
      identificationType,
    } = req.body;

    // Validar campos requeridos
    if (!name || !identification || !bankCode || !accountNumber) {
      return res.status(400).json({
        success: false,
        message:
          "Faltan campos requeridos: name, identification, bankCode, accountNumber",
        code: "field_missing",
      });
    }

    // Procesar domiciliación previa
    const result = await processPreRegistrationDomiciliation(
      name,
      identification,
      bankCode,
      accountNumber,
      identificationType || "V",
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  },
);

/**
 * Register
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
  const { body }: { body: UserRegisterPayload } = req;

  if (!body.sessionId)
    return res.status(500).json({
      success: false,
      message: "sessionId required",
      code: "field_missing",
    });
  let diditSession;
  try {
    diditSession = await getSessionDecision(body.sessionId);
    loggers.operation("Didit - getSessionDecision() - Success", {
      action: "didit_verification",
      step: "success",
    });
  } catch (error) {
    loggers.operation("Didit - getSessionDecision() - Error", {
      action: "didit_verification",
      step: "error",
      error: JSON.stringify(error),
    });
    return res.status(500).json({
      success: false,
      message: "Se produjo un error verificando el usuario",
      code: "verification_error",
    });
  }

  body.status = "active";
  try {
    const listas = await Config.findOne({ key: "agile-check-lists" });

    if (listas && listas.value.length > 0) {
      const resp = await buscar(
        diditSession.id_verification?.first_name,
        diditSession.id_verification?.last_name,
        false,
        diditSession.id_verification?.document_number.slice(1),
        listas.value,
        "",
        0,
        0,
        "0",
      );

      if (resp.success) {
        if (
          resp.data.consultaRows.filter((c: any) => c.intFuente != 3).length > 1
        ) {
          return res.status(400).json({
            success: false,
            message: "Su solicitud de afiliacion ha sido rechazada.",
            code: "agile_check_result",
          });
        }

        if (
          resp.data.consultaRows.filter((c: any) => c.intFuente == 3).length > 0
        ) {
          body.status = "pending";
          body.agileCheckLists = resp.data.consultaRows.map(
            (c: any) => c.intFuente,
          );
        }

        if (body.pep && body.pepInfo) {
          const pepFirstName = body.pepInfo.name.split(" ")[0];
          const pepLastName =
            body.pepInfo.name.split(" ").length > 1
              ? body.pepInfo.name.split(" ")[1]
              : "";
          const respPep = await buscar(
            pepFirstName,
            pepLastName,
            false,
            body.pepInfo.identification,
            listas.value,
            "",
            0,
            0,
            "0",
          );
          console.log(respPep);
          if (respPep.success) {
            if (respPep.data.consultaRows.length > 1) {
              body.status = "pending";
              body.pepInfo.agileCheckLists = respPep.data.consultaRows.map(
                (c: any) => c.intFuente,
              );
            }
          }
        }
      }
    }
  } catch (error) {
    console.log(error);
  }

  body.isVerified = diditSession.status?.toLowerCase() === "approved";
  body.verificationStatus = diditSession.status;

  const level = await Level.findOne({ level: 1 });
  body.level = level!.level;
  body.levelName = level!.name;
  body.maxAmount = level!.creditLimit;
  body.allowedFeeCount = level!.allowedFeeCount;

  if (body.selfEmployed) delete body.enterprise;

  if (!body.account?.type || !body.account?.number || !body.account?.code)
    return res.status(500).json({
      success: false,
      message: "account required",
      code: "field_missing",
    });

  if (!body.token)
    return res.status(500).json({
      success: false,
      message: "token de correo y token de sms requeridos",
      code: "field_missing",
    });

  // Excepción para ambiente de desarrollo: si el token es "0000", no validar
  if (!(process.env.NODE_ENV === "development" && body.token === "0000")) {
    const tokenUserEmail = await Token.findOne({
      email: body.email,
      token: body.token,
      type: "register-email",
    });
    if (!tokenUserEmail)
      return res.status(500).json({
        success: false,
        message: "Token de correo no válido",
        code: "invalid_email_token",
      });
  }

  if (body.password) {
    const salt = await bcrypt.genSalt(10);
    const { password } = body;
    const passwordHash = await bcrypt.hash(password, salt);
    body.password = passwordHash;
  }

  // Eliminar cualquier letra al principio del documento
  if (body.document) {
    body.document = body.document.replace(/^[A-Za-z]+/, "");
  }

  // Validar que existe una pre-suscripción válida antes de continuar con el registro
  // const normalizedDocument = body.document.replace(/^[A-Za-z]+/, "");
  // #pending_to_restore, process deleted due to business decision
  // const preSubscriptionResult = await getPreSubscription(normalizedDocument);

  // if (
  //   (!preSubscriptionResult.success || !preSubscriptionResult.data) &&
  //   env.ENABLE_SUBSCRIPTION_ON_REGISTER
  // ) {
  //   return res.status(400).json({
  //     success: false,
  //     message:
  //       "No existe una pre-suscripción válida. Debe completar el proceso de domiciliación antes de registrarse.",
  //     code: "subscription_required",
  //   });
  // }

  // const preSubscription = preSubscriptionResult.data;

  const user = await User.create(body);
  const bank = await Bank.findOne({ code: body.account.code });
  let account: any;
  try {
    account = new Account({
      user: user._id,
      bank: bank!._id,
      type: body.account.type,
      number: body.account.number,
    });
    await account.save();
  } catch (error) {
    console.log(error);
    const userId = user._id;
    await User.findByIdAndDelete(userId);
    return res.status(500).json({ success: false, error });
  }

  // Cobro de domiciliación al momento del registro
  // #pending_to_restore, process deleted due to business decision
  // if (false) {
  //   const domiciliationResult = await processRegistrationDomiciliation(
  //     user,
  //     diditSession,
  //     bank?.code,
  //     body.account.number,
  //   );
  //   if (!domiciliationResult.success) {
  //     return res
  //       .status(
  //         domiciliationResult.code === "rate_not_available" ||
  //           domiciliationResult.code === "domiciliation_process_error"
  //           ? 500
  //           : 400,
  //       )
  //       .json(domiciliationResult);
  //   }
  // }

  // Crear UserAddress después de crear el usuario
  let userAddress: any = null;
  try {
    // Crea directamente el objeto con los campos de la dirección, sin ifs
    const addressPayload: any = {
      user: user._id,
      street: body.street,
      housingType: body.housingType,
      housingName: body.housingName,
      zipCode: body.zipCode,
    };

    // Buscar Location por code para country, state, municipality y parish
    if (body.country) {
      const country = await Location.findOne({
        code: body.country,
        type: "country",
      });
      if (country) addressPayload.country = country._id;
    }

    if (body.state) {
      const state = await Location.findOne({ code: body.state, type: "state" });
      if (state) addressPayload.state = state._id;
    }

    if (body.municipality) {
      const municipality = await Location.findOne({
        code: body.municipality,
        type: "municipality",
      });
      if (municipality) addressPayload.municipality = municipality._id;
    }

    if (body.parish) {
      const parish = await Location.findOne({
        code: body.parish,
        type: "parish",
      });
      if (parish) addressPayload.parish = parish._id;
    }

    // Si no hay país, pon el default igual que antes
    if (!addressPayload.country) {
      const defaultCountry = await Location.findOne({ code: "721" });
      if (defaultCountry) addressPayload.country = defaultCountry._id;
    }

    // Solo crea el address si country quedó bien seteado
    if (addressPayload.country) {
      userAddress = await UserAddress.create(addressPayload);
      // Poblar después de crear
      await userAddress.populate([
        { path: "country", select: "code" },
        { path: "state", select: "code name" },
        { path: "municipality", select: "code name" },
        { path: "parish", select: "code name" },
      ]);
    }
  } catch (error) {
    console.log(error);
  }

  // Actualizar datos en LA Sistemas después del registro
  try {
    // Obtener UserAddress con populate si no se obtuvo antes
    let updatedUserAddress = userAddress
      ? userAddress.toObject()
      : await UserAddress.findOne({ user: user._id })
          .populate("country", "code")
          .populate("state", "code name")
          .populate("municipality", "code name")
          .populate("parish", "code name")
          .lean();

    // Obtener valores de configuración para campos obligatorios
    const laOficinaConfig = await Config.findOne({ key: "la-oficina" });
    const laCiejecutivoConfig = await Config.findOne({
      key: "la-ciejecutivo",
    });
    const laTppersonaConfig = await Config.findOne({ key: "la-tppersona" });

    // Obtener código del estado desde LaModel (igual que en editProfileConfirmation)
    const state = updatedUserAddress?.state
      ? (updatedUserAddress.state as any).name || undefined
      : undefined;

    let stateCode = "";
    if (state) {
      const laState = await LaModel.findOne({
        name: { $regex: state, $options: "i" },
      }).select("code");
      if (laState) stateCode = laState.code || "";
    }

    // Preparar datos para LA Sistemas
    const clientUpdateData: ClientUpdateData = {
      // Campos obligatorios
      Apellido: user.lastname || "",
      Nombre: user.name || "",
      Rif: user.identificationType + user.document,
      Nuejecutivo: "7",
      Ejecutivo: "1",
      Ciejecutivo: laCiejecutivoConfig?.value || "001",
      Edocivil: getMaritalStatus(user.maritalStatus) || "",
      Oficina: laOficinaConfig?.value || "0001",
      Tppersona: laTppersonaConfig?.value || "1",
      Tlf1:
        typeof user.phone === "object" && user.phone?.number
          ? `${user.phone.countryCode || ""}${
              user.phone.areaCode || ""
            }${user.phone.number.replace(/^0+/, "")}`
          : typeof user.phone === "string"
            ? (user.phone as string)?.replace(/^0+/, "")
            : undefined,
      Tlf2: "",
      Tlfejecutivo: "",
      Emailejecutivo: "",
      Certifejecutivo: "",
      Fotoejecutivo: "",
      Extejecutivo: "",
      Email: user.email || undefined,
      Demail: "",
      Verificacionemail: "",
      Stat: "S",
      Riftraspaso: "",
      Fecontrato: "",
      Numcontrato: " ",
      Perfil: " ",
      Situacionlab: user.selfEmployed ? "1-DEPENDIENTE" : "2-EMPLEADO",
      Situacionlablegal: "",
      Grupo: "INV",
      Paisresid: "VE",
      Paisnac: "VE",
      Paisotro: "VE",
      Nacionalidad: "VE-VENEZOLANO",
      Estado: stateCode,
      /* Ciudad: updatedUserAddress?.municipality
        ? (updatedUserAddress.municipality as any).name || undefined
        : undefined, */
      Postal: updatedUserAddress?.zipCode || undefined,
      Profesionco: "",
      //Ocupacionco: "",
      Empresa: user.enterprise?.name || "",
      Ocupacion: user.occupation || "",
      Antiguedadempresa: user.seniority ? String(user.seniority) : "",
      Dirempre1: user.enterprise?.address || "",
      Nivelacad: user.education || "",
      Banco: bank?.laCode || "",
      Cuenta: body.account?.number || "",
      Tpcuenta: body.account?.type || "",
      Publicexp: body.pep ? "S" : "N",
      Documpolitexp: body.pep ? "S" : "N",
      Cargopolitexp: body.pepInfo?.occupation || "",
      Cargoempresa: user.enterprise?.position || "",
      Apepolitexp: body.pepInfo?.name || "",
      Feingresoempresa: "",
      Rifempresa: "",
      Actividadco: "",
      Empresaref: "",
      Empleadoref: "",
      Oficinaref: "",
      Empresacoref: "",
      Empleadocoref: "",
      Oficinacoref: "",
      Institutopagot: "",
      Períodopagot: "",
      Cuentaccbu: "",
      Escotitulares: "",
      Monbasecliente: "",
      Lineatipo: "",
      Lineamonto: "",
      // Información personal
      Sexo: getGender(user.gender) || undefined,
      Nacimiento: user.birthDate
        ? (() => {
            const date = new Date(user.birthDate);
            const day = date.getUTCDate().toString().padStart(2, "0");
            const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
            const year = date.getUTCFullYear();
            return `${day}/${month}/${year}`;
          })()
        : undefined,

      // Información de dirección
      Dirhabitacion1: updatedUserAddress?.street || undefined,
      Dirhabitacion2: updatedUserAddress?.housingName || undefined,
      Dirhabitacion3: updatedUserAddress?.housingType || undefined,
      Referencias: {
        Referencia: [],
      },
      Balance: {
        Ingsalario: "       0.00",
        Ingbono: "       0.00",
        Ingrenta: "       0.00",
        Inginver: "       0.00",
        Ingotros: "       0.00",
        Egrprestamos: "       0.00",
        Egrpagpend: "       0.00",
        Egrpagreg: "       0.00",
        Egrhipotecas: "       0.00",
        Egrotros: "       0.00",
        Ingpaisorigen: "",
        Ingtpfrecuencia: "",
        Ingprocedencia: "",
        Ingrecepfing: "",
        Ingrecepfotros: "",
        Ingdetalle: "",
      },
    };

    if (
      clientUpdateData.Rif &&
      clientUpdateData.Apellido &&
      clientUpdateData.Nombre &&
      clientUpdateData.Ciejecutivo &&
      clientUpdateData.Oficina &&
      clientUpdateData.Tppersona
    ) {
      const laUpdateResult = await updateClientData(clientUpdateData);
      console.log(laUpdateResult);
      if (!laUpdateResult.success) {
        console.error(
          "Error al actualizar datos en LA Sistemas durante el registro:",
          laUpdateResult.message,
          laUpdateResult.error,
        );
      }
    }
  } catch (error) {
    // No afectar el registro si falla la actualización en LA Sistemas
    console.error(
      "Error al actualizar datos en LA Sistemas durante el registro:",
      error,
    );
  }

  if (body.isVerified) {
    try {
      const filename = `${user._id}_${Date.now()}`;
      loggers.info("File name CDN ", filename);
      const fileNameImage = await downloadImage(
        diditSession.face_match.target_image,
        path.join(env.CDN_USERS, filename),
      );
      loggers.info("After downloadImage - fileNameImage  ", fileNameImage);
      const fileNameDocument = await downloadImage(
        diditSession.id_verification.front_image,
        path.join(env.CDN_DOCUMENTS, `1_${filename}`),
      );
      loggers.info(
        "After downloadImage - fileNameDocument  ",
        fileNameDocument,
      );

      user.image = fileNameImage!;
      user.documentImages = [
        {
          documentType: "1",
          image: fileNameDocument!,
          dateOfIssue: diditSession.id_verification?.date_of_issue,
          expirationDate: diditSession.id_verification?.expiration_date,
        },
      ];
      user.identificationType =
        diditSession.id_verification?.document_number?.[0];
      await user.save();
    } catch (error) {
      console.log(error);
    }
  }

  await Token.deleteMany({ email: body.email });
  // Generar accessToken y refreshToken, guardar el refreshToken en el usuario y enviarlo en la respuesta
  const accessToken = jwt.sign(
    { id: user._id, email: user.email },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRE_AT,
      algorithm: "HS256",
      issuer: "Pasta",
    },
  );

  const refreshToken = jwt.sign(
    { id: user._id, email: user.email },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRE_AT,
      algorithm: "HS256",
      issuer: "Pasta",
    },
  );

  // Inicializa refreshTokens si no existe, para evitar error en usuarios nuevos
  user.refreshTokens = [refreshToken];
  await user.save();

  // Crear Subscription definitiva basada en la pre-suscripción y consumirla (controlado por P_ENABLE_SUBSCRIPTION_ON_REGISTER)
  // #pending_to_restore, process deleted due to business decision
  // if (env.ENABLE_SUBSCRIPTION_ON_REGISTER) {
  //   try {
  //     if (!preSubscription) {
  //       throw new Error("Pre-suscripción no encontrada");
  //     }

  //     const subscriptionCount = await Subscription.countDocuments();
  //     const finalSubscription = await Subscription.create({
  //       user: user._id,
  //       plan: "monthly", // Plan por defecto
  //       startDate: new Date(),
  //       contractNumber: padNumber(subscriptionCount + 1, 8),
  //       transactionId: preSubscription.transactionId,
  //       transactionRate: preSubscription.transactionRate,
  //       transactionAmount: preSubscription.transactionAmount,
  //       active: true,
  //     });
  //     await finalSubscription.save();

  //     // Consumir la pre-suscripción para evitar reutilización
  //     const preSubscriptionId =
  //       typeof preSubscription._id === "string"
  //         ? preSubscription._id
  //         : (preSubscription._id as any).toString();
  //     await consumePreSubscription(preSubscriptionId);

  //     // Registrar operación de membresía en LA Sistemas y crear SubscriptionPayment (cobro ya hecho en pre-register)
  //     const today = new Date();
  //     const day = String(today.getDate()).padStart(2, "0");
  //     const month = String(today.getMonth() + 1).padStart(2, "0");
  //     const year = today.getFullYear();
  //     const iniDate = `${day}/${month}/${year}`;

  //     const identificationTypeRif =
  //       user.identificationType ??
  //       diditSession?.id_verification?.document_number?.[0] ??
  //       "V";
  //     const insertOperationBody = {
  //       Rif: identificationTypeRif + (user.document ?? ""),
  //       Contrap: "",
  //       Validagraba: "G",
  //       Producto: "MB",
  //       Moneda: "1",
  //       Monefec: "0",
  //       Comi: "",
  //       Inicio: iniDate,
  //       Venc: iniDate,
  //       Cuotas: "0",
  //       Monto: finalSubscription.transactionAmount?.toString() ?? "0.99",
  //       Tpcambio: finalSubscription.transactionRate?.toString() ?? "1",
  //       Tasa: "0",
  //       Fpago: "2",
  //       Refer: "MEMBRESIA",
  //       Tpint: "V",
  //       Numesa: "1",
  //       Nuveh: "1",
  //       Nucorre: "2",
  //       Tipomm: "0",
  //       Copaso: "",
  //     };

  //     const laInsertResp = await InsertOperation(insertOperationBody);
  //     if (!laInsertResp.success) {
  //       console.error(
  //         "No se pudo registrar la operación de membresía en LA Sistemas:",
  //         laInsertResp.message,
  //       );
  //     } else {
  //       loggers.operation(
  //         `Operación de membresía registrada en LA Sistemas: ${JSON.stringify(laInsertResp)}`,
  //       );
  //     }

  //     const amountVef =
  //       (finalSubscription.transactionAmount ?? 0.99) *
  //       (finalSubscription.transactionRate ?? 1);
  //     const subscriptionPayment = await SubscriptionPayment.create({
  //       user: user._id,
  //       amountVef: parseFloat(amountVef.toFixed(2)),
  //       amountUsd: finalSubscription.transactionAmount ?? 0.99,
  //       rate: finalSubscription.transactionRate ?? 1,
  //       paymentDate: new Date(),
  //       status: "paid",
  //       details: "Membresia",
  //       receiptId: finalSubscription.transactionId,
  //     });
  //     await subscriptionPayment.save();
  //   } catch (error) {
  //     loggers.operation(
  //       `Error al crear la suscripción definitiva durante el registro: ${JSON.stringify(error)}`,
  //     );
  //     console.error(
  //       "Error al crear la suscripción definitiva durante el registro:",
  //       error,
  //     );
  //     // No fallar el registro si hay error al crear la suscripción, pero loguear el error
  //   }
  // }

  return res.status(200).json({
    success: true,
    message:
      user.status == Status.Active
        ? "Registro exitoso"
        : "Su solicitud de registro está pendiente por aprobación",
    data: {
      id: user._id,
      status: user.status,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      isVerified: user.isVerified,
      accessToken:
        user.isVerified && user.status == Status.Active ? accessToken : null,
      refreshToken:
        user.isVerified && user.status == Status.Active ? refreshToken : null,
    },
  });
});

/**
 * Edit profile request
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const editProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
      code: "unauthorized",
    });
  }

  const token = await generateDbToken(user.email, "edit-profile", user._id);

  // Send email with the token
  const mailOptions = {
    from: env.SMTP_FROM,
    to: user.email,
    subject: "Modificación de perfil",
    html: editProfileTemplate(user.name.split(" ")[0], token.token),
  };

  await mailHelper.sendMail(mailOptions);

  return res.status(200).json({
    success: true,
    message: "Verification email sent successfully",
  });
});

/**
 * Edit profile confirmation
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const editProfileConfirmation = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      phone,
      email,
      address,
      gender,
      token,
      country,
      state,
      municipality,
      parish,
      street,
      housingType,
      housingName,
      zipCode,
    } = req.body;
    if (!phone || !email || !token) {
      return res.status(400).json({
        success: false,
        message: "Phone, Email and Token are required",
        code: "field_missing",
      });
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        code: "unauthorized",
      });
    }

    // Excepción para ambiente de desarrollo: si el token es "0000", no validar
    if (!(process.env.NODE_ENV === "development" && token === "0000")) {
      const tokenUser = await Token.findOne({
        user: user._id,
        token,
        type: "edit-profile",
      });
      if (!tokenUser)
        return res.status(500).json({
          success: false,
          message: "Invalid token",
          code: "invalid_token",
        });
    }

    user.phone = phone;
    user.email = email;
    user.address = address;
    if (gender !== undefined) {
      user.gender = gender;
    }

    await user.save();

    // Obtener UserAddress una sola vez con populate para reutilizarlo
    let userAddress = await UserAddress.findOne({ user: user._id })
      .populate("country", "code")
      .populate("state", "code name")
      .populate("municipality", "code name")
      .populate("parish", "code name");

    // Actualizar o crear UserAddress si se proporcionan datos de dirección
    if (
      country ||
      state ||
      municipality ||
      parish ||
      street ||
      housingType ||
      housingName ||
      zipCode
    ) {
      const addressPayload: any = {};

      // Buscar Location por code para country, state, municipality y parish
      if (country) {
        const countryLocation = await Location.findOne({
          code: country,
          type: "country",
        });
        if (countryLocation) addressPayload.country = countryLocation._id;
      }

      if (state) {
        const stateLocation = await Location.findOne({
          code: state,
          type: "state",
        });
        if (stateLocation) addressPayload.state = stateLocation._id;
      }

      if (municipality) {
        const municipalityLocation = await Location.findOne({
          code: municipality,
          type: "municipality",
        });
        if (municipalityLocation)
          addressPayload.municipality = municipalityLocation._id;
      }

      if (parish) {
        const parishLocation = await Location.findOne({
          code: parish,
          type: "parish",
        });
        if (parishLocation) addressPayload.parish = parishLocation._id;
      }

      // Agregar campos opcionales si se proporcionan
      if (street !== undefined) addressPayload.street = street;
      if (housingType !== undefined) addressPayload.housingType = housingType;
      if (housingName !== undefined) addressPayload.housingName = housingName;
      if (zipCode !== undefined) addressPayload.zipCode = zipCode;

      if (userAddress) {
        // Actualizar UserAddress existente
        Object.assign(userAddress, addressPayload);
        await userAddress.save();
        // Repoblar después de guardar para tener los datos actualizados
        await userAddress.populate([
          { path: "country", select: "code" },
          { path: "state", select: "code name" },
          { path: "municipality", select: "code name" },
          { path: "parish", select: "code name" },
        ]);
      } else {
        // Crear nuevo UserAddress
        // Si no hay país, usar el default (Venezuela - code: "721")
        if (!addressPayload.country) {
          const defaultCountry = await Location.findOne({ code: "721" });
          if (defaultCountry) addressPayload.country = defaultCountry._id;
        }

        // Solo crear si hay al menos un país
        if (addressPayload.country) {
          addressPayload.user = user._id;
          userAddress = await UserAddress.create(addressPayload);
          // Poblar después de crear
          await userAddress.populate([
            { path: "country", select: "code" },
            { path: "state", select: "code name" },
            { path: "municipality", select: "code name" },
            { path: "parish", select: "code name" },
          ]);
        }
      }
    }

    await Token.deleteMany({
      user: user._id,
      type: "edit-profile",
    });

    // Actualizar datos en LA Sistemas
    try {
      // Usar el UserAddress ya obtenido/actualizado anteriormente
      const updatedUserAddress = userAddress ? userAddress.toObject() : null;

      // Obtener valores de configuración para campos obligatorios
      const laOficinaConfig = await Config.findOne({ key: "la-oficina" });
      const laCiejecutivoConfig = await Config.findOne({
        key: "la-ciejecutivo",
      });
      const laTppersonaConfig = await Config.findOne({ key: "la-tppersona" });

      const account = await Account.findOne({ user: user._id }).populate<{
        bank: env.Bank;
      }>({
        path: "bank",
        select: "code laCode",
      });

      // Obtener bank directamente como en register
      const bank = account?.bank
        ? await Bank.findOne({ code: (account.bank as any).code })
        : null;

      console.log(updatedUserAddress?.state);
      const state = updatedUserAddress?.state
        ? (updatedUserAddress.state as any).name || undefined
        : undefined;

      let stateCode = "";
      if (state) {
        const laState = await LaModel.findOne({
          name: { $regex: state, $options: "i" },
        }).select("code");
        console.log(laState);
        if (laState) stateCode = laState.code || "";
      }

      // Preparar datos para LA Sistemas
      const clientUpdateData: ClientUpdateData = {
        // Campos obligatorios
        Apellido: user.lastname || "",
        Nombre: user.name || "",
        Rif: user.identificationType + user.document,
        Nuejecutivo: "7",
        Ejecutivo: "1",
        Ciejecutivo: laCiejecutivoConfig?.value || "001",
        Edocivil: getMaritalStatus(user.maritalStatus) || "",
        Oficina: laOficinaConfig?.value || "0001",
        Tppersona: laTppersonaConfig?.value || "1",
        Tlf1:
          typeof user.phone === "object" && user.phone?.number
            ? `${user.phone.countryCode || ""}${
                user.phone.areaCode || ""
              }${user.phone.number.replace(/^0+/, "")}`
            : typeof user.phone === "string"
              ? (user.phone as string)?.replace(/^0+/, "")
              : undefined,
        Tlf2: "",
        Tlfejecutivo: "",
        Emailejecutivo: "",
        Certifejecutivo: "",
        Fotoejecutivo: "",
        Extejecutivo: "",
        Email: user.email || undefined,
        Demail: "",
        Verificacionemail: "",
        Stat: "S",
        Riftraspaso: "",
        Fecontrato: "",
        Numcontrato: " ",
        Perfil: " ",
        Situacionlab: user.selfEmployed ? "1-DEPENDIENTE" : "2-EMPLEADO",
        Situacionlablegal: "",
        Grupo: "INV",
        Paisresid: "VE",
        /* Paisresid: updatedUserAddress?.country
          ? (updatedUserAddress.country as any).code || undefined
          : undefined, */
        Paisnac: "VE",
        Paisotro: "VE",
        Nacionalidad: "VE-VENEZOLANO",
        Estado: stateCode,
        /* Ciudad: updatedUserAddress?.municipality
          ? (updatedUserAddress.municipality as any).name || undefined
          : undefined, */
        Postal: updatedUserAddress?.zipCode || undefined,
        Profesionco: "",
        Empresa: user.enterprise?.name || "",
        Ocupacion: user.occupation || "",
        Antiguedadempresa: user.seniority ? String(user.seniority) : "",
        Dirempre1: user.enterprise?.address || "",
        Nivelacad: user.education || "",
        Banco: bank?.laCode || "",
        Cuenta: account?.number || "",
        Tpcuenta: account?.type || "",
        Publicexp: user.pep ? "S" : "N",
        Documpolitexp: user.pep ? "S" : "N",
        Cargopolitexp: user.pepInfo?.occupation || "",
        Cargoempresa: user.enterprise?.position || "",
        Apepolitexp: user.pepInfo?.name || "",
        Feingresoempresa: "",
        Rifempresa: "",
        Actividadco: "",
        Empresaref: "",
        Empleadoref: "",
        Oficinaref: "",
        Empresacoref: "",
        Empleadocoref: "",
        Oficinacoref: "",
        Institutopagot: "",
        Períodopagot: "",
        Cuentaccbu: "",
        Escotitulares: "",
        Monbasecliente: "",
        Lineatipo: "",
        Lineamonto: "",
        // Información personal
        Sexo: getGender(user.gender) || undefined,
        Nacimiento: user.birthDate
          ? (() => {
              const date = new Date(user.birthDate);
              const day = date.getDate().toString().padStart(2, "0");
              const month = (date.getMonth() + 1).toString().padStart(2, "0");
              const year = date.getFullYear();
              return `${day}/${month}/${year}`;
            })()
          : undefined,

        // Información de dirección
        Dirhabitacion1: updatedUserAddress?.street || undefined,
        Dirhabitacion2: updatedUserAddress?.housingName || undefined,
        Dirhabitacion3: updatedUserAddress?.housingType || undefined,
        Referencias: {
          Referencia: [],
        },
        Balance: {
          Ingsalario: "       0.00",
          Ingbono: "       0.00",
          Ingrenta: "       0.00",
          Inginver: "       0.00",
          Ingotros: "       0.00",
          Egrprestamos: "       0.00",
          Egrpagpend: "       0.00",
          Egrpagreg: "       0.00",
          Egrhipotecas: "       0.00",
          Egrotros: "       0.00",
          Ingpaisorigen: "",
          Ingtpfrecuencia: "",
          Ingprocedencia: "",
          Ingrecepfing: "",
          Ingrecepfotros: "",
          Ingdetalle: "",
        },
      };

      // Solo actualizar si tenemos los campos obligatorios mínimos
      if (
        clientUpdateData.Rif &&
        clientUpdateData.Apellido &&
        clientUpdateData.Nombre &&
        clientUpdateData.Ciejecutivo &&
        clientUpdateData.Oficina &&
        clientUpdateData.Tppersona
      ) {
        const laUpdateResult = await updateClientData(clientUpdateData);
        if (!laUpdateResult.success) {
          console.error(
            "Error al actualizar datos en LA Sistemas:",
            laUpdateResult.message,
            laUpdateResult.error,
          );
        }
      }
    } catch (error) {
      // No afectar la respuesta si falla la actualización en LA Sistemas
      console.error("Error al actualizar datos en LA Sistemas:", error);
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { userId: user._id },
    });
  },
);

/**
 * Edit user notifications config
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const editNotificationsConfig = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const { type, enabled } = req.body;

    const VALID_TYPES = ["email", "sms", "push", "promotions"] as const;

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type '${type}'`,
        code: "invalid_type",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "user_not_found",
      });
    }

    user.notificationsConfig[type as keyof typeof user.notificationsConfig] =
      enabled;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User notifications config updated successfully",
      data: user.notificationsConfig,
    });
  },
);

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
  const filteredBody = helper.filterObj(
    req.body,
    "name",
    "lastname",
    "identificationType",
    "document",
    "gender",
    "maritalStatus",
    "birthDate",
    "email",
    "phone",
    "education",
    "occupation",
    "dependents",
    "seniority",
    "income",
    "otherIncome",
    "selfEmployed",
    "notificationsConfig",
    "enterprise",
  );
  try {
    console.log(filteredBody);

    const user = await User.findById(req.params.userId);
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
        } else if (error.keyPattern.document) {
          message += `este documento (${error.keyValue.document}).`;
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

/**
 * Change password
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { oldPassword } = req.body;
    if (!oldPassword) {
      return res.status(400).json({
        success: false,
        message: "Old Password is required",
        code: "field_missing",
      });
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        code: "unauthorized",
      });
    }

    if (!(await bcrypt.compare(oldPassword, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Old Password is incorrect",
        code: "invalid_password",
      });
    }

    const token = await generateDbToken(
      user.email,
      "change-password",
      user._id,
    );

    // Send email with the token
    const mailOptions = {
      from: env.SMTP_FROM,
      to: user.email,
      subject: "Cambio de contraseña",
      html: changePasswordTemplate(user.name.split(" ")[0], token.token),
    };

    mailHelper.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "Verification email sent successfully",
      data: { userId: user._id },
    });
  },
);

/**
 * Change password Confirmation
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const changePasswordConfirmation = asyncHandler(
  async (req: Request, res: Response) => {
    const { newPassword, token } = req.body;
    if (!newPassword || !token) {
      return res.status(400).json({
        success: false,
        message: "Password and token are required",
        code: "field_missing",
      });
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        code: "unauthorized",
      });
    }

    // Excepción para ambiente de desarrollo: si el token es "0000", no validar
    if (!(process.env.NODE_ENV === "development" && token === "0000")) {
      const userToken = await Token.findOne({
        user: user._id,
        email: user.email,
        token,
        type: "change-password",
      });
      if (!userToken) {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
          code: "invalid_token",
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    user.password = hash;

    await user.save();

    await Token.deleteMany({
      user: user._id,
      email: user.email,
      type: "change-password",
    });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
      data: { userId: user._id },
    });
  },
);

/**
 * Unregister user
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const unregister = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const user = await User.findById(userId);

  const { motive } = req.body;

  if (!motive) {
    return res.status(400).json({
      success: false,
      message: "Motive is required",
      code: "field_missing",
    });
  }
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
      code: "user_not_found",
    });
  }

  const rif = user.identificationType + user.document;
  const debtResult = await consultDebt({ Rif: rif });

  let totalPendingAmount = 0;
  if (debtResult.success && debtResult.data?.Totales?.Totalpendiente) {
    console.log(debtResult.data);
    totalPendingAmount = parseFloat(
      debtResult.data.Totales.Totalpendiente.replace(/[^\d.-]/g, "").trim(),
    );
  }

  if (totalPendingAmount > 0) {
    return res.status(400).json({
      success: false,
      message:
        "Su usuario no puede ser desafiliado porque tiene pagos pendientes",
      code: "user_has_pending_payments",
      data: {
        totalAmount: parseFloat(totalPendingAmount.toFixed(2)),
      },
    });
  }

  user.status = Status.Deleted;
  user.statusHistory.push({
    status: Status.Deleted,
    note: motive,
    createdAt: new Date(Date.now()),
  });

  user.refreshTokens = [];
  user.pushTokens = [];
  user.pushToken = "";

  await user.save();

  // Eliminar registros de PushToken externos si existen
  await PushToken.deleteMany({ user: userId });

  return res
    .status(200)
    .json({ success: true, message: "User unregistered successfully" });
});

/**
 * Refresh token
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token is required" });
    }

    // Buscar usuario con ese refresh token
    const user = await User.findOne({
      refreshTokens: refreshToken,
      _id: userId,
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Verificar que el token sea válido (su firma y expiración)
    let payload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_SECRET, {
        algorithms: ["HS256"],
        issuer: "Pasta",
      }) as { id: string; email: string };
    } catch {
      return res
        .status(401)
        .json({ message: "Invalid or expired refresh token" });
    }

    // Rotación del refresh token (opcional, recomendado)
    // Eliminar el viejo y agregar uno nuevo
    (user as any).refreshTokens = (user as any).refreshTokens.filter(
      (t: string) => t !== refreshToken,
    );
    const newRefreshToken = jwt.sign(
      { id: user._id, email: user.email },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRE_AT,
        algorithm: "HS256",
        issuer: "Pasta",
      },
    );
    (user as any).refreshTokens.push(newRefreshToken);
    await user.save();

    // Emitir nuevo access token
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, roles: user.roles },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRE_AT,
        algorithm: "HS256",
        issuer: "Pasta",
      },
    );

    return res.status(200).json({
      message: "Refresh token successful",
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
      success: true,
    });
  },
);

/**
 * Forgot password
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Correo es requerido",
        code: "field_missing",
      });
    }

    const user = await User.findOne({ email, status: Status.Active });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Correo no encontrado en sistema",
        code: "user_not_found",
      });
    }

    const token = await generateDbToken(email, "reset", user._id);

    // Send email with the token
    const mailOptions = {
      from: env.SMTP_FROM,
      to: user.email,
      subject: "Reseteo de contraseña",
      html: forgotPasswordTemplate(user.name, token.token),
    };

    await mailHelper.sendMail(mailOptions);

    // // Send SMS with the token
    //await sendSms(user.phone, `Tu código de verificación es: ${token.token}`);

    // Send Whatsapp with the token
    //  await sendWhatsapp(user.phone, `Tu código de verificación es: ${token.token}`);

    return res
      .status(200)
      .json({ success: true, message: "success", data: { userId: user._id } });
  },
);

/**
 * Reset password
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, token, password } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
        code: "field_missing",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
        code: "field_missing",
      });
    }

    // Excepción para ambiente de desarrollo: si el token es "0000", no validar
    if (!(process.env.NODE_ENV === "development" && token === "0000")) {
      const userToken = await Token.findOne({ user: userId, token });

      if (!userToken) {
        return res.status(401).json({
          success: false,
          message: "Invalid token",
          code: "invalid_token",
        });
      }
    }

    await Token.deleteMany({ user: userId });

    const user = (await User.findById(userId))!;

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    user.password = hash;

    await user.save();

    return res
      .status(200)
      .json({ success: true, message: "Reset password successful" });
  },
);

function encodeData(data: any) {
  const formattedData = JSON.stringify(data);
  return Buffer.from(formattedData, "utf-8");
}

/**
 * Webhook didit.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const webhook = asyncHandler(async (req: Request, res: Response) => {
  try {
    const signature = req.get("X-Signature");
    const timestamp = req.get("X-Timestamp");
    // Ensure all required data is present
    if (!signature || !req.body || !env.DIDIT_WEBHOOK_SECRET_KEY) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // 4) Generate an HMAC from the raw body using your shared secret
    const hmac = crypto.createHmac("sha256", env.DIDIT_WEBHOOK_SECRET_KEY);
    const expectedSignature = hmac.update(encodeData(req.body)).digest("hex");

    // 5) Compare using timingSafeEqual for security
    const expectedSignatureBuffer = Buffer.from(expectedSignature, "utf8");
    const providedSignatureBuffer = Buffer.from(signature, "utf8");

    if (
      expectedSignatureBuffer.length !== providedSignatureBuffer.length ||
      !crypto.timingSafeEqual(expectedSignatureBuffer, providedSignatureBuffer)
    ) {
      return res.status(401).json({
        message: `Invalid signature. Computed (${expectedSignature}), Provided (${signature})`,
      });
    }

    // 6) Parse the JSON and proceed (signature is valid at this point)
    const jsonBody = req.body;
    const { session_id, status, vendor_data } = jsonBody;

    const user = await User.findOne({ sessionId: session_id });
    if (!user)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    user.isVerified = status.toLowerCase() === "approved";
    user.verificationStatus = status;

    if (user.isVerified) {
      try {
        const filename = `${user._id}_${Date.now()}`;
        const fileNameImage = await downloadImage(
          jsonBody.decision.face_match.target_image,
          path.join(env.CDN_USERS, filename),
        );
        const fileNameDocument = await downloadImage(
          jsonBody.decision.id_verification.front_image,
          path.join(env.CDN_DOCUMENTS, `1_${filename}`),
        );

        user.image = fileNameImage!;
        user.documentImages = [
          {
            documentType: "1",
            image: fileNameDocument!,
            dateOfIssue: jsonBody.decision.id_verification?.date_of_issue,
            expirationDate: jsonBody.decision.id_verification?.expiration_date,
          },
        ];
        user.identificationType =
          jsonBody.decision.id_verification?.document_number?.[0];
        await user.save();
      } catch (error) {
        console.log(error);
      }
    }

    await user.save();

    return res.json({ message: "Webhook event dispatched" });
  } catch (error) {
    console.error("Error in /webhook handler:", error);
    return res.status(500).json({ message: "Error in /webhook handler" });
  }
});

export const updateProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const diditSession = await getSessionDecision(user.sessionId);

    const filename = `${user._id}_${Date.now()}`;
    const fileNameImage = await downloadImage(
      diditSession.face_match_match.target_image,
      path.join(env.CDN_USERS, filename),
    );
    const fileNameDocument = await downloadImage(
      diditSession.id_verification.front_image,
      path.join(env.CDN_DOCUMENTS, `1_${filename}`),
    );

    user.image = fileNameImage!;
    user.documentImages = [
      {
        documentType: "1",
        image: fileNameDocument!,
        dateOfIssue: diditSession.id_verification?.date_of_issue,
        expirationDate: diditSession.id_verification?.expiration_date,
      },
    ];
    user.identificationType =
      diditSession.id_verification?.document_number?.[0];
    // user.documentImages[0].dateOfIssue = diditSession.id_verification?.date_of_issue;
    // user.documentImages[0].expirationDate = diditSession.id_verification?.expiration_date;
    await user.save();

    return res.json(diditSession);
  },
);

export const updateProfiles = asyncHandler(
  async (req: Request, res: Response) => {
    const users = await User.find({});
    let count = 0;

    users.forEach(async (user) => {
      const diditSession = await getSessionDecision(user.sessionId);
      if (diditSession) {
        if (!user.image || !user.documentImages) {
          const filename = `${user._id}_${Date.now()}`;

          if (diditSession.face_match?.target_image) {
            const fileNameImage = await downloadImage(
              diditSession.face_match.target_image,
              path.join(env.CDN_USERS, filename),
            );
            user.image = fileNameImage!;
          }

          if (diditSession.id_verification?.front_image) {
            const fileNameDocument = await downloadImage(
              diditSession.id_verification.front_image,
              path.join(env.CDN_DOCUMENTS, `1_${filename}`),
            );
            user.documentImages = [
              {
                documentType: "1",
                image: fileNameDocument!,
                dateOfIssue: diditSession.id_verification?.date_of_issue,
                expirationDate: diditSession.id_verification?.expiration_date,
              },
            ];
          }

          user.identificationType =
            diditSession.id_verification?.document_number?.[0];

          await user.save();
          count++;
        } else {
          if (user.image) {
            let filename = user.image;
            if (filename.includes("\\"))
              filename = filename.split("\\").pop() as string;
            else if (filename.includes("/"))
              filename = filename.split("/").pop() as string;
            user.image = filename;
          }
          if (user.documentImages) {
            user.documentImages.forEach((doc) => {
              let filename = doc.image;
              if (filename.includes("\\"))
                filename = filename.split("\\").pop() as string;
              else if (filename.includes("/"))
                filename = filename.split("/").pop() as string;
              doc.image = filename;
            });
          }
          await user.save();
          count++;
        }
      }
    });
    return res.json({ message: "Profiles updated successfully", count });
  },
);

export const downloadDocument = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId, image } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "user_not_found",
      });
    }
    const document = user.documentImages.find((doc) => doc.image === image);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
        code: "document_not_found",
      });
    }
    res.download(path.join(env.CDN_DOCUMENTS, image));
  },
);

export const subscribePush = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { token } = req.body;
    const user = await User.findById(userId);
    if (!user) {
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
          ownerType: "USER",
          userId: user._id,
          adminId: null,
          status: "active",
          lastUsedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    // Backward compatibility: keep last token and array in User
    user.pushToken = token;
    const current = Array.isArray((user as any).pushTokens)
      ? ((user as any).pushTokens as string[])
      : [];
    if (!current.includes(token)) current.push(token);
    (user as any).pushTokens = current;
    await user.save();

    const activeCount = await PushToken.countDocuments({
      ownerType: "USER",
      userId: user._id,
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
    const userId = req.user!.id;
    const { token } = req.body as { token: string };
    const user = await User.findById(userId);
    if (!user) {
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

    // Backward compatibility: remove from User arrays
    const current = Array.isArray((user as any).pushTokens)
      ? ((user as any).pushTokens as string[])
      : [];
    const next = current.filter((t) => t !== token);
    (user as any).pushTokens = next;
    if (user.pushToken === token) {
      user.pushToken = next[0] || (undefined as any);
    }
    await user.save();

    const activeCount = await PushToken.countDocuments({
      ownerType: "USER",
      userId: user._id,
      status: "active",
    });
    return res.json({
      success: true,
      message: "Push token unsubscribed successfully",
      data: { tokens: activeCount },
    });
  },
);

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
      code: "user_not_found",
    });
  }
  user.status = "deleted";
  user.statusHistory.push({
    status: Status.Deleted,
    note: "Deleted by admin",
    createdAt: new Date(Date.now()),
  });
  await user.save();
  return res
    .status(200)
    .json({ success: true, message: "User deleted successfully" });
});

export const verifySession = asyncHandler(
  async (req: Request, res: Response) => {
    const { sessionId } = req.body;
    let diditSession;
    try {
      diditSession = await getSessionDecision(sessionId);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Se produjo un error verificando el usuario",
        code: "verification_error",
      });
    }

    if (diditSession.status?.toLowerCase() !== "approved")
      return res.status(400).json({
        success: false,
        message: "El usuario no ha sido verificado",
        code: "user_not_verified",
        data: diditSession,
      });

    const document = diditSession.id_verification?.document_number.slice(1);

    const user = await User.findOne({ document });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "Documento ya esta registrado",
        code: "user_exists",
      });
    }

    const resultData = {
      document,
      identificationType: diditSession.id_verification?.document_number?.[0],
      name: diditSession.id_verification?.first_name,
      lastname: diditSession.id_verification?.last_name,
      birthDate: diditSession.id_verification?.date_of_birth,
      gender: diditSession.id_verification?.gender,
      maritalStatus:
        diditSession.id_verification?.marital_status?.toLowerCase(),
    };

    return res.status(200).json({
      success: true,
      message: "Sesión verificada correctamente",
      data: resultData,
    });
  },
);

export const getTermsAndConditions = asyncHandler(
  async (req: Request, res: Response) => {
    const filePath = path.join(
      env.TERMS_AND_CONDITIONS_PATH,
      "terminos-condiciones.html",
    );

    return res.status(200).json({
      success: true,
      message: "Terminos y condiciones descargados correctamente",
      data: readFileSync(filePath, "utf8"),
    });
  },
);

export const changeStatus = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const status = req.body.status;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "user_not_found",
      });
    }
    user.status = status;
    user.statusHistory.push({
      status: status,
      note: `Cambio de estado a ${status} por ${req.user?.email}`,
      createdAt: new Date(Date.now()),
    });
    await user.save();
    return res
      .status(200)
      .json({ success: true, message: "User changed successfully" });
  },
);

export const createDiditSession = asyncHandler(
  async (req: Request, res: Response) => {
    const { body } = req;

    const session = await createSession(
      body.vendorData,
      body.metadata,
      body.callback,
    );

    return res.status(200).json({
      success: true,
      message: "Sesión creada correctamente",
      data: session,
    });
  },
);

/**
 * Create user
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const { body }: { body: UserRegisterPayload } = req;

  body.isVerified = false;
  body.verificationStatus = "Not started";

  const level = await Level.findOne({ level: 1 });
  body.level = level!.level;
  body.levelName = level!.name;
  body.maxAmount = level!.creditLimit;
  body.allowedFeeCount = level!.allowedFeeCount;

  if (body.selfEmployed) delete body.enterprise;

  if (!body.account?.type || !body.account?.number || !body.account?.code)
    return res.status(500).json({
      success: false,
      message: "account required",
      code: "field_missing",
    });

  if (!body.token)
    return res.status(500).json({
      success: false,
      message: "token required",
      code: "field_missing",
    });

  if (body.password) {
    const salt = await bcrypt.genSalt(10);
    const { password } = body;
    const passwordHash = await bcrypt.hash(password, salt);
    body.password = passwordHash;
  }

  const session = await createSession(null, null, null);

  body.sessionId = session.session_id;

  const user = await User.create(body);
  try {
    const bank = await Bank.findOne({ code: body.account.code });
    const account = new Account({
      user: user._id,
      bank: bank!._id,
      type: body.account.type,
      number: body.account.number,
    });
    await account.save();
  } catch (error) {
    const userId = user._id;
    await User.findByIdAndDelete(userId);
    return res.status(500).json({ success: false, error });
  }

  // Crear UserAddress después de crear el usuario
  try {
    // Crea directamente el objeto con los campos de la dirección, sin ifs
    const addressPayload: any = {
      user: user._id,
      street: body.street,
      housingType: body.housingType,
      housingName: body.housingName,
      zipCode: body.zipCode,
    };

    // Buscar Location por code para country, state, municipality y parish
    if (body.country) {
      const country = await Location.findOne({
        code: body.country,
        type: "country",
      });
      if (country) addressPayload.country = country._id;
    }

    if (body.state) {
      const state = await Location.findOne({ code: body.state, type: "state" });
      if (state) addressPayload.state = state._id;
    }

    if (body.municipality) {
      const municipality = await Location.findOne({
        code: body.municipality,
        type: "municipality",
      });
      if (municipality) addressPayload.municipality = municipality._id;
    }

    if (body.parish) {
      const parish = await Location.findOne({
        code: body.parish,
        type: "parish",
      });
      if (parish) addressPayload.parish = parish._id;
    }

    // Si no hay país, pon el default igual que antes
    if (!addressPayload.country) {
      const defaultCountry = await Location.findOne({ code: "721" });
      if (defaultCountry) addressPayload.country = defaultCountry._id;
    }

    // Solo crea el address si country quedó bien seteado
    if (addressPayload.country) {
      await UserAddress.create(addressPayload);
    }
  } catch (error) {
    console.log(error);
  }

  //throw Error("Not implemented");
  return res.status(200).json({
    success: true,
    message: "Register successful",
    data: {
      id: user._id,
      name: user.name,
      lastname: user.lastname,
      email: user.email,
      isVerified: user.isVerified,
    },
  });
});

export const getFrequentQuestions = asyncHandler(
  async (req: Request, res: Response) => {
    const results = await FrequentQuestion.find()
      .sort({ order: 1 })
      .select("question answer -_id");
    return res.status(200).json({
      success: true,
      message: "Frequent questions retrieved successfully",
      data: results,
    });
  },
);

export const testSms = async (req: Request, res: Response) => {
  const { to, message } = req.body;
  await sendSms(to, message);
  return res
    .status(200)
    .json({ success: true, message: "SMS sent successfully" });
};

export const updateFees = async (req: Request, res: Response) => {
  const users = await User.find({});

  users.forEach(async (user) => {
    switch (user.level) {
      case 1:
        user.allowedFeeCount = [6];
        break;
      case 2:
        user.allowedFeeCount = [6, 8];
        break;
      case 3:
        user.allowedFeeCount = [6, 8, 10];
        break;
      case 4:
      case 5:
        user.allowedFeeCount = [6, 8, 10, 12];
        break;
      default:
        user.allowedFeeCount = [6];
    }
    await user.save();
  });

  return res
    .status(200)
    .json({ success: true, message: "Fees updated successfully" });
};

export const updateCountry = async (req: Request, res: Response) => {
  const users = await User.find({});

  const countryVE = await Location.findOne({ code: "721" });

  if (!countryVE) {
    return res
      .status(404)
      .json({ success: false, message: "País por defecto no encontrado" });
  }

  await Promise.all(
    users.map(async (user) => {
      const exists = await UserAddress.findOne({ user: user._id });
      if (!exists) {
        await UserAddress.create({ user: user._id, country: countryVE._id });
      }
    }),
  );

  return res
    .status(200)
    .json({ success: true, message: "Direcciones actualizadas correctamente" });
};

/**
 * Test method to update client data in LA Sistemas
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
/**
 * Get client statistics
 * Returns total clients broken down by: Vigentes (with operation), Inactivos (without operation), Vencidos, Morosos
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
const VENEZUELA_TZ = "America/Caracas";

export const getClientStatistics = asyncHandler(
  async (req: Request, res: Response) => {
    const dayMs = 24 * 60 * 60 * 1000;
    // Hoy y fechas de vencimiento en horario Venezuela para calcular diferencia de días
    const todayVEStr = formatInTimeZone(new Date(), VENEZUELA_TZ, "yyyy-MM-dd");
    const startOfTodayVE = fromZonedTime(
      `${todayVEStr}T00:00:00`,
      VENEZUELA_TZ,
    );

    // Obtener todos los usuarios activos (no eliminados)
    const activeUsers = await User.find({
      status: { $in: [Status.Active, Status.Pending] },
    }).select("_id");

    const activeUserIds = activeUsers.map((user) => user._id);

    // Cuotas no pagadas (pending, overdue, inArrears) de usuarios activos
    const unpaidPayments = await OperationPayment.find({
      user: { $in: activeUserIds },
      status: { $in: ["pending", "overdue", "inArrears"] },
    })
      .select("user date")
      .lean();

    // Por usuario: máximo atraso en días (0 = al día, >0 = días pasados desde fecha de pago)
    // Diferencia calculada en horario Venezuela
    const maxAtrasoByUser = new Map<string, number>();
    for (const p of unpaidPayments) {
      const userId = String(p.user);
      const dueDateVEStr = formatInTimeZone(
        new Date(p.date),
        VENEZUELA_TZ,
        "yyyy-MM-dd",
      );
      const startOfDueDateVE = fromZonedTime(
        `${dueDateVEStr}T00:00:00`,
        VENEZUELA_TZ,
      );
      const atraso = Math.floor(
        (startOfTodayVE.getTime() - startOfDueDateVE.getTime()) / dayMs,
      );
      const current = maxAtrasoByUser.get(userId);
      if (current === undefined || atraso > current) {
        maxAtrasoByUser.set(userId, atraso);
      }
    }

    // Clasificación excluyente por severidad: moroso > vencido > vigente
    let vigentes = 0;
    let vencidos = 0;
    let morosos = 0;
    for (const [, atraso] of maxAtrasoByUser) {
      if (atraso > 2) morosos += 1;
      else if (atraso >= 1) vencidos += 1;
      else vigentes += 1; // atraso <= 0
    }

    const inactivos = activeUserIds.length - vigentes - vencidos - morosos;

    return res.status(200).json({
      success: true,
      message: "Estadísticas de clientes obtenidas correctamente",
      data: {
        total: activeUserIds.length,
        vigentes,
        inactivos,
        vencidos,
        morosos,
      },
    });
  },
);

export const testClientUpdate = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "El id del usuario es requerido",
        code: "field_missing",
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
        code: "user_not_found",
      });
    }

    try {
      // Obtener UserAddress con populate
      const userAddress = await UserAddress.findOne({ user: user._id })
        .populate("country", "code")
        .populate("state", "code name")
        .populate("municipality", "code name")
        .populate("parish", "code name")
        .lean();

      // Obtener valores de configuración para campos obligatorios
      const laOficinaConfig = await Config.findOne({ key: "la-oficina" });
      const laCiejecutivoConfig = await Config.findOne({
        key: "la-ciejecutivo",
      });
      const laTppersonaConfig = await Config.findOne({ key: "la-tppersona" });

      const account = await Account.findOne({ user: user._id }).populate<{
        bank: env.Bank;
      }>({
        path: "bank",
        select: "code laCode",
      });

      // Obtener bank directamente como en register
      const bank = account?.bank
        ? await Bank.findOne({ code: (account.bank as any).code })
        : null;

      // Obtener código del estado desde LaModel (igual que en editProfileConfirmation)
      const state = userAddress?.state
        ? (userAddress.state as any).name || undefined
        : undefined;

      let stateCode = "";
      if (state) {
        const laState = await LaModel.findOne({
          name: { $regex: state, $options: "i" },
        }).select("code");
        if (laState) stateCode = laState.code || "";
      }

      // Preparar datos para LA Sistemas
      const clientUpdateData: ClientUpdateData = {
        // Campos obligatorios
        Apellido: user.lastname || "",
        Nombre: user.name || "",
        Rif: user.identificationType + user.document,
        Nuejecutivo: "7",
        Ejecutivo: "1",
        Ciejecutivo: laCiejecutivoConfig?.value || "001",
        Edocivil: getMaritalStatus(user.maritalStatus) || "",
        Oficina: laOficinaConfig?.value || "0001",
        Tppersona: laTppersonaConfig?.value || "1",
        Tlf1:
          typeof user.phone === "object" && user.phone?.number
            ? `${user.phone.countryCode || ""}${
                user.phone.areaCode || ""
              }${user.phone.number.replace(/^0+/, "")}`
            : typeof user.phone === "string"
              ? (user.phone as string)?.replace(/^0+/, "")
              : undefined,
        Tlf2: "",
        Tlfejecutivo: "",
        Emailejecutivo: "",
        Certifejecutivo: "",
        Fotoejecutivo: "",
        Extejecutivo: "",
        Email: user.email || undefined,
        Demail: "",
        Verificacionemail: "",
        Stat: "S",
        Riftraspaso: "",
        Fecontrato: "",
        Numcontrato: " ",
        Perfil: " ",
        Situacionlab: user.selfEmployed ? "1-DEPENDIENTE" : "2-EMPLEADO",
        Situacionlablegal: "",
        Grupo: "INV",
        Paisresid: "VE",
        Paisnac: "VE",
        Paisotro: "VE",
        Nacionalidad: "VE-VENEZOLANO",
        Estado: stateCode,
        /* Ciudad: userAddress?.municipality
          ? (userAddress.municipality as any).name || undefined
          : undefined, */
        Postal: userAddress?.zipCode || undefined,
        Profesionco: "",
        Empresa: user.enterprise?.name || "",
        Ocupacion: user.occupation || "",
        Antiguedadempresa: user.seniority ? String(user.seniority) : "",
        Dirempre1: user.enterprise?.address || "",
        Nivelacad: user.education || "",
        Banco: bank?.laCode || "",
        Cuenta: account?.number || "",
        Tpcuenta: account?.type || "",
        Publicexp: user.pep ? "S" : "N",
        Documpolitexp: user.pep ? "S" : "N",
        Cargopolitexp: user.pepInfo?.occupation || "",
        Cargoempresa: user.enterprise?.position || "",
        Apepolitexp: user.pepInfo?.name || "",
        Feingresoempresa: "",
        Rifempresa: "",
        Actividadco: "",
        Empresaref: "",
        Empleadoref: "",
        Oficinaref: "",
        Empresacoref: "",
        Empleadocoref: "",
        Oficinacoref: "",
        Institutopagot: "",
        Períodopagot: "",
        Cuentaccbu: "",
        Escotitulares: "",
        Monbasecliente: "",
        Lineatipo: "",
        Lineamonto: "",
        // Información personal
        Sexo: getGender(user.gender) || undefined,
        Nacimiento: user.birthDate
          ? (() => {
              const date = new Date(user.birthDate);
              const day = date.getDate().toString().padStart(2, "0");
              const month = (date.getMonth() + 1).toString().padStart(2, "0");
              const year = date.getFullYear();
              return `${day}/${month}/${year}`;
            })()
          : undefined,

        // Información de dirección
        Dirhabitacion1: userAddress?.street || undefined,
        Dirhabitacion2: userAddress?.housingName || undefined,
        Dirhabitacion3: userAddress?.housingType || undefined,
        Referencias: {
          Referencia: [],
        },
        Balance: {
          Ingsalario: "       0.00",
          Ingbono: "       0.00",
          Ingrenta: "       0.00",
          Inginver: "       0.00",
          Ingotros: "       0.00",
          Egrprestamos: "       0.00",
          Egrpagpend: "       0.00",
          Egrpagreg: "       0.00",
          Egrhipotecas: "       0.00",
          Egrotros: "       0.00",
          Ingpaisorigen: "",
          Ingtpfrecuencia: "",
          Ingprocedencia: "",
          Ingrecepfing: "",
          Ingrecepfotros: "",
          Ingdetalle: "",
        },
      };

      // Validar campos obligatorios
      if (
        !clientUpdateData.Rif ||
        !clientUpdateData.Apellido ||
        !clientUpdateData.Nombre ||
        !clientUpdateData.Ciejecutivo ||
        !clientUpdateData.Oficina ||
        !clientUpdateData.Tppersona
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Faltan campos obligatorios para actualizar en LA Sistemas. Verifique la configuración (la-oficina, la-ciejecutivo, la-tppersona) y los datos del usuario.",
          code: "missing_required_fields",
          data: {
            missingFields: {
              Rif: !clientUpdateData.Rif,
              Apellido: !clientUpdateData.Apellido,
              Nombre: !clientUpdateData.Nombre,
              Ciejecutivo: !clientUpdateData.Ciejecutivo,
              Oficina: !clientUpdateData.Oficina,
              Tppersona: !clientUpdateData.Tppersona,
            },
          },
        });
      }

      // Llamar al método de actualización
      const laUpdateResult = await updateClientData(clientUpdateData);

      return res.status(200).json({
        success: laUpdateResult.success,
        message: laUpdateResult.message,
        data: {
          userId: user._id,
          laResponse: laUpdateResult.data,
        },
        error: laUpdateResult.error,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Error al procesar la solicitud",
        error: error.message || error,
      });
    }
  },
);
