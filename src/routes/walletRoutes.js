import express from "express";
import {
  getBalance,
  getPaymentMethods,
  getTransactionById,
  getTransactions,
  handlePaymentCallback,
  processPayment,
  topupWallet,
} from "../controllers/walletController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// All wallet routes require authentication
router.use(protect);

router.get("/balance", getBalance);
router.get("/transactions", getTransactions);
router.get("/payment-methods", getPaymentMethods);
router.post("/top-up", topupWallet);
router.post("/topup", topupWallet);
router.post("/payment", processPayment);
router.get("/transactions/:id", getTransactionById);
router.post("/vnpay/callback", handlePaymentCallback);
router.post("/momo/callback", handlePaymentCallback);
router.post("/paypal/callback", handlePaymentCallback);
router.post("/callback/:provider", handlePaymentCallback);

export default router;
