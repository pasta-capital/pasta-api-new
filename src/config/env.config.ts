import e, { CookieOptions } from "express";
import * as helper from "../common/helper";
import { Document, Types } from "mongoose";

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
 * Server Port. Default is 4002.
 *
 * @type {number}
 */
export const PORT = Number.parseInt(__env__("P_PORT", false, "4002"), 10);

/**
 * Indicate whether HTTPS is enabled or not.
 *
 * @type {boolean}
 */
export const HTTPS = helper.StringToBoolean(__env__("P_HTTPS"));

/**
 * Private SSL key filepath.
 *
 * @type {string}
 */
export const PRIVATE_KEY = __env__("P_PRIVATE_KEY", HTTPS);

/**
 * Private SSL certificate filepath.
 *
 * @type {string}
 */
export const CERTIFICATE = __env__("P_CERTIFICATE", HTTPS);

/**
 * frontend authentication cookie name.
 *
 * @type {"p-x-access-token-backend"}
 */
export const FRONTEND_AUTH_COOKIE_NAME = "p-x-access-token-frontend";

/**
 * Backend authentication cookie name.
 *
 * @type {"p-x-access-token-frontend"}
 */
export const BACKEND_AUTH_COOKIE_NAME = "p-x-access-token-backend";

/**
 * Mobile App and unit tests authentication header name.
 *
 * @type {"x-access-token"}
 */
export const X_ACCESS_TOKEN = "x-access-token";

/**
 * JWT secret. It should at least be 32 characters long, but the longer the better.
 *
 * @type {string}
 */
export const JWT_SECRET = __env__(
  "P_JWT_SECRET",
  true, // Make it required to ensure a secure value is always provided
);

/**
 * JWT expiration in seconds. Default is 86400 seconds (1 day).
 *
 * @type {number}
 */
export const JWT_EXPIRE_AT = Number.parseInt(
  __env__("P_JWT_EXPIRE_AT", false, "86400"),
  10,
);

/**
 * Validation Token expiration in seconds. Default is 86400 seconds (1 day).
 *
 * @type {number}
 */
export const TOKEN_EXPIRE_AT = Number.parseInt(
  __env__("P_TOKEN_EXPIRE_AT", false, "86400"),
  10,
);

/**
 * Agile Check Token expiration in seconds. Default is 3600 seconds (1 hour).
 *
 * @type {number}
 */
export const AGILE_CHECK_TOKEN_EXPIRE_AT = Number.parseInt(
  __env__("P_AGILE_CHECK_TOKEN_EXPIRE_AT", false, "3600"),
  10,
);

/**
 * OPERATION expiration in seconds. Default is 3600 seconds (1 hour).
 *
 * @type {number}
 */
export const OPERATION_EXPIRE_AT = Number.parseInt(
  __env__("P_OPERATION_EXPIRE_AT", false, "3600"),
  10,
);

/**
 * Backend host.
 *
 * @type {string}
 */
export const BACKEND_HOST = __env__("P_BACKEND_HOST", true);

/**
 * Frontend domain.
 *
 * @type {string}
 */
export const FRONTEND_DOMAIN = __env__("P_FRONTEND_DOMAIN", true);

/**
 * Cookie secret. It should at least be 32 characters long, but the longer the better.
 *
 * @type {string}
 */
export const COOKIE_SECRET = __env__(
  "P_COOKIE_SECRET",
  false,
  "Per-Capital-API-Secret",
);

/**
 * Authentication cookie domain.
 * Default is localhost.
 *
 * @type {string}
 */
export const AUTH_COOKIE_DOMAIN = __env__(
  "P_AUTH_COOKIE_DOMAIN",
  false,
  "localhost",
);

/**
 * Indicate whether HTTPS is enabled or not.
 *
 * @type {boolean}
 */
export const HTTPS_CLIENT = helper.StringToBoolean(__env__("P_HTTPS_CLIENT"));

/**
 * Indicate whether MongoDB SSL is enabled or not.
 *
 * @type {boolean}
 */
export const DB_SSL = helper.StringToBoolean(
  __env__("P_DB_SSL", false, "false"),
);

/**
 * MongoDB SSL certificate filepath.
 *
 * @type {string}
 */
export const DB_SSL_CERT = __env__("P_DB_SSL_CERT", DB_SSL);

/**
 * MongoDB SSL CA certificate filepath.
 *
 * @type {string}
 */
