import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { createServer } from "http";
import morgan from "morgan";
import { Server } from "socket.io";
import swaggerUi from "swagger-ui-express";
import connectDB from "./config/database.js";
import { logRequest, morganStream } from "./config/logger.js";
import { connectRedis } from "./config/redis.js";
import swaggerSetup from "./config/swagger.js";
import "./jobs/cronJobs.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";
import {
  apiRateLimit,
  authRateLimit,
  sanitizeData,
  securityHeaders,
  strictRateLimit,
} from "./middleware/securityMiddleware.js";
import aiPlannerRoutes from "./routes/aiPlannerRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import utilityRoutes from "./routes/utilityRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import { setupWebSocket } from "./websocket/socketHandler.js";

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Connect to MongoDB
connectDB();

// Connect to Redis
connectRedis();

// Security middleware
app.use(securityHeaders);
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  })
);

// Data sanitization
app.use(sanitizeData());

// CORS configuration
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      process.env.ADMIN_URL || "http://localhost:3001",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Rate limiting
app.use(apiRateLimit);

// Specific rate limits for auth routes
app.use("/api/v1/auth", authRateLimit);

// Strict rate limit for sensitive operations
app.use("/api/v1/wallet", strictRateLimit);
app.use("/api/v1/ai-planner", strictRateLimit);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
app.use(logRequest);
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined", { stream: morganStream }));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "NextGenAI API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerSetup);

// API Routes
const API_VERSION = process.env.API_VERSION || "v1";
// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "NextGenAI API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  });
});

app.use(`/api/${API_VERSION}/auth`, authRoutes);
app.use(`/api/${API_VERSION}/projects`, projectRoutes);
app.use(`/api/${API_VERSION}/ai-planner`, aiPlannerRoutes);
app.use(`/api/${API_VERSION}/wallet`, walletRoutes);
app.use(`/api/${API_VERSION}/users`, userRoutes);
app.use(`/api/${API_VERSION}/notifications`, notificationRoutes);
app.use(`/api/${API_VERSION}/utility`, utilityRoutes);

// WebSocket setup
setupWebSocket(io);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const WS_PORT = process.env.WS_PORT || 5001;

server.listen(PORT, () => {
  console.log(`🚀 NextGenAI API Server running on port ${PORT}`);
  console.log(`🌐 WebSocket server running on port ${WS_PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api/${API_VERSION}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    console.log("Process terminated");
  });
});

export default app;
