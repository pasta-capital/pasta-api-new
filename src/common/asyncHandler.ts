import { Request, Response, NextFunction } from "express";
import * as loggers from "../common/logger";

const asyncHandler =
  (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;

    res.send = function (data: any) {
      const statusCode = res.statusCode;
      const method = req.method;
      const url = req.originalUrl;
      const timestamp = new Date().toISOString();

      let message = "";
      if (typeof data === "string") {
        try {
          const parsed = JSON.parse(data);
          message = parsed.message || "";
        } catch {
          message = data;
        }
      } else if (typeof data === "object" && data?.message) {
        message = data.message;
      }

      const logMessage = `${method} ${url} - ${statusCode}${
        message ? ` - ${message}` : ""
      }`;

      if (statusCode >= 400) {
        //console.error(logMessage);
        loggers.error(logMessage);
      } else {
        //console.log(logMessage);
        loggers.info(logMessage);
      }
      return originalSend.call(this, data);
    };

    Promise.resolve(fn(req, res, next)).catch(next);
  };

export default asyncHandler;
