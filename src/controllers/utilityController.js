import Project from "../models/Project.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Upload file
// @route   POST /api/v1/files/upload
// @access  Private
export const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  res.json({
    success: true,
    data: {
      fileId: req.file.public_id,
      filename: req.file.originalname,
      url: req.file.secure_url,
      size: req.file.bytes,
      mimetype: req.file.mimetype,
    },
  });
});

// @desc    Get search suggestions
// @route   GET /api/v1/search/suggestions
// @access  Public
export const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.json({
      success: true,
      data: {
        projects: [],
        techStacks: [],
        authors: [],
      },
    });
  }

  // Search projects
  const projects = await Project.find({
    $text: { $search: q },
    status: "published",
  })
    .select("title")
    .limit(5);

  // Search tech stacks
  const techStacks = await Project.distinct("techStack", {
    techStack: { $regex: q, $options: "i" },
    status: "published",
  });

  // Search authors
  const authors = await User.find({
    fullName: { $regex: q, $options: "i" },
    role: { $in: ["author", "admin"] },
  })
    .select("fullName")
    .limit(5);

  res.json({
    success: true,
    data: {
      projects: projects.map((p) => p.title),
      techStacks: techStacks.slice(0, 5),
      authors: authors.map((a) => a.fullName),
    },
  });
});

// @desc    Get overview statistics
// @route   GET /api/v1/stats/overview
// @access  Public
export const getStats = asyncHandler(async (req, res) => {
  const [totalProjects, totalUsers, totalPurchases, avgRating] =
    await Promise.all([
      Project.countDocuments({ status: "published" }),
      User.countDocuments({ verified: true }),
      Project.aggregate([
        { $match: { status: "published" } },
        { $group: { _id: null, total: { $sum: "$purchaseCount" } } },
      ]),
      Project.aggregate([
        { $match: { status: "published", "rating.count": { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: "$rating.average" } } },
      ]),
    ]);

  res.json({
    success: true,
    data: {
      totalProjects,
      totalUsers,
      totalDownloads: totalPurchases[0]?.total || 0,
      avgRating: Math.round((avgRating[0]?.avg || 0) * 10) / 10,
    },
  });
});
