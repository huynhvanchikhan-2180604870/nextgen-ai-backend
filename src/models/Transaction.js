import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
    },
    type: {
      type: String,
      enum: ["topup", "purchase", "refund", "withdrawal", "commission"],
      required: [true, "Transaction type is required"],
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
    },
    currency: {
      type: String,
      default: "USD",
      enum: ["USD", "VND", "EUR"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "refunded",
      ],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: [
        "wallet_balance",
        "vnpay",
        "momo",
        "paypal",
        "stripe",
        "bank_transfer",
      ],
      required: [true, "Payment method is required"],
    },
    paymentDetails: {
      // VNPay specific
      vnpay: {
        txnRef: String,
        orderId: String,
        transactionNo: String,
        responseCode: String,
        secureHash: String,
      },
      // MoMo specific
      momo: {
        orderId: String,
        requestId: String,
        transId: String,
        resultCode: Number,
        message: String,
      },
      // PayPal specific
      paypal: {
        orderId: String,
        captureId: String,
        payerId: String,
        status: String,
      },
      // Stripe specific
      stripe: {
        paymentIntentId: String,
        chargeId: String,
        status: String,
      },
    },
    relatedProject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    relatedPurchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      default: null,
    },
    fees: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    processedAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: null,
    },
    refundReason: {
      type: String,
      default: null,
    },
    refundedAt: {
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
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ paymentMethod: 1 });
transactionSchema.index({ "paymentDetails.vnpay.txnRef": 1 });
transactionSchema.index({ "paymentDetails.momo.orderId": 1 });
transactionSchema.index({ "paymentDetails.paypal.orderId": 1 });

// Virtual for transaction display amount
transactionSchema.virtual("displayAmount").get(function () {
  return Math.abs(this.amount);
});

// Virtual for transaction direction
transactionSchema.virtual("isCredit").get(function () {
  return this.amount > 0;
});

// Virtual for transaction direction
transactionSchema.virtual("isDebit").get(function () {
  return this.amount < 0;
});

// Pre-save middleware to calculate net amount
transactionSchema.pre("save", function (next) {
  this.netAmount = this.amount - this.fees;
  next();
});

// Instance method to mark as completed
transactionSchema.methods.markCompleted = function () {
  this.status = "completed";
  this.processedAt = new Date();
  return this.save();
};

// Instance method to mark as failed
transactionSchema.methods.markFailed = function (reason) {
  this.status = "failed";
  this.failureReason = reason;
  this.processedAt = new Date();
  return this.save();
};

// Instance method to process refund
transactionSchema.methods.processRefund = function (reason) {
  this.status = "refunded";
  this.refundReason = reason;
  this.refundedAt = new Date();
  return this.save();
};

// Static method to get user transaction summary
transactionSchema.statics.getUserSummary = async function (userId) {
  const summary = await this.aggregate([
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$type",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const result = {
    totalTopup: 0,
    totalPurchase: 0,
    totalRefund: 0,
    currentBalance: 0,
  };

  summary.forEach((item) => {
    switch (item._id) {
      case "topup":
        result.totalTopup = item.totalAmount;
        break;
      case "purchase":
        result.totalPurchase = Math.abs(item.totalAmount);
        break;
      case "refund":
        result.totalRefund = item.totalAmount;
        break;
    }
  });

  result.currentBalance =
    result.totalTopup + result.totalRefund - result.totalPurchase;
  return result;
};

// Static method to get transaction statistics
transactionSchema.statics.getStats = async function (startDate, endDate) {
  const matchStage = {};
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalTransactions: { $sum: 1 },
        totalVolume: { $sum: "$amount" },
        totalFees: { $sum: "$fees" },
        completedTransactions: {
          $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
        },
        failedTransactions: {
          $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] },
        },
      },
    },
  ]);
};

export default mongoose.model("Transaction", transactionSchema);
