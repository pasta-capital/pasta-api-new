import { Request, Response } from "express";
import Operation from "../models/operation";
import asyncHandler from "../common/asyncHandler";
import { Types } from "mongoose";
import * as env from "../config/env.config";
import OperationPayment from "../models/operationPayment";
import { getRateS } from "../services/rateService";
import {
  getDaysDifference,
  getOperationPaymentStatusName,
  getOperationStatusName,
  getPaymentStatusName,
  startOfToday,
} from "../common/helper";
import { syncDebtPayments } from "../services/operationService";
import Config from "../models/config";
// Banesco - ya no integrado en el sistema
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import {
  payDebtConfirmationValidationSchema,
  payDebtValidationSchema,
} from "../validations/operation/payDebt";
import Payment from "../models/payment";
import User from "../models/User";
import Level from "../models/level";
import LevelHistory from "../models/levelHistory";
import { registerBalance } from "../services/balanceService";
import { requestOperationValidationSchema } from "../validations/operation/requestOperation";
import { icons } from "../config/data/icons";
import {
  credit,
  debitOtp,
  getRejectedCodeDescription,
  getStatusDescription,
  getTransaction,
  getTransactionResult,
  requestOtp,
  TransactionStatusCode,
} from "../services/sypagoService";
import { findPaymentMobile } from "../services/bancamigaService";
import { requestOtpValidationSchema } from "../validations/operation/requestOtp";
import Balance from "../models/balance";
import Account from "../models/Account";
import SubscriptionPayment from "../models/subscriptionPayment";
import {
  buscarCuotaPorCopasocuota,
  consultDebt,
  getPlan,
  getStatus,
  InsertOperation,
  InsertPayment,
  simulateCredit,
} from "../services/la";
import { updateCustomerStatusToActive } from "../services/customerHistoryService";

import { InsertOperationData } from "../models/la/insertOperationData";
import * as loggers from "../common/logger";
import { getScore } from "../services/userService";
import { InsertPaymentData } from "../models/la/insertPaymentData";
import { createAndSendCampaign } from "../services/notificationService";

