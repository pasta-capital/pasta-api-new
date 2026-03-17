import { Request, Response } from "express";
import asyncHandler from "../common/asyncHandler";
import {
  generateMonthlyHistory,
  getHistoryByUser,
  getStatistics,
  getAmountStatistics,
  getArrearsHistoryStatistics,
  getPaymentDelayHistoryStatistics,
  getPaymentsAndLiquidationsHistory,
  getRecurringClientsIndicator,
  getLiquidatedAmountsIndicator,
} from "../services/customerHistoryService";
import { fromZonedTime } from "date-fns-tz";


/**
 * Manually trigger the monthly history generation.
 * @param {Request} req
 * @param {Response} res
 */
export const triggerMonthlyHistory = asyncHandler(
  async (req: Request, res: Response) => {
    // Optional: allow passing a date for backfilling
    const { date } = req.body;
    const executionDate = date ? new Date(date) : new Date();

    await generateMonthlyHistory(executionDate);

    return res.status(200).json({
      success: true,
      message: "Customer history generation triggered successfully",
      date: executionDate,
    });
  }
);

/**
 * Get history for a specific user.
 * @param {Request} req
 * @param {Response} res
 */
export const getUserHistory = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const history = await getHistoryByUser(userId);

    return res.status(200).json({
      success: true,
      data: history,
    });
  }
);

/**
 * Get aggregated statistics by status and month.
 * @param {Request} req
 * @param {Response} res
 */
export const getStats = asyncHandler(
  async (req: Request, res: Response) => {
    const take = req.query.take ? parseInt(req.query.take as string) : 12;
    const year = req.query.year ? parseInt(req.query.year as string) : undefined;
    
    const stats = await getStatistics(take, year);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  }
);

/**
 * Get aggregated amount statistics (vigente, vencido, moroso) by month.
 * @param {Request} req
 * @param {Response} res
 */
export const getAmountStats = asyncHandler(
  async (req: Request, res: Response) => {
    const take = req.query.take ? parseInt(req.query.take as string) : 12;
    const currency = (req.query.currency as string) || "USD";

    if (currency !== "USD" && currency !== "VEF") {
      return res.status(400).json({
        success: false,
        message: "Currency must be USD or VEF",
      });
    }

    const stats = await getAmountStatistics(take, currency as "USD" | "VEF");

    return res.status(200).json({
      success: true,
      data: stats,
    });
  }
);

/**
 * Get arrears history statistics by month: clients with 1, 2, 3, 4, or +4 morose installments.
 */
export const getArrearsHistoryStats = asyncHandler(
  async (req: Request, res: Response) => {
    const take = req.query.take ? parseInt(req.query.take as string) : 12;

    const stats = await getArrearsHistoryStatistics(take);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  }
);

/**
 * Get payment delay history statistics by month:
 * buckets and average days from createdAt to paidAt for paid installments.
 */
export const getPaymentDelayHistoryStats = asyncHandler(
  async (req: Request, res: Response) => {
    const take = req.query.take ? parseInt(req.query.take as string) : 12;

    const stats = await getPaymentDelayHistoryStatistics(take);

    return res.status(200).json({
      success: true,
      data: stats,
    });
  }
);

/**
 * Get payments and liquidations history statistics by month.
 * Payments are from OperationPayment (status "paid").
 * Liquidations are from Operation (status IN "approved", "completed").
 */
export const getPaymentsAndLiquidationsHistoryStats = asyncHandler(
  async (req: Request, res: Response) => {
    const take = req.query.take ? parseInt(req.query.take as string) : 12;
    const currency = (req.query.currency as string) || "VEF";

    if (currency !== "USD" && currency !== "VEF") {
      return res.status(400).json({
        success: false,
        message: "Currency must be USD or VEF",
      });
    }

    const stats = await getPaymentsAndLiquidationsHistory(
      take,
      currency as "USD" | "VEF",
    );

    return res.status(200).json({
      success: true,
      data: stats,
    });
  }
);

/**
 * Get recurring clients indicator: clients with more than 1 credit in the date range,
 * ordered by credits count descending, max 10. Requires startDate, endDate; optional currency (USD|VEF).
 */
export const getRecurringClientsIndicatorStats = asyncHandler(
  async (req: Request, res: Response) => {
    const startDateFilter = req.query.startDate as string | undefined;
    const endDateFilter = req.query.endDate as string | undefined;
    const currency = (req.query.currency as string) || "VEF";

    if (currency !== "USD" && currency !== "VEF") {
      return res.status(400).json({
        success: false,
        message: "Currency must be USD or VEF",
      });
    }

    const fixedTimeZone = "America/Caracas";
    const startOfUtcDay = startDateFilter
      ? fromZonedTime(`${startDateFilter}T00:00:00`, fixedTimeZone)
      : new Date(0);
    const endOfUtcDay = endDateFilter
      ? fromZonedTime(`${endDateFilter}T23:59:59.999`, fixedTimeZone)
      : new Date();

    const data = await getRecurringClientsIndicator({
      startDate: startOfUtcDay,
      endDate: endOfUtcDay,
      currency: currency as "USD" | "VEF",
    });

    return res.status(200).json({
      success: true,
      data,
    });
  }
);

/**
 * Get liquidated amounts indicator: vigentes, vencidos, morosos (no Disponible).
 */
export const getLiquidatedAmountsIndicatorStats = asyncHandler(
  async (req: Request, res: Response) => {
    const currency = (req.query.currency as string) || "VEF";

    if (currency !== "USD" && currency !== "VEF") {
      return res.status(400).json({
        success: false,
        message: "Currency must be USD or VEF",
      });
    }

    const data = await getLiquidatedAmountsIndicator(currency as "USD" | "VEF");

    return res.status(200).json({
      success: true,
      data,
    });
  }
);

