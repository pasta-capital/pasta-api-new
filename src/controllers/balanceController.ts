import { Request, Response } from "express";
import asyncHandler from "../common/asyncHandler";
import Balance from "../models/balance";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { getRateS } from "../services/rateService";
import { PipelineStage } from "mongoose";
import { getDatesInWeek } from "../common/helper";

/**
 * Get balance registers per day
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getBalanceList = asyncHandler(
  async (req: Request, res: Response) => {
    try {
      // Extract pagination parameters from the query string
      const page = parseInt(req.query.page as string) || 1; // Default to page 1 if not provided
      const limit = parseInt(req.query.limit as string) || 10; // Default to 10 items per page if not provided
      const globalFilter = req.query.globalFilter as string; // Extract the global filter term
      let dateFilter = req.query.date as string;
      const currency = (req.query.currency as string) || "VEF";

      // Build the filter query object
      const filter: any = {};
      if (globalFilter) {
        // Create a case-insensitive regular expression for the search term
        const regex = new RegExp(globalFilter, "i");

        // Use the $or operator to search across multiple fields
        filter.$or = [
          { description: { $regex: regex } },
          { reference: { $regex: regex } },
          { client: { $regex: regex } },
        ];
      }

      const fixedTimeZone = "America/Caracas";
      const today = formatInTimeZone(new Date(), fixedTimeZone, "yyyy-MM-dd");
      if (!dateFilter) {
        dateFilter = today;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Please use YYYY-MM-DD.",
        });
      }

      const startOfDayString = `${dateFilter}T00:00:00`;
      const endOfDayString = `${dateFilter}T23:59:59.999`;

      const startOfUtcDay = fromZonedTime(startOfDayString, fixedTimeZone);
      const endOfUtcDay = fromZonedTime(endOfDayString, fixedTimeZone);

      // Calculate the number of documents to skip
      const skip = (page - 1) * limit;

      const rate = await getRateS();
      const rateUsd = rate!.usd;

      const orDateFilter = [
        {
          status: { $in: ["pending", "confirmed"] },
          createdAt: {
            $gte: startOfUtcDay,
            $lte: endOfUtcDay,
          },
        },
      ] as [any];

      if (dateFilter === today) {
        orDateFilter.push({
          status: { $in: ["overdue", "inArrears"] },
          createdAt: {
            $lte: endOfUtcDay,
          },
        });
      }

      const pipeline = [
        {
          $project: {
            _id: 1,
            description: 1,
            reference: 1,
            amount: {
              $round: [
                {
                  $divide: ["$amount", currency === "VEF" ? 1 : rateUsd],
                },
                2, // Redondea a 2 decimales
              ],
            },
            createdAt: 1,
            client: 1,
            isIncome: 1,
            status: 1,
          },
        },
        {
          $match: {
            status: "confirmed",
          },
        },
        {
          $unionWith: {
            coll: "OperationPayment",
            pipeline: [
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
                $project: {
                  _id: 0,
                  description: "Cuota pendiente",
                  reference: "",
                  amount: {
                    $round: [
                      {
                        $multiply: [
                          "$amountUsd",
                          currency === "VEF" ? rateUsd : 1,
                        ],
                      },
                      2, // Redondea a 2 decimales
                    ],
                  },
                  createdAt: "$date",
                  client: {
                    $concat: ["$userData.name", " ", "$userData.lastname"],
                  },
                  isIncome: { $literal: true },
                  status: 1,
                },
              },
              {
                $match: {
                  status: {
                    $in: ["pending", "overdue", "inArrears"],
                  },
                },
              },
            ],
          },
        },
        {
          $match: {
            $and: [filter, { $or: orDateFilter }],
          },
        },
      ];

      const results = await Balance.aggregate([
        ...pipeline,
        {
          $skip: skip,
        },
        {
          $limit: limit,
        },
      ]);

      const countPipeline = await Balance.aggregate([
        ...pipeline,
        {
          $count: "totalCount",
        },
      ]);
      const totalCount =
        countPipeline.length > 0 ? countPipeline[0].totalCount : 0;

      return res.status(200).json({
        success: true,
        message: "Balance retrieved successfully",
        data: results,
        totalCount: totalCount, // Include the total count in the response
      });
    } catch (error: any) {
      console.error("Error fetching balance list:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving balance list",
        error: error.message,
      });
    }
  },
);

/**
 * Get balance totals in a week
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {Promise<void>}
 */
