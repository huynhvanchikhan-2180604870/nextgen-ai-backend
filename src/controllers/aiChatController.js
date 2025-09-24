import AIChatSession from "../models/AIChatSession.js";
import aiService from "../services/aiService.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Create AI chat session
// @route   POST /api/v1/ai-chat/sessions
// @access  Private
export const createAIChatSession = asyncHandler(async (req, res) => {
  // Check if user already has an active session
  const existingSession = await AIChatSession.findActiveByUser(req.user._id);

  if (existingSession) {
    return res.status(200).json({
      success: true,
      data: {
        sessionId: existingSession.sessionId,
        status: existingSession.status,
        messageCount: existingSession.messages.length,
      },
    });
  }

  // Create new session
  const session = await AIChatSession.create({
    user: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: {
      sessionId: session.sessionId,
      status: session.status,
      messageCount: 0,
    },
  });
});

// @desc    Get AI chat session
// @route   GET /api/v1/ai-chat/sessions/:sessionId
// @access  Private
export const getAIChatSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await AIChatSession.findOne({
    sessionId,
    user: req.user._id,
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Session not found",
    });
  }

  res.json({
    success: true,
    data: {
      sessionId: session.sessionId,
      status: session.status,
      messages: session.getRecentMessages(),
      lastActivity: session.lastActivity,
    },
  });
});

// @desc    Send message to AI
// @route   POST /api/v1/ai-chat/sessions/:sessionId/messages
// @access  Private
export const sendAIMessage = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "Message is required",
    });
  }

  const session = await AIChatSession.findOne({
    sessionId,
    user: req.user._id,
    status: "active",
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Session not found or inactive",
    });
  }

  // Add user message
  await session.addMessage("user", message.trim());

  // Generate AI response
  try {
    const aiResponse = await aiService.generateChatResponse(message.trim());

    // Add AI response
    await session.addMessage("ai", aiResponse);

    res.json({
      success: true,
      data: {
        userMessage: {
          type: "user",
          content: message.trim(),
          timestamp: new Date(),
        },
        aiMessage: {
          type: "ai",
          content: aiResponse,
          timestamp: new Date(),
        },
      },
    });
  } catch (error) {
    console.error("AI response generation error:", error);

    // Add error message
    await session.addMessage(
      "ai",
      "Xin lỗi, tôi gặp sự cố kỹ thuật. Vui lòng thử lại sau."
    );

    res.status(500).json({
      success: false,
      message: "Failed to generate AI response",
    });
  }
});

// @desc    Get session messages
// @route   GET /api/v1/ai-chat/sessions/:sessionId/messages
// @access  Private
export const getSessionMessages = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  const session = await AIChatSession.findOne({
    sessionId,
    user: req.user._id,
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Session not found",
    });
  }

  const messages = session.getRecentMessages(parseInt(limit));
  const paginatedMessages = messages.slice(parseInt(offset));

  res.json({
    success: true,
    data: {
      messages: paginatedMessages,
      total: messages.length,
      hasMore: paginatedMessages.length < messages.length,
    },
  });
});

// @desc    End AI chat session
// @route   DELETE /api/v1/ai-chat/sessions/:sessionId
// @access  Private
export const endAIChatSession = asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  const session = await AIChatSession.findOne({
    sessionId,
    user: req.user._id,
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Session not found",
    });
  }

  session.status = "inactive";
  await session.save();

  res.json({
    success: true,
    message: "Session ended successfully",
  });
});

// @desc    Get user's AI chat sessions
// @route   GET /api/v1/ai-chat/sessions
// @access  Private
export const getUserAIChatSessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const sessions = await AIChatSession.find({
    user: req.user._id,
  })
    .sort({ lastActivity: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .select("sessionId status lastActivity messages");

  const total = await AIChatSession.countDocuments({
    user: req.user._id,
  });

  res.json({
    success: true,
    data: {
      sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});