export const DB_SSL_CA = __env__("P_DB_SSL_CA", DB_SSL);

/**
 * Indicate whether MongoDB debug is enabled or not.
 *
 * @type {boolean}
 */
export const DB_DEBUG = helper.StringToBoolean(
  __env__("P_DB_DEBUG", false, "false"),
);

/**
 * MongoDB database URI. Default is: mongodb://127.0.0.1:27017/bookcars?authSource=admin&appName=bookcars
 *
 * @type {string}
 */
export const DB_URI = __env__(
  "P_DB_URI",
  false,
  "mongodb://127.0.0.1:27017/pasta?authSource=admin&appName=pasta",
);

/**
 * Get Encryption Key
 *
 * @type {string}
 */
export const ENCRYPTION_KEY = __env__("P_ENCRYPTION_KEY", false, "pasta");

/**
 * Didit Verification URL
 *
 * @type {string}
 */
export const DIDIT_VERIFICATION_URL = __env__("P_DIDIT_VERIFICATION_URL", true);

/**
 * Didit Api key
 *
 * @type {string}
 */
export const DIDIT_API_KEY = __env__("P_DIDIT_API_KEY", true);

/**
 * Didit Workflow Id
 *
 * @type {string}
 */
export const DIDIT_WORKFLOW_ID = __env__("P_DIDIT_WORKFLOW_ID", true);

/**
 * Didit Webhook Secret Key
 *
 * @type {string}
 */
export const DIDIT_WEBHOOK_SECRET_KEY = __env__("P_DIDIT_WEBHOOK_SECRET", true);

export const API_VERSION = __env__("P_API_VERSION", true);

/**
 * SMTP host.
 *
 * @type {string}
 */
export const SMTP_HOST = __env__("P_SMTP_HOST", true);

/**
 * SMTP port.
 *
 * @type {number}
 */
export const SMTP_PORT = Number.parseInt(__env__("P_SMTP_PORT", true), 10);

/**
 * SMTP username.
 *
 * @type {string}
 */
export const SMTP_USER = __env__("P_SMTP_USER", true);

/**
 * SMTP password.
 *
 * @type {string}
 */
export const SMTP_PASS = __env__("P_SMTP_PASS", true);

/**
 * SMTP from email.
 *
 * @type {string}
 */
export const SMTP_FROM = __env__("P_SMTP_FROM", true);

/**
 * API url
 *
 * @type {string}
 */
export const API_URL = __env__("P_API_URL", true);

/**
 * CDN url
 *
 * @type {string}
 */
export const CDN_URL = __env__("P_CDN_URL", true);

/**
 * Twilio Account SID
 *
 * @type {string}
 */
export const TWILIO_ACCOUNT_SID = __env__("P_TWILIO_ACCOUNT_SID", true);

/**
 * Twilio Auth Token
 *
 * @type {string}
 */
export const TWILIO_AUTH_TOKEN = __env__("P_TWILIO_AUTH_TOKEN", true);

/**
 * Twilio Phone Number
 *
 * @type {string}
 */
export const TWILIO_PHONE_NUMBER = __env__("P_TWILIO_PHONE_NUMBER", true);

/**
 * Twilio Whatsapp Number
 *
 * @type {string}
 */
export const TWILIO_WHATSAPP_NUMBER = __env__("P_TWILIO_WHATSAPP_NUMBER", true);

/**
 * Firebase Cloud Messaging configuration (optional)
 */
export const FCM_ENABLED = helper.StringToBoolean(
  __env__("FIREBASE_FCM_ENABLED", false, "false"),
);
export const FCM_PROJECT_ID = __env__("FIREBASE_PROJECT_ID", false);
export const FCM_CLIENT_EMAIL = __env__("FIREBASE_CLIENT_EMAIL", false);
export const FCM_PRIVATE_KEY = __env__("FIREBASE_PRIVATE_KEY", false);

/**
 * Public API URL
 *
 * @type {string}
 */
export const PUBLIC_API_URL = __env__("P_PUBLIC_API_URL", true);

/**
 * Admin URL
 *
 * @type {string}
 */
export const ADMIN_URL = __env__("P_ADMIN_URL", true);

/**
 * CDN users
 *
 * @type {string}
 */
export const CDN_USERS = __env__("P_CDN_USERS", true);

/**
 * CDN documents
 *
 * @type {string}
 */
export const CDN_DOCUMENTS = __env__("P_CDN_DOCUMENTS", true);

