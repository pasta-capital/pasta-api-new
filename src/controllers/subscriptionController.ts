import { Request, Response } from "express";
import {
  createSubscription,
  generateDomiciliationFile,
  readDomiciliationFileResp,
} from "../services/subscriptionService";
import { getRateS } from "../services/rateService";
import { getSubscription } from "../services/subscriptionService";
import User from "../models/User";
import Subscription from "../models/subscription";
import SubscriptionPayment from "../models/subscriptionPayment";
import { padNumber } from "../common/helper";
import * as env from "../config/env.config";
import {
  domiciliation,
  getTransactionResult,
  TransactionStatusCode,
} from "../services/sypagoService";
import * as loggers from "../common/logger";

const SUBSCRIPTION_CONTROLLER_DISABLED = true;

const respondSubscriptionDisabled = (res: Response) =>
  res.status(503).json({
    success: false,
    message: "Métodos de suscripción deshabilitados temporalmente.",
  });

export const createSubscriptionHandler = async (
  req: Request,
  res: Response,
) => {
  if (SUBSCRIPTION_CONTROLLER_DISABLED) {
    return respondSubscriptionDisabled(res);
  }
  const { user, account, plan } = req.body;

  const subscription = await createSubscription(user, account, plan);
  if (!subscription.success) {
    return res.status(400).json(subscription);
  }

  return res.status(200).json(subscription);
};

export const generateDomiciliationFileHandler = async (
  req: Request,
  res: Response,
) => {
  if (SUBSCRIPTION_CONTROLLER_DISABLED) {
    return respondSubscriptionDisabled(res);
  }
  const { date } = req.body;

  const resp = await generateDomiciliationFile(date);

  return res
    .status(200)
    .json({ success: true, message: "Archivo generado", data: resp });
};

export const readDomiciliationFileResponse = async (
  req: Request,
  res: Response,
) => {
  if (SUBSCRIPTION_CONTROLLER_DISABLED) {
    return respondSubscriptionDisabled(res);
  }
  const resp = await readDomiciliationFileResp();

  return res.status(resp.success ? 200 : 400).json(resp);
};

export const subscribeUsers = async (req: Request, res: Response) => {
  if (SUBSCRIPTION_CONTROLLER_DISABLED) {
    return respondSubscriptionDisabled(res);
  }
  const usersWithoutSubscription = await User.aggregate([
    {
      $match: {
        status: { $eq: "active" },
      },
    },
    {
      $lookup: {
        from: "Subscription",
        localField: "_id",
        foreignField: "user",
        as: "subscriptions",
      },
    },
    {
      $match: {
        subscriptions: { $size: 0 },
      },
    },
  ]);

  console.log(usersWithoutSubscription);

  for (const user of usersWithoutSubscription) {
    const count = await Subscription.countDocuments();
    const newSubscription = new Subscription({
      user: user._id,
      startDate: new Date(),
      contractNumber: padNumber(count + 1, 10),
    });
    await newSubscription.save();
  }

  return res.status(200).json({
    success: true,
    message: "Suscripciones creadas exitosamente",
  });
};

