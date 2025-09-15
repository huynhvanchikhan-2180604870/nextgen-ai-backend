import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import slowDown from "express-slow-down";
import hpp from "hpp";
import xss from "xss-clean";
import { logSecurity } from "../config/logger.js";

// Data sanitization middleware
export const sanitizeData = () => {
  return [
    // Sanitize data against NoSQL query injection
    mongoSanitize({
      replaceWith: "_",
      onSanitize: ({ req, key }) => {
        logSecurity("NoSQL injection attempt", req.ip, req.get("User-Agent"), {
          key,
          value: req.body[key],
        });
      },
    }),

    // Sanitize data against XSS attacks
    xss(),

    // Prevent parameter pollution
    hpp({
      whitelist: ["sort", "limit", "page", "fields"],
    }),
  ];
};

// Rate limiting configurations
export const createRateLimit = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message,
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logSecurity("Rate limit exceeded", req.ip, req.get("User-Agent"), {
        endpoint: req.originalUrl,
        method: req.method,
      });
      res.status(429).json({
        success: false,
        message,
      });
    },
  });
};

// Speed limiting (slow down after certain number of requests)
export const createSpeedLimit = (windowMs, delayAfter, delayMs) => {
  return slowDown({
    windowMs,
    delayAfter,
    delayMs,
    onLimitReached: (req) => {
      logSecurity("Speed limit reached", req.ip, req.get("User-Agent"), {
        endpoint: req.originalUrl,
        method: req.method,
      });
    },
  });
};

// Specific rate limits
export const authRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  "Too many authentication attempts, please try again later"
);

export const apiRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  "Too many API requests, please try again later"
);

export const strictRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  20, // 20 requests
  "Too many requests, please slow down"
);

export const uploadRateLimit = createRateLimit(
  60 * 60 * 1000, // 1 hour
  10, // 10 uploads
  "Too many file uploads, please try again later"
);

// IP whitelist middleware
export const ipWhitelist = (allowedIPs) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;

    if (allowedIPs.includes(clientIP)) {
      next();
    } else {
      logSecurity("IP not whitelisted", clientIP, req.get("User-Agent"), {
        endpoint: req.originalUrl,
        method: req.method,
      });
      res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }
  };
};

// Request size limiter
export const requestSizeLimit = (limit) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get("content-length") || "0");

    if (contentLength > limit) {
      logSecurity("Request too large", req.ip, req.get("User-Agent"), {
        contentLength,
        limit,
        endpoint: req.originalUrl,
      });
      return res.status(413).json({
        success: false,
        message: "Request entity too large",
      });
    }

    next();
  };
};

// CSRF protection middleware
export const csrfProtection = (req, res, next) => {
  // Skip CSRF for API routes with proper authentication
  if (req.path.startsWith("/api/") && req.headers.authorization) {
    return next();
  }

  const token = req.headers["x-csrf-token"] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    logSecurity("CSRF token mismatch", req.ip, req.get("User-Agent"), {
      endpoint: req.originalUrl,
      method: req.method,
    });
    return res.status(403).json({
      success: false,
      message: "Invalid CSRF token",
    });
  }

  next();
};

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Remove X-Powered-By header if it exists
  if (res.removeHeader) {
    res.removeHeader("X-Powered-By");
  }

  // Set security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()"
  );

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; frame-ancestors 'none';"
  );

  next();
};

// Brute force protection
export const bruteForceProtection = (
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
) => {
  const attempts = new Map();

  return (req, res, next) => {
    const key = `${req.ip}:${req.body.email || req.body.username || "unknown"}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old attempts
    if (attempts.has(key)) {
      const userAttempts = attempts
        .get(key)
        .filter((time) => time > windowStart);
      attempts.set(key, userAttempts);
    } else {
      attempts.set(key, []);
    }

    const userAttempts = attempts.get(key);

    if (userAttempts.length >= maxAttempts) {
      logSecurity(
        "Brute force attempt detected",
        req.ip,
        req.get("User-Agent"),
        {
          key,
          attempts: userAttempts.length,
          endpoint: req.originalUrl,
        }
      );

      return res.status(429).json({
        success: false,
        message: "Too many failed attempts, please try again later",
        retryAfter: Math.ceil((userAttempts[0] + windowMs - now) / 1000),
      });
    }

    // Add current attempt
    userAttempts.push(now);

    // Add middleware to track failed attempts
    const originalJson = res.json;
    res.json = function (data) {
      if (
        data.success === false &&
        (data.message?.includes("Invalid") || data.message?.includes("failed"))
      ) {
        // This is a failed attempt, it's already tracked above
      }
      return originalJson.call(this, data);
    };

    next();
  };
};

// API key validation middleware
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  const validApiKeys = process.env.API_KEYS?.split(",") || [];

  if (!apiKey || !validApiKeys.includes(apiKey)) {
    logSecurity("Invalid API key", req.ip, req.get("User-Agent"), {
      apiKey: apiKey ? "***" : "missing",
      endpoint: req.originalUrl,
    });
    return res.status(401).json({
      success: false,
      message: "Invalid API key",
    });
  }

  next();
};

// Request validation middleware
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);

    if (error) {
      logSecurity("Request validation failed", req.ip, req.get("User-Agent"), {
        error: error.details[0].message,
        endpoint: req.originalUrl,
        body: req.body,
      });

      return res.status(400).json({
        success: false,
        message: "Invalid request data",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    next();
  };
};

// File upload security
export const secureFileUpload = (allowedTypes, maxSize) => {
  return (req, res, next) => {
    if (!req.file) {
      return next();
    }

    const { mimetype, size, originalname } = req.file;

    // Check file type
    if (!allowedTypes.includes(mimetype)) {
      logSecurity(
        "Invalid file type upload attempt",
        req.ip,
        req.get("User-Agent"),
        {
          mimetype,
          originalname,
          endpoint: req.originalUrl,
        }
      );

      return res.status(400).json({
        success: false,
        message: "Invalid file type",
      });
    }

    // Check file size
    if (size > maxSize) {
      logSecurity(
        "File too large upload attempt",
        req.ip,
        req.get("User-Agent"),
        {
          size,
          maxSize,
          originalname,
          endpoint: req.originalUrl,
        }
      );

      return res.status(400).json({
        success: false,
        message: "File too large",
      });
    }

    // Check for malicious file names
    const maliciousPatterns = [
      /\.\./, // Directory traversal
      /<script/i, // XSS
      /javascript:/i, // JavaScript protocol
      /vbscript:/i, // VBScript protocol
    ];

    if (maliciousPatterns.some((pattern) => pattern.test(originalname))) {
      logSecurity(
        "Malicious filename upload attempt",
        req.ip,
        req.get("User-Agent"),
        {
          originalname,
          endpoint: req.originalUrl,
        }
      );

      return res.status(400).json({
        success: false,
        message: "Invalid filename",
      });
    }

    next();
  };
};
