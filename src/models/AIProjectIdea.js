import mongoose from "mongoose";

const aiProjectIdeaSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    sessionId: {
      type: String,
      required: [true, "Session ID is required"],
    },
    title: {
      type: String,
      required: [true, "Project title is required"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Project description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    features: [
      {
        name: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          required: true,
        },
        priority: {
          type: String,
          enum: ["high", "medium", "low"],
          default: "medium",
        },
        estimatedHours: {
          type: Number,
          min: 0,
        },
      },
    ],
    techStack: [
      {
        name: {
          type: String,
          required: true,
        },
        category: {
          type: String,
          enum: ["frontend", "backend", "database", "deployment", "other"],
          required: true,
        },
        experience: {
          type: String,
          enum: ["beginner", "intermediate", "advanced"],
          default: "intermediate",
        },
      },
    ],
    budget: {
      estimated: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        default: "USD",
      },
      breakdown: [
        {
          category: {
            type: String,
            required: true,
          },
          amount: {
            type: Number,
            required: true,
            min: 0,
          },
          description: String,
        },
      ],
    },
    timeline: {
      estimated: {
        type: Number, // in weeks
        min: 1,
      },
      phases: [
        {
          name: {
            type: String,
            required: true,
          },
          duration: {
            type: Number, // in weeks
            required: true,
            min: 1,
          },
          description: String,
          deliverables: [String],
        },
      ],
    },
    complexity: {
      level: {
        type: String,
        enum: ["beginner", "intermediate", "advanced", "expert"],
        required: true,
      },
      score: {
        type: Number,
        min: 1,
        max: 10,
        required: true,
      },
      factors: [
        {
          name: String,
          impact: {
            type: String,
            enum: ["low", "medium", "high"],
          },
          description: String,
        },
      ],
    },
    marketAnalysis: {
      targetAudience: String,
      competitors: [String],
      marketSize: String,
      opportunities: [String],
      challenges: [String],
    },
    resources: {
      teamSize: {
        type: Number,
        min: 1,
      },
      roles: [
        {
          title: String,
          skills: [String],
          experience: String,
          hours: Number,
        },
      ],
      tools: [String],
      externalServices: [String],
    },
    status: {
      type: String,
      enum: ["draft", "reviewed", "approved", "in_progress", "completed", "cancelled"],
      default: "draft",
    },
    tags: [String],
    isPublic: {
      type: Boolean,
      default: false,
    },
    exportFormats: [
      {
        type: {
          type: String,
          enum: ["pdf", "docx", "json", "markdown"],
        },
        url: String,
        generatedAt: Date,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
aiProjectIdeaSchema.index({ user: 1, createdAt: -1 });
aiProjectIdeaSchema.index({ status: 1 });
aiProjectIdeaSchema.index({ isPublic: 1 });
aiProjectIdeaSchema.index({ tags: 1 });

// Instance method to calculate total budget
aiProjectIdeaSchema.methods.calculateTotalBudget = function () {
  if (!this.budget.breakdown) return this.budget.estimated || 0;
  return this.budget.breakdown.reduce((total, item) => total + item.amount, 0);
};

// Instance method to calculate total timeline
aiProjectIdeaSchema.methods.calculateTotalTimeline = function () {
  if (!this.timeline.phases) return this.timeline.estimated || 0;
  return this.timeline.phases.reduce((total, phase) => total + phase.duration, 0);
};

// Instance method to generate summary
aiProjectIdeaSchema.methods.generateSummary = function () {
  return {
    title: this.title,
    description: this.description,
    totalBudget: this.calculateTotalBudget(),
    totalTimeline: this.calculateTotalTimeline(),
    complexity: this.complexity.level,
    features: this.features.length,
    techStack: this.techStack.length,
    status: this.status,
  };
};

// Static method to find public ideas
aiProjectIdeaSchema.statics.findPublic = function (filters = {}) {
  return this.find({ isPublic: true, ...filters }).sort({ createdAt: -1 });
};

// Static method to find by user
aiProjectIdeaSchema.statics.findByUser = function (userId, filters = {}) {
  return this.find({ user: userId, ...filters }).sort({ createdAt: -1 });
};

const AIProjectIdea = mongoose.model("AIProjectIdea", aiProjectIdeaSchema);

export default AIProjectIdea;
