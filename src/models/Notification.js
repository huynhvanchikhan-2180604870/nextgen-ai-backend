import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    type: {
      type: String,
      enum: [
        "project_update",
        "payment_success",
        "purchase_success",
        "payment_failed",
        "new_message",
        "ai_plan_ready",
        "system_announcement",
        "promotion",
        "security_alert",
      ],
      required: [true, "Notification type is required"],
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    data: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    category: {
      type: String,
      enum: ["transaction", "project", "ai_planner", "system", "promotion"],
      default: "system",
    },
    actionUrl: {
      type: String,
      default: null,
    },
    actionText: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: function () {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      },
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for is expired
notificationSchema.virtual("isExpired").get(function () {
  return this.expiresAt < new Date();
});

// Instance method to mark as read
notificationSchema.methods.markAsRead = function () {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Instance method to mark as unread
notificationSchema.methods.markAsUnread = function () {
  this.read = false;
  this.readAt = null;
  return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = function (
  userId,
  type,
  title,
  message,
  data = {},
  options = {}
) {
  return this.create({
    user: userId,
    type,
    title,
    message,
    data,
    priority: options.priority || "medium",
    category: options.category || "system",
    actionUrl: options.actionUrl,
    actionText: options.actionText,
    expiresAt:
      options.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
};

// Static method to get user notifications
notificationSchema.statics.getUserNotifications = function (
  userId,
  page = 1,
  limit = 20,
  filters = {}
) {
  const skip = (page - 1) * limit;
  const query = {
    user: userId,
    expiresAt: { $gt: new Date() },
    ...filters,
  };

  return this.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function (userId) {
  return this.countDocuments({
    user: userId,
    read: false,
    expiresAt: { $gt: new Date() },
  });
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = function (userId) {
  return this.updateMany(
    { user: userId, read: false },
    {
      read: true,
      readAt: new Date(),
    }
  );
};

// Static method to cleanup expired notifications
notificationSchema.statics.cleanupExpired = function () {
  return this.deleteMany({ expiresAt: { $lt: new Date() } });
};

// Static method to get notification statistics
notificationSchema.statics.getStats = function (startDate, endDate) {
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
        _id: "$type",
        count: { $sum: 1 },
        readCount: { $sum: { $cond: ["$read", 1, 0] } },
        unreadCount: { $sum: { $cond: ["$read", 0, 1] } },
      },
    },
  ]);
};

// Static method to create bulk notifications
notificationSchema.statics.createBulkNotifications = function (notifications) {
  return this.insertMany(notifications);
};

export default mongoose.model("Notification", notificationSchema);
