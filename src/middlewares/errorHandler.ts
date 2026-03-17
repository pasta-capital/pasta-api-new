import { Request, Response, NextFunction } from "express";

interface ErrorResponse {
  success: boolean;
  message: string;
  error?: any;
}

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  console.error(err);
  const error: ErrorResponse = {
    success: false,
    message: err.message,
  };

  if (process.env.NODE_ENV === "development") {
    return res.status(statusCode).json(error);
  }

  return res.status(statusCode).json(error);
};
