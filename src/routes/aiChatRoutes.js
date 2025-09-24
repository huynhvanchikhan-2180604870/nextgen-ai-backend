import express from "express";
import {
  createAIChatSession,
  endAIChatSession,
  getAIChatSession,
  getSessionMessages,
  getUserAIChatSessions,
  sendAIMessage,
} from "../controllers/aiChatController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes are protected
router.use(protect);

// @route   POST /api/v1/ai-chat/sessions
// @desc    Create AI chat session
// @access  Private
router.post("/sessions", createAIChatSession);

// @route   GET /api/v1/ai-chat/sessions
// @desc    Get user's AI chat sessions
// @access  Private
router.get("/sessions", getUserAIChatSessions);

// @route   GET /api/v1/ai-chat/sessions/:sessionId
// @desc    Get AI chat session
// @access  Private
router.get("/sessions/:sessionId", getAIChatSession);

// @route   POST /api/v1/ai-chat/sessions/:sessionId/messages
// @desc    Send message to AI
// @access  Private
router.post("/sessions/:sessionId/messages", sendAIMessage);

// @route   GET /api/v1/ai-chat/sessions/:sessionId/messages
// @desc    Get session messages
// @access  Private
router.get("/sessions/:sessionId/messages", getSessionMessages);

// @route   DELETE /api/v1/ai-chat/sessions/:sessionId
// @desc    End AI chat session
// @access  Private
router.delete("/sessions/:sessionId", endAIChatSession);

export default router;
