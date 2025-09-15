import { logAI } from "../config/logger.js";
import AIPlannerSession from "../models/AIPlannerSession.js";
import aiService from "../services/aiService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  broadcastAIMessage,
  broadcastAITyping,
} from "../websocket/socketHandler.js";

// @desc    Create AI planning session
// @route   POST /api/v1/ai-planner/sessions
// @access  Private
export const createAISession = asyncHandler(async (req, res) => {
  const {
    projectName,
    description,
    requirements,
    budget,
    timeline,
    techPreferences,
  } = req.body;

  // Create new session
  const session = await AIPlannerSession.create({
    user: req.user._id,
    projectDetails: {
      projectName,
      description,
      requirements,
      budget,
      timeline,
      techPreferences,
    },
  });

  logAI("session_created", req.user._id, session.sessionId, {
    projectName,
    complexity: session.projectDetails.complexity,
  });

  // Start AI processing in background
  processAIPlanning(session._id);

  res.status(201).json({
    success: true,
    data: {
      sessionId: session.sessionId,
      status: session.status,
      estimatedTime: "2-3 minutes",
    },
  });
});

// @desc    Get AI session
// @route   GET /api/v1/ai-planner/sessions/:sessionId
// @access  Private
export const getAISession = asyncHandler(async (req, res) => {
  const session = await AIPlannerSession.findOne({
    sessionId: req.params.sessionId,
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
    data: session,
  });
});

// @desc    Get AI session result
// @route   GET /api/v1/ai-planner/sessions/:sessionId/result
// @access  Private
export const getAISessionResult = asyncHandler(async (req, res) => {
  const session = await AIPlannerSession.findOne({
    sessionId: req.params.sessionId,
    user: req.user._id,
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Session not found",
    });
  }

  if (session.status !== "completed") {
    return res.status(400).json({
      success: false,
      message: "Session is still processing",
    });
  }

  res.json({
    success: true,
    data: {
      sessionId: session.sessionId,
      projectPlan: session.aiPlan,
      createdAt: session.createdAt,
    },
  });
});

// @desc    Send message to AI session
// @route   POST /api/v1/ai-planner/sessions/:sessionId/message
// @access  Private
export const sendMessage = asyncHandler(async (req, res) => {
  const { message } = req.body;
  const { sessionId } = req.params;

  const session = await AIPlannerSession.findOne({
    sessionId,
    user: req.user._id,
  });

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Session not found",
    });
  }

  // Add user message
  await session.addMessage("user", message);

  // Send typing indicator
  broadcastAITyping(sessionId);

  // Process AI response in background
  processAIResponse(session._id, message);

  res.json({
    success: true,
    message: "Message sent successfully",
  });
});

// @desc    Get user AI sessions
// @route   GET /api/v1/ai-planner/sessions
// @access  Private
export const getAISessions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filters = { user: req.user._id };
  if (status) filters.status = status;

  const sessions = await AIPlannerSession.find(filters)
    .select(
      "sessionId status projectDetails processingStatus createdAt completedAt"
    )
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await AIPlannerSession.countDocuments(filters);

  res.json({
    success: true,
    data: {
      sessions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1,
      },
    },
  });
});

// Background AI processing functions
const processAIPlanning = async (sessionId) => {
  try {
    const session = await AIPlannerSession.findById(sessionId);
    if (!session) return;

    // Update status to processing
    session.status = "processing";
    await session.updateProcessingStatus(
      "analyzing_requirements",
      10,
      "2-3 minutes"
    );
    await session.save();

    // Simulate AI processing steps
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await session.updateProcessingStatus("generating_plan", 30, "1-2 minutes");
    await session.save();

    await new Promise((resolve) => setTimeout(resolve, 2000));
    await session.updateProcessingStatus("calculating_costs", 60, "30 seconds");
    await session.save();

    await new Promise((resolve) => setTimeout(resolve, 2000));
    await session.updateProcessingStatus(
      "finalizing_recommendations",
      90,
      "10 seconds"
    );
    await session.save();

    // Use AI service to generate project plan
    const aiResult = await aiService.generateProjectPlan(
      session.projectDetails
    );

    if (!aiResult.success) {
      throw new Error(aiResult.error);
    }

    const aiPlan = aiResult.plan;

    // Mark as completed
    await session.markCompleted(aiPlan);

    logAI("plan_generated", session.user, session.sessionId, {
      phases: aiPlan.phases?.length || 0,
      recommendations: aiPlan.recommendations?.length || 0,
    });

    // Send completion notification via WebSocket
    broadcastAIMessage(session.sessionId, {
      id: "completion",
      message: "Your project plan is ready! Check the results section.",
      timestamp: new Date(),
      isComplete: true,
    });
  } catch (error) {
    console.error("AI planning error:", error);
    const session = await AIPlannerSession.findById(sessionId);
    if (session) {
      await session.markFailed("AI processing failed");
      logAI("plan_generation_failed", session.user, session.sessionId, {
        error: error.message,
      });
    }
  }
};

const processAIResponse = async (sessionId, userMessage) => {
  try {
    const session = await AIPlannerSession.findById(sessionId);
    if (!session) return;

    // Use AI service to generate response
    const aiResult = await aiService.chatAboutProject(
      sessionId,
      userMessage,
      session.projectDetails
    );

    if (!aiResult.success) {
      throw new Error(aiResult.error);
    }

    const aiResponse = aiResult.response;

    // Add AI message to session
    await session.addMessage("ai", aiResponse);

    logAI("chat_response_generated", session.user, sessionId, {
      messageLength: userMessage.length,
      responseLength: aiResponse.length,
    });

    // Send response via WebSocket
    broadcastAIMessage(session.sessionId, {
      id: `msg_${Date.now()}`,
      message: aiResponse,
      timestamp: new Date(),
      isComplete: true,
    });
  } catch (error) {
    console.error("AI response error:", error);
    logAI("chat_response_failed", null, sessionId, {
      error: error.message,
    });

    // Send error message
    broadcastAIMessage(sessionId, {
      id: `error_${Date.now()}`,
      message: "Sorry, I encountered an error. Please try again.",
      timestamp: new Date(),
      isComplete: true,
    });
  }
};
