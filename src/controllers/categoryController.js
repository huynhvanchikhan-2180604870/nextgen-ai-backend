import Category from "../models/Category.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Get all categories
// @route   GET /api/v1/categories
// @access  Public
export const getCategories = asyncHandler(async (req, res) => {
  const { includeInactive = false, tree = false } = req.query;

  let categories;
  if (tree === "true") {
    categories = await Category.getCategoryTree();
  } else {
    const filter = includeInactive === "true" ? {} : { isActive: true };
    categories = await Category.find(filter)
      .populate("subcategories", "name slug icon color projectCount")
      .sort({ sortOrder: 1, name: 1 });
  }

  res.json({
    success: true,
    data: categories,
  });
});

// @desc    Get category by ID
// @route   GET /api/v1/categories/:id
// @access  Public
export const getCategoryById = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)
    .populate("subcategories", "name slug icon color projectCount")
    .populate("parent", "name slug");

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  res.json({
    success: true,
    data: category,
  });
});

// @desc    Get category by slug
// @route   GET /api/v1/categories/slug/:slug
// @access  Public
export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: req.params.slug })
    .populate("subcategories", "name slug icon color projectCount")
    .populate("parent", "name slug");

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  res.json({
    success: true,
    data: category,
  });
});

// @desc    Get category statistics
// @route   GET /api/v1/categories/stats
// @access  Public
export const getCategoryStats = asyncHandler(async (req, res) => {
  const stats = await Category.getCategoryStats();

  res.json({
    success: true,
    data: stats,
  });
});

// @desc    Create new category
// @route   POST /api/v1/categories
// @access  Private (Admin only)
export const createCategory = asyncHandler(async (req, res) => {
  const categoryData = {
    ...req.body,
    createdBy: req.user._id,
  };

  const category = await Category.create(categoryData);

  res.status(201).json({
    success: true,
    data: category,
  });
});

// @desc    Update category
// @route   PUT /api/v1/categories/:id
// @access  Private (Admin only)
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: updatedCategory,
  });
});

// @desc    Delete category
// @route   DELETE /api/v1/categories/:id
// @access  Private (Admin only)
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  // Check if category has subcategories
  const subcategories = await Category.find({ parent: category._id });
  if (subcategories.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete category with subcategories",
    });
  }

  // Check if category has projects
  const Project = (await import("../models/Project.js")).default;
  const projects = await Project.find({ category: category._id });
  if (projects.length > 0) {
    return res.status(400).json({
      success: false,
      message: "Cannot delete category with projects",
    });
  }

  await Category.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Category deleted successfully",
  });
});

// @desc    Toggle category status
// @route   PUT /api/v1/categories/:id/toggle
// @access  Private (Admin only)
export const toggleCategoryStatus = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  category.isActive = !category.isActive;
  await category.save();

  res.json({
    success: true,
    data: category,
    message: `Category ${category.isActive ? "activated" : "deactivated"}`,
  });
});

// @desc    Update category sort order
// @route   PUT /api/v1/categories/sort
// @access  Private (Admin only)
export const updateCategorySort = asyncHandler(async (req, res) => {
  const { categories } = req.body;

  if (!Array.isArray(categories)) {
    return res.status(400).json({
      success: false,
      message: "Categories must be an array",
    });
  }

  const updatePromises = categories.map((cat, index) =>
    Category.findByIdAndUpdate(cat.id, { sortOrder: index })
  );

  await Promise.all(updatePromises);

  res.json({
    success: true,
    message: "Category sort order updated",
  });
});

// @desc    Get category breadcrumb
// @route   GET /api/v1/categories/:id/breadcrumb
// @access  Public
export const getCategoryBreadcrumb = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);

  if (!category) {
    return res.status(404).json({
      success: false,
      message: "Category not found",
    });
  }

  const breadcrumb = [];
  let current = category;

  while (current) {
    breadcrumb.unshift({
      id: current._id,
      name: current.name,
      slug: current.slug,
    });

    if (current.parent) {
      current = await Category.findById(current.parent);
    } else {
      current = null;
    }
  }

  res.json({
    success: true,
    data: breadcrumb,
  });
});
