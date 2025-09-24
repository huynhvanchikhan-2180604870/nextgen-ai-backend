import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [100, "Full name cannot exceed 100 characters"],
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["user", "author", "admin"],
      default: "user",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
    },
    otpCode: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
    balance: {
      type: Number,
      default: 0.0,
      min: [0, "Balance cannot be negative"],
    },
    socialAccounts: {
      google: {
        id: String,
        email: String,
      },
      github: {
        id: String,
        username: String,
      },
    },
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        projectUpdates: { type: Boolean, default: true },
        promotions: { type: Boolean, default: true },
      },
      theme: {
        type: String,
        enum: ["dark", "light", "auto"],
        default: "dark",
      },
      language: {
        type: String,
        default: "en",
      },
    },
    stats: {
      totalPurchases: { type: Number, default: 0 },
      totalSpent: { type: Number, default: 0.0 },
      favoriteTechStacks: [String],
      lastLogin: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userSchema.index({ email: 1 });
userSchema.index({ "socialAccounts.google.id": 1 });
userSchema.index({ "socialAccounts.github.id": 1 });
userSchema.index({ createdAt: -1 });

// Virtual for user's purchased projects
userSchema.virtual("purchasedProjects", {
  ref: "Purchase",
  localField: "_id",
  foreignField: "user",
  justOne: false,
});

// Virtual for user's favorite projects
userSchema.virtual("favoriteProjects", {
  ref: "Favorite",
  localField: "_id",
  foreignField: "user",
  justOne: false,
});

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to generate OTP
userSchema.methods.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otpCode = otp;
  this.otpExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return otp;
};

// Instance method to verify OTP
userSchema.methods.verifyOTP = function (otp) {
  return this.otpCode === otp && this.otpExpires > new Date();
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  return this.save();
};

// Static method to find by email
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by social account
userSchema.statics.findBySocialAccount = function (provider, socialId) {
  return this.findOne({ [`socialAccounts.${provider}.id`]: socialId });
};

export default mongoose.model("User", userSchema);