/**
 * Path terms and conditions
 *
 * @type {string}
 */
export const TERMS_AND_CONDITIONS_PATH = __env__(
  "P_TERMS_AND_CONDITIONS_PATH",
  true,
);

/**
 * Agile Check API URL
 *
 * @type {string}
 */
export const AGILE_CHECK_API_URL = __env__("P_AGILE_CHECK_API_URL", true);

/**
 * Agile Check API User
 *
 * @type {string}
 */
export const AGILE_CHECK_API_USER = __env__("P_AGILE_CHECK_API_USER", true);

/**
 * Agile Check API Password
 *
 * @type {string}
 */
export const AGILE_CHECK_API_PASSWORD = __env__(
  "P_AGILE_CHECK_API_PASSWORD",
  true,
);

/**
 * Agile Check API Validate Certificate
 *
 * @type {string}
 */
export const AGILE_CHECK_API_VALIDATE_CERT = __env__(
  "P_AGILE_CHECK_API_VALIDATE_CERT",
  true,
);

// Banesco - ya no integrado en el sistema (variables opcionales para evitar errores al cargar)
export const BANESCO_VALIDATE_CERT = __env__(
  "P_BANESCO_VALIDATE_CERT",
  false,
  "false",
);
export const BANESCO_CONSULTA_API_SSO = __env__(
  "P_BANESCO_CONSULTA_API_SSO",
  false,
);
export const BANESCO_CONSULTA_API_CLIENT_ID = __env__(
  "P_BANESCO_CONSULTA_API_CLIENT_ID",
  false,
);
export const BANESCO_CONSULTA_API_CLIENT_SECRET = __env__(
  "P_BANESCO_CONSULTA_API_CLIENT_SECRET",
  false,
);
export const BANESCO_CONSULTA_API_USER = __env__(
  "P_BANESCO_CONSULTA_API_USER",
  false,
);
export const BANESCO_CONSULTA_API_PASSWORD = __env__(
  "P_BANESCO_CONSULTA_API_PASSWORD",
  false,
);
export const BANESCO_CONSULTA_API_URL = __env__(
  "P_BANESCO_CONSULTA_API_URL",
  false,
);
export const BANESCO_VUELTO_API_SSO = __env__(
  "P_BANESCO_VUELTO_API_SSO",
  false,
);
export const BANESCO_VUELTO_API_CLIENT_ID = __env__(
  "P_BANESCO_VUELTO_API_CLIENT_ID",
  false,
);
export const BANESCO_VUELTO_API_CLIENT_SECRET = __env__(
  "P_BANESCO_VUELTO_API_CLIENT_SECRET",
  false,
);
export const BANESCO_VUELTO_API_USER = __env__(
  "P_BANESCO_VUELTO_API_USER",
  false,
);
export const BANESCO_VUELTO_API_PASSWORD = __env__(
  "P_BANESCO_VUELTO_API_PASSWORD",
  false,
);
export const BANESCO_VUELTO_API_URL = __env__(
  "P_BANESCO_VUELTO_API_URL",
  false,
);
export const BANESCO_CARGO_EN_CUENTA_API_PROXY_URL = __env__(
  "P_BANESCO_CARGO_EN_CUENTA_API_PROXY_URL",
  false,
);
export const BANESCO_CARGO_EN_CUENTA_API_RESPONSE_TYPE = __env__(
  "P_BANESCO_CARGO_EN_CUENTA_API_RESPONSE_TYPE",
  false,
);
export const BANESCO_CARGO_EN_CUENTA_API_CALLBACK_URL = __env__(
  "P_BANESCO_CARGO_EN_CUENTA_API_CALLBACK_URL",
  false,
);
export const BANESCO_CARGO_EN_CUENTA_API_SCOPE = __env__(
  "P_BANESCO_CARGO_EN_CUENTA_API_SCOPE",
  false,
);
export const BANESCO_CARGO_EN_CUENTA_API_SSO = __env__(
  "P_BANESCO_CARGO_EN_CUENTA_API_SSO",
  false,
);
export const BANESCO_CARGO_EN_CUENTA_API_CLIENT_ID = __env__(
  "P_BANESCO_CARGO_EN_CUENTA_API_CLIENT_ID",
  false,
);
export const BANESCO_CARGO_EN_CUENTA_API_CLIENT_SECRET = __env__(
  "P_BANESCO_CARGO_EN_CUENTA_API_CLIENT_SECRET",
  false,
);
export const BANESCO_CARGO_EN_CUENTA_API_USER = __env__(
  "P_BANESCO_CARGO_EN_CUENTA_API_USER",
  false,
);
export const BANESCO_CARGO_EN_CUENTA_API_PASSWORD = __env__(
  "P_BANESCO_CARGO_EN_CUENTA_API_PASSWORD",
  false,
);
export const BANESCO_CARGO_EN_CUENTA_API_CONSULTA_DE_CUENTA_URL = __env__(
  "P_BANESCO_CARGO_EN_CUENTA_API_CONSULTA_DE_CUENTA_URL",
  false,
);
export const BANESCO_CARGO_EN_CUENTA_API_CARGO_EN_CUENTA_PAGO_URL = __env__(
  "P_BANESCO_CARGO_EN_CUENTA_API_CARGO_EN_CUENTA_PAGO_URL",
  false,
);
export const BANESCO_CARGO_EN_CUENTA_API_CONSULTA_DE_TRANSACCION_URL = __env__(
  "P_BANESCO_CARGO_EN_CUENTA_API_CONSULTA_DE_TRANSACCION_URL",
  false,
);

