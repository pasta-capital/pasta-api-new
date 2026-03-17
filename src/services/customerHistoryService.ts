import CustomerHistory from "../models/CustomerHistory";
import User from "../models/User";
import Operation from "../models/operation";
import { Types } from "mongoose";
import * as logger from "../common/logger";
import OperationPayment from "../models/operationPayment";
import Payment from "../models/payment";
import {
  startOfMonth,
  eachMonthOfInterval,
  differenceInDays,
  endOfMonth,
  isSameMonth,
  subDays,
} from "date-fns";
import { getRateS } from "./rateService";
import { startOfToday } from "../common/helper";

/**
 * Generates the monthly history for all active users.
 * Should be executed at the beginning of each month.
 */
export async function generateMonthlyHistory(specificDate?: Date) {
  const now = specificDate || new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // getMonth() is 0-indexed

  try {
    // Get all users with status "active"
    const users = await User.find({ status: "active" }).select("_id");

    for (const user of users) {
      // Check if the user has at least one "approved" operation
      const activeOperation = await Operation.findOne({
        user: user._id,
        status: "approved",
      });

      const status = activeOperation ? "active" : "inactive";

      await CustomerHistory.findOneAndUpdate(
        { user: user._id, year, month },
        { status },
        { upsert: true, new: true },
      );
    }

    logger.info(
      `[CustomerHistory] Monthly history generated for ${month}/${year}`,
    );
  } catch (err) {
    logger.error(
      `[CustomerHistory] Error generating monthly history for ${month}/${year}`,
      err,
    );
    throw err;
  }
}

/**
 * Updates a customer's status for the current month to 'active'
 * when an operation is confirmed.
 */
export async function updateCustomerStatusToActive(
  userId: string | Types.ObjectId,
) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    await CustomerHistory.findOneAndUpdate(
      { user: new Types.ObjectId(userId), year, month, status: "inactive" },
      { $set: { status: "active" } },
      { new: true },
    );

    logger.info(
      `[CustomerHistory] User ${userId} status updated to 'active' for ${month}/${year}`,
    );
  } catch (err) {
    logger.error(
      `[CustomerHistory] Error updating status for user ${userId}`,
      err,
    );
  }
}

/**
 * Gets the customer history for a specific user.
 */
export async function getHistoryByUser(userId: string | Types.ObjectId) {
  return await CustomerHistory.find({ user: new Types.ObjectId(userId) }).sort({
    year: -1,
    month: -1,
  });
}

/**
 * Gets statistics of users by status and month.
 */
export async function getStatistics(take: number, year?: number) {
  const match: any = {};
  if (year) {
    match.year = year;
  }

  const stats = await CustomerHistory.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year: "$year",
          month: "$month",
          status: "$status",
        },
        count: { $sum: 1 },
      },
    },
    {
      $group: {
        _id: {
          year: "$_id.year",
          month: "$_id.month",
        },
        statuses: {
          $push: {
            status: "$_id.status",
            count: "$count",
          },
        },
        total: { $sum: "$count" },
      },
    },
    { $sort: { "_id.year": -1, "_id.month": -1 } },
    { $limit: take },
  ]);

  return stats;
}

/**
 * Gets aggregated amount statistics (vigente, vencido, moroso) by month.
 */
