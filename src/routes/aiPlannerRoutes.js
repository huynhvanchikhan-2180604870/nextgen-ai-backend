import express from "express";
import {
  createAISession,
  getAISession,
  getAISessionResult,
  getAISessions,
  sendMessage,
} from "../controllers/aiPlannerController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All AI Planner routes require authentication
router.use(protect);

router.post("/sessions", createAISession);
router.get("/sessions", getAISessions);
router.get("/sessions/:sessionId", getAISession);
router.get("/sessions/:sessionId/result", getAISessionResult);
router.post("/sessions/:sessionId/message", sendMessage);
router.get("/recommendations", getAISessions);

export default router;