export const API_WEBSITE_URL = __env__("P_API_WEBSITE_URL", true);

export const DOMICILIATION_FILE_PATH = __env__(
  "P_DOMICILIATION_FILE_PATH",
  true,
);

export const SYPAGO_API_URL = __env__("P_SYPAGO_API_URL", true);

export const SYPAGO_CLIENT_ID = __env__("P_SYPAGO_CLIENT_ID", true);

export const SYPAGO_API_KEY = __env__("P_SYPAGO_API_KEY", true);

export const SYPAGO_ACCESS_TOKEN = __env__("P_SYPAGO_ACCESS_TOKEN");

export const SYPAGO_BANK_ACCOUNT_CODE = __env__(
  "P_SYPAGO_BANK_ACCOUNT_CODE",
  true,
);

export const SYPAGO_BANK_ACCOUNT_NUMBER = __env__(
  "P_SYPAGO_BANK_ACCOUNT_NUMBER",
  true,
);

export const SYPAGO_WEBHOOK_URL = __env__("P_SYPAGO_WEBHOOK_URL", true);

export const SYPAGO_WEBHOOK_TOKEN = __env__("P_SYPAGO_WEBHOOK_TOKEN", true);
export const SYPAGO_ALLOWED_IPS = __env__(
  "P_SYPAGO_ALLOWED_IPS",
  false,
  "127.0.0.1",
);

export const SYPAGO_CREDIT_SUBPRODUCT_ID = __env__(
  "P_SYPAGO_CREDIT_SUBPRODUCT_ID",
  true,
);

export const BANCAMIGA_API_URL = __env__("P_BANCAMIGA_API_URL", true);

export const BANCAMIGA_USER = __env__("P_BANCAMIGA_USER", true);

export const BANCAMIGA_PASSWORD = __env__("P_BANCAMIGA_PASSWORD", true);

/**
 * LA Sistemas API URL
 *
 * @type {string}
 */
export const LA_SISTEMAS_API_URL = __env__("P_LA_SISTEMAS_API_URL", true);

/**
 * LA Sistemas API Key
 *
 * @type {string}
 */
export const LA_SISTEMAS_API_KEY = __env__("P_LA_SISTEMAS_API_KEY", true);

export const TESTING = __env__("P_TESTING", true);

/**
 * Indica si se debe crear la suscripción definitiva durante el registro (pre-suscripción, LA Sistemas, SubscriptionPayment).
 * Por defecto true para mantener el comportamiento actual.
 *
 * @type {boolean}
 */
export const ENABLE_SUBSCRIPTION_ON_REGISTER = helper.StringToBoolean(
  __env__("P_ENABLE_SUBSCRIPTION_ON_REGISTER", false, "true"),
);

export const DAILY_PAYMENT_NOTIFICATIONS_HOUR = __env__(
  "P_DAILY_PAYMENT_NOTIFICATIONS_HOUR",
  true,
  "0",
);
export const DAILY_PAYMENT_NOTIFICATIONS_MINUTE = __env__(
  "P_DAILY_PAYMENT_NOTIFICATIONS_MINUTE",
  true,
  "5",
);