export const chargeSubscriptions = async (req: Request, res: Response) => {
  if (SUBSCRIPTION_CONTROLLER_DISABLED) {
    return respondSubscriptionDisabled(res);
  }
  const subscriptions = await Subscription.find({
    contractNumber: { $exists: true },
    active: true,
  });

  for (const subscription of subscriptions) {
    const users = await User.aggregate([
      {
        $match: {
          _id: subscription.user,
        },
      },
      {
        $lookup: {
          from: "Account",
          localField: "_id",
          foreignField: "user",
          as: "accounts",
        },
      },
      {
        $lookup: {
          from: "Account", // usa el nombre REAL en la base (normalmente plural y minúsculas)
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$user", "$$userId"] } } },

            // Sub-lookup para bank
            {
              $lookup: {
                from: "Bank", // nombre real de la colección de bancos
                localField: "bank",
                foreignField: "_id",
                as: "bank",
              },
            },
            // Desnormaliza banco (siempre 0 o 1 item)
            { $unwind: { path: "$bank", preserveNullAndEmptyArrays: true } },

            // // Proyección de cuentas (ajusta campos según tu esquema)
            // {
            //   $project: {
            //     _id: 1,
            //     type: 1,
            //     number: 1,
            //     alias: 1,
            //     currency: 1,
            //     // Campos del banco que te interesen
            //     bank: {
            //       _id: 1,
            //       name: "$bank.name",
            //       code: "$bank.code",
            //       swift: "$bank.swift",
            //       // añade más si los necesitas
            //     },
            //   },
            // },
          ],
          as: "accounts",
        },
      },
      {
        $project: {
          document: 1,
          identificationType: 1,
          name: 1,
          lastname: 1,
          email: 1,
          accounts: 1,
        },
      },
    ]);
    const user = users[0];

    for (const account of user.accounts) {
      const rate = await getRateS();
      const rateUsd = rate!.usd;

      const amountUsd = 1;
      const amountVef = parseFloat((amountUsd * rateUsd).toFixed(2));

      const SypagoDomiciliationBody = {
        internal_id: subscription.contractNumber,
        account: {
          bank_code: env.SYPAGO_BANK_ACCOUNT_CODE!,
          type: "CNTA",
          number: env.SYPAGO_BANK_ACCOUNT_NUMBER!,
        },
        amount: {
          amt: amountVef,
          currency: "VES",
        },
        concept: "Cobro por domiciliación",
        notification_urls: {
          web_hook_endpoint: env.SYPAGO_WEBHOOK_URL!,
        },
        receiving_user: {
          name: `${user.name} ${user.lastname}`,
          document_info: {
            type: user.identificationType,
            number: user.document,
          },
          account: {
            bank_code: account.bank.code,
            type: "CNTA",
            number: account.number,
          },
        },
        domiciliation_data: {
          contract: {
            id: subscription.contractNumber,
          },
          invoices: [
            {
              id: subscription.contractNumber,
              amount: {
                amt: amountVef,
                currency: "VES",
              },
            },
          ],
        },
      } as env.SypagoDomiciliationBody;
      console.log(
        "🚀 ~ chargeSubscriptions ~ SypagoDomiciliationBody:",
        SypagoDomiciliationBody,
      );

      const resp = await domiciliation(SypagoDomiciliationBody);
      console.log("🚀 ~ chargeSubscriptions ~ resp:", resp);
      if (resp.success) continue;
    }
  }

  return res.status(200).json({
    success: true,
    message: "Suscripciones cobradas exitosamente",
  });
};

export const createPayments = async (req: Request, res: Response) => {
  if (SUBSCRIPTION_CONTROLLER_DISABLED) {
    return respondSubscriptionDisabled(res);
  }
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;

  const subscriptions = await Subscription.find({
    active: true,
    $expr: {
      $and: [
        { $eq: [{ $dayOfMonth: "$startDate" }, day] },
        { $eq: [{ $month: "$startDate" }, month] },
      ],
    },
  });

  const rate = await getRateS();
  const rateUsd = rate!.usd;

  for (const sub of subscriptions) {
    const newPayment = new SubscriptionPayment({
      user: sub.user,
      amountUsd: 1,
      amountVef: parseFloat((1 * rateUsd).toFixed(2)),
      rate: rateUsd,
      paymentDate: new Date(),
      status: "pending",
    });
    await newPayment.save();
  }

  return res.status(200).json({
    success: true,
    message: "Pagos creados exitosamente",
    count: subscriptions.length,
  });
};

