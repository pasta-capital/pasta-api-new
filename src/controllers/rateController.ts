import { Request, Response } from "express";
import RateHistory from "../models/rateHistory";
import { getRateS } from "../services/rateService";

export const getRate = async (req: Request, res: Response) => {
  const rate = await getRateS();
  if (!rate) {
    return res
      .status(500)
      .send({ success: false, message: "Error getting rate" });
  }

  return res.status(200).send({ success: true, data: rate });
};

export const getRateHistories = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1; // Default to page 1 if not provided
  const limit = parseInt(req.query.limit as string) || 10; // Default to 10 items per page if not provided
  const skip = (page - 1) * limit;

  const totalCount = await RateHistory.countDocuments();

  const rateHistories = await RateHistory.find()
    .select("createdAt validDate usd")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean()
    .exec();

  return res.status(200).json({
    success: true,
    message: "Tasas obtenidas",
    data: rateHistories,
    totalCount: totalCount,
  });
};