/**
 * Cookie options.
 *
 * On production, authentication cookies are httpOnly, signed, secure and strict sameSite.
 * This will prevent XSS attacks by not allowing access to the cookie via JavaScript.
 * This will prevent CSRF attacks by not allowing the browser to send the cookie along with cross-site requests.
 * This will prevent MITM attacks by only allowing the cookie to be sent over HTTPS.
 * Authentication cookies are protected against XST attacks as well by disabling TRACE HTTP method via allowedMethods middleware.
 *
 * @type {CookieOptions}
 */
export const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: HTTPS_CLIENT,
  signed: true,
  sameSite: "strict",
  domain: AUTH_COOKIE_DOMAIN,
};

/**
 * User.
 *
 * @export
 * @interface User
 * @typedef {User}
 * @extends {Document}
 */
export interface User extends Document {
  _id: string;
  document: string;
  identificationType: string;
  name: string;
  lastname: string;
  gender: string;
  maritalStatus: string;
  birthDate: Date;
  address?: string;
  selfEmployed: boolean;
  enterprise?: {
    name: string;
    address: string;
    phone: string;
    position: string;
  };
  occupation?: string;
  dependents: number;
  seniority: number;
  income: number;
  otherIncome: number;
  education: string;
  email: string;
  phone: {
    countryCode: string;
    areaCode?: string;
    number: string;
  };
  sessionId: string;
  password: string;
  status: string;
  isVerified: boolean;
  verificationStatus: string;
  acceptedTermsAndConditions: [
    {
      acceptedAt: Date;
      version: string;
    },
  ];
  level: number;
  levelName: string;
  maxAmount: number;
  points: number;
  allowedFeeCount: number[];
  roles: string[];
  statusHistory: [
    {
      createdAt: Date;
      status: string;
      note: string;
    },
  ];
  notificationsConfig: {
    email: boolean;
    sms: boolean;
    push: boolean;
    promotions: boolean;
  };
  image: string;
  documentImages: [
    {
      documentType: string;
      image: string;
      dateOfIssue: Date;
      expirationDate: Date;
    },
  ];
  pushToken: string;
  pushTokens: string[];
  updatedAt: Date;
  achievements: [Types.ObjectId];
  agileCheckLists: [number];
  pep: boolean;
  pepInfo: {
    relationship: string;
    entity: string;
    name: string;
    occupation: string;
    identification: string;
    agileCheckLists: [number];
  };
  refreshTokens: string[];
  userAgent: string;
}

/**
 * Token Document.
 *
 * @export
 * @interface Token
 * @typedef {Token}
 * @extends {Document}
 */
export interface Token extends Document {
  user?: Types.ObjectId;
  email?: string;
  token: string;
  type: string;
  expireAt?: Date;
}

/**
 * Account
 *
 * @interface Account
 * @typedef {Account}
 * @extends {Document}
 */
export interface Account extends Document {
  user: Types.ObjectId;
  bank: {
    name: string;
    code: string;
    laCode: string;
  };
  type: string;
  number: string;
}

/**
 * Account
 *
 * @interface AdminAccount
 * @typedef {AdminAccount}
 * @extends {Document}
 */
export interface AdminAccount extends Document {
  currency: string;
  bank: Types.ObjectId;
  type: string;
  number: string;
}

/**
 * Bank
 *
 * @export
 * @interface Bank
 * @typedef {Bank}
 * @extends {Document}
 */
export interface Bank extends Document {
  name: string;
  code: string;
  laCode: string;
  currency: string;
}

/**
 * Notification
 *
 * @export
 * @interface Notification
 * @typedef {Notification}
 * @extends {Document}
 */
export interface Notification extends Document {
  user: Types.ObjectId;
  message: string;
  type: string;
  isRead: boolean;
}

/**
 * Notification count
 *
 * @export
 * @interface NotificationCounter
 * @typedef {NotificationCounter}
 * @extends {Document}
 */
export interface NotificationCounter extends Document {
  user: Types.ObjectId;
  count: number;
}

/**
 * Operation
 *
 * @export
 * @interface Operation
 * @typedef {Operation}
 * @extends {Document}
 */
