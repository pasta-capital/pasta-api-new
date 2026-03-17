import { Request } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: string[];
        modules: string[];
      };
      // rawBody?: string;
      // token?: string;
    }
  }
}