export async function getAmountStatistics(
  take: number,
  currency: "USD" | "VEF" = "USD",
) {
  const now = new Date();
  const rate = await getRateS();
  const rateUsd = rate!.usd;

  // Get all payments that are not void or rejected
  const payments = await OperationPayment.find({
    status: { $nin: ["void", "rejected"] },
  })
    .select("date amountUsd amountUsdTotal amountVef rate paidAt createdAt")
    .lean();

  const statsMap: Record<
    string,
    {
      year: number;
      month: number;
      vigente: number;
      vencido: number;
      moroso: number;
    }
  > = {};

  for (const payment of payments) {
    const {
      date,
      amountUsd,
      amountUsdTotal,
      amountVef,
      rate: paymentRate,
      paidAt,
      status,
      createdAt,
    } = payment;
    if (!date || !createdAt) continue;

    // Calculate amount based on currency
    let amount: number;
    if (currency === "USD") {
      amount = amountUsdTotal ?? amountUsd ?? 0;
    } else {
      // VEF
      if (amountVef) {
        amount = amountVef;
      } else {
        // Convert from USD if VEF not available
        const usdAmount = amountUsdTotal ?? amountUsd ?? 0;
        const conversionRate = paymentRate ?? rateUsd;
        amount = usdAmount * conversionRate;
      }
    }

    if (amount === 0) continue;

    const dueDate = new Date(date);
    const creationDate = new Date(createdAt);
    const endPointDate = paidAt ? new Date(paidAt) : now;

    // Iterate through each month from creation until payment (or now)
    const startM = startOfMonth(creationDate);
    const endM = startOfMonth(endPointDate);

    const months = eachMonthOfInterval({ start: startM, end: endM });

    for (const m of months) {
      const key = `${m.getFullYear()}-${m.getMonth() + 1}`;
      if (!statsMap[key]) {
        statsMap[key] = {
          year: m.getFullYear(),
          month: m.getMonth() + 1,
          vigente: 0,
          vencido: 0,
          moroso: 0,
        };
      }

      let referenceDate: Date;
      if (isSameMonth(m, endPointDate)) {
        referenceDate = endPointDate;
      } else {
        referenceDate = endOfMonth(m);
      }

      // Logic classification
      if (referenceDate <= dueDate) {
        // If the reference date (end of month or actual end point) is before or on due date
        statsMap[key].vigente += amount;
      } else {
        // If it passed the due date
        const diff = differenceInDays(referenceDate, dueDate);
        if (diff <= 2) {
          statsMap[key].vencido += amount;
        } else {
          statsMap[key].moroso += amount;
        }
      }
    }
  }

  return Object.values(statsMap)
    .sort((a, b) => b.year - a.year || b.month - a.month)
    .slice(0, take)
    .map((item) => ({
      ...item,
      vigente: Number(item.vigente.toFixed(2)),
      vencido: Number(item.vencido.toFixed(2)),
      moroso: Number(item.moroso.toFixed(2)),
    }));
}

/**
 * Gets arrears history statistics by month: number of clients with 1, 2, 3, 4, or +4 morose installments.
 * Morose = payment past due by more than 2 days (same logic as getAmountStatistics).
 */
