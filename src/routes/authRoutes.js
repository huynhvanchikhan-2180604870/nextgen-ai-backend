import express from "express";
import { body } from "express-validator";
import {
  forgotPassword,
  login,
  logout,
  refreshToken,
  register,
  resetPassword,
  socialLogin,
  verifyOTP,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";

const router = express.Router();

// Validation rules
const registerValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("fullName")
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),
];

const verifyOTPValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage("OTP must be 6 digits"),
];

const loginValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
  body("password").notEmpty().withMessage("Password is required"),
];

const socialLoginValidation = [
  body("accessToken").notEmpty().withMessage("Access token is required"),
];

const forgotPasswordValidation = [
  body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email"),
];

const resetPasswordValidation = [
  body("token").notEmpty().withMessage("Reset token is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

// Routes
router.post("/register", registerValidation, validateRequest, register);
router.post("/verify-otp", verifyOTPValidation, validateRequest, verifyOTP);
router.post("/login", loginValidation, validateRequest, login);
router.post(
  "/social/:provider",
  socialLoginValidation,
  validateRequest,
  socialLogin
);
router.post("/refresh", refreshToken);
router.post(
  "/forgot-password",
  forgotPasswordValidation,
  validateRequest,
  forgotPassword
);
router.post(
  "/reset-password",
  resetPasswordValidation,
  validateRequest,
  resetPassword
);
router.post("/logout", protect, logout);

export default router;
