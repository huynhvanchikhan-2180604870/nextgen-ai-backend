import mongoose from "mongoose";

const aiChatSessionSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ["active", "inactive", "expired"],
      default: "active",
    },
    messages: [
      {
        type: {
          type: String,
          enum: ["user", "ai"],
          required: true,
        },
        content: {
          type: String,
          required: true,
          maxlength: [5000, "Message content cannot exceed 5000 characters"],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        metadata: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
      },
    ],
    lastActivity: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
aiChatSessionSchema.index({ user: 1, sessionId: 1 });
aiChatSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to generate session ID if not provided
aiChatSessionSchema.pre("save", function (next) {
  if (!this.sessionId) {
    const crypto = require("crypto");
    this.sessionId = crypto.randomUUID();
  }
  next();
});

// Instance method to add message
aiChatSessionSchema.methods.addMessage = function (
  type,
  content,
  metadata = {}
) {
  this.messages.push({
    type,
    content,
    metadata,
  });
  this.lastActivity = new Date();
  return this.save();
};

// Instance method to get recent messages
aiChatSessionSchema.methods.getRecentMessages = function (limit = 50) {
  return this.messages
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
    .reverse();
};

// Static method to find active session by user
aiChatSessionSchema.statics.findActiveByUser = function (userId) {
  return this.findOne({
    user: userId,
    status: "active",
    expiresAt: { $gt: new Date() },
  });
};

// Static method to cleanup expired sessions
aiChatSessionSchema.statics.cleanupExpired = function () {
  return this.updateMany(
    {
      expiresAt: { $lt: new Date() },
      status: { $ne: "expired" },
    },
    { status: "expired" }
  );
};

const AIChatSession = mongoose.model("AIChatSession", aiChatSessionSchema);

export default AIChatSession;
