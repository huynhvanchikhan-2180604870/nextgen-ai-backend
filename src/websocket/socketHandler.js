import jwt from "jsonwebtoken";
import AIPlannerSession from "../models/AIPlannerSession.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

// Store active connections
const activeConnections = new Map();

export const setupWebSocket = (io) => {
  // Authentication middleware for WebSocket
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User ${socket.userId} connected via WebSocket`);

    // Store connection
    activeConnections.set(socket.userId, socket);

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Handle AI Planner session events
    socket.on("join_ai_session", async (sessionId) => {
      try {
        const session = await AIPlannerSession.findOne({
          _id: sessionId,
          user: socket.userId,
        });

        if (session) {
          socket.join(`ai_session:${sessionId}`);
          socket.emit("ai_session_joined", { sessionId });
        } else {
          socket.emit("error", { message: "Session not found" });
        }
      } catch (error) {
        socket.emit("error", { message: "Failed to join session" });
      }
    });

    socket.on("leave_ai_session", (sessionId) => {
      socket.leave(`ai_session:${sessionId}`);
      socket.emit("ai_session_left", { sessionId });
    });

    // Handle typing indicators
    socket.on("ai_typing_start", (sessionId) => {
      socket.to(`ai_session:${sessionId}`).emit("ai_typing", { sessionId });
    });

    socket.on("ai_typing_stop", (sessionId) => {
      socket
        .to(`ai_session:${sessionId}`)
        .emit("ai_typing_stop", { sessionId });
    });

    // Handle disconnect
    socket.on("disconnect", () => {
      console.log(`User ${socket.userId} disconnected from WebSocket`);
      activeConnections.delete(socket.userId);
    });
  });

  // Make io instance available for other modules
  global.io = io;
};

// Helper functions for sending events
export const sendToUser = (userId, event, data) => {
  const socket = activeConnections.get(userId);
  if (socket) {
    socket.emit(event, data);
  }
};

export const sendToAISession = (sessionId, event, data) => {
  global.io.to(`ai_session:${sessionId}`).emit(event, data);
};

export const sendNotification = async (userId, notification) => {
  // Save notification to database
  const savedNotification = await Notification.createNotification(
    userId,
    notification.type,
    notification.title,
    notification.message,
    notification.data,
    notification.options
  );

  // Send real-time notification
  sendToUser(userId, "notification", {
    id: savedNotification._id,
    type: savedNotification.type,
    title: savedNotification.title,
    message: savedNotification.message,
    data: savedNotification.data,
    createdAt: savedNotification.createdAt,
  });

  return savedNotification;
};

export const broadcastBalanceUpdate = (userId, newBalance, change) => {
  sendToUser(userId, "balance_update", {
    newBalance,
    change,
    timestamp: new Date(),
  });
};

export const broadcastAIMessage = (sessionId, message) => {
  sendToAISession(sessionId, "ai_message", {
    messageId: message.id,
    message: message.message,
    timestamp: message.timestamp,
    isComplete: message.isComplete,
  });
};

export const broadcastAITyping = (sessionId) => {
  sendToAISession(sessionId, "ai_typing", { sessionId });
};

export const broadcastAITypingStop = (sessionId) => {
  sendToAISession(sessionId, "ai_typing_stop", { sessionId });
};