export interface Operation extends Document {
  user: {
    _id?: Types.ObjectId;
    name: string;
    lastname: string;
    email: string;
    identificationType: string;
    document: string;
  };
  currency: string;
  amountVef: number;
  rate: number;
  amountUsd: number;
  annualCommission: number;
  commissionAmount: number;
  settledAmount: number;
  feeCount: number;
  period: string;
  paymentPlan: Types.ObjectId[];
  comment: string;
  isThirdParty: boolean;
  beneficiary: {
    name: string;
    identificationType: string;
    identificationNumber: string;
    phone: string;
    bankCode: string;
  };
  status: string;
  expireAt: Date | undefined;
  reference: string;
  createdAt: Date;
  account: {
    bank: {
      name: string;
      code: string;
    };
    type: string;
    number: string;
  };
  banescoVuelto: Types.ObjectId;
  sypagoId: string;
  icon: string;
  laCopaso: string;
  laNumerots: string;
  userAgent: string;
  score: number;
  internalReference: string;
  laStatus?: string;
  syncAttempts: number;
  lastSyncAttemptAt?: Date;
  syncError?: string;
}

/**
 * OperationPayment
 *
 * @export
 * @interface OperationPayment
 * @typedef {OperationPayment}
 * @extends {Document}
 */
export interface OperationPayment extends Document {
  date: Date;
  amountUsd: number;
  amountUsdTotal: number;
  interestRate: number;
  interest: number;
  amountVef: number;
  rate: number;
  status: string;
  paymentMethod?: string;
  paidAt?: Date;
  user?: Types.ObjectId;
  operation?: Types.ObjectId;
  points: number;
  expireAt: Date | undefined;
  laCuota: string;
  laCopaso: string;
  laNupaso: string;
  createdAt: Date;
}

/**
 * Payment
 *
 * @export
 * @interface Payment
 * @typedef {Payment}
 * @extends {Document}
 */
export interface Payment extends Document {
  user: Types.ObjectId;
  operationPayments: [Types.ObjectId];
  laCuotas: [String];
  amountUsd: number;
  amountVef: number;
  rate: number;
  paymentType: string;
  points: number;
  expireAt: Date | undefined;
  status: string;
  errorMessage?: string;
  reference?: string;
  internalReference?: string;
  debitorAccount?: {
    bankCode: string;
    identificationType: string;
    identificationNumber: string;
    phone: string;
  };
}

/**
 * Beneficiary
 *
 * @export
 * @interface Beneficiary
 * @typedef {Beneficiary}
 * @extends {Document}
 */
export interface Beneficiary extends Document {
  name: string;
  identification: string;
  phone: string;
  bank: Types.ObjectId;
}

/**
 * Level
 *
 * @export
 * @interface Level
 * @typedef {Level}
 * @extends {Document}
 */
export interface Level extends Document {
  name: string;
  level: number;
  pointsRequired: number;
  creditLimit: number;
  allowedFeeCount: [number];
}

/**
 * Level History
 *
 * @export
 * @interface LevelHistory
 * @typedef {LevelHistory}
 * @extends {Document}
 */
export interface LevelHistory extends Document {
  user: Types.ObjectId;
  oldLevel: number;
  newLevel: number;
  pointsAtChange: number;
  changedAt: Date;
}

/**
 * Subscription
 *
 * @export
 * @interface Subscription
 * @typedef {Subscription}
 * @extends {Document}
 */
export interface Subscription extends Document {
  user: {
    identificationType: string;
    document: string;
    _id: Types.ObjectId;
  };
  plan: string;
  startDate: Date;
  account: Types.ObjectId;
  contractNumber: string;
  active: boolean;
  transactionId: string;
  transactionRate: number;
  transactionAmount: number;
}

/**
 * PreSubscription
 *
 * @export
 * @interface PreSubscription
 * @typedef {PreSubscription}
 * @extends {Document}
 */
export interface PreSubscription extends Document {
  identification: string;
  name: string;
  bankCode: string;
  accountNumber: string;
  transactionId: string;
  transactionStatus: string;
  transactionRate: number;
  transactionAmount: number;
  consumed: boolean;
  active: boolean;
}

/**
 * Subscription Payment
 *
 * @export
 * @interface SubscriptionPayment
 * @typedef {SubscriptionPayment}
 * @extends {Document}
 */
export interface SubscriptionPayment extends Document {
  user: Types.ObjectId;
  amountVef: number;
  amountUsd: number;
  rate: number;
  paymentDate: Date;
  status: string;
  details: string;
  account: {
    bank: Types.ObjectId;
    type: string;
    number: string;
  };
  receiptId: string;
}

/**
 * Admin
 *
 * @export
 * @interface Admin
 * @typedef {Admin}
 * @extends {Document}
 */
