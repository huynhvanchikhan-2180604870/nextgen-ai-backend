import path from "path";
import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which transports the logger must use
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.NODE_ENV === "production" ? "warn" : "debug",
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
      )
    ),
  }),

  // Error log file
  new DailyRotateFile({
    filename: path.join("logs", "error-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: "error",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    maxSize: "20m",
    maxFiles: "14d",
  }),

  // Combined log file
  new DailyRotateFile({
    filename: path.join("logs", "combined-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    maxSize: "20m",
    maxFiles: "14d",
  }),

  // HTTP requests log file
  new DailyRotateFile({
    filename: path.join("logs", "http-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    level: "http",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxSize: "20m",
    maxFiles: "7d",
  }),

  // API requests log file
  new DailyRotateFile({
    filename: path.join("logs", "api-%DATE%.log"),
    datePattern: "YYYY-MM-DD",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    maxSize: "20m",
    maxFiles: "30d",
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "warn" : "debug",
  levels,
  transports,
  exitOnError: false,
});

// Create a stream object with a 'write' function that will be used by morgan
export const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Custom loggers for different purposes
export const apiLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join("logs", "api-requests-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "30d",
    }),
  ],
});

export const authLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join("logs", "auth-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "90d", // Keep auth logs longer
    }),
  ],
});

export const paymentLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join("logs", "payments-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "365d", // Keep payment logs for 1 year
    }),
  ],
});

export const aiLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join("logs", "ai-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      maxSize: "20m",
      maxFiles: "30d",
    }),
  ],
});

// Helper functions
export const logRequest = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      userId: req.user?.id || null,
    };

    if (res.statusCode >= 400) {
      logger.warn("HTTP Request", logData);
    } else {
      logger.http("HTTP Request", logData);
    }

    // Log to API logger
    apiLogger.info("API Request", logData);
  });

  next();
};

export const logError = (error, req = null) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  };

  if (req) {
    errorData.request = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get("User-Agent"),
      userId: req.user?.id || null,
    };
  }

  logger.error("Application Error", errorData);
};

export const logAuth = (action, userId, ip, userAgent, details = {}) => {
  authLogger.info("Authentication Event", {
    action,
    userId,
    ip,
    userAgent,
    details,
    timestamp: new Date().toISOString(),
  });
};

export const logPayment = (action, userId, amount, currency, details = {}) => {
  paymentLogger.info("Payment Event", {
    action,
    userId,
    amount,
    currency,
    details,
    timestamp: new Date().toISOString(),
  });
};

export const logAI = (action, userId, sessionId, details = {}) => {
  aiLogger.info("AI Event", {
    action,
    userId,
    sessionId,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Performance monitoring
export const logPerformance = (operation, duration, details = {}) => {
  logger.info("Performance", {
    operation,
    duration: `${duration}ms`,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Security logging
export const logSecurity = (event, ip, userAgent, details = {}) => {
  logger.warn("Security Event", {
    event,
    ip,
    userAgent,
    details,
    timestamp: new Date().toISOString(),
  });
};

export default logger;