export async function getArrearsHistoryStatistics(take: number) {
  const now = new Date();

  const payments = await OperationPayment.find({
    status: { $nin: ["void", "rejected"] },
  })
    .select("_id user date paidAt")
    .lean();

  // monthKey -> userId -> count of morose installments in that month
  const arrearsByMonthUser = new Map<
    string,
    Map<string, number>
  >();
  // monthKey -> cuota _ids morosas en ese mes (para certificar)
  const cuotaIdsByMonth = new Map<string, string[]>();

  for (const payment of payments) {
    const { _id, date, paidAt, user } = payment;
    if (!date || !user) continue;

    const dueDate = new Date(date);
    const endPointDate = paidAt ? new Date(paidAt) : now;
    const userId = String(user);

    // Si ya pagó antes del vencimiento, nunca fue morosa
    if (paidAt && endPointDate <= dueDate) continue;

    // Start from due date month to avoid missing historical delinquency
    // when records are created/synced after their actual due date.
    const startM = startOfMonth(dueDate);
    const endM = startOfMonth(endPointDate);
    const months = eachMonthOfInterval({ start: startM, end: endM });

    for (const m of months) {
      let referenceDate: Date;
      if (isSameMonth(m, endPointDate)) {
        referenceDate = endPointDate;
      } else {
        referenceDate = endOfMonth(m);
      }

      // Morose = past due by more than 2 days
      if (referenceDate <= dueDate) continue;
      const diff = differenceInDays(referenceDate, dueDate);
      if (diff <= 2) continue;

      const key = `${m.getFullYear()}-${m.getMonth() + 1}`;
      if (!arrearsByMonthUser.has(key)) {
        arrearsByMonthUser.set(key, new Map());
      }
      const userMap = arrearsByMonthUser.get(key)!;
      userMap.set(userId, (userMap.get(userId) ?? 0) + 1);

      if (!cuotaIdsByMonth.has(key)) cuotaIdsByMonth.set(key, []);
      cuotaIdsByMonth.get(key)!.push(String(_id));
    }
  }

  const result: Array<{
    year: number;
    month: number;
    one: number;
    two: number;
    three: number;
    four: number;
    moreThan4: number;
    totalClientsWithArrears: number;
    cuotaIds: string[];
  }> = [];

  for (const [key, userMap] of arrearsByMonthUser) {
    const [yearStr, monthStr] = key.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    let one = 0;
    let two = 0;
    let three = 0;
    let four = 0;
    let moreThan4 = 0;

    for (const count of userMap.values()) {
      if (count === 1) one += 1;
      else if (count === 2) two += 1;
      else if (count === 3) three += 1;
      else if (count === 4) four += 1;
      else moreThan4 += 1;
    }

    result.push({
      year,
      month,
      one,
      two,
      three,
      four,
      moreThan4,
      totalClientsWithArrears: one + two + three + four + moreThan4,
      cuotaIds: cuotaIdsByMonth.get(key) ?? [],
    });
  }

  const resultByKey = new Map<string, (typeof result)[number]>();
  for (const item of result) {
    const key = `${item.year}-${item.month}`;
    resultByKey.set(key, item);
  }

  const lastMonths: typeof result = [];
  for (let i = 0; i < take; i += 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth() + 1;
    const key = `${year}-${month}`;

    lastMonths.push(
      resultByKey.get(key) ?? {
        year,
        month,
        one: 0,
        two: 0,
        three: 0,
        four: 0,
        moreThan4: 0,
        totalClientsWithArrears: 0,
        cuotaIds: [],
      },
    );
  }

  return lastMonths;
}

/**
 * Gets payment delay history by month based on paid installments.
 * Delay is calculated as days between createdAt and paidAt.
 */