/**
 * Request operation
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const requestOperation = asyncHandler(
  async (req: Request, res: Response) => {
    const { body } = req;

    loggers.operation("Request Operation - Inicio", {
      action: "request_operation",
      step: "start",
      userId: req.user!.id,
      body: {
        currency: body.currency,
        amount: body.amount,
        feeCount: body.feeCount,
        isThirdParty: !body.account,
        account: body.account,
      },
    });

    const { error, value } = requestOperationValidationSchema.validate(body, {
      abortEarly: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: `Error de validación: ${error.details
          .map((d) => d.message)
          .join(", ")}`,
        code: "field_missing",
      });
    }

    loggers.operation("Request Operation - Validación exitosa", {
      action: "request_operation",
      step: "validation_success",
      userId: req.user!.id,
      validatedData: value,
    });

    const creditActiveConfig = await Config.findOne({
      key: "credit-active",
    }).lean();
    if (!creditActiveConfig?.value) {
      return res.status(400).json({
        success: false,
        message:
          "El sistema de generación de operaciones de crédito no está activo en este momento. Por favor, intente mas tarde",
        code: "not_active",
      });
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "No se encontró información del cliente",
        code: "not_found",
      });
    }

    user.userAgent = req.headers["user-agent"] as string;
    const score = await getScore(user);

    loggers.operation("Request Operation - Score obtenido", {
      action: "request_operation",
      step: "score_calculated",
      userId: req.user!.id,
      score,
    });

    const minScore = await Config.findOne({ key: "min-score" }).lean();
    if (!minScore) {
      loggers.operation("Request Operation - Error: min-score no encontrado", {
        action: "request_operation",
        step: "config_error",
        userId: req.user!.id,
      });
      return res.status(400).json({
        success: false,
        message:
          "No se encontró la puntuación mínima requerida para la solicitud de crédito",
        code: "not_found",
      });
    }

    if (score < minScore.value) {
      loggers.operation("Request Operation - Score insuficiente", {
        action: "request_operation",
        step: "score_insufficient",
        userId: req.user!.id,
        score,
        minScore: minScore.value,
      });
      return res.status(400).json({
        success: false,
        message:
          "Usted no cumple con los requisitos mínimos para la solicitud de crédito",
        code: "not_met_requirements",
      });
    }

    let amountUsd, amountVef;
    const rate = await getRateS();
    const rateUsd = parseFloat(rate!.usd.toFixed(2));

    const commissionCreditConfig = await Config.findOne({
      key: "commission-credit",
    }).lean();
    const commissionCredit = commissionCreditConfig?.value ?? 0;
    const annualInterestConfig = await Config.findOne({
      key: "annual-interest",
    }).lean();

    const subPlan = await getPlan({
      Plan: "CRE",
      Subplan: "C2",
    });

    const tasa = subPlan.data.Plan.find(
      (plan: any) => plan.Codplan === "CRE",
    )?.Subplanes?.Subplan?.find(
      (subplan: any) => subplan.Codigo === "C2",
    )?.Tasafin;
    const annualInterest = tasa
      ? parseFloat(tasa.trim())
      : (annualInterestConfig?.value ?? 60);

    if (body.currency === "USD") {
      amountUsd = parseFloat(body.amount.toFixed(2));
      amountVef = parseFloat((body.amount * rateUsd).toFixed(2));
    } else {
      amountUsd = parseFloat((body.amount / rateUsd).toFixed(2));
      amountVef = parseFloat(body.amount.toFixed(2));
    }

    if (amountUsd > user.maxAmount && !env.TESTING) {
      return res.status(400).json({
        success: false,
        message:
          "La cantidad solicitada excede el máximo permitido para el usuario",
        code: "max_amount_exceeded",
      });
    }
    if (!user.allowedFeeCount.includes(body.feeCount)) {
      return res.status(400).json({
        success: false,
        message: "El número de cuotas es inválido",
        code: "fee_count_invalid",
      });
    }

    // TODO: Cambiar busqueda de deudas hacia LA para obtener el total de deudas del usuario

    const amountPending = await OperationPayment.aggregate([
      {
        $match: {
          user: new Types.ObjectId(req.user!.id),
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

    if (totalPendingAmount + amountUsd > user.maxAmount) {
      return res.status(400).json({
        success: false,
        message:
          "La cantidad solicitada excede el máximo permitido para el usuario",
        code: "max_amount_exceeded",
      });
    }

    const commissionAmount = parseFloat(
      ((amountVef * commissionCredit) / (100 + commissionCredit)).toFixed(2),
    );
    const settledAmount = parseFloat((amountVef - commissionAmount).toFixed(2));

    const expireAt = new Date();
    expireAt.setSeconds(expireAt.getSeconds() + env.OPERATION_EXPIRE_AT);

    const operationData: any = {
      user: req.user!.id,
      currency: body.currency,
      amountVef: amountVef,
      rate: rateUsd,
      amountUsd: amountUsd,
      annualCommission: annualInterest,
      commissionAmount: commissionAmount,
      settledAmount: settledAmount,
      feeCount: body.feeCount,
      isThirdParty: !body.account,
      //beneficiary: body.isThirdParty ? body.beneficiary : undefined,
      beneficiary: body.beneficiary,
      status: "void",
      expireAt: expireAt,
      userAgent: user.userAgent,
      score: score,
    };

    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const iniDate = `${day}/${month}/${year}`;

    const simulateData = {
      NuContrato: "0", // Valor por defecto para simulación
      SubPlan: "C2", // Valor por defecto para simulación
      Valor: amountUsd.toFixed(2),
      Financiar: amountUsd.toFixed(2),
      Ini: iniDate,
      Plazo: body.feeCount.toString(),
      Tasa: annualInterest.toString(),
      DiaMes: iniDate,
    };

    loggers.operation("Request Operation - Iniciando simulación de crédito", {
      action: "request_operation",
      step: "simulate_credit_start",
      userId: req.user!.id,
      simulateData,
      calculatedAmounts: {
        amountUsd,
        amountVef,
        rateUsd,
        commissionAmount,
        settledAmount,
        annualInterest,
      },
    });

    const result = await simulateCredit(simulateData);

    if (!result.success) {
      loggers.operation("Request Operation - Error en simulación", {
        action: "request_operation",
        step: "simulate_credit_error",
        userId: req.user!.id,
        error: result.message,
        data: result.data,
      });
      return res.status(400).json({
        success: false,
        message: result.message,
        code: "error",
      });
    }

    loggers.operation("Request Operation - Simulación exitosa", {
      action: "request_operation",
      step: "simulate_credit_success",
      userId: req.user!.id,
      result: {
        success: result.success,
        message: result.message,
        hasCronograma: !!result.data?.Cronograma,
      },
    });

    const operationPayments = result.data.Cronograma?.Lineas?.Linea?.map(
      (payment: any) => ({
        date: (() => {
          const [day, month, year] = payment.Fecha.split("/").map(Number);
          return new Date(year, month - 1, day);
        })(),
        amountUsd: parseFloat(
          payment.Cuota.replace("Ult.", "").replace(/[^\d.-]/g, ""),
        ),
      }),
    );

    if (body.account) {
      const account = await Account.findOne({
        user: req.user!.id,
        _id: body.account,
      })
        .populate("bank")
        .lean()
        .exec();

      if (!account) {
        return res.status(400).json({
          success: false,
          message: "Cuenta escogida no encontrada",
          code: "not_found",
        });
      }
      operationData.account = account;
    }

    const operation = new Operation(operationData);
    const savedOperation = await operation.save();

    operationData.id = savedOperation._id;

    loggers.operation("Request Operation - Operación creada exitosamente", {
      action: "request_operation",
      step: "operation_created",
      userId: req.user!.id,
      operationId: String(savedOperation._id),
      operationData: {
        currency: operationData.currency,
        amountUsd: operationData.amountUsd,
        amountVef: operationData.amountVef,
        settledAmount: operationData.settledAmount,
        feeCount: operationData.feeCount,
        isThirdParty: operationData.isThirdParty,
        status: operationData.status,
        score: operationData.score,
      },
      paymentPlanCount: operationPayments?.length || 0,
    });

    const respData = {
      id: operationData.id,
      currency: operationData.currency,
      amountVef: operationData.settledAmount,
      rate: operationData.rate,
      amountUsd: operationData.amountUsd,
      feeCount: operationData.feeCount,
      isThirdParty: operationData.isThirdParty,
      beneficiary: operationData.beneficiary,
      account: operationData.account
        ? {
            bankCode: operationData.account.bank.code,
            identificationType: user.identificationType,
            identificationNumber: user.document,
            number: operationData.account.number,
            name: operationData.account.bank.name,
          }
        : undefined,
      paymentPlan: operationPayments.map((operationPayment: any) => ({
        date: operationPayment.date,
        amount: operationPayment.amountUsd,
      })),
    };

    return res.status(201).json({
      success: true,
      message: "Operation created successfully",
      data: respData,
    });
  },
);

export const getInstallmentSimulation = asyncHandler(
  async (req: Request, res: Response) => {
    const amountUsdParam = req.query.amountUsd as string;
    const feeCountParam = req.query.feeCount as string;

    if (!amountUsdParam || !feeCountParam) {
      return res.status(400).json({
        success: false,
        message: "Parámetros 'amountUsd' y 'feeCount' son requeridos",
        code: "field_missing",
      });
    }

    const amountUsd = parseFloat(amountUsdParam);
    const feeCount = parseInt(feeCountParam, 10);

    if (
      Number.isNaN(amountUsd) ||
      Number.isNaN(feeCount) ||
      amountUsd <= 0 ||
      feeCount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Parámetros inválidos: 'amountUsd' debe ser > 0 y 'feeCount' entero > 0",
        code: "validation",
      });
    }

    // Obtener la tasa de interés anual de la configuración
    const annualInterestConfig = await Config.findOne({
      key: "annual-interest",
    }).lean();

    // Obtener la fecha actual y formatearla como DD/MM/YYYY
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const iniDate = `${day}/${month}/${year}`;

    const subPlan = await getPlan({
      Plan: "CRE",
      Subplan: "C2",
    });

    const tasa = subPlan.data.Plan.find(
      (plan: any) => plan.Codplan === "CRE",
    )?.Subplanes?.Subplan?.find(
      (subplan: any) => subplan.Codigo === "C2",
    )?.Tasafin;
    const annualInterest = tasa
      ? parseFloat(tasa.trim())
      : (annualInterestConfig?.value ?? 60);

    // Preparar los datos para la simulación
    // Nota: NuContrato y SubPlan pueden necesitar valores por defecto o venir de configuración
    // Por ahora usamos valores por defecto para la simulación
    const result = await simulateCredit({
      NuContrato: "0", // Valor por defecto para simulación
      SubPlan: "C2", // Valor por defecto para simulación
      Valor: amountUsd.toFixed(2),
      Financiar: amountUsd.toFixed(2),
      Ini: iniDate,
      Plazo: feeCount.toString(),
      Tasa: annualInterest,
      DiaMes: iniDate,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        code: "error",
      });
    }

    const payments = result.data.Cronograma?.Lineas?.Linea?.map(
      (payment: any) => ({
        // Parsear string MM/DD/YYYY correctamente
        date: (() => {
          const [day, month, year] = payment.Fecha.split("/").map(Number);
          return new Date(year, month - 1, day);
        })(),
        amountUsd: parseFloat(payment.Cuota),
      }),
    );

    return res.status(200).json({
      success: true,
      data: payments,
      message: "Plan de cuotas simulado",
    });
  },
);

/**
 * Get tasa financiera
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getTasaFinanciera = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const annualInterestConfig = await Config.findOne({
        key: "annual-interest",
      }).lean();

      const annualInterest = annualInterestConfig?.value ?? 60;

      if (!annualInterest) {
        return res.status(404).json({
          success: false,
          message: `No se encontró la tasa anual de interés`,
          code: "not_found",
        });
      }

      return res.status(200).json({
        success: true,
        data: annualInterest,
        message: "Tasa anual obtenida exitosamente",
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: "Error al obtener la tasa financiera",
        code: "internal_error",
        error: error.message,
      });
    }
  },
);

/**
 * Confirm operation
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const confirmOperation = asyncHandler(
  async (req: Request, res: Response) => {
    const { body } = req;

    loggers.operation("Confirm Operation - Inicio", {
      action: "confirm_operation",
      step: "start",
      userId: req.user!.id,
      operationId: body.operationId,
    });

    if (!body.operationId) {
      loggers.operation("Confirm Operation - Error: operationId faltante", {
        action: "confirm_operation",
        step: "validation_error",
        userId: req.user!.id,
      });
      return res.status(400).json({
        success: false,
        message: "Campo 'operationId' es requerido",
        code: "field_missing",
      });
    }

    const operation = await Operation.findById(body.operationId).populate(
      "user account.bank",
    );
    if (!operation) {
      loggers.operation("Confirm Operation - Error: Operación no encontrada", {
        action: "confirm_operation",
        step: "operation_not_found",
        userId: req.user!.id,
        operationId: body.operationId,
      });
      return res.status(404).json({
        success: false,
        message: "No se encontró la operación",
        code: "not_found",
      });
    }

    if (operation.status !== "void") {
      loggers.operation("Confirm Operation - Error: Estado inválido", {
        action: "confirm_operation",
        step: "invalid_status",
        userId: req.user!.id,
        operationId: body.operationId,
        currentStatus: operation.status,
      });
      return res.status(400).json({
        success: false,
        message: "La operación tiene estatus no válido",
        code: "invalid_status",
      });
    }

    const now = new Date();
    const todayOperationsCount = await Operation.countDocuments({
      status: "approved",
      createdAt: {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      },
    });

    const diferenciaMilisegundos = Math.abs(
      now.getTime() - new Date(1983, 11, 30).getTime(),
    );
    const milisegundosPorDia = 1000 * 60 * 60 * 24;
    const diferenciaDias = Math.floor(
      diferenciaMilisegundos / milisegundosPorDia,
    );

    const operationCount = await Operation.countDocuments({
      user: operation.user,
      status: { $nin: ["void", "rejected"] },
    });

    const reference = `${diferenciaDias}${String(
      todayOperationsCount + 1,
    ).padStart(5, "0")}`;

    const type = !operation.isThirdParty ? "CNTA" : "CELE";
    const number = !operation.isThirdParty
      ? operation.account.number
      : operation.beneficiary?.phone;
    const bankCode = !operation.isThirdParty
      ? operation.account.bank.code
      : operation.beneficiary?.bankCode;

    const identificationType = !operation.isThirdParty
      ? operation.account.number === "00017495563424733075"
        ? "V"
        : operation.user.identificationType
      : operation.beneficiary?.identificationType;
    const document = !operation.isThirdParty
      ? operation.account.number === "00017495563424733075"
        ? "15854963"
        : operation.user.document
      : operation.beneficiary?.identificationNumber;

    // #TODO: BEGIN LA INSERT OPERATION
    const day = String(operation.createdAt.getDate()).padStart(2, "0");
    const month = String(operation.createdAt.getMonth() + 1).padStart(2, "0");
    const year = operation.createdAt.getFullYear();
    const iniDate = `${day}/${month}/${year}`;

    const insertOperationData: InsertOperationData = {
      Rif: operation.user.identificationType + operation.user.document,
      Validagraba: "G",
      Producto: "C2",
      Moneda: "1",
      Monefec: "0",
      Comi: (-(operation.commissionAmount ?? 0)).toFixed(2),
      Inicio: iniDate,
      Venc: iniDate,
      Cuotas: operation.feeCount.toString(),
      Monto: operation.amountUsd.toFixed(2),
      Tpcambio: operation.rate.toString(),
      Tasa: operation.annualCommission.toString(),
      Fpago: "1",
      // Refer: transaction.data.ref_ibp ?? reference,
      Refer: "",
      Tpint: "V",
      Numesa: "1",
      Nuveh: "1",
      // Nucorre: "1",
      Nucorre: "",
      Tipomm: "0",
      Copaso: "",
    };
    const insertOperationResult = await InsertOperation(insertOperationData);
    if (!insertOperationResult.success) {
      loggers.error("Error al insertar la operación en LA", {
        error: insertOperationResult.message,
        data: insertOperationResult.data,
      });

      return res.status(400).json({
        success: false,
        message: `Error al insertar la operación en LA - /WInserta_transacMMCred: ${insertOperationResult.message}`,
        code: "error",
        error: insertOperationResult.error ?? "",
      });
    }
    // #TODO: END LA INSERT OPERATION

    // Sincronizar cuotas desde LA Sistemas 3 veces
    const rif = operation.user.identificationType + operation.user.document;
    let syncDebtPaymentsResult = false;
    // #TODO: Execute this task in background : syncDebtPayments, SyPago Credit and Push Notifications
    (async () => {
      const maxRetries = 3;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        syncDebtPaymentsResult = await syncDebtPayments(
          String(operation._id),
          rif,
        );
        if (syncDebtPaymentsResult) {
          break;
        } else {
          loggers.operation(
            `Sincronización inicial de deuda fallida (Intento ${attempt}/${maxRetries}) - OperationId : ${operation._id}`,
            {
              action: "confirm_operation",
              step: "sync_debt_retry",
              operationId: operation._id,
              attempt,
            },
          );
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, 30000));
          } else {
            loggers.operation(
              "Sincronización de deuda fallida, se reintentará mediante scheduler",
              {
                action: "confirm_operation",
                step: "sync_debt_retry_scheduled",
                operationId: operation._id,
              },
            );
          }
        }
      }

      if (!syncDebtPaymentsResult) {
        //Send PushNotifications
        const pushNotification = {
          audience: "USER",
          infoType: "ERROR",
          type: "MOBILE",
          title: "Operación fallida",
          description: "Tu pasta no se ha podido procesar, intenta nuevamente",
          users: [new Types.ObjectId(operation.user._id)],
          status: "scheduled",
          isPromotional: false,
        };
        await createAndSendCampaign(pushNotification);
      }

      /** #TODO: CREDIT BEGIN SYPAGO*/
      const sypagoCreditBody = {
        internal_id: reference,
        account: {
          bank_code: env.SYPAGO_BANK_ACCOUNT_CODE!,
          type: "CNTA",
          number: env.SYPAGO_BANK_ACCOUNT_NUMBER!,
        },
        sub_product: env.SYPAGO_CREDIT_SUBPRODUCT_ID!,
        amount: {
          amt: operation.settledAmount,
          currency: "VES",
        },
        notification_urls: {
          web_hook_endpoint: env.SYPAGO_WEBHOOK_URL!,
        },
        receiving_user: {
          name: "Test User",
          document_info: {
            type: identificationType,
            number: document,
          },
          account: {
            bank_code: bankCode,
            type: type,
            number: number,
          },
        },
        concept: "Pago movil",
      };

      loggers.operation("Confirm Operation - Iniciando crédito Sypago", {
        action: "confirm_operation",
        step: "sypago_credit_start",
        userId: req.user!.id,
        operationId: body.operationId,
        reference,
        sypagoCreditBody: {
          internal_id: sypagoCreditBody.internal_id,
          amount: sypagoCreditBody.amount,
          receiving_user: {
            document_info: sypagoCreditBody.receiving_user.document_info,
            account: {
              bank_code: sypagoCreditBody.receiving_user.account.bank_code,
              type: sypagoCreditBody.receiving_user.account.type,
            },
          },
        },
      });

      const creditTransaction = await credit(sypagoCreditBody);

      loggers.operation("Confirm Operation - Respuesta crédito Sypago", {
        action: "confirm_operation",
        step: "sypago_credit_response",
        userId: req.user!.id,
        operationId: body.operationId,
        success: creditTransaction.success,
        transactionId: creditTransaction.data?.transaction_id,
        message: creditTransaction.message,
      });

      if (!creditTransaction.success) {
        loggers.operation("Confirm Operation - Error en crédito Sypago", {
          action: "confirm_operation",
          step: "sypago_credit_error",
          userId: req.user!.id,
          operationId: body.operationId,
          error: creditTransaction.message,
          data: creditTransaction.data,
        });
        return res.status(400).json({
          success: false,
          message: "Error al generar la transacción",
          code: "error",
          error: creditTransaction.message,
        });
      }
      operation.sypagoId = creditTransaction.data.transaction_id;

      loggers.operation(
        "Confirm Operation - Obteniendo resultado de transacción",
        {
          action: "confirm_operation",
          step: "get_transaction_result_start",
          userId: req.user!.id,
          operationId: body.operationId,
          transactionId: creditTransaction.data.transaction_id,
        },
      );

      /**GET SYPAGO TRANSACTION RESULT */
      const transaction = await getTransactionResult(
        creditTransaction.data.transaction_id,
      );

      loggers.operation(
        "Confirm Operation - Resultado de transacción obtenido",
        {
          action: "confirm_operation",
          step: "get_transaction_result_response",
          userId: req.user!.id,
          operationId: body.operationId,
          success: transaction.success,
          status: transaction.data?.status,
          rejectedCode: transaction.data?.rejected_code,
        },
      );

      if (!transaction.success) {
        loggers.operation("Confirm Operation - Error obteniendo transacción", {
          action: "confirm_operation",
          step: "get_transaction_result_error",
          userId: req.user!.id,
          operationId: body.operationId,
          error: transaction.message,
        });
        return res.status(400).json({
          success: false,
          message: "Error al obtener la transacción",
          code: "error",
          error: transaction.message,
        });
      }

      if (transaction.data.status !== TransactionStatusCode.ACCP) {
        loggers.operation("Confirm Operation - Transacción rechazada", {
          action: "confirm_operation",
          step: "transaction_rejected",
          userId: req.user!.id,
          operationId: body.operationId,
          status: transaction.data.status,
          rejectedCode: transaction.data.rejected_code,
          statusDescription: getStatusDescription(transaction.data.status),
          rejectedDescription: getRejectedCodeDescription(
            transaction.data.rejected_code,
          ),
        });
        return res.status(400).json({
          success: false,
          message:
            "La transacción no está aprobada - " +
            getRejectedCodeDescription(transaction.data.rejected_code),
          code: "error",
          error: getStatusDescription(transaction.data.status),
        });
      }
      /** #TODO: CREDIT END SYPAGO*/

      //#TODO: BEGIN INSERT PAYMENT DATA
      const insertPaymentCommissionBody: InsertPaymentData = {
        Rif: operation.user.identificationType + operation.user.document,
        Val_gra: "G",
        FlEmi: iniDate,
        FlDisp: iniDate,
        Cuenta: "",
        Concepto: "Comisión por desembolso",
        TpPaso: "E",
        Nunota: reference,
        Refer: transaction.data.ref_ibp ?? reference,
        Nurefer: "",
        Nucorre: 1,
        Fpago: 3,
        Monto: operation.commissionAmount.toFixed(2).replace(".", ","),
        Tpcambio: "1",
        Copaso: "",
        Nupaso: 0,
        Statusabono: 1,
        Statusliq: "B",
        Statusoper: "N",
        Codcontrap: "640201",
      };

      const insertPaymentCommissionResult = await InsertPayment(
        insertPaymentCommissionBody,
      );
      if (!insertPaymentCommissionResult.success) {
        loggers.error("Error al insertar la comisión en LA", {
          error: insertPaymentCommissionResult.message,
          data: insertPaymentCommissionResult.data,
        });
      }

      operation.laCopaso = insertOperationResult?.data?.Copaso ?? "";
      operation.internalReference = reference;
      operation.sypagoId = transaction.data.transaction_id;
      operation.reference = transaction.data.ref_ibp ?? reference;
      operation.status = "approved";
      operation.expireAt = undefined;
      operation.comment = body.comment;
      operation.icon = icons[operationCount % icons.length];
      await operation.save();
      await updateCustomerStatusToActive(req.user!.id);

      loggers.operation("Confirm Operation - Operación aprobada exitosamente", {
        action: "confirm_operation",
        step: "operation_approved",
        userId: req.user!.id,
        operationId: body.operationId,
        operationData: {
          status: operation.status,
          reference: operation.reference,
          sypagoId: operation.sypagoId,
          laCopaso: operation.laCopaso,
          icon: operation.icon,
        },
        transactionData: {
          transactionId: transaction.data.transaction_id,
          refIbp: transaction.data.ref_ibp,
          status: transaction.data.status,
        },
      });
      // #TODO: END INSERT PAYMENT DATA

      // #TODO: SEND PUSH NOTIFICATIONS TO CONFIRM THE USER THE OPERATION
      const pushNotification = {
        audience: "USER",
        infoType: "SUCCESS",
        type: "MOBILE",
        title: "Operación exitosa",
        description:
          "Tu pasta se ha procesado exitosamente, verifica tu cuenta",
        users: [new Types.ObjectId(operation.user._id)],
        status: "scheduled",
        isPromotional: false,
      };
      await createAndSendCampaign(pushNotification);
    })();
    res.status(200).json({ success: true, message: "Operación confirmada" });
  },
);

