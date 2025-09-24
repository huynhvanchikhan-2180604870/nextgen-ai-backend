import express from "express";
import {
  saveProjectIdea,
  getUserProjectIdeas,
  getProjectIdea,
  updateProjectIdea,
  deleteProjectIdea,
  exportProjectIdea,
  getPublicProjectIdeas,
} from "../controllers/aiProjectIdeaController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/public", getPublicProjectIdeas);

// Protected routes
router.use(protect);

// @route   POST /api/v1/ai-project-ideas
// @desc    Save AI chat result as project idea
// @access  Private
router.post("/", saveProjectIdea);

// @route   GET /api/v1/ai-project-ideas
// @desc    Get user's project ideas
// @access  Private
router.get("/", getUserProjectIdeas);

// @route   GET /api/v1/ai-project-ideas/:id
// @desc    Get project idea by ID
// @access  Private
router.get("/:id", getProjectIdea);

// @route   PUT /api/v1/ai-project-ideas/:id
// @desc    Update project idea
// @access  Private
router.put("/:id", updateProjectIdea);

// @route   DELETE /api/v1/ai-project-ideas/:id
// @desc    Delete project idea
// @access  Private
router.delete("/:id", deleteProjectIdea);

// @route   POST /api/v1/ai-project-ideas/:id/export
// @desc    Export project idea
// @access  Private
router.post("/:id/export", exportProjectIdea);

export default router;
