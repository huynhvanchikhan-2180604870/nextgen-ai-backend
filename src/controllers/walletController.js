import { logPayment } from "../config/logger.js";
import Purchase from "../models/Purchase.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import paymentService from "../services/paymentService.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { broadcastBalanceUpdate } from "../websocket/socketHandler.js";

// @desc    Get wallet balance
// @route   GET /api/v1/wallet/balance
// @access  Private
export const getBalance = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  res.json({
    success: true,
    data: {
      balance: user.balance,
      currency: "USD",
      pendingAmount: 0, // This would be calculated from pending transactions
      lastUpdated: new Date(),
    },
  });
});

// @desc    Get payment methods
// @route   GET /api/v1/wallet/payment-methods
// @access  Private
export const getPaymentMethods = asyncHandler(async (req, res) => {
  const methods = [
    {
      id: "vnpay",
      name: "VNPay",
      icon: "/icons/vnpay.png",
      enabled: true,
      fees: "0%",
      minAmount: 10000, // VND
      maxAmount: 500000000,
    },
    {
      id: "momo",
      name: "MoMo",
      icon: "/icons/momo.png",
      enabled: true,
      fees: "0%",
      qrSupported: true,
    },
    {
      id: "paypal",
      name: "PayPal",
      icon: "/icons/paypal.png",
      enabled: true,
      fees: "3.5%",
    },
  ];

  res.json({
    success: true,
    data: {
      methods,
    },
  });
});

// @desc    Top up wallet
// @route   POST /api/v1/wallet/topup
// @access  Private
export const topupWallet = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, returnUrl } = req.body;

  if (amount < 10) {
    return res.status(400).json({
      success: false,
      message: "Minimum top-up amount is $10",
    });
  }

  // Create transaction record
  const transaction = await Transaction.create({
    user: req.user._id,
    type: "topup",
    amount: amount,
    currency: "USD",
    description: `Top-up wallet via ${paymentMethod}`,
    status: "pending",
    paymentMethod: paymentMethod,
    balanceBefore: req.user.balance,
    balanceAfter: req.user.balance,
    netAmount: amount,
  });

  // Use payment service to create payment
  const paymentResult = await paymentService.createPayment(
    paymentMethod,
    amount,
    "USD",
    `Top-up wallet ${amount} USD`,
    transaction._id.toString(),
    returnUrl,
    { userId: req.user._id, transactionId: transaction._id }
  );

  if (!paymentResult.success) {
    return res.status(400).json({
      success: false,
      message: paymentResult.error,
    });
  }

  const paymentData = paymentResult;

  logPayment("topup_initiated", req.user._id, amount, "USD", {
    paymentMethod,
    transactionId: transaction._id,
  });

  res.json({
    success: true,
    data: {
      sessionId: transaction._id,
      ...paymentData,
    },
  });
});

// @desc    Get transactions
// @route   GET /api/v1/wallet/transactions
// @access  Private
export const getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, status } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const filters = { user: req.user._id };
  if (type) filters.type = type;
  if (status) filters.status = status;

  const transactions = await Transaction.find(filters)
    .populate("relatedProject", "title thumbnail")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Transaction.countDocuments(filters);
  const summary = await Transaction.getUserSummary(req.user._id);

  res.json({
    success: true,
    data: {
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1,
      },
      summary,
    },
  });
});

// @desc    Get transaction by ID
// @route   GET /api/v1/wallet/transactions/:id
// @access  Private
export const getTransactionById = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).populate("relatedProject", "title thumbnail");

  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: "Transaction not found",
    });
  }

  res.json({
    success: true,
    data: transaction,
  });
});

// @desc    Process payment
// @route   POST /api/v1/wallet/payment
// @access  Private
export const processPayment = asyncHandler(async (req, res) => {
  const { projectId, amount, paymentMethod } = req.body;

  // Check if user already purchased this project
  const existingPurchase = await Purchase.hasUserPurchased(
    req.user._id,
    projectId
  );
  if (existingPurchase) {
    return res.status(400).json({
      success: false,
      message: "You have already purchased this project",
    });
  }

  // Check user balance
  if (req.user.balance < amount) {
    return res.status(400).json({
      success: false,
      message: "Insufficient balance",
    });
  }

  // Create transaction
  const transaction = await Transaction.create({
    user: req.user._id,
    type: "purchase",
    amount: -amount,
    currency: "USD",
    description: `Purchase project`,
    status: "completed",
    paymentMethod: paymentMethod,
    relatedProject: projectId,
    balanceBefore: req.user.balance,
    balanceAfter: req.user.balance - amount,
    netAmount: -amount,
  });

  // Update user balance
  await User.findByIdAndUpdate(req.user._id, {
    $inc: { balance: -amount },
  });

  // Create purchase record
  const purchase = await Purchase.create({
    user: req.user._id,
    project: projectId,
    transaction: transaction._id,
    amount: amount,
    status: "completed",
    license: {
      type: "commercial",
      description: "Can be used for commercial projects",
    },
  });

  // Generate download URL
  await purchase.generateDownloadUrl();

  // Update project purchase count
  const Project = (await import("../models/Project.js")).default;
  await Project.findByIdAndUpdate(projectId, {
    $inc: { purchaseCount: 1 },
  });

  // Broadcast balance update
  broadcastBalanceUpdate(req.user._id, req.user.balance - amount, -amount);

  logPayment("purchase_completed", req.user._id, amount, "USD", {
    projectId,
    transactionId: transaction._id,
    purchaseId: purchase._id,
  });

  res.json({
    success: true,
    data: {
      transaction,
      purchase,
      newBalance: req.user.balance - amount,
    },
  });
});

// @desc    Handle payment callback
// @route   POST /api/v1/wallet/callback/:provider
// @access  Public
export const handlePaymentCallback = asyncHandler(async (req, res) => {
  const { provider } = req.params;

  // Use payment service to verify payment
  const verificationResult = await paymentService.verifyPayment(
    provider,
    req.query
  );

  if (!verificationResult.success) {
    logPayment("callback_verification_failed", null, 0, "USD", {
      provider,
      error: verificationResult.error,
    });

    return res.redirect(
      `${
        process.env.FRONTEND_URL
      }/wallet/callback?status=error&message=${encodeURIComponent(
        verificationResult.error
      )}`
    );
  }

  // Handle successful payment
  const { data } = verificationResult;
  const transactionId = data.vnp_TxnRef || data.orderId || data.paymentIntentId;

  if (transactionId) {
    const transaction = await Transaction.findById(transactionId);
    if (transaction && transaction.status === "pending") {
      // Update transaction status
      await transaction.markCompleted();

      // Update user balance
      await User.findByIdAndUpdate(transaction.user, {
        $inc: { balance: transaction.amount },
      });

      // Broadcast balance update
      broadcastBalanceUpdate(
        transaction.user,
        transaction.amount,
        transaction.amount
      );

      logPayment(
        "callback_success",
        transaction.user,
        transaction.amount,
        transaction.currency,
        {
          provider,
          transactionId,
        }
      );
    }
  }

  res.redirect(`${process.env.FRONTEND_URL}/wallet/callback?status=success`);
});
