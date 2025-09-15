import Project from "../models/Project.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Get featured projects
// @route   GET /api/v1/projects/featured
// @access  Public
export const getFeaturedProjects = asyncHandler(async (req, res) => {
  const projects = await Project.getFeatured(6);

  res.json({
    success: true,
    data: projects,
  });
});

// @desc    Get all projects with filtering
// @route   GET /api/v1/projects
// @access  Public
export const getProjects = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    sort = "createdAt",
    techStack,
    productType,
    license,
    priceMin,
    priceMax,
    rating,
    search,
  } = req.query;

  // Build filter object
  const filters = { status: "published" };

  if (techStack) {
    filters.techStack = {
      $in: Array.isArray(techStack) ? techStack : [techStack],
    };
  }

  if (productType) {
    filters.productType = productType;
  }

  if (license) {
    filters["license.type"] = license;
  }

  if (priceMin || priceMax) {
    filters.price = {};
    if (priceMin) filters.price.$gte = parseFloat(priceMin);
    if (priceMax) filters.price.$lte = parseFloat(priceMax);
  }

  if (rating) {
    filters["rating.average"] = { $gte: parseFloat(rating) };
  }

  // Build sort object
  let sortObj = {};
  switch (sort) {
    case "price_asc":
      sortObj = { price: 1 };
      break;
    case "price_desc":
      sortObj = { price: -1 };
      break;
    case "rating":
      sortObj = { "rating.average": -1 };
      break;
    case "popular":
      sortObj = { purchaseCount: -1 };
      break;
    default:
      sortObj = { createdAt: -1 };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Execute query
  let query = Project.find(filters)
    .populate("author", "fullName avatar")
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

  // Add search if provided
  if (search) {
    query = query.find({ $text: { $search: search } });
    sortObj = { score: { $meta: "textScore" } };
  }

  const projects = await query;
  const total = await Project.countDocuments(filters);
  const totalPages = Math.ceil(total / parseInt(limit));

  res.json({
    success: true,
    data: {
      projects,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1,
      },
    },
  });
});

// @desc    Get single project
// @route   GET /api/v1/projects/:id
// @access  Public
export const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate("author", "fullName avatar totalProjects rating")
    .populate("reviews.user", "fullName avatar");

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  // Increment view count
  await project.incrementView();

  // Check if user has purchased this project
  let isPurchased = false;
  let isFavorited = false;

  if (req.user) {
    const Purchase = (await import("../models/Purchase.js")).default;
    const Favorite = (await import("../models/Favorite.js")).default;

    isPurchased = await Purchase.hasUserPurchased(req.user._id, project._id);
    isFavorited = await Favorite.isFavorited(req.user._id, project._id);
  }

  // Get related projects
  const relatedProjects = await Project.find({
    _id: { $ne: project._id },
    techStack: { $in: project.techStack },
    status: "published",
  })
    .select("title thumbnail price rating")
    .limit(4);

  res.json({
    success: true,
    data: {
      ...project.toObject(),
      isPurchased,
      isFavorited,
      relatedProjects,
    },
  });
});

// @desc    Get filter options
// @route   GET /api/v1/projects/filter-options
// @access  Public
export const getFilterOptions = asyncHandler(async (req, res) => {
  const techStacks = await Project.distinct("techStack", {
    status: "published",
  });
  const productTypes = await Project.distinct("productType", {
    status: "published",
  });
  const licenses = await Project.distinct("license.type", {
    status: "published",
  });

  const priceRange = await Project.aggregate([
    { $match: { status: "published" } },
    {
      $group: {
        _id: null,
        min: { $min: "$price" },
        max: { $max: "$price" },
      },
    },
  ]);

  res.json({
    success: true,
    data: {
      techStacks: techStacks.sort(),
      productTypes,
      licenses,
      priceRange: priceRange[0] || { min: 0, max: 299.99 },
      maxRating: 5,
    },
  });
});

// @desc    Search projects
// @route   GET /api/v1/projects/search
// @access  Public
export const searchProjects = asyncHandler(async (req, res) => {
  const { q, page = 1, limit = 12 } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      message: "Search query is required",
    });
  }

  const projects = await Project.searchProjects(q, { status: "published" })
    .populate("author", "fullName avatar")
    .skip((parseInt(page) - 1) * parseInt(limit))
    .limit(parseInt(limit));

  const total = await Project.countDocuments({
    $text: { $search: q },
    status: "published",
  });

  res.json({
    success: true,
    data: {
      projects,
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

// @desc    Create new project
// @route   POST /api/v1/projects
// @access  Private (Author only)
export const createProject = asyncHandler(async (req, res) => {
  const projectData = {
    ...req.body,
    author: req.user._id,
  };

  const project = await Project.create(projectData);

  res.status(201).json({
    success: true,
    data: project,
  });
});

// @desc    Update project
// @route   PUT /api/v1/projects/:id
// @access  Private (Author only)
export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  // Check if user is the author or admin
  if (
    project.author.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this project",
    });
  }

  const updatedProject = await Project.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: updatedProject,
  });
});

// @desc    Delete project
// @route   DELETE /api/v1/projects/:id
// @access  Private (Author only)
export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  // Check if user is the author or admin
  if (
    project.author.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this project",
    });
  }

  await Project.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Project deleted successfully",
  });
});

// @desc    Get project statistics
// @route   GET /api/v1/projects/:id/stats
// @access  Private (Author only)
export const getProjectStats = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return res.status(404).json({
      success: false,
      message: "Project not found",
    });
  }

  // Check if user is the author or admin
  if (
    project.author.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to view this project stats",
    });
  }

  const Purchase = (await import("../models/Purchase.js")).default;
  const stats = await Purchase.getProjectStats(req.params.id);

  res.json({
    success: true,
    data: {
      project: {
        id: project._id,
        title: project.title,
        viewCount: project.viewCount,
        purchaseCount: project.purchaseCount,
        rating: project.rating,
      },
      stats: stats[0] || {
        totalPurchases: 0,
        totalRevenue: 0,
        uniqueBuyers: 0,
      },
    },
  });
});
