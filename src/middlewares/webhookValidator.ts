import { Request, Response, NextFunction } from "express";
import * as env from "../config/env.config";
import * as logger from "../common/logger";

/**
 * Middleware to validate Bancamiga Webhook access.
 * Validates a unique access token and source IP address.
 */
export const validateBancamigaWebhook = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers["authorization"];
  let token = "";
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }
  const clientIp = req.ip || req.socket.remoteAddress || "";

  logger.bancamiga(`Validating webhook request. IP: ${clientIp}`);

  // 1. IP Validation
  const allowedIps = env.SYPAGO_ALLOWED_IPS.split(",").map((ip) => ip.trim());
  
  // Handle potential cases where req.ip might have IPv6 prefix
  const normalizedIp = clientIp.startsWith("::ffff:") ? clientIp.substring(7) : clientIp;

  if (!allowedIps.includes(normalizedIp) && !allowedIps.includes(clientIp)) {
    logger.bancamiga(`Forbidden access attempt from IP: ${clientIp}`);
    return res.status(403).json({
      Code: 403,
      message: "Forbidden: IP not allowed",
    });
  }

  // 2. Token Validation
  if (!token || token !== env.SYPAGO_WEBHOOK_TOKEN) {
    logger.bancamiga(`Unauthorized access attempt from IP: ${clientIp}. Token mismatch.`);
    return res.status(401).json({
      Code: 401,
      message: "Unauthorized: Invalid or missing token",
    });
  }

  next();
};