export interface Admin extends Document {
  name: string;
  lastname: string;
  email: string;
  password: string;
  phone: string;
  roles: [
    {
      code: string;
      name: string;
      modules: [
        {
          code: string;
          name: string;
        },
      ];
    },
  ];
  status: string;
  pushToken: string;
  pushTokens: string[];
}

/**
 * Credit Score
 *
 * @export
 * @interface CreditScore
 * @extends {Document}
 */
export interface CreditScore extends Document {
  code: string;
  name: string;
  score: number;
  items: [
    {
      code: string;
      name: string;
      value: number;
    },
  ];
}

/**
 * Rate History
 *
 * @export
 * @interface RateHistory
 * @extends {Document}
 */
export interface RateHistory extends Document {
  date: Date;
  validDate: Date;
  usd: number;
  rub: number;
  try: number;
  cny: number;
  eur: number;
}

/**
 * Role
 *
 * @export
 * @interface Role
 * @typedef {Role}
 * @extends {Document}
 */
export interface Role extends Document {
  name: string;
  description: string;
  code: string;
  modules: [
    {
      name: string;
      code: string;
    },
  ];
}

/**
 * Module
 *
 * @export
 * @interface Module
 * @typedef {Module}
 * @extends {Document}
 */
export interface Module extends Document {
  name: string;
  code: string;
}

/**
 * Balance
 *
 * @export
 * @interface Balance
 * @typedef {Balance}
 * @extends {Document}
 */
export interface Balance extends Document {
  account: Types.ObjectId;
  isIncome: boolean;
  amount: number;
  description: string;
  category: string;
  reference: string;
  status: "pending" | "confirmed" | "rejected";
  client: string;
}

/**
 * Agile Check Token
 *
 * @export
 * @interface AgileCheckToken
 * @typedef {AgileCheckToken}
 * @extends {Document}
 */
export interface AgileCheckToken extends Document {
  accessToken: string;
  tokenType: string;
  expireAt: Date;
  expiresIn: number;
}

/**
 * Config
 *
 * @interface Config
 * @typedef {Config}
 * @extends {Document}
 */
export interface Config extends Document {
  key: string;
  description: string;
  value: any;
  type: string;
}

/**
 * BanescoVueltoP2P
 *
 * @interface BanescoVuelto
 * @typedef {BanescoVuelto}
 * @extends {Document}
 */
export interface BanescoVuelto extends Document {
  device: {
    type: string;
    description: string;
    ipAddress: string;
    sid: string;
  };
  p2p: {
    accountFrom: {
      accountId: string;
    };
    accountTo: {
      bankId: string;
      customerId: string;
      phoneNum: string;
    };
    amount: number;
    paymentId: string;
    concept: string;
    trnDate: string;
    trnTime: string;
  };
  referenceNumber: string;
}

export interface BanescoCargoCuenta extends Document {
  device: {
    type: string;
    description: string;
    ipAddress: string;
  };
  payment: {
    customerId: string;
    accountDebit: string;
    accountType: string;
    amount: number;
    companyCode: string;
    companyId: string;
    concept: string;
    paymentId: string;
  };
  securityAuth: {
    sessionId: string;
  };
  referenceNumber: string;
}
/**
 * Enterprise
 *
 * @export
 * @interface Enterprise
 * @typedef {Enterprise}
 * @extends {Document}
 */
export interface Enterprise extends Document {
  name: string;
  commercialActivity: string;
  website: string;
  email: string;
  rif: string;
  address: string;
  phone: string;
  contactDetails: {
    name: string;
    lastname: string;
    email: string;
    identification: string;
    phone: string;
  };
  employees: string[];
  status: string;
}

/**
 * BanescoTransaction
 *
 * @export
 * @interface BanescoTransaction
 * @typedef {BanescoTransaction}
 * @extends {Document}
 */
export interface BanescoTransaction extends Document {
  referenceNumber: string;
  amount: number;
  accountId: string;
  trnDate: string;
  trnTime: string;
  sourceBankId: string;
  concept: string;
  customerIdBen: string;
  trnType: string;
}

export interface AgileCheckList {
  _id: string;
  description: string;
  value: number;
}

export interface Achievement {
  _id: string;
  code: string;
  name: string;
  description: string;
}

export interface BanescoDomiciliation {
  orderId: string;
  fileName: string;
  status: string;
  payments: [Types.ObjectId];
}

export interface FrequentQuestion {
  question: string;
  answer: string;
  order: number;
}