export async function getPaymentDelayHistoryStatistics(take: number) {
  const now = new Date();

  const payments = await OperationPayment.find({
    status: "paid",
    paidAt: { $exists: true, $ne: null },
  })
    .select("createdAt paidAt")
    .lean();

  const statsByMonth = new Map<
    string,
    {
      year: number;
      month: number;
      totalPaidInstallments: number;
      totalDiffDays: number;
      lt14: number;
      d14to15: number;
      d15to20: number;
      d21to30: number;
      d31to60: number;
      d61to90: number;
      d91plus: number;
    }
  >();

  for (const payment of payments) {
    const { createdAt, paidAt } = payment;
    if (!createdAt || !paidAt) continue;

    const paidDate = new Date(paidAt);
    const createdDate = new Date(createdAt);
    const diffDays = Math.max(0, differenceInDays(paidDate, createdDate));

    const year = paidDate.getFullYear();
    const month = paidDate.getMonth() + 1;
    const key = `${year}-${month}`;

    if (!statsByMonth.has(key)) {
      statsByMonth.set(key, {
        year,
        month,
        totalPaidInstallments: 0,
        totalDiffDays: 0,
        lt14: 0,
        d14to15: 0,
        d15to20: 0,
        d21to30: 0,
        d31to60: 0,
        d61to90: 0,
        d91plus: 0,
      });
    }

    const monthStats = statsByMonth.get(key)!;
    monthStats.totalPaidInstallments += 1;
    monthStats.totalDiffDays += diffDays;

    if (diffDays < 14) monthStats.lt14 += 1;
    else if (diffDays <= 15) monthStats.d14to15 += 1;
    else if (diffDays <= 20) monthStats.d15to20 += 1;
    else if (diffDays <= 30) monthStats.d21to30 += 1;
    else if (diffDays <= 60) monthStats.d31to60 += 1;
    else if (diffDays <= 90) monthStats.d61to90 += 1;
    else monthStats.d91plus += 1;
  }

  const resultByKey = new Map<
    string,
    {
      year: number;
      month: number;
      totalPaidInstallments: number;
      averageDays: number;
      lt14: number;
      d14to15: number;
      d15to20: number;
      d21to30: number;
      d31to60: number;
      d61to90: number;
      d91plus: number;
    }
  >();

  for (const [key, item] of statsByMonth) {
    resultByKey.set(key, {
      year: item.year,
      month: item.month,
      totalPaidInstallments: item.totalPaidInstallments,
      averageDays:
        item.totalPaidInstallments === 0
          ? 0
          : Number(
              (item.totalDiffDays / item.totalPaidInstallments).toFixed(2),
            ),
      lt14: item.lt14,
      d14to15: item.d14to15,
      d15to20: item.d15to20,
      d21to30: item.d21to30,
      d31to60: item.d31to60,
      d61to90: item.d61to90,
      d91plus: item.d91plus,
    });
  }

  const lastMonths: Array<{
    year: number;
    month: number;
    totalPaidInstallments: number;
    averageDays: number;
    lt14: number;
    d14to15: number;
    d15to20: number;
    d21to30: number;
    d31to60: number;
    d61to90: number;
    d91plus: number;
  }> = [];
  for (let i = 0; i < take; i += 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth() + 1;
    const key = `${year}-${month}`;

    lastMonths.push(
      resultByKey.get(key) ?? {
        year,
        month,
        totalPaidInstallments: 0,
        averageDays: 0,
        lt14: 0,
        d14to15: 0,
        d15to20: 0,
        d21to30: 0,
        d31to60: 0,
        d61to90: 0,
        d91plus: 0,
      },
    );
  }

  return lastMonths;
}

/**
 * Gets payments and liquidations history by month.
 * Payments are from Payment with status "confirmed".
 * Liquidations are from Operation with status IN ("approved", "completed").
 */
