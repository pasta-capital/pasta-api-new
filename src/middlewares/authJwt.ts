import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as env from "../config/env.config";
import * as helper from "../common/helper";
import * as authHelper from "../common/authHelper";
import * as logger from "../common/logger";

/**
 * Verify authentication token middleware.
 *
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
export const verifyToken = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let token: string;
  if (authHelper.isBackend(req)) {
    token = req.signedCookies[env.X_ACCESS_TOKEN] as string;
  } else if (authHelper.isFrontend(req)) {
    token = req.signedCookies[env.FRONTEND_AUTH_COOKIE_NAME] as string;
  } else {
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1]; // Remove "Bearer " from string
    } else token = "";
  }
  if (token) {
    jwt.verify(
      token,
      env.JWT_SECRET,
      {
        algorithms: ["HS256"],
        issuer: "Pasta",
      },
      async (err, user) => {
        if (err) {
          logger.info("Token not valid", err);
          res.status(401).send({ message: "Unauthorized!" });
        } else {
          req.user = user as {
            id: string;
            email: string;
            roles: string[];
            modules: string[];
          };
          //req.token = token;
          next();
        }
      },
    );
  } else {
    // Token not found!
    res.status(403).send({ message: "No token provided!" });
  }
};

/**
 * Authorize roles middleware.
 *
 * @param {string[]} roles
 */
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user) {
      const userRoles = req.user.roles;
      if (userRoles.some((role) => roles.includes(role))) {
        next();
      } else {
        res.status(403).send({ message: "Unauthorized role!" });
      }
    } else {
      res.status(403).send({ message: "Unauthorized!" });
    }
  };
};

export const authorizeModules = (...requiredModules: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user && req.user.modules) {
      const userModules = req.user.modules;
      const hasAccess = requiredModules.some(
        (module) => userModules.includes(module) || userModules.includes("all"),
      );

      if (hasAccess) {
        next();
      } else {
        res.status(403).send({ message: "Access to this module is denied!" });
      }
    } else {
      res.status(403).send({ message: "User information not available!" });
    }
  };
};
