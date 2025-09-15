import axios from "axios";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { logAuth } from "../config/logger.js";
import User from "../models/User.js";
import emailService from "../services/emailService.js";
import { generateRefreshToken, generateToken } from "../utils/jwt.js";

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      fullName,
    });

    // Generate OTP
    const otp = user.generateOTP();
    await user.save();

    // Send OTP email
    try {
      await emailService.sendOTPEmail(email, otp, fullName);
      logAuth("otp_sent", user._id, req.ip, req.get("User-Agent"), {
        email,
        method: "registration",
      });
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError);
      // Don't fail registration if email fails
    }

    logAuth("user_registered", user._id, req.ip, req.get("User-Agent"), {
      email,
      method: "email",
    });

    res.status(201).json({
      success: true,
      data: {
        userId: user._id,
        email: user.email,
        verificationRequired: true,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Verify OTP
// @route   POST /api/v1/auth/verify-otp
// @access  Public
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify OTP
    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Mark user as verified
    user.verified = true;
    user.otpCode = null;
    user.otpExpires = null;
    await user.save();

    // Generate tokens
    const token = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, user.fullName);
      logAuth("welcome_email_sent", user._id, req.ip, req.get("User-Agent"));
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
    }

    logAuth("user_verified", user._id, req.ip, req.get("User-Agent"), {
      email,
      method: "otp",
    });

    res.json({
      success: true,
      data: {
        accessToken: token,
        refreshToken: refreshToken,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          avatar: user.avatar,
          balance: user.balance,
          verified: user.verified,
        },
      },
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user and include password
    const user = await User.findByEmail(email).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check password
    const isPasswordValid = await user.matchPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Check if user is verified
    if (!user.verified) {
      return res.status(401).json({
        success: false,
        message: "Please verify your email address first",
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate tokens
    const token = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    res.json({
      success: true,
      data: {
        accessToken: token,
        refreshToken: refreshToken,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          avatar: user.avatar,
          balance: user.balance,
          verified: user.verified,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Social login
// @route   POST /api/v1/auth/social/:provider
// @access  Public
export const socialLogin = async (req, res) => {
  try {
    const { provider } = req.params;
    const { accessToken } = req.body;

    let socialUser;

    // Get user info from social provider
    switch (provider) {
      case "google":
        socialUser = await getGoogleUserInfo(accessToken);
        break;
      case "github":
        socialUser = await getGithubUserInfo(accessToken);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: "Unsupported social provider",
        });
    }

    if (!socialUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid social token",
      });
    }

    // Check if user exists
    let user = await User.findBySocialAccount(provider, socialUser.id);

    if (!user) {
      // Check if user exists with same email
      user = await User.findByEmail(socialUser.email);

      if (user) {
        // Link social account to existing user
        user.socialAccounts[provider] = {
          id: socialUser.id,
          email: socialUser.email,
          ...(provider === "github" && { username: socialUser.username }),
        };
        await user.save();
      } else {
        // Create new user
        user = await User.create({
          email: socialUser.email,
          fullName: socialUser.name,
          avatar: socialUser.avatar,
          verified: true,
          socialAccounts: {
            [provider]: {
              id: socialUser.id,
              email: socialUser.email,
              ...(provider === "github" && { username: socialUser.username }),
            },
          },
        });
      }
    }

    // Update last login
    await user.updateLastLogin();

    // Generate tokens
    const token = generateToken({ id: user._id });
    const refreshToken = generateRefreshToken({ id: user._id });

    res.json({
      success: true,
      data: {
        accessToken: token,
        refreshToken: refreshToken,
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          avatar: user.avatar,
          balance: user.balance,
          verified: user.verified,
        },
      },
    });
  } catch (error) {
    console.error("Social login error:", error);
    res.status(500).json({
      success: false,
      message: "Social login failed",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh-token
// @access  Public
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    // Find user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    // Generate new tokens
    const newToken = generateToken({ id: user._id });
    const newRefreshToken = generateRefreshToken({ id: user._id });

    res.json({
      success: true,
      data: {
        accessToken: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    console.error("Refresh token error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid refresh token",
    });
  }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message: "If the email exists, a password reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = resetToken;
    await user.save();

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(
        email,
        resetToken,
        user.fullName
      );
      logAuth(
        "password_reset_email_sent",
        user._id,
        req.ip,
        req.get("User-Agent")
      );
    } catch (emailError) {
      console.error("Failed to send password reset email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send reset email",
      });
    }

    res.json({
      success: true,
      message: "If the email exists, a password reset link has been sent",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Password reset request failed",
    });
  }
};

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Update password
    user.password = password;
    user.verificationToken = null;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Password reset failed",
    });
  }
};

// Helper functions for social login
const getGoogleUserInfo = async (accessToken) => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
    );
    return {
      id: response.data.id,
      email: response.data.email,
      name: response.data.name,
      avatar: response.data.picture,
    };
  } catch (error) {
    console.error("Google API error:", error);
    return null;
  }
};

const getGithubUserInfo = async (accessToken) => {
  try {
    const response = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });
    return {
      id: response.data.id.toString(),
      email: response.data.email,
      name: response.data.name || response.data.login,
      avatar: response.data.avatar_url,
      username: response.data.login,
    };
  } catch (error) {
    console.error("GitHub API error:", error);
    return null;
  }
};