export const getBalanceTotalsInWeek = asyncHandler(
  async (req: Request, res: Response) => {
    const currency = (req.query.currency as string) || "VEF";
    const startDate =
      (req.query.startDate as string) || new Date().toISOString();
    try {
      const selectedDate = new Date(startDate);
      selectedDate.setHours(0, 0, 0, 0); // Set to the beginning of today in local time
      const fixedTimeZone = "America/Caracas";
      const startOfUtcDay = fromZonedTime(selectedDate, fixedTimeZone);

      // Calculate endOfUtcDay for the end of the 7-day period
      const endOfWeek = new Date(selectedDate);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      const endOfUtcDay = fromZonedTime(endOfWeek, fixedTimeZone);

      const pastBalances = await Balance.aggregate([
        {
          $match: {
            status: "confirmed",
            createdAt: {
              $lt: startOfUtcDay,
            },
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

      const rate = await getRateS();
      const rateUsd = rate!.usd;

      const initialBalance =
        (pastBalances.length > 0 ? pastBalances[0].totalAmount : 0) /
        (currency === "VEF" ? 1 : rateUsd);

      const pipeline: PipelineStage[] = [
        {
          $project: {
            _id: 1,
            description: 1,
            reference: 1,
            amount: {
              $divide: ["$amount", currency === "VEF" ? 1 : rateUsd],
            },
            createdAt: 1,
            isIncome: 1,
            status: 1,
          },
        },
        {
          $match: {
            status: "confirmed",
          },
        },
        {
          $unionWith: {
            coll: "OperationPayment",
            pipeline: [
              {
                $project: {
                  _id: 0,
                  description: "Cuota pendiente",
                  reference: "",
                  amount: {
                    $round: [
                      {
                        $multiply: [
                          "$amountUsd",
                          currency === "VEF" ? rateUsd : 1,
                        ],
                      },
                      2, // Redondea a 2 decimales
                    ],
                  },
                  createdAt: {
                    $cond: {
                      if: {
                        $in: ["$status", ["overdue", "inArrears"]],
                      },
                      then: new Date(),
                      else: "$date",
                    },
                  },
                  isIncome: { $literal: true },
                  status: 1,
                },
              },
              {
                $match: {
                  status: {
                    $in: ["pending", "overdue", "inArrears"],
                  },
                },
              },
            ],
          },
        },
        {
          $match: {
            createdAt: {
              $gte: startOfUtcDay,
              $lt: endOfUtcDay,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d", // Formato YYYY-MM-DD para agrupar por día
                date: "$createdAt", // Usa el campo 'createdAt' que ya has proyectado
                timezone: "America/Caracas",
              },
            },
            credit: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $eq: ["$isIncome", true],
                      },
                      {
                        $in: ["$status", ["confirmed"]],
                      },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            creditPending: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $eq: ["$isIncome", true],
                      },
                      {
                        $in: ["$status", ["overdue", "inArrears", "pending"]],
                      },
                    ],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            debit: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$isIncome", false],
                  },
                  then: "$amount",
                  else: 0,
                },
              },
            },
            netFlow: {
              $sum: {
                $cond: {
                  if: {
                    $eq: ["$isIncome", true],
                  },
                  then: "$amount",
                  else: {
                    $multiply: ["$amount", -1],
                  },
                },
              },
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $project: {
            _id: 1,
            credit: 1,
            creditPending: 1,
            debit: 1,
            netFlow: 1,
          },
        },
      ];

      const rawResults = await Balance.aggregate(pipeline);

      const weekDates = getDatesInWeek(selectedDate);

      const resultsMap = new Map<string, any>();
      rawResults.forEach((item: any) => resultsMap.set(item._id, item));

      let currentBalance = initialBalance;
      const results = weekDates.map((date) => {
        const result = resultsMap.get(date);
        if (result) {
          currentBalance += result.netFlow;
          return {
            ...result,
            nextBalance: currentBalance,
          };
        } else {
          return {
            _id: date,
            credit: 0,
            creditPending: 0,
            debit: 0,
            netFlow: 0,
            nextBalance: currentBalance,
          };
        }
      });

      return res.status(200).json({
        success: true,
        message: "Balance retrieved successfully",
        data: {
          initialBalance,
          startOfUtcDay,
          endOfUtcDay,
          results,
        },
      });
    } catch (error: any) {
      console.error("Error fetching balance totals in week:", error);
      res.status(500).json({
        success: false,
        message: "Error retrieving balance totals in week",
        error: error.message,
      });
    }
  },
);
