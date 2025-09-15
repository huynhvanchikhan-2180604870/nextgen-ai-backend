import mongoose from "mongoose";

const aiPlannerSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    sessionId: {
      type: String,
      required: [true, "Session ID is required"],
      unique: true,
    },
    status: {
      type: String,
      enum: ["active", "processing", "completed", "failed", "expired"],
      default: "active",
    },
    projectDetails: {
      projectName: {
        type: String,
        required: [true, "Project name is required"],
        maxlength: [200, "Project name cannot exceed 200 characters"],
      },
      description: {
        type: String,
        required: [true, "Project description is required"],
        maxlength: [2000, "Description cannot exceed 2000 characters"],
      },
      requirements: [
        {
          type: String,
          required: true,
          trim: true,
        },
      ],
      budget: {
        type: Number,
        min: [0, "Budget cannot be negative"],
      },
      timeline: {
        type: String,
        enum: [
          "1 week",
          "2 weeks",
          "1 month",
          "2 months",
          "3 months",
          "6 months",
          "1 year",
          "flexible",
        ],
      },
      techPreferences: [
        {
          type: String,
          trim: true,
        },
      ],
      complexity: {
        type: String,
        enum: ["simple", "medium", "complex", "enterprise"],
        default: "medium",
      },
    },
    messages: [
      {
        id: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["user", "ai"],
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        isComplete: {
          type: Boolean,
          default: true,
        },
        metadata: {
          type: Map,
          of: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],
    aiPlan: {
      overview: {
        projectName: String,
        estimatedCost: Number,
        estimatedTime: String,
        complexity: String,
        successRate: Number,
      },
      phases: [
        {
          id: Number,
          name: String,
          duration: String,
          cost: Number,
          tasks: [String],
          deliverables: [String],
        },
      ],
      techStack: {
        frontend: [String],
        backend: [String],
        database: [String],
        deployment: [String],
        tools: [String],
      },
      recommendations: [
        {
          projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
          },
          title: String,
          matchPercentage: Number,
          price: Number,
          thumbnail: String,
          reason: String,
        },
      ],
      estimatedROI: {
        investment: Number,
        projectedRevenue: Number,
        breakEvenTime: String,
      },
      risks: [
        {
          type: String,
          description: String,
          mitigation: String,
          probability: String,
        },
      ],
      alternatives: [
        {
          name: String,
          description: String,
          pros: [String],
          cons: [String],
          cost: Number,
        },
      ],
    },
    processingStatus: {
      currentStep: {
        type: String,
        default: "initializing",
      },
      progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      estimatedTimeRemaining: {
        type: String,
        default: "2-3 minutes",
      },
      lastUpdate: {
        type: Date,
        default: Date.now,
      },
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      },
    },
    completedAt: {
      type: Date,
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
aiPlannerSessionSchema.index({ user: 1, createdAt: -1 });
aiPlannerSessionSchema.index({ sessionId: 1 });
aiPlannerSessionSchema.index({ status: 1 });
aiPlannerSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for message count
aiPlannerSessionSchema.virtual("messageCount").get(function () {
  return this.messages.length;
});

// Virtual for is expired
aiPlannerSessionSchema.virtual("isExpired").get(function () {
  return this.expiresAt < new Date();
});

// Pre-save middleware to generate session ID if not provided
aiPlannerSessionSchema.pre("save", function (next) {
  if (!this.sessionId) {
    const crypto = require("crypto");
    this.sessionId = crypto.randomUUID();
  }
  next();
});

// Instance method to add message
aiPlannerSessionSchema.methods.addMessage = function (
  type,
  message,
  metadata = {}
) {
  const messageId = require("crypto").randomUUID();
  this.messages.push({
    id: messageId,
    type,
    message,
    metadata,
    timestamp: new Date(),
  });
  return this.save();
};

// Instance method to update processing status
aiPlannerSessionSchema.methods.updateProcessingStatus = function (
  step,
  progress,
  timeRemaining
) {
  this.processingStatus.currentStep = step;
  this.processingStatus.progress = progress;
  this.processingStatus.estimatedTimeRemaining = timeRemaining;
  this.processingStatus.lastUpdate = new Date();
  return this.save();
};

// Instance method to mark as completed
aiPlannerSessionSchema.methods.markCompleted = function (aiPlan) {
  this.status = "completed";
  this.aiPlan = aiPlan;
  this.completedAt = new Date();
  this.processingStatus.progress = 100;
  this.processingStatus.currentStep = "completed";
  return this.save();
};

// Instance method to mark as failed
aiPlannerSessionSchema.methods.markFailed = function (reason) {
  this.status = "failed";
  this.metadata.failureReason = reason;
  return this.save();
};

// Instance method to extend expiration
aiPlannerSessionSchema.methods.extendExpiration = function (hours = 24) {
  this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
  return this.save();
};

// Static method to get active sessions
aiPlannerSessionSchema.statics.getActiveSessions = function (userId) {
  return this.find({
    user: userId,
    status: { $in: ["active", "processing"] },
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });
};

// Static method to cleanup expired sessions
aiPlannerSessionSchema.statics.cleanupExpired = function () {
  return this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      status: { $in: ["active", "processing"] },
    },
    { status: "expired" }
  );
};

// Static method to get session statistics
aiPlannerSessionSchema.statics.getStats = function (startDate, endDate) {
  const matchStage = {};
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        avgProcessingTime: {
          $avg: {
            $cond: [
              { $ne: ["$completedAt", null] },
              { $subtract: ["$completedAt", "$createdAt"] },
              null,
            ],
          },
        },
      },
    },
  ]);
};

export default mongoose.model("AIPlannerSession", aiPlannerSessionSchema);
