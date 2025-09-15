import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Project is required"],
    },
    transaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: [true, "Transaction is required"],
    },
    amount: {
      type: Number,
      required: [true, "Purchase amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    currency: {
      type: String,
      default: "USD",
      enum: ["USD", "VND", "EUR"],
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled", "refunded"],
      default: "pending",
    },
    license: {
      type: {
        type: String,
        enum: ["mit", "commercial", "custom", "gpl", "apache"],
        required: true,
      },
      description: String,
      restrictions: [String],
    },
    downloadUrl: {
      type: String,
      default: null,
    },
    downloadExpires: {
      type: Date,
      default: null,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    maxDownloads: {
      type: Number,
      default: 10,
    },
    version: {
      type: String,
      default: "1.0.0",
    },
    hasUpdates: {
      type: Boolean,
      default: false,
    },
    lastDownloaded: {
      type: Date,
      default: null,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    refundReason: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
purchaseSchema.index({ user: 1, createdAt: -1 });
purchaseSchema.index({ project: 1 });
purchaseSchema.index({ transaction: 1 });
purchaseSchema.index({ status: 1 });
purchaseSchema.index({ user: 1, project: 1 }, { unique: true }); // Prevent duplicate purchases

// Virtual for download availability
purchaseSchema.virtual("canDownload").get(function () {
  if (this.status !== "completed") return false;
  if (this.downloadCount >= this.maxDownloads) return false;
  if (this.downloadExpires && this.downloadExpires < new Date()) return false;
  return true;
});

// Virtual for remaining downloads
purchaseSchema.virtual("remainingDownloads").get(function () {
  return Math.max(0, this.maxDownloads - this.downloadCount);
});

// Instance method to generate download URL
purchaseSchema.methods.generateDownloadUrl = function () {
  // Generate secure download URL with expiration
  const crypto = require("crypto");
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  this.downloadUrl = `/api/v1/downloads/${
    this._id
  }?token=${token}&expires=${expires.getTime()}`;
  this.downloadExpires = expires;

  return this.save();
};

// Instance method to record download
purchaseSchema.methods.recordDownload = function () {
  this.downloadCount += 1;
  this.lastDownloaded = new Date();
  return this.save();
};

// Instance method to check for updates
purchaseSchema.methods.checkForUpdates = async function () {
  const project = await mongoose.model("Project").findById(this.project);
  if (project && project.changelog.length > 0) {
    const latestVersion = project.changelog[0].version;
    this.hasUpdates = latestVersion !== this.version;
    if (this.hasUpdates) {
      this.version = latestVersion;
    }
    return this.save();
  }
  return this;
};

// Instance method to process refund
purchaseSchema.methods.processRefund = function (reason) {
  this.status = "refunded";
  this.refundedAt = new Date();
  this.refundReason = reason;
  return this.save();
};

// Static method to get user purchases
purchaseSchema.statics.getUserPurchases = function (
  userId,
  page = 1,
  limit = 10
) {
  const skip = (page - 1) * limit;

  return this.find({ user: userId, status: "completed" })
    .populate("project", "title thumbnail price techStack")
    .populate("transaction", "amount currency createdAt")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get project purchase stats
purchaseSchema.statics.getProjectStats = function (projectId) {
  return this.aggregate([
    {
      $match: {
        project: mongoose.Types.ObjectId(projectId),
        status: "completed",
      },
    },
    {
      $group: {
        _id: null,
        totalPurchases: { $sum: 1 },
        totalRevenue: { $sum: "$amount" },
        uniqueBuyers: { $addToSet: "$user" },
      },
    },
    {
      $project: {
        totalPurchases: 1,
        totalRevenue: 1,
        uniqueBuyers: { $size: "$uniqueBuyers" },
      },
    },
  ]);
};

// Static method to check if user purchased project
purchaseSchema.statics.hasUserPurchased = function (userId, projectId) {
  return this.findOne({
    user: userId,
    project: projectId,
    status: "completed",
  });
};

export default mongoose.model("Purchase", purchaseSchema);
