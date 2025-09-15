import express from "express";
import {
  createProject,
  deleteProject,
  getFeaturedProjects,
  getFilterOptions,
  getProjectById,
  getProjects,
  getProjectStats,
  searchProjects,
  updateProject,
} from "../controllers/projectController.js";
import {
  authorOnly,
  optionalAuth,
  protect,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/featured", getFeaturedProjects);
router.get("/filter-options", getFilterOptions);
router.get("/categories", getFilterOptions);
router.get("/stats", getProjectStats);
router.get("/search", optionalAuth, searchProjects);
router.get("/", optionalAuth, getProjects);
router.get("/:id", optionalAuth, getProjectById);

// Protected routes
router.post("/", protect, authorOnly, createProject);
router.put("/:id", protect, authorOnly, updateProject);
router.delete("/:id", protect, authorOnly, deleteProject);
router.get("/:id/stats", protect, authorOnly, getProjectStats);

export default router;