/**
 * Get completed operations
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getCompletedOperations = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit as string) || 10; // Default to 10 items per page if not provided
    const skip = (page - 1) * limit;
    const filter: any = {
      user: userId,
      status: "completed",
    };
    const totalCount = await Operation.countDocuments(filter);

    const operations = await Operation.find({
      user: userId,
      status: "completed",
    })
      .select("reference createdAt currency amountUsd amountVef status icon")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const formattedOperations = operations.map((operation) => {
      return {
        id: operation._id,
        reference: operation.reference,
        createdAt: operation.createdAt,
        amount: operation.amountUsd,
        status: operation.status,
        statusName: "Finalizado",
        //iconUrl: `${env.PUBLIC_API_URL}/icons/${operation.icon}-white.png`,
        iconUrl: `${operation.icon}`,
      };
    });

    res.status(200).json({
      success: true,
      message: "Operaciones finalizadas",
      data: formattedOperations,
      totalCount: totalCount,
    });
  },
);

/**
 * Get active operations
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getActiveOperations = asyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit as string) || 10; // Default to 10 items per page if not provided
    const skip = (page - 1) * limit;

    const userId = req.user!.id;
    const filter: any = {
      user: userId,
      status: { $in: ["pending", "approved"] },
    };
    const totalCount = await Operation.countDocuments(filter);

    const operations = await Operation.find(filter)
      .select("reference createdAt currency amountUsd amountVef status icon")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const formattedOperations = operations.map((operation) => {
      return {
        id: operation._id,
        reference: operation.reference,
        createdAt: operation.createdAt,
        amount: operation.amountUsd,
        status: operation.status,
        // iconUrl: `${env.PUBLIC_API_URL}/icons/${operation.icon}-white.png`,
        iconUrl: `${operation.icon}`,
        statusName:
          operation.status === "pending"
            ? "En proceso"
            : operation.status === "approved"
              ? "Aprobado"
              : "Desconocido",
      };
    });

    res.status(200).json({
      success: true,
      message: "Operaciones activas",
      data: formattedOperations,
      totalCount: totalCount,
    });
  },
);

/**
 * Get operation details
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getOperationDetails = asyncHandler(
  async (req: Request, res: Response) => {
    const { operationId } = req.params;
    const userId = req.user!.id;
    if (!operationId) {
      return res.status(400).json({
        success: false,
        message: "Campo 'operationId' es requerido",
        code: "field_missing",
      });
    }

    const operation = await Operation.findOne({
      user: userId,
      _id: operationId,
    })
      .select(
        "reference createdAt amountUsd amountVef settledAmount rate feeCount account comment",
      )
      .populate({
        path: "account.bank",
        select: "name",
      })
      .lean()
      .exec();

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: "Operación no encontrada",
        code: "not_found",
      });
    }

    // Obtener datos del usuario para construir el RIF
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
        code: "not_found",
      });
    }

    const rif = user.identificationType + user.document;

    // Consultar deuda en LA Sistemas
    const debtResult = await consultDebt({ Rif: rif });

    if (!debtResult.success) {
      return res.status(400).json({
        success: false,
        message: debtResult.message,
        code: "error",
      });
    }

    // Buscar la posición que corresponde a esta operación por referencia
    const posiciones = debtResult.data?.Posiciones?.Posicion || [];
    const posicionesArray = Array.isArray(posiciones)
      ? posiciones
      : [posiciones];

    const posicion = posicionesArray.find(
      (p) => p.Refapertura === operation.reference,
    );

    // Extraer cuotas de la posición encontrada
    let paymentPlan: any[] = [];
    if (posicion && posicion.Cuotas?.Cuota) {
      const cuotas = posicion.Cuotas.Cuota;
      const cuotasArray = Array.isArray(cuotas) ? cuotas : [cuotas];

      paymentPlan = cuotasArray.map((cuota) => {
        // Parsear la fecha DD/MM/YYYY
        const [day, month, year] = cuota.Fechacuota.split("/").map(Number);
        const fechaCuota = new Date(year, month - 1, day);

        // Parsear el monto (viene con espacios y formato numérico)
        const montoCuota = parseFloat(
          cuota.Montocuota.replace(/[^\d.-]/g, "").trim(),
        );

        // Mapear status de LA Sistemas a nuestro formato
        let status = "pending";
        const statusLA = cuota.Status?.toLowerCase() || "";
        if (statusLA.includes("pendiente")) {
          status = "pending";
        } else if (statusLA.includes("pagad")) {
          status = "paid";
        } else if (statusLA.includes("vencid")) {
          status = "overdue";
        } else if (statusLA.includes("mora")) {
          status = "inArrears";
        }

        return {
          id: cuota.Copasocuota,
          date: fechaCuota,
          status: status,
          statusName: getOperationPaymentStatusName(status),
          amount: montoCuota,
          points:
            status === "pending"
              ? montoCuota *
                (getDaysDifference(fechaCuota, new Date()) >= 5 ? 2 : 1)
              : 0,
        };
      });
    }

    const formattedOperation = {
      reference: operation.reference,
      createdAt: operation.createdAt,
      amountUsd: operation.amountUsd,
      amountVef: operation.settledAmount,
      rate: operation.rate,
      feeCount: operation.feeCount,
      account:
        operation.account && operation.account.bank
          ? `${operation.account.bank.name} ${operation.account.number.slice(
              -4,
            )}`
          : null,
      beneficiary: operation.beneficiary,
      comment: operation.comment,
      paymentPlan: paymentPlan,
    };

    res.status(200).json({
      success: true,
      message: "Detalles de la operación",
      data: formattedOperation,
    });
  },
);

export const getOperationDetailsById = asyncHandler(
  async (req: Request, res: Response) => {
    const { operationId } = req.params;

    if (!operationId) {
      return res.status(400).json({
        success: false,
        message: "Campo 'operationId' es requerido",
        code: "field_missing",
      });
    }

    const operation = await Operation.findOne({
      _id: operationId,
    })
      .populate("user", "name lastname email identificationType document")
      .populate({
        path: "account.bank",
        select: "name",
      })
      .lean()
      .exec();

    if (!operation) {
      return res.status(404).json({
        success: false,
        message: "Operación no encontrada",
        code: "not_found",
      });
    }

    // Obtener datos del usuario para construir el RIF
    if (!operation.user) {
      return res.status(404).json({
        success: false,
        message: "Usuario de la operación no encontrado",
        code: "not_found",
      });
    }

    const user = operation.user as any;
    const rif = user.identificationType + user.document;

    // Consultar deuda en LA Sistemas
    const debtResult = await consultDebt({ Rif: rif });

    if (!debtResult.success) {
      return res.status(400).json({
        success: false,
        message: debtResult.message,
        code: "error",
      });
    }

    // Buscar la posición que corresponde a esta operación por referencia
    const posiciones = debtResult.data?.Posiciones?.Posicion || [];
    const posicionesArray = Array.isArray(posiciones)
      ? posiciones
      : [posiciones];

    const posicion = posicionesArray.find(
      (p) => p.Refapertura === operation.reference,
    );

    // Extraer cuotas de la posición encontrada
    let paymentPlan: any[] = [];
    if (posicion && posicion.Cuotas?.Cuota) {
      const cuotas = posicion.Cuotas.Cuota;
      const cuotasArray = Array.isArray(cuotas) ? cuotas : [cuotas];

      paymentPlan = cuotasArray.map((cuota) => {
        // Parsear la fecha DD/MM/YYYY
        const [day, month, year] = cuota.Fechacuota.split("/").map(Number);
        const fechaCuota = new Date(year, month - 1, day);

        // Parsear el monto (viene con espacios y formato numérico)
        const montoCuota = parseFloat(
          cuota.Montocuota.replace(/[^\d.-]/g, "").trim(),
        );

        // Mapear status de LA Sistemas a nuestro formato
        let status = "pending";
        const statusLA = cuota.Status?.toLowerCase() || "";
        if (statusLA.includes("pendiente")) {
          status = "pending";
        } else if (statusLA.includes("pagad")) {
          status = "paid";
        } else if (statusLA.includes("vencid")) {
          status = "overdue";
        } else if (statusLA.includes("mora")) {
          status = "inArrears";
        }

        // Parsear fecha de pago si existe
        let paidAt = null;
        if (cuota.Fechapago && cuota.Fechapago.trim() !== "") {
          const [dayPaid, monthPaid, yearPaid] =
            cuota.Fechapago.split("/").map(Number);
          paidAt = new Date(yearPaid, monthPaid - 1, dayPaid);
        }

        return {
          id: cuota.Copasocuota,
          date: fechaCuota,
          paidAt: paidAt,
          status: status,
          statusName: getOperationPaymentStatusName(status),
          amount: montoCuota,
          points:
            status === "pending"
              ? montoCuota *
                (getDaysDifference(fechaCuota, new Date()) >= 5 ? 2 : 1)
              : 0,
        };
      });
    }

    const formattedOperation = {
      reference: operation.reference,
      createdAt: operation.createdAt,
      amountUsd: operation.amountUsd,
      amountVef: operation.amountVef,
      commissionAmount: operation.commissionAmount,
      settledAmount: operation.settledAmount,
      rate: operation.rate,
      feeCount: operation.feeCount,
      account:
        operation.account && operation.account.bank
          ? `${operation.account.bank.name} ${operation.account.number.slice(
              -4,
            )}`
          : null,
      beneficiary: operation.beneficiary,
      comment: operation.comment,
      clientName: user.name + " " + user.lastname,
      clientEmail: user.email,
      statusName: getOperationStatusName(operation.status),
      status: operation.status,
      paymentPlan: paymentPlan,
    };

    res.status(200).json({
      success: true,
      message: "Detalles de la operación",
      data: formattedOperation,
    });
  },
);

export const getOperationPaymentsWithTotal = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    // Obtener datos del usuario para construir el RIF
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Usuario no encontrado",
        code: "not_found",
      });
    }

    const rif = user.identificationType + user.document;

    // Consultar deuda en LA Sistemas
    const debtResult = await consultDebt({ Rif: rif });

    if (!debtResult.success) {
      return res.status(400).json({
        success: false,
        message: debtResult.message,
        code: "error",
      });
    }

    // Extraer referencias únicas de todas las posiciones para buscar iconos
    const posiciones = debtResult.data?.Posiciones?.Posicion || [];
    const posicionesArray = Array.isArray(posiciones)
      ? posiciones
      : [posiciones];

    const referencias = posicionesArray
      .map((p) => p.Refapertura)
      .filter((ref) => ref && ref.trim() !== "");

    // Buscar operaciones por referencia para obtener los iconos
    const operations = await Operation.find({
      reference: { $in: referencias },
    })
      .select("reference icon")
      .lean();

    // Crear mapa de referencia -> icon
    const referenceToIconMap = new Map<string, string>();
    for (const op of operations) {
      if (op.reference && op.icon) {
        referenceToIconMap.set(op.reference, op.icon);
      }
    }

    // Extraer cuotas de todas las posiciones
    let allPayments: any[] = [];
    for (const posicion of posicionesArray) {
      // Verificar si hay cuotas
      if (!posicion.Cuotas?.Cuota) continue;

      const cuotas = posicion.Cuotas.Cuota;
      // Asegurar que sea un array (a veces puede venir como objeto si es solo uno)
      const cuotasArray = Array.isArray(cuotas) ? cuotas : [cuotas];

      // Obtener el icono de la operación si existe
      const operationIcon = posicion.Refapertura
        ? referenceToIconMap.get(posicion.Refapertura)
        : null;
      const iconUrl = operationIcon
        ? // ? `${env.PUBLIC_API_URL}/icons/${operationIcon}-white.png`
          `${operationIcon}`
        : null;

      for (const cuota of cuotasArray) {
        // Parsear la fecha DD/MM/YYYY
        const [day, month, year] = cuota.Fechacuota.split("/").map(Number);
        const fechaCuota = new Date(year, month - 1, day);

        // Parsear el monto (viene con espacios y formato numérico)
        const montoCuota = parseFloat(
          cuota.Montocuota.replace(/[^\d.-]/g, "").trim(),
        );

        // Mapear status de LA Sistemas a nuestro formato
        let status = "pending";
        const statusLA = cuota.Status?.toLowerCase() || "";
        if (statusLA.includes("pendiente")) {
          status = "pending";
        } else if (statusLA.includes("pagad")) {
          status = "paid";
        } else if (statusLA.includes("vencid")) {
          status = "overdue";
        } else if (statusLA.includes("mora")) {
          status = "inArrears";
        }

        if (status !== "paid") {
          allPayments.push({
            id: cuota.Copasocuota,
            date: fechaCuota,
            status: status,
            statusName: getOperationPaymentStatusName(status),
            amountUsd: montoCuota,
            iconUrl: iconUrl,
            operationReference: posicion.Refapertura,
          });
        }
      }
    }

    // Ordenar por fecha
    allPayments.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Agregar puntos
    allPayments = allPayments.map((payment) => ({
      ...payment,
      points:
        payment.status === "pending"
          ? payment.amountUsd *
            (getDaysDifference(payment.date, new Date()) >= 5 ? 2 : 1)
          : 0,
    }));

    // Paginación
    const totalCount = allPayments.length;
    const paginatedPayments = allPayments.slice(
      (page - 1) * limit,
      page * limit,
    );

    // Calcular total pendiente desde los totales de LA o sumando manualmente
    let totalPendingAmountUsd = 0;
    totalPendingAmountUsd = allPayments
      .filter((p) => p.status !== "paid")
      .reduce((acc, p) => acc + p.amountUsd, 0);

    res.status(200).json({
      success: true,
      message: "Listado de deudas del usuario y total pendiente",
      data: {
        operationPayments: paginatedPayments,
        totalAmount: parseFloat(totalPendingAmountUsd.toFixed(2)),
      },
      totalCount: totalCount,
    });
  },
);

export const getOperationPayments = asyncHandler(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1; // Default to page 1 if not provided
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const startDateParam = req.query.startDate as string;
    const endDateParam = req.query.endDate as string;
    const globalFilter = (req.query.globalFilter as string)?.trim();
    const statusParam = req.query.status as string;
    const VENEZUELA_TZ = "America/Caracas";

    // Criterio de filtro base por usuario
    const baseFilter: Record<string, unknown> = {};

    // Filtro por status
    if (statusParam) {
      baseFilter.status = statusParam;
    } else {
      baseFilter.status = { $in: ["pending", "paid", "overdue", "inArrears"] };
    }

    // Filtro global (nombre de cliente o monto) - se aplica en el pipeline después del lookup
    const amountStr = globalFilter ? globalFilter.replace(/[^\d.]/g, "") : "";
    const globalFilterLower = globalFilter?.toLowerCase() ?? "";

    const dateFilter: Record<string, Date> = {};
    if (startDateParam) {
      const startDate = fromZonedTime(
        `${startDateParam}T00:00:00`,
        VENEZUELA_TZ,
      );
      if (!isNaN(startDate.getTime())) {
        dateFilter.$gte = startDate;
      }
    }
    if (endDateParam) {
      const endDate = fromZonedTime(
        `${endDateParam}T23:59:59.999`,
        VENEZUELA_TZ,
      );
      if (!isNaN(endDate.getTime())) {
        dateFilter.$lte = endDate;
      }
    }
    if (Object.keys(dateFilter).length > 0) {
      baseFilter.date = dateFilter;
    }

    // Construir $match para filtro global (nombre de cliente o monto)
    const globalFilterMatch =
      globalFilter &&
      ({
        $match: {
          $or: [
            // Filtro por nombre de cliente (nombre completo)
            {
              $expr: {
                $gt: [
                  {
                    $indexOfCP: [
                      {
                        $toLower: {
                          $concat: [
                            { $ifNull: ["$userData.name", ""] },
                            " ",
                            { $ifNull: ["$userData.lastname", ""] },
                          ],
                        },
                      },
                      globalFilterLower,
                    ],
                  },
                  -1,
                ],
              },
            },
            ...(amountStr.length > 0
              ? [
                  {
                    $expr: {
                      $gt: [
                        {
                          $indexOfCP: [
                            {
                              $toString: { $ifNull: ["$amountUsdTotal", 0] },
                            },
                            amountStr,
                          ],
                        },
                        -1,
                      ],
                    },
                  },
                ]
              : []),
          ],
        },
      } as const);

    const totalCount = globalFilter
      ? 0
      : await OperationPayment.countDocuments(baseFilter);

    // const config = await Config.find().lean().exec();
    // const paidOnTimePoints = config.find(
    //   (config) => config.key === "paid-on-time-points"
    // )!.value;
    // const paidLatePoints = config.find(
    //   (config) => config.key === "paid-late-points"
    // )!.value;

    const aggregationPipeline = [
      { $match: baseFilter },
      {
        $facet: {
          // Pipeline para obtener el listado de pagos del usuario
          userOperationPayments: [
            // Puedes añadir un filtro adicional aquí si quieres que el listado
            // solo muestre un subconjunto de los pagos del usuario (ej. por estado específico)
            // { $match: { status: { $ne: "completed" } } }, // Ejemplo: Excluir pagos completados del listado del usuario
            {
              $lookup: {
                from: "Operation", // Nombre de la colección de Operation (asegúrate de que sea el correcto)
                localField: "operation", // Campo en OperationPayment que referencia a Operation
                foreignField: "_id", // Campo en Operation que coincide con localField
                as: "operationData", // Nombre del nuevo campo que contendrá los documentos de Operation
              },
            },
            {
              $lookup: {
                from: "User",
                localField: "user",
                foreignField: "_id",
                as: "userData",
              },
            },
            {
              $unwind: {
                path: "$operationData",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $unwind: {
                path: "$userData",
                preserveNullAndEmptyArrays: true,
              },
            },
            ...(globalFilterMatch ? [globalFilterMatch] : []),
            {
              $project: {
                _id: 0, // Excluye el _id si no lo necesitas
                id: "$_id", // Opcional: renombra _id a id
                date: 1,
                paidAt: 1,
                status: 1,
                amountUsd: { $ifNull: ["$amountUsdTotal", "$amountUsd"] },
                amountVef: 1,
                iconUrl: {
                  $concat: [
                    `${env.PUBLIC_API_URL}/icons/`,
                    "$operationData.icon",
                    "-white.png",
                  ],
                },
                clientName: {
                  $concat: ["$userData.name", " ", "$userData.lastname"],
                },
                clientEmail: "$userData.email",
                statusName: {
                  $switch: {
                    branches: [
                      {
                        case: { $eq: ["$status", "pending"] },
                        then: "Pendiente",
                      },
                      {
                        case: { $eq: ["$status", "paid"] },
                        then: "Pagado",
                      },
                      {
                        case: { $eq: ["$status", "overdue"] },
                        then: "Vencido",
                      },
                      {
                        case: { $eq: ["$status", "inArrears"] },
                        then: "En mora",
                      },
                      // Agrega más casos según los estados que manejes en tu modelo
                    ],
                    default: "Desconocido", // Valor por defecto si el estado no coincide
                  },
                },
                // Incluye otros campos de OperationPayment que necesites mostrar
                // operation: 1, // Opcional: si quieres ver a qué operación pertenece
              },
            },
            {
              $sort: { paidAt: -1, date: 1 }, // Opcional: Ordena el listado de pagos del usuario
            },
            // Aquí puedes agregar etapas de paginación si es necesario ($skip, $limit)
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
            // {
            //   $lookup: {
          ],
          // Conteo filtrado cuando hay globalFilter
          ...(globalFilter && {
            filteredCount: [
              {
                $lookup: {
                  from: "Operation",
                  localField: "operation",
                  foreignField: "_id",
                  as: "operationData",
                },
              },
              {
                $lookup: {
                  from: "User",
                  localField: "user",
                  foreignField: "_id",
                  as: "userData",
                },
              },
              {
                $unwind: {
                  path: "$operationData",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $unwind: {
                  path: "$userData",
                  preserveNullAndEmptyArrays: true,
                },
              },
              ...(globalFilterMatch ? [globalFilterMatch] : []),
              { $count: "count" },
            ],
          }),
          // Pipeline para calcular el total de pagos pendientes del usuario
          // pendingTotal: [
          //   // {
          //   //   // Filtra solo los pagos con estado "pending" entre los del usuario
          //   //   $match: { status: "pending" },
          //   // },
          //   {
          //     $group: {
          //       _id: null, // Agrupa todos los documentos "pending" del usuario en uno solo
          //       totalPendingAmountUsd: { $sum: "$amountUsd" }, // Calcula la suma de amountUsd
          //     },
          //   },
          //   {
          //     $project: {
          //       // Limpia el resultado del total pendiente del usuario
          //       _id: 0,
          //       totalPendingAmountUsd: 1,
          //     },
          //   },
          // ],
        },
      },
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aggregationResult = await OperationPayment.aggregate(
      aggregationPipeline as any[],
    ).exec();

    // El resultado de $facet será un array con un único objeto
    let userOperationPayments = aggregationResult[0].userOperationPayments;
    const finalTotalCount = globalFilter
      ? ((aggregationResult[0] as { filteredCount?: { count: number }[] })
          .filteredCount?.[0]?.count ?? 0)
      : totalCount;

    // Agrega el campo points a cada pago, igual que en operationDetail
    userOperationPayments = userOperationPayments.map(
      (operationPayment: any) => ({
        ...operationPayment,
        points:
          operationPayment.status === "pending"
            ? operationPayment.amountUsd *
              (getDaysDifference(operationPayment.date, new Date()) >= 5
                ? 2
                : 1)
            : 0,
      }),
    );

    res.status(200).json({
      success: true,
      message: "Listado de deudas del usuario y total pendiente",
      data: userOperationPayments,
      totalCount: finalTotalCount,
    });
  },
);

export const payDebt = asyncHandler(async (req: Request, res: Response) => {
  const { body } = req;
  const manualRate = body.manualRate ? parseFloat(body.manualRate) : null;
  loggers.operation("Pay Debt - Inicio", {
    action: "pay_debt",
    step: "start",
    userId: req.user!.id,
    paymentsCount: body.payments?.length || 0,
    payments: body.payments,
  });

  const { error } = payDebtValidationSchema.validate(body, {
    abortEarly: false,
  });

  if (error) {
    loggers.operation("Pay Debt - Error de validación", {
      action: "pay_debt",
      step: "validation_error",
      userId: req.user!.id,
      errors: error.details.map((d) => d.message),
    });
    return res.status(400).json({
      success: false,
      message: `Error de validación: ${error.details
        .map((d) => d.message)
        .join(", ")}`,
      code: "field_missing",
    });
  }

  const user = await User.findById(req.user!.id).lean();
  const deudas = await consultDebt({
    Rif: (user?.identificationType ?? "") + (user?.document ?? ""),
  });

  loggers.operation("Pay Debt - Consulta de deuda realizada", {
    action: "pay_debt",
    step: "consult_debt_response",
    userId: req.user!.id,
    success: deudas.success,
    hasData: !!deudas.data,
  });

  if (!deudas.success) {
    loggers.operation("Pay Debt - Error consultando deuda", {
      action: "pay_debt",
      step: "consult_debt_error",
      userId: req.user!.id,
      error: deudas.message,
    });
    return res.status(400).json({
      success: false,
      message: deudas.message,
      code: "error",
    });
  }

  let rateUsd: number;
  if (manualRate) {
    rateUsd = parseFloat(manualRate.toFixed(2));
  } else {
    const rate = await getRateS();
    rateUsd = parseFloat(rate!.usd.toFixed(2));
  }

  const expireAt = new Date();
  expireAt.setSeconds(expireAt.getSeconds() + env.OPERATION_EXPIRE_AT);

  const operationPayments = [];

  for (const payment of body.payments) {
    const checkOperationPayment = await OperationPayment.findOne({
      user: req.user!.id,
      laCopaso: payment,
    });

    // Check if the payment record exists in our DB (it should have been synced)
    if (!checkOperationPayment) {
      loggers.operation("Pay Debt - Cuota no sincronizada", {
        action: "pay_debt",
        step: "cuota_not_synced",
        userId: req.user!.id,
        copasocuota: payment,
      });
      return res.status(400).json({
        success: false,
        message: "Cuota no encontrada en el sistema. Falla en sincronizacion.",
        code: "not_synced",
      });
    }

    // Check if it's already paid
    if (checkOperationPayment.status === "paid") {
      loggers.operation("Pay Debt - Cuota ya pagada", {
        action: "pay_debt",
        step: "cuota_already_paid",
        userId: req.user!.id,
        copasocuota: payment,
      });
      return res.status(400).json({
        success: false,
        message: "Cuota ya pagada",
        code: "already_paid",
      });
    }

    // UPDATE LOGIC: Prepare the existing record for payment
    const { cuotaNumber } = buscarCuotaPorCopasocuota(deudas.data, payment);

    const amountVef = parseFloat(
      (checkOperationPayment.amountUsdTotal * rateUsd).toFixed(2),
    );

    // Fill in missing fields and update rate
    checkOperationPayment.amountVef = amountVef;
    checkOperationPayment.rate = rateUsd;
    checkOperationPayment.laCuota = cuotaNumber?.toString() || "";

    await checkOperationPayment.save();
    operationPayments.push(checkOperationPayment);
  }

  // Calculate totals for the Payment master record
  const amountUsd = parseFloat(
    operationPayments
      .reduce(
        (acc: number, operationPayment) =>
          acc + (operationPayment.amountUsdTotal ?? operationPayment.amountUsd),
        0,
      )
      .toFixed(2),
  );
  const amountVef = parseFloat(
    operationPayments
      .reduce(
        (acc: number, operationPayment) =>
          acc + (operationPayment.amountVef || 0),
        0,
      )
      .toFixed(2),
  );

  const paymentMaster = new Payment({
    user: req.user!.id,
    operationPayments: operationPayments.map(
      (operationPayment) => operationPayment._id,
    ),
    laCuotas: body.payments,
    amountUsd: amountUsd,
    amountVef: amountVef,
    rate: rateUsd,
    points: operationPayments.reduce(
      (acc: number, operationPayment) => acc + (operationPayment.points || 0),
      0,
    ),
    expireAt,
  });

  const savedPayment = await paymentMaster.save();

  loggers.operation("Pay Debt - Payment creado exitosamente", {
    action: "pay_debt",
    step: "payment_created",
    userId: req.user!.id,
    paymentId: String(savedPayment._id),
    paymentData: {
      feeCount: savedPayment.operationPayments.length,
      amountUsd: savedPayment.amountUsd,
      amountVef: savedPayment.amountVef,
      rate: savedPayment.rate,
      points: savedPayment.points,
    },
    operationPaymentsIds: operationPayments.map((op) => String(op._id)),
  });

  const respData = {
    id: savedPayment._id,
    feeCount: savedPayment.operationPayments.length,
    amountUsd: savedPayment.amountUsd,
    amountVef: savedPayment.amountVef,
    rate: savedPayment.rate,
    points: savedPayment.points,
  };

  res.status(200).json({
    success: true,
    message: "Operación creada en espera de confirmación",
    data: respData,
  });
});
export const payDebtConfirmation = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      const { body } = req;

      loggers.operation("Pay Debt Confirmation - Inicio", {
        action: "pay_debt_confirmation",
        step: "start",
        userId: req.user!.id,
        paymentId: body.id,
        paymentType: body.paymentType,
      });

      const { error } = payDebtConfirmationValidationSchema.validate(body, {
        abortEarly: false,
      });

      if (error) {
        loggers.operation("Pay Debt Confirmation - Error de validación", {
          action: "pay_debt_confirmation",
          step: "validation_error",
          userId: req.user!.id,
          paymentId: body.id,
          errors: error.details.map((d) => d.message),
        });
        return res.status(400).json({
          success: false,
          message: `Error de validación: ${error.details
            .map((d) => d.message)
            .join(", ")}`,
          code: "validation",
        });
      }

      const payment = await Payment.findOne({
        user: req.user!.id,
        _id: body.id,
        status: { $in: ["void", "error"] },
      });

      if (payment == null) {
        loggers.operation("Pay Debt Confirmation - Payment no encontrado", {
          action: "pay_debt_confirmation",
          step: "payment_not_found",
          userId: req.user!.id,
          paymentId: body.id,
        });
        return res.status(404).json({
          success: false,
          message: "No se encontró la operación",
          code: "not_found",
        });
      }

      loggers.operation("Pay Debt Confirmation - Payment encontrado", {
        action: "pay_debt_confirmation",
        step: "payment_found",
        userId: req.user!.id,
        paymentId: body.id,
        paymentData: {
          amountUsd: payment.amountUsd,
          amountVef: payment.amountVef,
          operationPaymentsCount: payment.operationPayments.length,
        },
      });

      const user = await User.findById(req.user!.id);

      const now = new Date();
      const todayOperationsCount = await Payment.countDocuments({
        createdAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      });

      const diferenciaMilisegundos = Math.abs(
        now.getTime() - new Date(1985, 11, 30).getTime(),
      );
      const milisegundosPorDia = 1000 * 60 * 60 * 24;
      const diferenciaDias = Math.floor(
        diferenciaMilisegundos / milisegundosPorDia,
      );

      payment.internalReference = `${diferenciaDias}${String(
        todayOperationsCount + 1,
      ).padStart(5, "0")}`;

      let reference = body.reference;
      let referenceSmall = body.reference;
      if (body.reference !== "000000" && env.TESTING) {
        if (body.paymentType === "mobile" || body.paymentType === "transfer") {
          const phone = body.phone.startsWith("58")
            ? body.phone
            : `58${body.phone.replace(/^0+/, "")}`;
          loggers.bancamiga("Pay Debt Confirmation - Phone AFTER CLEANUP", {
            action: "pay_debt_confirmation",
            step: "phone_cleanup",
            phone: phone,
          });
          const data = {
            phone,
            bank: body.bankCode,
            date: body.date,
            reference: body.reference,
            amount: payment.amountVef,
          } as env.BancamigaFindPaymentMobileBody;

          loggers.operation("Pay Debt Confirmation - Buscando pago móvil", {
            action: "pay_debt_confirmation",
            step: "find_payment_mobile_start",
            userId: req.user!.id,
            paymentId: body.id,
            paymentType: body.paymentType,
            data,
          });

          const resp = await findPaymentMobile(data);

          loggers.operation("Pay Debt Confirmation - Respuesta pago móvil", {
            action: "pay_debt_confirmation",
            step: "find_payment_mobile_response",
            userId: req.user!.id,
            paymentId: body.id,
            success: resp.success,
            hasData: !!resp.data,
          });

          if (!resp.success) {
            loggers.operation("Pay Debt Confirmation - Error en pago móvil", {
              action: "pay_debt_confirmation",
              step: "find_payment_mobile_error",
              userId: req.user!.id,
              paymentId: body.id,
              error: resp.message,
            });
            payment.status = "error";
            payment.errorMessage = resp.message || "Error en pago móvil";
            payment.expireAt = undefined;
            await payment.save();
            return res.status(400).json({
              success: false,
              message: resp.message,
              code: "error",
            });
          }

          reference = resp.data.NroReferencia;
          referenceSmall = resp.data.NroReferenciaCorto;
        } else if (body.paymentType === "debit") {
          if (
            !payment.debitorAccount?.bankCode ||
            !payment.debitorAccount?.identificationNumber ||
            !payment.debitorAccount?.phone
          ) {
            return res.status(400).json({
              success: false,
              message: "No se ha generado el código de OTP",
              code: "otp_error",
            });
          }

          const debitOtpBody: env.SypagoDebitOtpBody = {
            internal_id: payment.internalReference,
            account: {
              bank_code: env.SYPAGO_BANK_ACCOUNT_CODE!,
              type: "CNTA",
              number: env.SYPAGO_BANK_ACCOUNT_NUMBER!,
            },
            receiving_user: {
              name: "Débito OTP",
              otp: body.otp,
              document_info: {
                type: payment.debitorAccount.identificationType,
                number: payment.debitorAccount.identificationNumber,
              },
              account: {
                bank_code: payment.debitorAccount.bankCode,
                type: "CELE",
                number: payment.debitorAccount.phone,
              },
            },
            amount: {
              amt: payment.amountVef,
              currency: "VES",
            },
            concept: "pago de cuota por debito OTP",
            notification_urls: {
              web_hook_endpoint: env.SYPAGO_WEBHOOK_URL!,
            },
          };

          loggers.operation("Pay Debt Confirmation - Iniciando débito OTP", {
            action: "pay_debt_confirmation",
            step: "debit_otp_start",
            userId: req.user!.id,
            paymentId: body.id,
            internalReference: payment.internalReference,
            debitOtpBody: {
              internal_id: debitOtpBody.internal_id,
              amount: debitOtpBody.amount,
              receiving_user: {
                document_info: debitOtpBody.receiving_user.document_info,
                account: {
                  bank_code: debitOtpBody.receiving_user.account.bank_code,
                  type: debitOtpBody.receiving_user.account.type,
                },
              },
            },
          });

          const respDebitOtp = await debitOtp(debitOtpBody);

          loggers.operation("Pay Debt Confirmation - Respuesta débito OTP", {
            action: "pay_debt_confirmation",
            step: "debit_otp_response",
            userId: req.user!.id,
            paymentId: body.id,
            success: respDebitOtp.success,
            transactionId: respDebitOtp.data?.transaction_id,
            message: respDebitOtp.message,
          });

          if (!respDebitOtp.success) {
            loggers.operation("Pay Debt Confirmation - Error en débito OTP", {
              action: "pay_debt_confirmation",
              step: "debit_otp_error",
              userId: req.user!.id,
              paymentId: body.id,
              error: respDebitOtp.message,
            });
            return res.status(400).json({
              success: false,
              message: `Error al ejecutar el pago - ${respDebitOtp.message}`,
              code: "payment_error",
            });
          }

          loggers.operation(
            "Pay Debt Confirmation - Obteniendo resultado transacción",
            {
              action: "pay_debt_confirmation",
              step: "get_transaction_result_start",
              userId: req.user!.id,
              paymentId: body.id,
              transactionId: respDebitOtp.data.transaction_id,
            },
          );

          const transaction = await getTransactionResult(
            respDebitOtp.data.transaction_id,
          );

          loggers.operation(
            "Pay Debt Confirmation - Resultado transacción obtenido",
            {
              action: "pay_debt_confirmation",
              step: "get_transaction_result_response",
              userId: req.user!.id,
              paymentId: body.id,
              success: transaction.success,
              status: transaction.data?.status,
              rejectedCode: transaction.data?.rejected_code,
            },
          );

          if (!transaction.success) {
            loggers.operation(
              "Pay Debt Confirmation - Error obteniendo transacción",
              {
                action: "pay_debt_confirmation",
                step: "get_transaction_result_error",
                userId: req.user!.id,
                paymentId: body.id,
                error: transaction.message,
              },
            );
            payment.status = "error";
            payment.errorMessage =
              transaction.message || "Error al obtener la transacción de pago";
            payment.reference = respDebitOtp.data.transaction_id;
            payment.expireAt = undefined;
            await payment.save();
            return res.status(400).json({
              success: false,
              message: "Error al obtener la transacción de pago",
              code: "error",
              error: transaction.message,
            });
          }

          if (transaction.data.status !== TransactionStatusCode.ACCP) {
            const rejectedMsg =
              "La transacción de pago no está aprobada - " +
              getRejectedCodeDescription(transaction.data.rejected_code);
            loggers.operation("Pay Debt Confirmation - Transacción rechazada", {
              action: "pay_debt_confirmation",
              step: "transaction_rejected",
              userId: req.user!.id,
              paymentId: body.id,
              status: transaction.data.status,
              rejectedCode: transaction.data.rejected_code,
              statusDescription: getStatusDescription(transaction.data.status),
              rejectedDescription: getRejectedCodeDescription(
                transaction.data.rejected_code,
              ),
            });
            payment.status = "error";
            payment.errorMessage = rejectedMsg;
            payment.reference = respDebitOtp.data.transaction_id;
            payment.expireAt = undefined;
            await payment.save();
            return res.status(400).json({
              success: false,
              message: rejectedMsg,
              code: "error",
              error: getStatusDescription(transaction.data.status),
            });
          }

          reference = transaction.data.ref_ibp;
          referenceSmall = transaction.data.ref_ibp.slice(-6);
        }
      }

      payment.reference = reference;
      payment.expireAt = undefined;
      payment.status = "confirmed";
      payment.errorMessage = undefined;
      payment.save();

      loggers.operation("Pay Debt Confirmation - Payment confirmado", {
        action: "pay_debt_confirmation",
        step: "payment_confirmed",
        userId: req.user!.id,
        paymentId: body.id,
        reference,
        referenceSmall,
      });

      const today = new Date();
      const day = String(today.getDate()).padStart(2, "0");
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const year = today.getFullYear();
      const iniDate = `${day}/${month}/${year}`;

      const operationPayments = await OperationPayment.find({
        user: req.user!.id,
        _id: { $in: payment.operationPayments },
      });

      for (const operationPayment of operationPayments) {
        const insertPaymentBody: InsertPaymentData = {
          Rif: (user?.identificationType ?? "") + (user?.document ?? ""),
          Val_gra: "G",
          FlEmi: iniDate,
          FlDisp: iniDate,
          Cuenta: "",
          Concepto: "Pago de cuotas " + operationPayment.laCuota,
          TpPaso: "I",
          Nunota: reference,
          Refer: referenceSmall,
          Nurefer: reference,
          Nucorre: 1,
          Fpago: 3,
          Monto: operationPayment.amountVef.toString().replace(".", ","),
          Tpcambio: "1",
          Copaso: operationPayment.laCopaso,
          Nupaso: 0,
          Statusabono: 1,
          Statusliq: "B",
          Statusoper: "N",
        };

        loggers.operation("Pay Debt Confirmation - Insertando pago en LA", {
          action: "pay_debt_confirmation",
          step: "insert_payment_la_start",
          userId: req.user!.id,
          paymentId: body.id,
          operationPaymentId: String(operationPayment._id),
          insertPaymentBody: {
            Rif: insertPaymentBody.Rif,
            Nunota: insertPaymentBody.Nunota,
            Refer: insertPaymentBody.Refer,
            Monto: insertPaymentBody.Monto,
            Copaso: insertPaymentBody.Copaso,
          },
        });

        const respInsertPayment = await InsertPayment(insertPaymentBody);

        loggers.operation(
          "Pay Debt Confirmation - Respuesta inserción pago LA",
          {
            action: "pay_debt_confirmation",
            step: "insert_payment_la_response",
            userId: req.user!.id,
            paymentId: body.id,
            operationPaymentId: String(operationPayment._id),
            success: respInsertPayment.success,
            nupaso: respInsertPayment.data?.Nupaso,
            message: respInsertPayment.message,
          },
        );

        if (!respInsertPayment.success) {
          loggers.operation(
            "Pay Debt Confirmation - Error insertando pago LA",
            {
              action: "pay_debt_confirmation",
              step: "insert_payment_la_error",
              userId: req.user!.id,
              paymentId: body.id,
              operationPaymentId: String(operationPayment._id),
              error: respInsertPayment.message,
            },
          );
          payment.status = "error";
          payment.errorMessage =
            respInsertPayment.message || "Error al insertar el pago en LA";
          payment.reference = reference;
          await payment.save();
          return res.status(400).json({
            success: false,
            message: `Error al insertar el pago - ${respInsertPayment.message}`,
            code: "payment_error",
          });
        }

        operationPayment.expireAt = undefined;
        operationPayment.status = "paid";
        operationPayment.paidAt = new Date();
        operationPayment.laNupaso = respInsertPayment.data.Nupaso;
        await operationPayment.save();

        loggers.operation(
          "Pay Debt Confirmation - OperationPayment actualizado",
          {
            action: "pay_debt_confirmation",
            step: "operation_payment_updated",
            userId: req.user!.id,
            paymentId: body.id,
            operationPaymentId: String(operationPayment._id),
            status: "paid",
            laNupaso: operationPayment.laNupaso,
          },
        );
      }

      // Verificar si las operaciones relacionadas se han completado (todas las cuotas pagadas)
      const operationIds = [
        ...new Set(
          operationPayments
            .map((op) => op.operation?.toString())
            .filter((id) => !!id),
        ),
      ];
      for (const opId of operationIds) {
        const pendingCount = await OperationPayment.countDocuments({
          operation: opId,
          status: { $ne: "paid" },
        });

        if (pendingCount === 0) {
          await Operation.updateOne(
            { _id: opId, user: req.user!.id },
            { $set: { status: "completed" } },
          );
          loggers.operation("Pay Debt Confirmation - Operación finalizada", {
            action: "pay_debt_confirmation",
            step: "operation_completed",
            userId: req.user!.id,
            operationId: opId,
          });
        }
      }

      // Calcular comisión según el tipo de pago
      let commissionAmount = 0;
      if (body.paymentType === "mobile") {
        commissionAmount = payment.amountVef * 0.015; // 1.5%
      } else if (body.paymentType === "debit") {
        commissionAmount = payment.amountVef * 0.006; // 0.6%
      }

      // Insertar comisión en LA si corresponde
      if (
        commissionAmount > 0 &&
        (body.paymentType === "mobile" || body.paymentType === "debit")
      ) {
        const insertPaymentCommissionBody: InsertPaymentData = {
          Rif: (user?.identificationType ?? "") + (user?.document ?? ""),
          Val_gra: "G",
          FlEmi: iniDate,
          FlDisp: iniDate,
          Cuenta: "",
          Concepto: "Comisión por pago de cuotas",
          TpPaso: "E",
          Nunota: referenceSmall,
          Refer: reference,
          Nurefer: "",
          Nucorre: 1,
          Fpago: 3,
          Monto: commissionAmount.toFixed(2).replace(".", ","),
          Tpcambio: "1",
          Copaso: "",
          Nupaso: 0,
          Statusabono: 1,
          Statusliq: "B",
          Statusoper: "N",
          Codcontrap: "640201",
        };

        loggers.operation("Pay Debt Confirmation - Insertando comisión en LA", {
          action: "pay_debt_confirmation",
          step: "insert_commission_la_start",
          userId: req.user!.id,
          paymentId: body.id,
          paymentType: body.paymentType,
          commissionAmount,
          reference,
        });

        const insertPaymentCommissionResult = await InsertPayment(
          insertPaymentCommissionBody,
        );
        if (!insertPaymentCommissionResult.success) {
          loggers.error("Error al insertar la comisión en LA", {
            error: insertPaymentCommissionResult.message,
            data: insertPaymentCommissionResult.data,
          });
        } else {
          loggers.operation(
            "Pay Debt Confirmation - Comisión insertada en LA",
            {
              action: "pay_debt_confirmation",
              step: "insert_commission_la_success",
              userId: req.user!.id,
              paymentId: body.id,
              paymentType: body.paymentType,
              commissionAmount,
            },
          );
        }
      }

      loggers.operation(
        "Pay Debt Confirmation - Proceso completado exitosamente",
        {
          action: "pay_debt_confirmation",
          step: "process_completed",
          userId: req.user!.id,
          paymentId: body.id,
          operationPaymentsCount: operationPayments.length,
          totalPoints: payment.points,
        },
      );

      user!.points = parseFloat((user!.points + payment.points).toFixed(2));
      await user?.save();

      const respNewLevel = await checkAndUpdateLevel(req.user!.id);

      return res.status(200).json({
        success: true,
        message: "Operación confirmada",
        data: {
          newLevel: respNewLevel.success ? respNewLevel.data : undefined,
        },
      });
    } catch (error) {
      loggers.operation("Pay Debt Confirmation - Error inesperado", {
        action: "pay_debt_confirmation",
        step: "unexpected_error",
        userId: req.user?.id,
        paymentId: req.body?.id,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
);

export const requestSypagoOtp = asyncHandler(
  async (req: Request, res: Response) => {
    const { body } = req;

    const { error } = requestOtpValidationSchema.validate(body, {
      abortEarly: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: `Error de validación: ${error.details
          .map((d) => d.message)
          .join(", ")}`,
        code: "field_missing",
      });
    }

    const payment = await Payment.findOne({
      user: req.user!.id,
      _id: body.id,
      status: "void",
    });

    if (payment == null) {
      return res.status(404).json({
        success: false,
        message: "No se encontró la operación",
        code: "not_found",
      });
    }

    const requestOtpBody: env.SypagoRequestOtpBody = {
      creditor_account: {
        bank_code: env.SYPAGO_BANK_ACCOUNT_CODE!,
        type: "CNTA",
        number: env.SYPAGO_BANK_ACCOUNT_NUMBER!,
      },
      debitor_document_info: {
        type: body.identificationType,
        number: body.identificationNumber,
      },
      debitor_account: {
        bank_code: body.bankCode,
        type: "CELE",
        number: body.phone,
      },
      amount: {
        amt: payment.amountVef,
        currency: "VES",
      },
    };
    const respRequestOtp = await requestOtp(requestOtpBody);

    if (!respRequestOtp.success) {
      loggers.operation("Request Sypago OTP - Error al generar el código OTP", {
        action: "request_sypago_otp",
        step: "request_otp_error",
        userId: req.user!.id,
        paymentId: body.id,
        error: respRequestOtp.message,
      });
      return res.status(400).json({
        success: false,
        message: `Ha ocurrido un error al generar el código OTP, por favor verifica tus datos e intenta de nuevo`,
        code: "otp_error",
      });
    }

    payment.debitorAccount = {
      bankCode: body.bankCode,
      identificationType: body.identificationType,
      identificationNumber: body.identificationNumber,
      phone: body.phone,
    };
    await payment.save();

    return res.status(200).json({
      success: true,
      message: "Código de OTP enviado correctamente",
    });
  },
);

// Banesco - ya no integrado en el sistema

const checkAndUpdateLevel = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    // throw new Error("Usuario no encontrado");
    return {
      success: false,
      message: "Usuario no encontrado",
    };
  }

  const newLevel = await Level.findOne({
    pointsRequired: { $lte: user.points },
  })
    .sort({ level: -1 })
    .limit(1);

  if (!newLevel) {
    return {
      success: false,
      message: "No se encontraron nuevos niveles configurados",
    };
  }

  // Si el nivel ha cambiado, actualizar
  if (user.level === newLevel.level) {
    return {
      success: false,
      message: "No se alcanzo el nuevo nivel",
    };
  }

  const oldLevel = user.level;

  // Actualizar nivel y límite de crédito del usuario
  user.level = newLevel.level;
  user.maxAmount = newLevel.creditLimit;
  user.allowedFeeCount = newLevel.allowedFeeCount;
  user.levelName = newLevel.name;

  await user.save();

  // Registrar el cambio en el historial (opcional)
  await LevelHistory.create({
    user: user._id,
    oldLevel,
    newLevel: newLevel.level,
    pointsAtChange: user.points,
    changedAt: new Date(),
  });

  return {
    success: true,
    data: {
      oldLevel,
      newLevel: newLevel.level,
      maxAmount: newLevel.creditLimit,
      allowedFeeCount: newLevel.allowedFeeCount,
    },
  };
};

export const checkLatePayments = async (req: Request, res: Response) => {
  const today = startOfToday();

  const latePayments = await OperationPayment.find({
    status: { $in: ["pending", "overdue", "inArrears"] },
    date: { $lt: today },
  });

  for (const latePayment of latePayments) {
    latePayment.status = "overdue";
    await latePayment.save();

    const user = await User.findById(latePayment.user);
    if (!user) {
      continue;
    }

    const lastUpdatedAt = user.updatedAt;
    lastUpdatedAt.setHours(0, 0, 0, 0);
    if (today.getTime() == lastUpdatedAt.getTime()) {
      continue;
    }

    user.points =
      user.points - latePayment.amountUsd < 0
        ? 0
        : parseFloat((user.points - latePayment.amountUsd).toFixed(2));
    await user.save();

    await checkAndUpdateLevel(user._id);
  }

  res.status(200).json({
    success: true,
    message: "Pagos vencidos actualizados correctamente",
    data: {
      latePayments: latePayments.map((latePayment) => {
        return {
          id: latePayment._id,
          operation: latePayment.operation,
          amount: latePayment.amountUsd,
          status: latePayment.status,
          statusName: getOperationPaymentStatusName(latePayment.status),
          date: latePayment.date,
        };
      }),
    },
  });
};

export const getAllOperations = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1; // Default to page 1 if not provided
  const limit = parseInt(req.query.limit as string) || 10; // Default to 10 items per page if not provided
  const globalFilter = req.query.globalFilter as string;
  const startDateParam = req.query.startDate as string;
  const endDateParam = req.query.endDate as string;
  const skip = (page - 1) * limit;

  const filter: any = {};
  const VENEZUELA_TZ = "America/Caracas";

  if (startDateParam) {
    const startDate = fromZonedTime(`${startDateParam}T00:00:00`, VENEZUELA_TZ);
    if (!isNaN(startDate.getTime())) {
      filter.createdAt = { ...filter.createdAt, $gte: startDate };
    }
  }
  if (endDateParam) {
    const endDate = fromZonedTime(`${endDateParam}T23:59:59.999`, VENEZUELA_TZ);
    if (!isNaN(endDate.getTime())) {
      filter.createdAt = { ...filter.createdAt, $lte: endDate };
    }
  }
  if (globalFilter) {
    // Create a case-insensitive regular expression for the search term
    const regex = new RegExp(globalFilter, "i");

    // Use the $or operator to search across multiple fields
    filter.$or = [
      { "userData.fullName": { $regex: regex } },
      { "userData.email": { $regex: regex } },
    ];
  }

  if (!isNaN(parseFloat(globalFilter)))
    filter.$or.push({ amountUsd: parseFloat(globalFilter) });

  const [facetResult] = await Operation.aggregate([
    {
      $lookup: {
        from: "User",
        localField: "user",
        foreignField: "_id",
        as: "userData",
      },
    },
    {
      $unwind: "$userData",
    },
    {
      $addFields: {
        "userData.fullName": {
          $concat: ["$userData.name", " ", "$userData.lastname"],
        },
      },
    },
    {
      $match: filter,
    },
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              createdAt: 1,
              amountUsd: 1,
              amountVef: 1,
              rate: 1,
              status: 1,
              reference: 1,
              icon: 1,
              user: {
                _id: "$userData._id",
                fullName: "$userData.fullName",
                email: "$userData.email",
              },
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    },
  ]);

  const results = facetResult?.data ?? [];
  const totalCount = facetResult?.total?.[0]?.count ?? 0;

  const formattedResults = results.map((operation: any) => {
    return {
      id: operation._id,
      reference: operation.reference,
      createdAt: operation.createdAt,
      amount: operation.amountUsd,
      icon: operation.icon,
      status: {
        id: operation.status,
        name: getOperationStatusName(operation.status),
      },
      amountUsd: operation.amountUsd,
      clientName: operation.user.fullName,
      clientEmail: operation.user.email,
    };
  });

  return res.status(200).json({
    success: true,
    message: "Operations retrieved successfully",
    data: formattedResults,
    totalCount,
  });
};

export const getAllPayments = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const globalFilter = req.query.globalFilter as string;
  const startDateParam = req.query.startDate as string;
  const endDateParam = req.query.endDate as string;
  const skip = (page - 1) * limit;
  const VENEZUELA_TZ = "America/Caracas";

  const filter: any = {
    status: { $in: ["confirmed", "error"] },
  };

  if (startDateParam) {
    const startDate = fromZonedTime(`${startDateParam}T00:00:00`, VENEZUELA_TZ);
    if (!isNaN(startDate.getTime())) {
      filter.createdAt = { ...filter.createdAt, $gte: startDate };
    }
  }
  if (endDateParam) {
    const endDate = fromZonedTime(`${endDateParam}T23:59:59.999`, VENEZUELA_TZ);
    if (!isNaN(endDate.getTime())) {
      filter.createdAt = { ...filter.createdAt, $lte: endDate };
    }
  }

  const textFilter = globalFilter
    ? {
        $or: [
          {
            "userData.fullName": {
              $regex: globalFilter,
              $options: "i",
            },
          },
          ...(!isNaN(parseFloat(globalFilter))
            ? [{ amountUsd: parseFloat(globalFilter) }]
            : []),
        ],
      }
    : null;

  const commonPipeline: any[] = [
    { $match: filter },
    {
      $lookup: {
        from: "User",
        localField: "user",
        foreignField: "_id",
        as: "userData",
      },
    },
    {
      $unwind: {
        path: "$userData",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        "userData.fullName": {
          $cond: {
            if: { $and: ["$userData.name", "$userData.lastname"] },
            then: { $concat: ["$userData.name", " ", "$userData.lastname"] },
            else: "",
          },
        },
      },
    },
    ...(textFilter ? [{ $match: textFilter }] : []),
  ];

  const [facetResult] = await Payment.aggregate([
    ...commonPipeline,
    {
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              createdAt: 1,
              amountUsd: 1,
              "userData.fullName": 1,
              "userData.document": 1,
              debitorAccount: 1,
              status: 1,
            },
          },
        ],
        total: [{ $count: "count" }],
      },
    },
  ]);

  const results = facetResult?.data ?? [];

  const totalCount = facetResult?.total?.[0]?.count ?? 0;

  const formattedResults = results.map((payment: any) => {
    const userDoc =
      payment.userData?.document?.toString().trim().toUpperCase() ?? "";
    const debitorId =
      payment.debitorAccount?.identificationNumber
        ?.toString()
        .trim()
        .toUpperCase() ?? "";
    const esDeTercero =
      debitorId !== "" && userDoc !== "" && debitorId !== userDoc;

    return {
      id: payment._id,
      fecha: payment.createdAt,
      monto: payment.amountUsd,
      cliente: payment.userData?.fullName ?? "",
      esDeTercero,
      status: payment.status,
      statusName: getPaymentStatusName(payment.status),
    };
  });

  return res.status(200).json({
    success: true,
    message: "Payments retrieved successfully",
    data: formattedResults,
    totalCount,
  });
};

export const getPaymentDetailsById = asyncHandler(
  async (req: Request, res: Response) => {
    const { paymentId } = req.params;

    const payment = await Payment.findOne({
      _id: paymentId,
    })
      .populate("user", "name lastname document")
      .lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Pago no encontrado",
      });
    }

    const operationPayments = await OperationPayment.find({
      _id: { $in: payment.operationPayments },
    })
      .select("date amountUsd")
      .sort({ date: 1 })
      .lean();

    const userDoc =
      (payment.user as any)?.document?.toString().trim().toUpperCase() ?? "";
    const debitorId =
      payment.debitorAccount?.identificationNumber
        ?.toString()
        .trim()
        .toUpperCase() ?? "";
    const esDeTercero =
      debitorId !== "" && userDoc !== "" && debitorId !== userDoc;

    const cliente =
      payment.user &&
      (payment.user as any).name &&
      (payment.user as any).lastname
        ? `${(payment.user as any).name} ${(payment.user as any).lastname}`
        : "";

    const paymentAny = payment as any;
    const data = {
      cliente,
      fecha: paymentAny.createdAt,
      montoUsd: payment.amountUsd,
      montoVef: payment.amountVef,
      tasa: payment.rate,
      cuentaBeneficiario: esDeTercero
        ? {
            bankCode: payment.debitorAccount?.bankCode,
            identificationType: payment.debitorAccount?.identificationType,
            identificationNumber: payment.debitorAccount?.identificationNumber,
            phone: payment.debitorAccount?.phone,
          }
        : null,
      cuotasPagadas: operationPayments.map((op: any) => ({
        fecha: op.date,
        monto: op.amountUsd,
      })),
      status: payment.status,
      statusName: getPaymentStatusName(payment.status),
      errorMessage: payment.errorMessage,
    };

    return res.status(200).json({
      success: true,
      message: "Detalle del pago obtenido correctamente",
      data,
    });
  },
);

export const getMovements = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;
    const type = ((req.query.type as string) || "").toLowerCase();

    const includeOperations = type !== "paid";
    const includePayments = type !== "liquidated";
    const includeSubscriptionPayments = type !== "liquidated";

    const operationsFilter = {
      user: new Types.ObjectId(userId),
      status: { $in: ["approved", "completed"] },
    } as any;

    const paymentsFilter = {
      user: new Types.ObjectId(userId),
      status: "confirmed",
    } as any;

    const subscriptionPaymentsFilter = {
      user: new Types.ObjectId(userId),
      status: { $in: ["completed", "paid"] },
    } as any;

    const [operationsCount, paymentsCount, subscriptionPaymentsCount] =
      await Promise.all([
        includeOperations
          ? Operation.countDocuments(operationsFilter)
          : Promise.resolve(0),
        includePayments
          ? Payment.countDocuments(paymentsFilter)
          : Promise.resolve(0),
        includeSubscriptionPayments
          ? SubscriptionPayment.countDocuments(subscriptionPaymentsFilter)
          : Promise.resolve(0),
      ]);

    const totalCount =
      operationsCount + paymentsCount + subscriptionPaymentsCount;

    // --- PROJECT DEFINITIONS ---

    const paymentProject = {
      _id: 0,
      id: "$_id",
      createdAt: 1,
      amountUsd: "$amountUsd",
      amountVef: "$amountVef",
      amountVefBase: "$amountVef",
      commission: { $literal: 0 },
      reference: "$reference",
      movementType: { $literal: "payment" },
      description: { $literal: "Pago" },
      iconUrl: { $literal: null },
      status: "received",
    };

    const operationProject = {
      _id: 0,
      id: "$_id",
      createdAt: 1,
      amountUsd: "$amountUsd",
      amountVef: "$amountVef",
      amountVefBase: "$settledAmount",
      feeCount: "$feeCount",
      commission: "$commissionAmount",
      accountNumber: "$account.number",
      rate: "$rate",
      reference: "$reference",
      movementType: { $literal: "operation" },
      description: { $literal: "Pedido" },
      iconUrl: { $concat: ["$icon"] },
      status: "sent",
      // --- THE FULL QUOTAS LIST ---
      quotas: {
        totalCount: { $size: "$payments" },
        paidCount: {
          $size: {
            $filter: {
              input: "$payments",
              as: "p",
              cond: { $eq: ["$$p.status", "paid"] },
            },
          },
        },
        // This returns the array of 6 installments with their specific info
        items: {
          $map: {
            input: "$payments",
            as: "p",
            in: {
              id: "$$p._id",
              date: "$$p.date", // The quota due date
              status: "$$p.status", // 'pending' or 'paid'
              amount: "$$p.amountUsdTotal",
            },
          },
        },
      },
    };
    const subscriptionPaymentProject = {
      _id: 0,
      id: "$_id",
      createdAt: 1,
      amountUsd: "$amountUsd",
      amountVef: "$amountVef",
      amountVefBase: "$amountVef",
      commission: { $literal: 0 },
      reference: "$receiptId",
      movementType: { $literal: "subscriptionPayment" },
      description: { $literal: "Pago de membresía" },
      iconUrl: { $literal: null },
      status: "received",
    };

    // --- AGGREGATION EXECUTION ---

    let movements: any[] = [];

    if (includeOperations && includePayments) {
      movements = await Operation.aggregate([
        { $match: operationsFilter },
        {
          $lookup: {
            from: "OperationPayment",
            localField: "_id",
            foreignField: "operation",
            as: "payments",
          },
        },
        { $project: operationProject },
        {
          $unionWith: {
            coll: "Payment",
            pipeline: [
              { $match: paymentsFilter },
              { $project: paymentProject },
            ],
          },
        },
        {
          $unionWith: {
            coll: "SubscriptionPayment",
            pipeline: [
              { $match: subscriptionPaymentsFilter },
              { $project: subscriptionPaymentProject },
            ],
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]).exec();
    } else if (includeOperations) {
      movements = await Operation.aggregate([
        { $match: operationsFilter },
        {
          $lookup: {
            from: "operationpayments",
            localField: "_id",
            foreignField: "operation",
            as: "payments",
          },
        },
        { $project: operationProject },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]).exec();
    } else {
      // Only Payments and Subscriptions
      movements = await Payment.aggregate([
        { $match: paymentsFilter },
        { $project: paymentProject },
        {
          $unionWith: {
            coll: "SubscriptionPayment",
            pipeline: [
              { $match: subscriptionPaymentsFilter },
              { $project: subscriptionPaymentProject },
            ],
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]).exec();
    }

    return res.status(200).json({
      success: true,
      message: "Movimientos obtenidos correctamente",
      data: movements,
      totalCount,
    });
  },
);

const checkMinBalance = async (amountVef: number): Promise<boolean> => {
  const pastBalances = await Balance.aggregate([
    {
      $match: {
        status: "confirmed",
      },
    },
    {
      $group: {
        _id: null,
        totalAmount: {
          $sum: "$amount",
        },
      },
    },
  ]);

  const configMinBalance = await Config.findOne({
    key: "min-available-balance",
  });
  const minBalance = configMinBalance?.value ?? 0;

  const availableBalance =
    pastBalances.length > 0 ? pastBalances[0].totalAmount : 0;

  if (availableBalance - amountVef < minBalance) {
    return false;
  }
  return true;
};

/**
 * Get treasury data
 * Retorna todos los datos de tesorería: clientes, capital, solicitudes, caja y pasivo
 *
 * @exports
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getTreasuryData = asyncHandler(
  async (req: Request, res: Response) => {
    const today = startOfToday();
    const rate = await getRateS();
    const rateUsd = parseFloat(rate!.usd.toFixed(2));

    // 1. CLIENTES TOTALES
    // Clientes activos (aprobados y con préstamos)
    const activeClientsWithLoans = await Operation.distinct("user", {
      status: "approved",
    });

    // Clientes morosos (que tienen 2 cuotas vencidas)
    const delinquentClients = await OperationPayment.aggregate([
      {
        $match: {
          status: { $in: ["overdue", "inArrears"] },
        },
      },
      {
        $group: {
          _id: "$user",
          overdueCount: { $sum: 1 },
        },
      },
      {
        $match: {
          overdueCount: { $gte: 2 },
        },
      },
    ]);

    // Clientes vencidos (que tienen 1+ días sin pagar su cuota)
    const overdueClients = await OperationPayment.distinct("user", {
      $or: [
        { status: "overdue" },
        { status: "inArrears" },
        { status: "pending", date: { $lt: today } },
      ],
    });

    // Clientes inactivos (aprobados sin crédito que se registraron/descargaron)
    const approvedUsers = await User.find({
      status: "active",
      verificationStatus: "approved",
    })
      .select("_id")
      .lean();

    const approvedUserIds = approvedUsers.map((u) => u._id.toString());

    const usersWithOperations = await Operation.distinct("user", {
      status: { $nin: ["void", "rejected"] },
    });

    const usersWithOperationsIds = usersWithOperations.map((id) =>
      id.toString(),
    );

    const inactiveClients = approvedUserIds.filter(
      (userId) => !usersWithOperationsIds.includes(userId),
    );

    // Clientes en cola - proceso / por aprobar
    const clientsInQueue = await User.countDocuments({
      status: "pending",
    });

    // 2. CAPITAL TOTAL
    // Monto disponible para prestar
    const confirmedBalances = await Balance.aggregate([
      {
        $match: {
          status: "confirmed",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const totalBalance =
      confirmedBalances.length > 0 ? confirmedBalances[0].totalAmount : 0;

    const configMinBalance = await Config.findOne({
      key: "min-available-balance",
    });
    const minBalance = configMinBalance?.value ?? 0;

    // Monto Vigente (operaciones aprobadas)
    const currentAmount = await Operation.aggregate([
      {
        $match: {
          status: "approved",
        },
      },
      {
        $group: {
          _id: null,
          totalAmountUsd: { $sum: "$amountUsd" },
          totalAmountVef: { $sum: "$amountVef" },
        },
      },
    ]);

    const montoVigenteUsd =
      currentAmount.length > 0 ? currentAmount[0].totalAmountUsd : 0;
    const montoVigenteVef =
      currentAmount.length > 0 ? currentAmount[0].totalAmountVef : 0;

    // Monto Moroso (pagos en mora)
    const delinquentAmount = await OperationPayment.aggregate([
      {
        $match: {
          status: "inArrears",
        },
      },
      {
        $group: {
          _id: null,
          totalAmountUsd: {
            $sum: { $ifNull: ["$amountUsdTotal", "$amountUsd"] },
          },
        },
      },
    ]);

    const montoMorosoUsd =
      delinquentAmount.length > 0 ? delinquentAmount[0].totalAmountUsd : 0;
    const montoMorosoVef = parseFloat((montoMorosoUsd * rateUsd).toFixed(2));

    // Monto vencido (pagos vencidos)
    const overdueAmount = await OperationPayment.aggregate([
      {
        $match: {
          status: "overdue",
        },
      },
      {
        $group: {
          _id: null,
          totalAmountUsd: {
            $sum: { $ifNull: ["$amountUsdTotal", "$amountUsd"] },
          },
        },
      },
    ]);

    const montoVencidoUsd =
      overdueAmount.length > 0 ? overdueAmount[0].totalAmountUsd : 0;
    const montoVencidoVef = parseFloat((montoVencidoUsd * rateUsd).toFixed(2));

    const montoDisponibleVef = Math.max(
      0,
      totalBalance - montoVigenteVef - montoMorosoVef - minBalance,
    );
    const montoDisponibleUsd = parseFloat(
      (montoDisponibleVef / rateUsd).toFixed(2),
    );

    // 3. SOLICITUDES
    // Cantidad de solicitudes
    const requestsCount = await Operation.countDocuments({
      status: { $in: ["void", "pending"] },
    });

    // Monto de solicitudes
    const requestsAmount = await Operation.aggregate([
      {
        $match: {
          status: { $in: ["void", "pending"] },
        },
      },
      {
        $group: {
          _id: null,
          totalAmountUsd: { $sum: "$amountUsd" },
          totalAmountVef: { $sum: "$amountVef" },
        },
      },
    ]);

    const montoSolicitudesUsd =
      requestsAmount.length > 0 ? requestsAmount[0].totalAmountUsd : 0;
    const montoSolicitudesVef =
      requestsAmount.length > 0 ? requestsAmount[0].totalAmountVef : 0;

    // Clientes recurrentes (cantidad y monto)
    const recurringClientsData = await Operation.aggregate([
      {
        $match: {
          status: "approved",
        },
      },
      {
        $group: {
          _id: "$user",
          operationCount: { $sum: 1 },
          totalAmountUsd: { $sum: "$amountUsd" },
        },
      },
      {
        $match: {
          operationCount: { $gt: 1 },
        },
      },
      {
        $group: {
          _id: null,
          clientCount: { $sum: 1 },
          totalAmountUsd: { $sum: "$totalAmountUsd" },
        },
      },
    ]);

    const clientesRecurrentesCantidad =
      recurringClientsData.length > 0 ? recurringClientsData[0].clientCount : 0;
    const clientesRecurrentesMontoUsd =
      recurringClientsData.length > 0
        ? recurringClientsData[0].totalAmountUsd
        : 0;
    const clientesRecurrentesMontoVef = parseFloat(
      (clientesRecurrentesMontoUsd * rateUsd).toFixed(2),
    );

    // 4. CAJA - Saldos en cuentas bancarias (Bs y $)
    const bankBalances = await Balance.aggregate([
      {
        $match: {
          status: "confirmed",
        },
      },
      {
        $lookup: {
          from: "AdminAccount",
          localField: "account",
          foreignField: "_id",
          as: "accountData",
        },
      },
      {
        $unwind: "$accountData",
      },
      {
        $group: {
          _id: "$accountData.currency",
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    const saldoBs = bankBalances.find((b) => b._id === "VEF")?.totalAmount ?? 0;
    const saldoUsd =
      bankBalances.find((b) => b._id === "USD")?.totalAmount ?? 0;

    // 5. PASIVO - Saldos por pagar (capital e intereses)
    const pendingPayments = await OperationPayment.aggregate([
      {
        $match: {
          status: { $in: ["pending", "overdue", "inArrears"] },
        },
      },
      {
        $group: {
          _id: null,
          totalAmountUsd: {
            $sum: { $ifNull: ["$amountUsdTotal", "$amountUsd"] },
          },
          totalInterestUsd: { $sum: { $ifNull: ["$interest", 0] } },
        },
      },
    ]);

    const pasivoCapitalUsd =
      pendingPayments.length > 0
        ? pendingPayments[0].totalAmountUsd -
          (pendingPayments[0].totalInterestUsd || 0)
        : 0;
    const pasivoInteresesUsd =
      pendingPayments.length > 0 ? pendingPayments[0].totalInterestUsd || 0 : 0;
    const pasivoTotalUsd = pasivoCapitalUsd + pasivoInteresesUsd;
    const pasivoCapitalVef = parseFloat(
      (pasivoCapitalUsd * rateUsd).toFixed(2),
    );
    const pasivoInteresesVef = parseFloat(
      (pasivoInteresesUsd * rateUsd).toFixed(2),
    );
    const pasivoTotalVef = parseFloat((pasivoTotalUsd * rateUsd).toFixed(2));

    const treasuryData = {
      clientes: {
        activos: {
          cantidad: activeClientsWithLoans.length,
        },
        morosos: {
          cantidad: delinquentClients.length,
        },
        vencidos: {
          cantidad: overdueClients.length,
        },
        inactivos: {
          cantidad: inactiveClients.length,
        },
        enCola: {
          cantidad: clientsInQueue,
        },
      },
      capital: {
        disponible: {
          usd: montoDisponibleUsd,
          vef: montoDisponibleVef,
          bs: montoDisponibleVef,
        },
        vigente: {
          usd: parseFloat(montoVigenteUsd.toFixed(2)),
          vef: parseFloat(montoVigenteVef.toFixed(2)),
          bs: parseFloat(montoVigenteVef.toFixed(2)),
        },
        moroso: {
          usd: parseFloat(montoMorosoUsd.toFixed(2)),
          vef: montoMorosoVef,
          bs: montoMorosoVef,
        },
        vencido: {
          usd: parseFloat(montoVencidoUsd.toFixed(2)),
          vef: montoVencidoVef,
          bs: montoVencidoVef,
        },
      },
      solicitudes: {
        cantidad: requestsCount,
        monto: {
          usd: parseFloat(montoSolicitudesUsd.toFixed(2)),
          vef: parseFloat(montoSolicitudesVef.toFixed(2)),
          bs: parseFloat(montoSolicitudesVef.toFixed(2)),
        },
        clientesRecurrentes: {
          cantidad: clientesRecurrentesCantidad,
          monto: {
            usd: parseFloat(clientesRecurrentesMontoUsd.toFixed(2)),
            vef: clientesRecurrentesMontoVef,
            bs: clientesRecurrentesMontoVef,
          },
        },
      },
      caja: {
        saldoBs: parseFloat(saldoBs.toFixed(2)),
        saldoUsd: parseFloat(saldoUsd.toFixed(2)),
      },
      pasivo: {
        capital: {
          usd: parseFloat(pasivoCapitalUsd.toFixed(2)),
          vef: pasivoCapitalVef,
          bs: pasivoCapitalVef,
        },
        intereses: {
          usd: parseFloat(pasivoInteresesUsd.toFixed(2)),
          vef: pasivoInteresesVef,
          bs: pasivoInteresesVef,
        },
        total: {
          usd: parseFloat(pasivoTotalUsd.toFixed(2)),
          vef: pasivoTotalVef,
          bs: pasivoTotalVef,
        },
      },
      tasaCambio: {
        usd: rateUsd,
      },
    };

    return res.status(200).json({
      success: true,
      message: "Datos de tesorería obtenidos correctamente",
      data: treasuryData,
    });
  },
);
