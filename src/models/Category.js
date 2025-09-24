import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxLength: [50, "Category name cannot exceed 50 characters"],
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      maxLength: [500, "Description cannot exceed 500 characters"],
    },
    icon: {
      type: String,
      default: "folder",
    },
    color: {
      type: String,
      default: "#3B82F6",
      validate: {
        validator: function (v) {
          return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(v);
        },
        message: "Color must be a valid hex color",
      },
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    projectCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      seoTitle: String,
      seoDescription: String,
      keywords: [String],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
categorySchema.index({ name: 1 });
categorySchema.index({ slug: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ isActive: 1 });
categorySchema.index({ sortOrder: 1 });

// Virtual for subcategories
categorySchema.virtual("subcategories", {
  ref: "Category",
  localField: "_id",
  foreignField: "parent",
});

// Virtual for projects
categorySchema.virtual("projects", {
  ref: "Project",
  localField: "_id",
  foreignField: "category",
});

// Pre-save middleware to generate slug
categorySchema.pre("save", function (next) {
  // Always generate slug if name is provided and slug is missing
  if (this.name && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }
  next();
});

// Static methods
categorySchema.statics.getActiveCategories = function () {
  return this.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .populate("subcategories", "name slug icon color projectCount");
};

categorySchema.statics.getCategoryTree = function () {
  return this.aggregate([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "parent",
        as: "subcategories",
      },
    },
    {
      $lookup: {
        from: "projects",
        localField: "_id",
        foreignField: "category",
        as: "projects",
        pipeline: [{ $match: { status: "published" } }],
      },
    },
    {
      $addFields: {
        projectCount: { $size: "$projects" },
        subcategories: {
          $map: {
            input: "$subcategories",
            as: "sub",
            in: {
              _id: "$$sub._id",
              name: "$$sub.name",
              slug: "$$sub.slug",
              icon: "$$sub.icon",
              color: "$$sub.color",
              projectCount: "$$sub.projectCount",
            },
          },
        },
      },
    },
    {
      $project: {
        projects: 0,
      },
    },
    { $sort: { sortOrder: 1, name: 1 } },
  ]);
};

categorySchema.statics.getCategoryStats = function () {
  return this.aggregate([
    {
      $lookup: {
        from: "projects",
        localField: "_id",
        foreignField: "category",
        as: "projects",
        pipeline: [{ $match: { status: "published" } }],
      },
    },
    {
      $lookup: {
        from: "categories",
        localField: "_id",
        foreignField: "parent",
        as: "subcategories",
      },
    },
    {
      $addFields: {
        projectCount: { $size: "$projects" },
        subcategoryCount: { $size: "$subcategories" },
        totalProjects: {
          $add: [
            { $size: "$projects" },
            {
              $sum: {
                $map: {
                  input: "$subcategories",
                  as: "sub",
                  in: "$$sub.projectCount",
                },
              },
            },
          ],
        },
      },
    },
    {
      $project: {
        name: 1,
        slug: 1,
        icon: 1,
        color: 1,
        projectCount: 1,
        subcategoryCount: 1,
        totalProjects: 1,
        isActive: 1,
      },
    },
    { $sort: { totalProjects: -1, name: 1 } },
  ]);
};

// Instance methods
categorySchema.methods.updateProjectCount = async function () {
  const Project = mongoose.model("Project");
  const count = await Project.countDocuments({
    category: this._id,
    status: "published",
  });
  this.projectCount = count;
  await this.save();
  return count;
};

categorySchema.methods.getFullPath = function () {
  const path = [this.name];
  let current = this;

  while (current.parent) {
    current = current.constructor.findById(current.parent);
    if (current) {
      path.unshift(current.name);
    }
  }

  return path.join(" > ");
};

// Update project count when projects are added/removed
categorySchema.post("save", async function (doc) {
  if (doc.parent) {
    const parentCategory = await this.constructor.findById(doc.parent);
    if (parentCategory) {
      await parentCategory.updateProjectCount();
    }
  }
});

const Category = mongoose.model("Category", categorySchema);

export default Category;