export async function getPaymentsAndLiquidationsHistory(
  take: number,
  currency: "USD" | "VEF",
) {
  const now = new Date();
  const rate = await getRateS();
  const rateUsd = rate!.usd;

  // Get confirmed payments
  const payments = await Payment.find({
    status: "confirmed",
  })
    .select("updatedAt amountUsd amountVef rate")
    .lean();

  // Get liquidated operations
  const operations = await Operation.find({
    status: { $in: ["approved", "completed"] },
  })
    .select("createdAt amountUsd amountVef")
    .lean();

  const statsByMonth = new Map<
    string,
    {
      year: number;
      month: number;
      paymentsAmount: number;
      paymentsCount: number;
      liquidationsAmount: number;
      liquidationsCount: number;
    }
  >();

  // Process payments
  for (const payment of payments) {
    const confirmedAt = (payment as { updatedAt?: Date }).updatedAt;
    const { amountUsd, amountVef, rate: paymentRate } = payment;
    if (!confirmedAt) continue;

    const confirmedDate = new Date(confirmedAt);
    const year = confirmedDate.getFullYear();
    const month = confirmedDate.getMonth() + 1;
    const key = `${year}-${month}`;

    if (!statsByMonth.has(key)) {
      statsByMonth.set(key, {
        year,
        month,
        paymentsAmount: 0,
        paymentsCount: 0,
        liquidationsAmount: 0,
        liquidationsCount: 0,
      });
    }

    const monthStats = statsByMonth.get(key)!;
    monthStats.paymentsCount += 1;

    // Calculate amount based on currency
    if (currency === "USD") {
      monthStats.paymentsAmount += amountUsd ?? 0;
    } else {
      // VEF
      if (amountVef) {
        monthStats.paymentsAmount += amountVef;
      } else {
        // Convert from USD if VEF not available
        const conversionRate = paymentRate ?? rateUsd;
        monthStats.paymentsAmount += (amountUsd ?? 0) * conversionRate;
      }
    }
  }

  // Process liquidations (operations)
  for (const operation of operations) {
    const { createdAt, amountUsd, amountVef } = operation;
    if (!createdAt) continue;

    const createdDate = new Date(createdAt);
    const year = createdDate.getFullYear();
    const month = createdDate.getMonth() + 1;
    const key = `${year}-${month}`;

    if (!statsByMonth.has(key)) {
      statsByMonth.set(key, {
        year,
        month,
        paymentsAmount: 0,
        paymentsCount: 0,
        liquidationsAmount: 0,
        liquidationsCount: 0,
      });
    }

    const monthStats = statsByMonth.get(key)!;
    monthStats.liquidationsCount += 1;

    // Calculate amount based on currency
    if (currency === "USD") {
      monthStats.liquidationsAmount += amountUsd ?? 0;
    } else {
      // VEF
      monthStats.liquidationsAmount += amountVef ?? 0;
    }
  }

  const resultByKey = new Map<
    string,
    {
      year: number;
      month: number;
      paymentsAmount: number;
      paymentsCount: number;
      liquidationsAmount: number;
      liquidationsCount: number;
    }
  >();

  for (const [key, item] of statsByMonth) {
    resultByKey.set(key, {
      year: item.year,
      month: item.month,
      paymentsAmount: Number(item.paymentsAmount.toFixed(2)),
      paymentsCount: item.paymentsCount,
      liquidationsAmount: Number(item.liquidationsAmount.toFixed(2)),
      liquidationsCount: item.liquidationsCount,
    });
  }

  const lastMonths: Array<{
    year: number;
    month: number;
    paymentsAmount: number;
    paymentsCount: number;
    liquidationsAmount: number;
    liquidationsCount: number;
  }> = [];
  for (let i = 0; i < take; i += 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth() + 1;
    const key = `${year}-${month}`;

    lastMonths.push(
      resultByKey.get(key) ?? {
        year,
        month,
        paymentsAmount: 0,
        paymentsCount: 0,
        liquidationsAmount: 0,
        liquidationsCount: 0,
      },
    );
  }

  return lastMonths;
}

const RECURRING_CLIENTS_LIMIT = 10;

export type RecurringClientsIndicatorParams = {
  startDate: Date;
  endDate: Date;
  currency: "USD" | "VEF";
};

/**
 * Gets recurring clients indicator: users with more than 1 credit (Operation status approved/completed)
 * in the given date range, ordered by credits count descending, limited to 10.
 */
export async function getRecurringClientsIndicator(
  params: RecurringClientsIndicatorParams,
) {
  const { startDate, endDate, currency } = params;

  const pipeline: any[] = [
    {
      $match: {
        status: { $in: ["approved", "completed"] },
        createdAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: "$user",
        creditsCount: { $sum: 1 },
        amountUsdTotal: { $sum: "$amountUsd" },
        amountVefTotal: { $sum: "$amountVef" },
      },
    },
    { $match: { creditsCount: { $gt: 1 } } },
    { $sort: { creditsCount: -1 } },
    { $limit: RECURRING_CLIENTS_LIMIT },
    {
      $lookup: {
        from: "User",
        localField: "_id",
        foreignField: "_id",
        as: "userDoc",
      },
    },
    { $unwind: { path: "$userDoc", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        clientId: "$_id",
        clientName: {
          $concat: [
            { $ifNull: ["$userDoc.name", ""] },
            " ",
            { $ifNull: ["$userDoc.lastname", ""] },
          ],
        },
        creditsCount: 1,
        amountUsdTotal: 1,
        amountVefTotal: 1,
      },
    },
  ];

  const results = await Operation.aggregate(pipeline);

  return results.map((row: any) => {
    const approvedAmount =
      currency === "USD"
        ? (row.amountUsdTotal ?? 0)
        : (row.amountVefTotal ?? 0);
    return {
      clientId: row.clientId,
      clientName: (row.clientName || "").trim() || "—",
      creditsCount: row.creditsCount,
      approvedAmount: Number(Number(approvedAmount).toFixed(2)),
    };
  });
}

