import jwt from "jsonwebtoken";
import AIChatSession from "../models/AIChatSession.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import aiService from "../services/aiService.js";

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
    socket.on("join_ai_session", async (data) => {
      try {
        // Extract sessionId from data object
        const sessionId = typeof data === "string" ? data : data.sessionId;
        console.log(
          `🔍 Attempting to join AI session: ${sessionId} for user: ${socket.userId}`
        );

        const session = await AIChatSession.findOne({
          sessionId: sessionId,
          user: socket.userId,
        });

        console.log(`🔍 Session found:`, session ? "Yes" : "No");

        if (session) {
          socket.join(`ai_session:${sessionId}`);
          socket.emit("ai_session_joined", { sessionId });
          console.log(
            `✅ User ${socket.userId} joined AI session: ${sessionId}`
          );
        } else {
          console.log(
            `❌ Session not found for user ${socket.userId}: ${sessionId}`
          );
          socket.emit("ai_session_error", { message: "Session not found" });
        }
      } catch (error) {
        console.error("❌ Error joining AI session:", error);
        socket.emit("ai_session_error", { message: "Failed to join session" });
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

    // Handle AI chat messages
    socket.on("ai_chat_message", async (data) => {
      try {
        const { sessionId, message, timestamp } = data;
        console.log(
          `💬 AI chat message from user ${socket.userId} in session ${sessionId}: ${message}`
        );

        // Find the session
        const session = await AIChatSession.findOne({
          sessionId: sessionId,
          user: socket.userId,
        });

        if (!session) {
          console.log(`❌ Session not found: ${sessionId}`);
          socket.emit("ai_session_error", { message: "Session not found" });
          return;
        }

        // Add user message to session
        session.messages.push({
          role: "user",
          content: message,
          timestamp: new Date(),
        });

        // Generate AI response
        try {
          const aiResponse = await aiService.chatAboutProject(
            sessionId,
            message,
            { messages: session.messages }
          );

          // Add AI response to session
          session.messages.push({
            role: "ai",
            content: aiResponse,
            timestamp: new Date(),
          });

          await session.save();

          // Broadcast AI response to all users in the session
          socket.to(`ai_session:${sessionId}`).emit("ai_message", {
            sessionId,
            message: aiResponse,
            timestamp: new Date(),
            userId: "ai",
          });

          console.log(`🤖 AI response sent for session: ${sessionId}`);
        } catch (aiError) {
          console.error("AI response generation error:", aiError);

          // Send error message
          socket.to(`ai_session:${sessionId}`).emit("ai_message", {
            sessionId,
            message: "Xin lỗi, tôi gặp sự cố kỹ thuật. Vui lòng thử lại sau.",
            timestamp: new Date(),
            userId: "ai",
          });
        }
      } catch (error) {
        console.error("Error handling AI chat message:", error);
        socket.emit("ai_session_error", { message: "Failed to send message" });
      }
    });

    // Handle AI plan generation requests
    socket.on("request_ai_plan", async (data) => {
      try {
        const { sessionId, projectDetails } = data;
        console.log(
          `📋 AI plan request from user ${socket.userId} in session ${sessionId}`
        );

        // Broadcast to all users in the session
        socket.to(`ai_session:${sessionId}`).emit("ai_plan_requested", {
          sessionId,
          projectDetails,
          userId: socket.userId,
        });
      } catch (error) {
        console.error("Error handling AI plan request:", error);
        socket.emit("ai_session_error", { message: "Failed to request plan" });
      }
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
