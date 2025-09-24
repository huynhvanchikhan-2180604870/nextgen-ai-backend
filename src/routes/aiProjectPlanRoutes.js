import express from "express";
import {
  deleteProjectPlan,
  exportProjectPlan,
  getProjectPlan,
  getUserProjectPlans,
  saveProjectPlan,
  updateProjectPlan,
} from "../controllers/aiProjectPlanController.js";
import { protect as auth } from "../middleware/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(auth);

// Save project plan
router.post("/", saveProjectPlan);

// Get user's project plans
router.get("/", getUserProjectPlans);

// Get single project plan
router.get("/:planId", getProjectPlan);

// Update project plan
router.put("/:planId", updateProjectPlan);

// Delete project plan
router.delete("/:planId", deleteProjectPlan);

// Export project plan
router.get("/:planId/export", exportProjectPlan);

export default router;
