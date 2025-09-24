import express from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryBreadcrumb,
  getCategoryById,
  getCategoryBySlug,
  getCategoryStats,
  toggleCategoryStatus,
  updateCategory,
  updateCategorySort,
} from "../controllers/categoryController.js";
import { adminOnly, protect } from "../middleware/authMiddleware.js";
import { apiRateLimit } from "../middleware/securityMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", apiRateLimit, getCategories);
router.get("/stats", apiRateLimit, getCategoryStats);
router.get("/:id", apiRateLimit, getCategoryById);
router.get("/slug/:slug", apiRateLimit, getCategoryBySlug);
router.get("/:id/breadcrumb", apiRateLimit, getCategoryBreadcrumb);

// Protected routes (Admin only)
router.post("/", protect, adminOnly, createCategory);
router.put("/:id", protect, adminOnly, updateCategory);
router.delete("/:id", protect, adminOnly, deleteCategory);
router.put("/:id/toggle", protect, adminOnly, toggleCategoryStatus);
router.put("/sort", protect, adminOnly, updateCategorySort);

export default router;
