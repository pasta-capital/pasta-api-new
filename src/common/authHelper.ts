import { Request } from "express";
import * as helper from "./helper";
import * as env from "../config/env.config";

/**
 * Check whether the request is from the backend or not.
 *
 * @exports
 * @param {Request} req
 * @returns {boolean}
 */
export const isBackend = (req: Request): boolean =>
  !!req.headers.origin &&
  helper.trimEnd(req.headers.origin, "/") ===
    helper.trimEnd(env.BACKEND_HOST, "/");

/**
 * Check whether the request is from the frontend or not.
 *
 * @exports
 * @param {Request} req
 * @returns {boolean}
 */
export const isFrontend = (req: Request): boolean =>
  !!req.headers.host &&
  helper.trimEnd(req.headers.host, "/") ===
    helper.trimEnd(env.FRONTEND_DOMAIN, "/");

/**
 * Get authentication cookie name.
 *
 * @exports
 * @param {Request} req
 * @returns {string}
 */
export const getAuthCookieName = (req: Request): string => {
  if (isBackend(req)) return env.BACKEND_AUTH_COOKIE_NAME;
  if (isFrontend(req)) return env.FRONTEND_AUTH_COOKIE_NAME;
  return env.X_ACCESS_TOKEN;
};
