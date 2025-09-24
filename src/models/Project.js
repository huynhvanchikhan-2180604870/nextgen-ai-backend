import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    longDescription: {
      type: String,
      default: "",
      maxlength: [10000, "Long description cannot exceed 10000 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    originalPrice: {
      type: Number,
      default: null,
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
      max: [100, "Discount cannot exceed 100%"],
    },
    thumbnail: {
      type: String,
      required: [true, "Thumbnail is required"],
    },
    images: [
      {
        type: String,
        required: true,
      },
    ],
    demoUrl: {
      type: String,
      default: null,
    },
    githubUrl: {
      type: String,
      default: null,
    },
    downloadUrl: {
      type: String,
      default: null,
    },
    techStack: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    productType: {
      type: String,
      enum: [
        "web_app",
        "mobile_app",
        "fullstack",
        "template",
        "api",
        "ai_ml",
        "desktop_app",
        "game",
      ],
      required: [true, "Product type is required"],
    },
    license: {
      type: {
        type: String,
        enum: ["mit", "commercial", "custom", "gpl", "apache"],
        required: [true, "License type is required"],
      },
      description: {
        type: String,
        default: "",
      },
      restrictions: [String],
    },
    features: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],
    requirements: {
      node: String,
      database: String,
      other: [String],
    },
    fileStructure: {
      type: Map,
      of: String,
      default: {},
    },
    changelog: [
      {
        version: {
          type: String,
          required: true,
        },
        date: {
          type: Date,
          required: true,
        },
        changes: [String],
      },
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Author is required"],
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    rating: {
      average: {
        type: Number,
        default: 0,
        min: [0, "Rating cannot be negative"],
        max: [5, "Rating cannot exceed 5"],
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    reviews: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        rating: {
          type: Number,
          required: true,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          maxlength: [1000, "Review comment cannot exceed 1000 characters"],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    purchaseCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived", "suspended"],
      default: "draft",
    },
    glowColor: {
      type: String,
      default: "#00ff88",
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },
    analytics: {
      dailyViews: [
        {
          date: Date,
          views: Number,
        },
      ],
      monthlySales: [
        {
          month: String,
          sales: Number,
          revenue: Number,
        },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
projectSchema.index({ title: "text", description: "text", tags: "text" });
projectSchema.index({ author: 1 });
projectSchema.index({ productType: 1 });
projectSchema.index({ techStack: 1 });
projectSchema.index({ price: 1 });
projectSchema.index({ rating: 1 });
projectSchema.index({ featured: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ createdAt: -1 });
projectSchema.index({ purchaseCount: -1 });

// Virtual for discount percentage
projectSchema.virtual("discountPercentage").get(function () {
  if (this.originalPrice && this.originalPrice > this.price) {
    return Math.round(
      ((this.originalPrice - this.price) / this.originalPrice) * 100
    );
  }
  return 0;
});

// Virtual for related projects
projectSchema.virtual("relatedProjects", {
  ref: "Project",
  localField: "techStack",
  foreignField: "techStack",
  justOne: false,
});

// Pre-save middleware to calculate discount
projectSchema.pre("save", function (next) {
  if (this.originalPrice && this.originalPrice > this.price) {
    this.discount = Math.round(
      ((this.originalPrice - this.price) / this.originalPrice) * 100
    );
  }
  next();
});

// Instance method to update rating
projectSchema.methods.updateRating = function () {
  if (this.reviews.length > 0) {
    const totalRating = this.reviews.reduce(
      (sum, review) => sum + review.rating,
      0
    );
    this.rating.average =
      Math.round((totalRating / this.reviews.length) * 10) / 10;
    this.rating.count = this.reviews.length;
  } else {
    this.rating.average = 0;
    this.rating.count = 0;
  }
  return this.save();
};

// Instance method to add review
projectSchema.methods.addReview = function (userId, rating, comment) {
  // Check if user already reviewed
  const existingReview = this.reviews.find(
    (review) => review.user.toString() === userId.toString()
  );

  if (existingReview) {
    // Update existing review
    existingReview.rating = rating;
    existingReview.comment = comment;
  } else {
    // Add new review
    this.reviews.push({ user: userId, rating, comment });
  }

  return this.updateRating();
};

// Instance method to increment view count
projectSchema.methods.incrementView = function () {
  this.viewCount += 1;
  return this.save();
};

// Instance method to increment purchase count
projectSchema.methods.incrementPurchase = function () {
  this.purchaseCount += 1;
  return this.save();
};

// Static method to get featured projects
projectSchema.statics.getFeatured = function (limit = 6) {
  return this.find({
    featured: true,
    status: "published",
  })
    .populate("author", "fullName avatar")
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to search projects
projectSchema.statics.searchProjects = function (query, filters = {}) {
  const searchQuery = {
    status: "published",
    ...filters,
  };

  if (query) {
    searchQuery.$text = { $search: query };
  }

  return this.find(searchQuery)
    .populate("author", "fullName avatar")
    .sort(query ? { score: { $meta: "textScore" } } : { createdAt: -1 });
};

export default mongoose.model("Project", projectSchema);
