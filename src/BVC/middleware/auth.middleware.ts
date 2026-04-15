import { Request, Response, NextFunction } from "express";
import { PROXY_API_KEY } from "../config/env.config";

export const validateApiKey = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== PROXY_API_KEY) {
    return res
      .status(401)
      .json({ success: false, message: "Unauthorized: Invalid API Key" });
  }
  next();
};
