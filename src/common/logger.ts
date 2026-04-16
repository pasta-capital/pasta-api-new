import winston, { format, transports } from "winston";

let ENABLE_LOGGING = true;
let ENABLE_ERROR_LOGGING = true;
let ENABLE_PAGO_LOGGING = true;
let ENABLE_OPERATION_LOGGING = true;

const logFormat = format.printf(
  (info) => `${info.timestamp} ${info.level}: ${info.message}`,
);

const logger = winston.createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.json(),
    format.prettyPrint(),
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), logFormat),
    }),
    //
    // - Write all logs with importance level of `error` or less to `logs/error.log`
    // - Write all logs with importance level of `info` or less to `logs/all.log`
    //
    new transports.File({
      filename: `logs/error/${new Date().toISOString().split("T")[0]}.log`,
      level: "error",
      format: logFormat,
    }),
    new transports.File({
      filename: `logs/all/${new Date().toISOString().split("T")[0]}.log`,
      level: "info",
      format: logFormat,
    }),
  ],
});

export const info = (message: string, obj?: any) => {
  if (ENABLE_LOGGING) {
    if (obj) {
      logger.info(`${message} ${JSON.stringify(obj)}`);
    } else {
      logger.info(message);
    }
  }
};

export const error = (message: string, obj?: unknown) => {
  if (ENABLE_LOGGING && ENABLE_ERROR_LOGGING) {
    if (obj instanceof Error) {
      logger.error(`${message} ${obj.message}`); // ${err.stack}
    } else if (obj) {
      logger.error(`${message} ${JSON.stringify(obj)}`);
    } else {
      logger.error(message);
    }
  }
};

// Nuevo método para pagos
export const bancamiga = (message: string, obj?: any) => {
  if (ENABLE_LOGGING && ENABLE_PAGO_LOGGING) {
    const pagoLogger = winston.createLogger({
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        logFormat,
      ),
      transports: [
        new transports.File({
          filename: `logs/bancamiga/${
            new Date().toISOString().split("T")[0]
          }.log`,
          level: "info",
        }),
      ],
    });

    if (obj) {
      pagoLogger.info(`${message} ${JSON.stringify(obj)}`);
    } else {
      pagoLogger.info(message);
    }
  }
};

// Nuevo método para pagos
export const bvc = (message: string, obj?: any) => {
  if (ENABLE_LOGGING && ENABLE_PAGO_LOGGING) {
    const pagoLogger = winston.createLogger({
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        logFormat,
      ),
      transports: [
        new transports.File({
          filename: `logs/bvc/${new Date().toISOString().split("T")[0]}.log`,
          level: "info",
        }),
      ],
    });

    if (obj) {
      pagoLogger.info(`${message} ${JSON.stringify(obj)}`);
    } else {
      pagoLogger.info(message);
    }
  }
};

// Método para operaciones de crédito
export const operation = (message: string, obj?: any) => {
  if (ENABLE_LOGGING && ENABLE_OPERATION_LOGGING) {
    const operationLogger = winston.createLogger({
      format: format.combine(
        format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        logFormat,
      ),
      transports: [
        new transports.File({
          filename: `logs/operations/${
            new Date().toISOString().split("T")[0]
          }.log`,
          level: "info",
        }),
      ],
    });

    if (obj) {
      operationLogger.info(`${message} ${JSON.stringify(obj)}`);
    } else {
      operationLogger.info(message);
    }
  }
};

export const enableLogging = () => {
  ENABLE_LOGGING = true;
};

export const disableLogging = () => {
  ENABLE_LOGGING = false;
};

export const enableErrorLogging = () => {
  ENABLE_ERROR_LOGGING = true;
};

export const disableErrorLogging = () => {
  ENABLE_ERROR_LOGGING = false;
};

export const enablePagoLogging = () => {
  ENABLE_PAGO_LOGGING = true;
};

export const disablePagoLogging = () => {
  ENABLE_PAGO_LOGGING = false;
};

export const enableOperationLogging = () => {
  ENABLE_OPERATION_LOGGING = true;
};

export const disableOperationLogging = () => {
  ENABLE_OPERATION_LOGGING = false;
};
