import { Document } from "mongoose";
import * as env from "../config/env.config";

const allowedVars = new Set([
  "name",
  "lastName",
  "email",
  "document",
  "address",
]);

export function parseTemplate(input: string, user: any): string {
  if (!input) return input;
  return input.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, v) => {
    if (!allowedVars.has(v)) return `{{${v}}}`; // keep as-is if not allowed
    switch (v) {
      case "name":
        return user?.name ?? "";
      case "lastName":
        return user?.lastname ?? "";
      case "email":
        return user?.email ?? "";
      case "document":
        return user?.document ?? "";
      case "address":
        return user?.address ?? "";
      default:
        return "";
    }
  });
}

export function parseTitleAndDescription(
  title: string,
  description: string,
  user: any,
) {
  return {
    title: parseTemplate(title, user),
    description: parseTemplate(description, user),
  };
}
