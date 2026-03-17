import { fromZonedTime } from "date-fns-tz";
import { Request, Response } from "express";
import Operation from "../models/operation";
import { getRateS } from "../services/rateService";
import OperationPayment from "../models/operationPayment";
import User from "../models/User";

export const getIndicatorsNew = async (req: Request, res: Response) => {
  const startDateFilter = req.query.startDate as string;
  const endDateFilter = req.query.endDate as string;
  const currency = (req.query.currency as string) || "VEF";

  const fixedTimeZone = "America/Caracas";

  const startOfDayString = `${startDateFilter}T00:00:00`;
  const endOfDayString = `${endDateFilter}T23:59:59.999`;

  const startOfUtcDay = fromZonedTime(startOfDayString, fixedTimeZone);
  const endOfUtcDay = fromZonedTime(endOfDayString, fixedTimeZone);

  const rate = await getRateS();
  const rateUsd = rate!.usd;

  const resultCLientes = await User.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startOfUtcDay,
          $lte: endOfUtcDay,
        },
        verificationStatus: "Approved",
      },
    },
  ]);
};

export const getIndicators = async (req: Request, res: Response) => {
  const startDateFilter = req.query.startDate as string;
  const endDateFilter = req.query.endDate as string;
  const currency = (req.query.currency as string) || "VEF";

  const fixedTimeZone = "America/Caracas";

  const startOfDayString = `${startDateFilter}T00:00:00`;
  const endOfDayString = `${endDateFilter}T23:59:59.999`;

  const startOfUtcDay = fromZonedTime(startOfDayString, fixedTimeZone);
  const endOfUtcDay = fromZonedTime(endOfDayString, fixedTimeZone);

  const rate = await getRateS();
  const rateUsd = rate!.usd;

  const resultOperations = await Operation.aggregate([
    {
      $match: {
        createdAt: {
          $gte: startOfUtcDay,
          $lte: endOfUtcDay,
        },
        status: {
          $nin: ["void", "rejected"],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalCount: {
          $sum: 1,
        },
        totalAmount: {
          $sum: {
            $multiply: ["$amountUsd", currency === "VEF" ? rateUsd : 1],
          },
        },
      },
    },
  ]);

  const resultDebts = await OperationPayment.aggregate([
    {
      $match: {
        status: {
          $nin: ["void", "rejected"],
        },
        $expr: {
          $and: [
            {
              $gte: [{ $ifNull: ["$paidAt", "$date"] }, startOfUtcDay],
            },
            {
              $lte: [{ $ifNull: ["$paidAt", "$date"] }, endOfUtcDay],
            },
          ],
        },
      },
    },
    {
      $group: {
        _id: null,
        totalCount: {
          $sum: 1,
        },
        totalAmount: {
          $sum: {
            $cond: {
              if: {
                $eq: ["$status", "paid"],
              },
              then: {
                $divide: ["$amountVef", currency === "VEF" ? 1 : rateUsd],
              },
              else: {
                $multiply: ["$amountUsd", currency === "USD" ? 1 : rateUsd],
              },
            },
          },
        },
      },
    },
  ]);

  return res.status(200).json({
    success: true,
    message: "Indicators retrieved successfully",
    data: {
      operationCount:
        resultOperations.length === 0 ? 0 : resultOperations[0].totalCount,
      operationAmount:
        resultOperations.length === 0 ? 0 : resultOperations[0].totalAmount,
      debtCount: resultDebts.length === 0 ? 0 : resultDebts[0].totalCount,
      debtAmount: resultDebts.length === 0 ? 0 : resultDebts[0].totalAmount,
    },
  });
};