/**
 * Gets liquidated amounts indicator: vigentes, vencidos, morosos (no Disponible).
 * Vigentes: pending, paidAt null, date >= hoy.
 * Vencidos: overdue OR (pending, date < hoy, date >= hoy-2), paidAt null.
 * Morosos: inArrears OR (pending, date < hoy-2), paidAt null.
 */
export async function getLiquidatedAmountsIndicator(currency: "USD" | "VEF") {
  const rate = await getRateS();
  const rateUsd = rate!.usd;
  const todayStart = startOfToday();
  const todayMinus2 = subDays(todayStart, 2);

  const unpaidMatch = {
    $or: [{ paidAt: null }, { paidAt: { $exists: false } }],
  };

  // Liquidados vigentes: status=pending, paidAt null, date >= hoy
  const vigentesResult = await OperationPayment.aggregate([
    {
      $match: {
        ...unpaidMatch,
        status: "pending",
        date: { $gte: todayStart },
      },
    },
    {
      $group: {
        _id: null,
        amountUsd: { $sum: { $ifNull: ["$amountUsdTotal", "$amountUsd"] } },
        amountVef: { $sum: "$amountVef" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Liquidados vencidos: overdue OR (pending, date < hoy, date >= hoy-2), paidAt null
  const vencidosResult = await OperationPayment.aggregate([
    {
      $match: {
        ...unpaidMatch,
        $or: [
          { status: "overdue" },
          {
            status: "pending",
            date: { $lt: todayStart, $gte: todayMinus2 },
          },
        ],
      },
    },
    {
      $group: {
        _id: null,
        amountUsd: { $sum: { $ifNull: ["$amountUsdTotal", "$amountUsd"] } },
        amountVef: { $sum: "$amountVef" },
        count: { $sum: 1 },
      },
    },
  ]);

  // Liquidados morosos: inArrears OR (pending, date < hoy-2), paidAt null
  const morososResult = await OperationPayment.aggregate([
    {
      $match: {
        ...unpaidMatch,
        $or: [
          { status: "inArrears" },
          {
            status: "pending",
            date: { $lt: todayMinus2 },
          },
        ],
      },
    },
    {
      $group: {
        _id: null,
        amountUsd: { $sum: { $ifNull: ["$amountUsdTotal", "$amountUsd"] } },
        amountVef: { $sum: "$amountVef" },
        count: { $sum: 1 },
      },
    },
  ]);

  const toAmount = (row: any, usdKey: string, vefKey: string) => {
    if (!row) return 0;
    if (currency === "USD") return row[usdKey] ?? 0;
    const vef = row[vefKey];
    if (vef != null && vef > 0) return vef;
    return (row[usdKey] ?? 0) * rateUsd;
  };

  const liquidadosVigentes = toAmount(
    vigentesResult[0],
    "amountUsd",
    "amountVef",
  );
  const liquidadosVencidos = toAmount(
    vencidosResult[0],
    "amountUsd",
    "amountVef",
  );
  const liquidadosMorosos = toAmount(
    morososResult[0],
    "amountUsd",
    "amountVef",
  );

  const total =
    liquidadosVigentes + liquidadosVencidos + liquidadosMorosos;

  return {
    liquidadosVigentes: Number(liquidadosVigentes.toFixed(2)),
    liquidadosVencidos: Number(liquidadosVencidos.toFixed(2)),
    liquidadosMorosos: Number(liquidadosMorosos.toFixed(2)),
    total: Number(total.toFixed(2)),
    currency,
  };
}
