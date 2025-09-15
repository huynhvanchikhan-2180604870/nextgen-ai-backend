import express from "express";
import {
  getSearchSuggestions,
  getStats,
  uploadFile,
} from "../controllers/utilityController.js";
import { protect } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// File upload (protected)
router.post("/files/upload", protect, upload.single("file"), uploadFile);
router.post("/upload", protect, upload.single("file"), uploadFile);

// Search suggestions (public)
router.get("/search/suggestions", getSearchSuggestions);

// Stats (public)
router.get("/stats/overview", getStats);
router.get("/stats", getStats);

export default router;
