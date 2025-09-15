import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
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
    addedAt: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
favoriteSchema.index({ user: 1, project: 1 }, { unique: true }); // Prevent duplicate favorites
favoriteSchema.index({ user: 1, addedAt: -1 });
favoriteSchema.index({ project: 1 });

// Static method to add favorite
favoriteSchema.statics.addFavorite = function (
  userId,
  projectId,
  notes = "",
  tags = []
) {
  return this.findOneAndUpdate(
    { user: userId, project: projectId },
    {
      user: userId,
      project: projectId,
      notes,
      tags,
      addedAt: new Date(),
    },
    { upsert: true, new: true }
  );
};

// Static method to remove favorite
favoriteSchema.statics.removeFavorite = function (userId, projectId) {
  return this.findOneAndDelete({ user: userId, project: projectId });
};

// Static method to check if favorited
favoriteSchema.statics.isFavorited = function (userId, projectId) {
  return this.findOne({ user: userId, project: projectId });
};

// Static method to get user favorites
favoriteSchema.statics.getUserFavorites = function (
  userId,
  page = 1,
  limit = 10
) {
  const skip = (page - 1) * limit;

  return this.find({ user: userId })
    .populate("project", "title thumbnail price rating techStack author")
    .sort({ addedAt: -1 })
    .skip(skip)
    .limit(limit);
};

// Static method to get project favorite count
favoriteSchema.statics.getProjectFavoriteCount = function (projectId) {
  return this.countDocuments({ project: projectId });
};

export default mongoose.model("Favorite", favoriteSchema);
