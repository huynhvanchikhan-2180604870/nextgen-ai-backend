import mongoose from "mongoose";

const AIProjectPlanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  content: {
    type: String,
    required: true,
  },
  projectType: {
    type: String,
    enum: ["Đồ án môn học", "Đồ án tốt nghiệp", "Dự án thực tế"],
    required: true,
  },
  budget: {
    type: Number,
    required: true,
  },
  timeline: {
    type: String,
    required: true,
  },
  techStack: [
    {
      type: String,
    },
  ],
  features: [
    {
      type: String,
    },
  ],
  status: {
    type: String,
    enum: ["draft", "saved", "in_progress", "completed", "cancelled"],
    default: "saved",
  },
  tags: [
    {
      type: String,
    },
  ],
  isPublic: {
    type: Boolean,
    default: false,
  },
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update updatedAt on save
AIProjectPlanSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// Index for better query performance
AIProjectPlanSchema.index({ user: 1, createdAt: -1 });
AIProjectPlanSchema.index({ status: 1 });
AIProjectPlanSchema.index({ projectType: 1 });

export default mongoose.model("AIProjectPlan", AIProjectPlanSchema);