export interface SypagoTransaction {
  internal_id: string;
  transaction_id: string;
  ref_ibp: string;
  group_id: string;
  operation_date: Date;
  amount: {
    type: string;
    amt: number;
    pay_amt: number;
    currency: string;
    rate: number;
  };
  receiving_user: {
    phone: {
      area_code: string;
      number: string;
    };
    email: string;
    otp: string;
    name: string;
    document_info: {
      type: string;
      number: string;
    };
    account: {
      bank_code: string;
      type: string;
      number: string;
    };
  };
  status: string;
  rejected_code: string;
}

export interface BancamigaPagoMovil {
  ID: string;
  created_at: Date;
  Dni: string;
  PhoneDest: string;
  PhoneOrig: string;
  Amount: number;
  BancoOrig: string;
  NroReferenciaCorto: string;
  NroReferencia: string;
  HoraMovimiento: string;
  FechaMovimiento: string;
  Descripcion: string;
  Status: string;
  Refpk: string;
  Ref: number;
}

export interface BancamigaFindPaymentMobileBody {
  phone: string;
  bank: string;
  amount: number;
  date: string;
  reference: string;
}

export interface SypagoRequestOtpBody {
  creditor_account: {
    bank_code: string; // Código del banco (4 dígitos)
    type: string; // Tipo de cuenta (ej: CNTA, CELE)
    number: string; // Número de cuenta
  };
  debitor_document_info: {
    type: string; // Tipo de documento (V, E, J, etc.)
    number: string; // Número de documento
  };
  debitor_account: {
    bank_code: string; // Código del banco (4 dígitos)
    type: string; // Tipo de cuenta
    number: string; // Número de cuenta o teléfono
  };
  amount: {
    amt: number; // Monto
    currency: string; // Moneda (VES, USD, etc.)
  };
}

export interface SypagoDebitOtpBody {
  internal_id: string; // ID interno de la transacción
  group_id?: string; // ID de grupo o lote
  account: {
    bank_code: string; // Código del banco (4 dígitos)
    type: string; // Tipo de cuenta (CNTA, CELE, etc.)
    number: string; // Número de cuenta
  };
  amount: {
    amt: number; // Monto
    currency: string; // Moneda (VES, USD, etc.)
  };
  concept: string; // Descripción o concepto del pago
  notification_urls: {
    web_hook_endpoint: string; // URL para notificaciones
  };
  receiving_user: {
    name: string; // Nombre del beneficiario
    otp: string; // Código OTP
    document_info: {
      type: string; // Tipo de documento (V, E, J, etc.)
      number: string; // Número de documento
    };
    account: {
      bank_code: string; // Código del banco
      type: string; // Tipo de cuenta
      number: string; // Número de cuenta o teléfono
    };
  };
}

export interface SypagoDomiciliationBody {
  internal_id: string; // ID interno de la transacción
  group_id?: string; // ID de grupo o lote
  account: {
    bank_code: string; // Código del banco (4 dígitos)
    type: string; // Tipo de cuenta (CNTA, CELE, etc.)
    number: string; // Número de cuenta
  };
  amount: {
    amt: number; // Monto
    currency: string; // Moneda (VES, USD, etc.)
  };
  concept: string; // Descripción o concepto del pago
  notification_urls: {
    web_hook_endpoint: string; // URL para notificaciones
  };
  receiving_user: {
    name: string; // Nombre del beneficiario
    document_info: {
      type: string; // Tipo de documento (V, E, J, etc.)
      number: string; // Número de documento
    };
    account: {
      bank_code: string; // Código del banco
      type: string; // Tipo de cuenta
      number: string; // Número de cuenta o teléfono
    };
  };
  domiciliation_data: {
    contract: {
      id: string;
      related_date: string;
    };
    invoices: [
      {
        id: string;
        related_date: string;
        rejection_date: string;
        amount: {
          amt: number;
          currency: string;
        };
      },
    ];
  };
}

export interface Location {
  name: string;
  type: string;
  code: string;
  location: string | Types.ObjectId;
}

export interface Address {
  country: Types.ObjectId;
  state?: Types.ObjectId;
  municipality?: Types.ObjectId;
  parish?: Types.ObjectId;
  description?: string;
}

export interface Ocupation extends Document {
  name: string;
  laCode: string;
}

export interface LaModel extends Document {
  name: string;
  type: string;
  code: string;
}
