import { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Allowed methods.
 *
 * @type {string[]}
 */
const ALLOWED_METHODS = ["GET", "POST", "PATCH", "PUT", "DELETE"];

/**
 * Allowed methods middleware.
 * Do not allow TRACE method to prevent XST attacks.
 *
 * @export
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 * @returns {*}
 */
export default (req: Request, res: Response, next: NextFunction) => {
  if (!ALLOWED_METHODS.includes(req.method)) {
    return res.status(405).send("Method Not Allowed");
  }
  return next();
};

// const allowedMethods: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
//     if (!ALLOWED_METHODS.includes(req.method)) {
//       return res.status(405).send("Method Not Allowed");
//     }
//     return next();
//   };

//   export default allowedMethods;
