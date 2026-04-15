import dotenv from "dotenv";
dotenv.config();
/**
 * Get environment variable value.
 * @param {string} name
 * @param {?boolean} required
 * @param {?string} defaultValue
 * @returns {string}
 */
export const __env__ = (
  name: string,
  required?: boolean,
  defaultValue?: string,
) => {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value ? String(value) : defaultValue || "";
};

/**
 * Server Port. Default is 3008.
 *
 *
 */
export const PORT = Number.parseInt(__env__("PORT", false, "3008"), 10);
/**
 * MongoDB database URI.
 *
 * Default is: mongodb://127.0.0.1:27017/bookcars?authSource=admin&appName=bookcars
 */
export const MONGO_URI = __env__("MONGO_URI", true);

/** BVC API URL
 *  Dev  https://200.35.106.250/rs
 */
export const BVC_BASE_URL = __env__("BVC_BASE_URL", true);

/** BVC AES Key */
export const BVC_AES_KEY = __env__("BVC_AES_KEY", true);

/** BVC AES IV */
export const BVC_AES_IV = __env__("BVC_AES_IV", true);

/** BVC API Key */
export const BVC_API_KEY = __env__("BVC_API_KEY", true);

/** Proxy API Key for internal services */
export const PROXY_API_KEY = __env__("PROXY_API_KEY", true);

export const ALLOWED_ORIGINS = __env__("ALLOWED_ORIGINS", true).split(",");

export const NODE_ENV = __env__("NODE_ENV", true);

export const BANK_CODE = __env__("BANK_CODE", true);
