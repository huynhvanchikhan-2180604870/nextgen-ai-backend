import Favorite from "../models/Favorite.js";
import Purchase from "../models/Purchase.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.user._id,
      email: req.user.email,
      fullName: req.user.fullName,
      avatar: req.user.avatar,
      balance: req.user.balance,
      role: req.user.role,
      verified: req.user.verified,
      preferences: req.user.preferences,
      stats: req.user.stats,
      createdAt: req.user.createdAt,
    },
  });
});

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  const { fullName, avatar, preferences } = req.body;

  const updateData = {};
  if (fullName) updateData.fullName = fullName;
  if (avatar) updateData.avatar = avatar;
  if (preferences)
    updateData.preferences = { ...req.user.preferences, ...preferences };

  const user = await User.findByIdAndUpdate(req.user._id, updateData, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    data: {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      avatar: user.avatar,
      preferences: user.preferences,
    },
  });
});

// @desc    Get user statistics
// @route   GET /api/v1/users/stats
// @access  Private
export const getUserStats = asyncHandler(async (req, res) => {
  const [purchaseStats, favoriteCount] = await Promise.all([
    Purchase.aggregate([
      { $match: { user: req.user._id, status: "completed" } },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          totalSpent: { $sum: "$amount" },
          avgPurchasePrice: { $avg: "$amount" },
        },
      },
    ]),
    Favorite.countDocuments({ user: req.user._id }),
  ]);

  const stats = purchaseStats[0] || {
    totalPurchases: 0,
    totalSpent: 0,
    avgPurchasePrice: 0,
  };

  res.json({
    success: true,
    data: {
      ...stats,
      totalFavorites: favoriteCount,
      memberSince: req.user.createdAt,
    },
  });
});

// @desc    Get user vault (purchased projects)
// @route   GET /api/v1/users/vault
// @access  Private
export const getUserVault = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12, search } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  let query = { user: req.user._id, status: "completed" };

  if (search) {
    // This would need a more complex query to search within populated project fields
    // For now, we'll get all and filter client-side or implement proper text search
  }

  const purchases = await Purchase.find(query)
    .populate("project", "title thumbnail price techStack author")
    .populate("project.author", "fullName avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Purchase.countDocuments(query);

  // Get summary stats
  const summary = await Purchase.aggregate([
    { $match: { user: req.user._id, status: "completed" } },
    {
      $group: {
        _id: null,
        totalPurchased: { $sum: 1 },
        totalValue: { $sum: "$amount" },
        mostUsedTech: { $first: "$project" }, // This would need more complex aggregation
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      projects: purchases,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1,
      },
      summary: summary[0] || {
        totalPurchased: 0,
        totalValue: 0,
        mostUsedTech: "React",
      },
    },
  });
});

// @desc    Get user favorites
// @route   GET /api/v1/users/favorites
// @access  Private
export const getUserFavorites = asyncHandler(async (req, res) => {
  const { page = 1, limit = 12 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const favorites = await Favorite.getUserFavorites(
    req.user._id,
    parseInt(page),
    parseInt(limit)
  );
  const total = await Favorite.countDocuments({ user: req.user._id });

  res.json({
    success: true,
    data: {
      projects: favorites,
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

// @desc    Add project to favorites
// @route   POST /api/v1/users/favorites/:projectId
// @access  Private
export const addToFavorites = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { notes, tags } = req.body;

  const favorite = await Favorite.addFavorite(
    req.user._id,
    projectId,
    notes,
    tags
  );

  res.status(201).json({
    success: true,
    data: favorite,
    message: "Project added to favorites",
  });
});

// @desc    Remove project from favorites
// @route   DELETE /api/v1/users/favorites/:projectId
// @access  Private
export const removeFromFavorites = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  const result = await Favorite.removeFavorite(req.user._id, projectId);

  if (!result) {
    return res.status(404).json({
      success: false,
      message: "Project not found in favorites",
    });
  }

  res.json({
    success: true,
    message: "Project removed from favorites",
  });
});
