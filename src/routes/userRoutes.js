import express from "express";
import {
  addToFavorites,
  getUserFavorites,
  getUserProfile,
  getUserStats,
  getUserVault,
  removeFromFavorites,
  updateUserProfile,
} from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All user routes require authentication
router.use(protect);

router.get("/profile", getUserProfile);
router.put("/profile", updateUserProfile);
router.get("/vault", getUserVault);
router.get("/favorites", getUserFavorites);
router.post("/favorites/:projectId", addToFavorites);
router.delete("/favorites/:projectId", removeFromFavorites);
router.get("/stats", getUserStats);

export default router;