export const chargePayments = async (req: Request, res: Response) => {
  if (SUBSCRIPTION_CONTROLLER_DISABLED) {
    return respondSubscriptionDisabled(res);
  }
  const pendingPayments = await SubscriptionPayment.find({
    status: "pending",
  });

  const summary = {
    successful: 0,
    failed: 0,
    details: [] as { paymentId: string; status: string; reason?: string }[],
  };

  for (const payment of pendingPayments) {
    const subscription = await Subscription.findOne({
      user: payment.user,
      active: true,
      contractNumber: { $exists: true },
    });

    if (!subscription) {
      summary.failed++;
      summary.details.push({
        paymentId: (payment._id as any).toString(),
        status: "failed",
        reason: "No active subscription with contract number found",
      });
      continue;
    }

    const users = await User.aggregate([
      {
        $match: {
          _id: payment.user,
        },
      },
      {
        $lookup: {
          from: "Account",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$user", "$$userId"] } } },
            {
              $lookup: {
                from: "Bank",
                localField: "bank",
                foreignField: "_id",
                as: "bank",
              },
            },
            { $unwind: { path: "$bank", preserveNullAndEmptyArrays: true } },
          ],
          as: "accounts",
        },
      },
      {
        $project: {
          document: 1,
          identificationType: 1,
          name: 1,
          lastname: 1,
          email: 1,
          accounts: 1,
        },
      },
    ]);

    const user = users[0];
    if (!user) {
      summary.failed++;
      summary.details.push({
        paymentId: (payment._id as any).toString(),
        status: "failed",
        reason: "User not found",
      });
      continue;
    }

    let charged = false;
    let lastReason = "No accounts found";

    for (const account of user.accounts) {
      const rate = await getRateS();
      const rateUsd = rate!.usd;

      const amountUsd = payment.amountUsd;
      const amountVef = parseFloat((amountUsd * rateUsd).toFixed(2));

      const SypagoDomiciliationBody = {
        internal_id: subscription.contractNumber,
        account: {
          bank_code: env.SYPAGO_BANK_ACCOUNT_CODE!,
          type: "CNTA",
          number: env.SYPAGO_BANK_ACCOUNT_NUMBER!,
        },
        amount: {
          amt: amountVef,
          currency: "VES",
        },
        concept: "Cobro por domiciliación",
        notification_urls: {
          web_hook_endpoint: env.SYPAGO_WEBHOOK_URL!,
        },
        receiving_user: {
          name: `${user.name} ${user.lastname}`,
          document_info: {
            type: user.identificationType,
            number: user.document,
          },
          account: {
            bank_code: account.bank.code,
            type: "CNTA",
            number: account.number,
          },
        },
        domiciliation_data: {
          contract: {
            id: subscription.contractNumber,
          },
          invoices: [
            {
              id: subscription.contractNumber,
              amount: {
                amt: amountVef,
                currency: "VES",
              },
            },
          ],
        },
      } as env.SypagoDomiciliationBody;

      const resp = await domiciliation(SypagoDomiciliationBody);
      console.log("🚀 ~ chargePayments ~ resp:", resp);

      if (resp.success) {
        const transaction = await getTransactionResult(
          resp.data.transaction_id,
        );

        if (
          transaction.success &&
          transaction.data.status === TransactionStatusCode.ACCP
        ) {
          payment.status = "completed";
          await payment.save();
          charged = true;
          break; // Si un cobro es exitoso no cobrar al resto de las cuentas
        } else {
          lastReason = transaction.message || "Transaction not accepted";
        }
      } else {
        lastReason = resp.message || "Domiciliation request failed";
      }
    }

    if (charged) {
      summary.successful++;
      summary.details.push({
        paymentId: (payment._id as any).toString(),
        status: "success",
      });
    } else {
      summary.failed++;
      summary.details.push({
        paymentId: (payment._id as any).toString(),
        status: "failed",
        reason: lastReason,
      });
    }
  }

  loggers.operation("Charge Payments Summary", {
    action: "charge_payments",
    successful: summary.successful,
    failed: summary.failed,
    details: summary.details,
  });

  return res.status(200).json({
    success: true,
    message: "Pagos procesados exitosamente",
    summary,
  });
};
