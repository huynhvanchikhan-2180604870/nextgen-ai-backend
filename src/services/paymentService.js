import axios from "axios";
import crypto from "crypto";
import paypal from "paypal-rest-sdk";
import Stripe from "stripe";
import { logError, logPayment } from "../config/logger.js";

// Initialize payment providers
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

paypal.configure({
  mode: process.env.PAYPAL_MODE || "sandbox",
  client_id: process.env.PAYPAL_CLIENT_ID,
  client_secret: process.env.PAYPAL_CLIENT_SECRET,
});

// VNPay configuration
const VNPAY_CONFIG = {
  tmnCode: process.env.VNPAY_TMN_CODE,
  hashSecret: process.env.VNPAY_HASH_SECRET,
  url: process.env.VNPAY_URL,
  returnUrl: process.env.VNPAY_RETURN_URL,
};

// MoMo configuration
const MOMO_CONFIG = {
  partnerCode: process.env.MOMO_PARTNER_CODE,
  accessKey: process.env.MOMO_ACCESS_KEY,
  secretKey: process.env.MOMO_SECRET_KEY,
  endpoint: process.env.MOMO_ENDPOINT,
  returnUrl: process.env.MOMO_RETURN_URL,
};

// Stripe payment methods
export const stripeService = {
  // Create payment intent
  async createPaymentIntent(amount, currency = "usd", metadata = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      logPayment("stripe_payment_intent_created", null, amount, currency, {
        paymentIntentId: paymentIntent.id,
        metadata,
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      logError(error);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  // Confirm payment
  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );

      if (paymentIntent.status === "succeeded") {
        logPayment(
          "stripe_payment_succeeded",
          null,
          paymentIntent.amount / 100,
          paymentIntent.currency,
          {
            paymentIntentId,
          }
        );
        return { success: true, paymentIntent };
      }

      return { success: false, status: paymentIntent.status };
    } catch (error) {
      logError(error);
      return { success: false, error: error.message };
    }
  },

  // Create refund
  async createRefund(paymentIntentId, amount = null) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      logPayment("stripe_refund_created", null, refund.amount / 100, "usd", {
        paymentIntentId,
        refundId: refund.id,
      });

      return { success: true, refund };
    } catch (error) {
      logError(error);
      return { success: false, error: error.message };
    }
  },
};

// PayPal payment methods
export const paypalService = {
  // Create payment
  async createPayment(
    amount,
    currency = "USD",
    description = "Payment",
    returnUrl,
    cancelUrl
  ) {
    try {
      const payment = {
        intent: "sale",
        payer: {
          payment_method: "paypal",
        },
        redirect_urls: {
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
        transactions: [
          {
            amount: {
              total: amount.toFixed(2),
              currency,
            },
            description,
          },
        ],
      };

      return new Promise((resolve, reject) => {
        paypal.payment.create(payment, (error, payment) => {
          if (error) {
            logError(error);
            resolve({ success: false, error: error.message });
          } else {
            logPayment("paypal_payment_created", null, amount, currency, {
              paymentId: payment.id,
            });
            resolve({ success: true, payment });
          }
        });
      });
    } catch (error) {
      logError(error);
      return { success: false, error: error.message };
    }
  },

  // Execute payment
  async executePayment(paymentId, payerId) {
    try {
      return new Promise((resolve, reject) => {
        paypal.payment.execute(
          paymentId,
          { payer_id: payerId },
          (error, payment) => {
            if (error) {
              logError(error);
              resolve({ success: false, error: error.message });
            } else {
              const amount = parseFloat(payment.transactions[0].amount.total);
              const currency = payment.transactions[0].amount.currency;

              logPayment("paypal_payment_executed", null, amount, currency, {
                paymentId,
                payerId,
              });
              resolve({ success: true, payment });
            }
          }
        );
      });
    } catch (error) {
      logError(error);
      return { success: false, error: error.message };
    }
  },
};

// VNPay payment methods
export const vnpayService = {
  // Create payment URL
  createPaymentUrl(amount, orderInfo, orderId, returnUrl) {
    try {
      const vnpParams = {
        vnp_Version: "2.1.0",
        vnp_Command: "pay",
        vnp_TmnCode: VNPAY_CONFIG.tmnCode,
        vnp_Amount: Math.round(amount * 100), // Convert to cents
        vnp_CurrCode: "VND",
        vnp_TxnRef: orderId,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: "other",
        vnp_Locale: "vn",
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr: "127.0.0.1",
        vnp_CreateDate: new Date()
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}/, ""),
      };

      // Sort parameters
      const sortedParams = Object.keys(vnpParams)
        .sort()
        .reduce((result, key) => {
          result[key] = vnpParams[key];
          return result;
        }, {});

      // Create query string
      const queryString = Object.keys(sortedParams)
        .map((key) => `${key}=${encodeURIComponent(sortedParams[key])}`)
        .join("&");

      // Create secure hash
      const secureHash = crypto
        .createHmac("sha512", VNPAY_CONFIG.hashSecret)
        .update(queryString)
        .digest("hex");

      const paymentUrl = `${VNPAY_CONFIG.url}?${queryString}&vnp_SecureHash=${secureHash}`;

      logPayment("vnpay_payment_url_created", null, amount, "VND", {
        orderId,
        orderInfo,
      });

      return {
        success: true,
        paymentUrl,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      };
    } catch (error) {
      logError(error);
      return { success: false, error: error.message };
    }
  },

  // Verify payment callback
  verifyPaymentCallback(queryParams) {
    try {
      const { vnp_SecureHash, ...otherParams } = queryParams;

      // Sort parameters
      const sortedParams = Object.keys(otherParams)
        .sort()
        .reduce((result, key) => {
          result[key] = otherParams[key];
          return result;
        }, {});

      // Create query string
      const queryString = Object.keys(sortedParams)
        .map((key) => `${key}=${encodeURIComponent(sortedParams[key])}`)
        .join("&");

      // Create secure hash
      const secureHash = crypto
        .createHmac("sha512", VNPAY_CONFIG.hashSecret)
        .update(queryString)
        .digest("hex");

      const isValid = secureHash === vnp_SecureHash;
      const isSuccess = otherParams.vnp_ResponseCode === "00";

      if (isValid && isSuccess) {
        logPayment(
          "vnpay_payment_verified",
          null,
          parseFloat(otherParams.vnp_Amount) / 100,
          "VND",
          {
            orderId: otherParams.vnp_TxnRef,
            transactionNo: otherParams.vnp_TransactionNo,
          }
        );
      }

      return {
        success: isValid && isSuccess,
        isValid,
        isSuccess,
        data: otherParams,
      };
    } catch (error) {
      logError(error);
      return { success: false, error: error.message };
    }
  },
};

// MoMo payment methods
export const momoService = {
  // Create payment request
  async createPaymentRequest(amount, orderInfo, orderId, returnUrl) {
    try {
      const requestId = Date.now().toString();
      const orderId_momo = orderId;
      const orderInfo_momo = orderInfo;
      const amount_momo = amount;
      const ipnUrl = process.env.MOMO_IPN_URL;
      const redirectUrl = returnUrl;
      const extraData = "";

      // Create signature
      const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount_momo}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId_momo}&orderInfo=${orderInfo_momo}&partnerCode=${MOMO_CONFIG.partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=captureWallet`;

      const signature = crypto
        .createHmac("sha256", MOMO_CONFIG.secretKey)
        .update(rawSignature)
        .digest("hex");

      const requestBody = {
        partnerCode: MOMO_CONFIG.partnerCode,
        accessKey: MOMO_CONFIG.accessKey,
        requestId,
        amount: amount_momo,
        orderId: orderId_momo,
        orderInfo: orderInfo_momo,
        redirectUrl,
        ipnUrl,
        extraData,
        requestType: "captureWallet",
        signature,
        lang: "vi",
      };

      const response = await axios.post(MOMO_CONFIG.endpoint, requestBody, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data.resultCode === 0) {
        logPayment("momo_payment_request_created", null, amount, "VND", {
          orderId,
          requestId,
        });

        return {
          success: true,
          paymentUrl: response.data.payUrl,
          requestId,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        };
      } else {
        return {
          success: false,
          error: response.data.message,
        };
      }
    } catch (error) {
      logError(error);
      return { success: false, error: error.message };
    }
  },

  // Verify payment callback
  async verifyPaymentCallback(queryParams) {
    try {
      const {
        requestId,
        orderId,
        resultCode,
        amount,
        orderInfo,
        orderType,
        transId,
        payType,
        signature,
      } = queryParams;

      // Create signature for verification
      const rawSignature = `accessKey=${MOMO_CONFIG.accessKey}&amount=${amount}&extraData=&message=&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${MOMO_CONFIG.partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=&resultCode=${resultCode}&transId=${transId}`;

      const expectedSignature = crypto
        .createHmac("sha256", MOMO_CONFIG.secretKey)
        .update(rawSignature)
        .digest("hex");

      const isValid = signature === expectedSignature;
      const isSuccess = resultCode === "0";

      if (isValid && isSuccess) {
        logPayment("momo_payment_verified", null, parseFloat(amount), "VND", {
          orderId,
          transId,
          requestId,
        });
      }

      return {
        success: isValid && isSuccess,
        isValid,
        isSuccess,
        data: queryParams,
      };
    } catch (error) {
      logError(error);
      return { success: false, error: error.message };
    }
  },
};

// Unified payment service
export const paymentService = {
  // Create payment
  async createPayment(
    provider,
    amount,
    currency,
    orderInfo,
    orderId,
    returnUrl,
    metadata = {}
  ) {
    switch (provider.toLowerCase()) {
      case "stripe":
        return await stripeService.createPaymentIntent(
          amount,
          currency,
          metadata
        );

      case "paypal":
        return await paypalService.createPayment(
          amount,
          currency,
          orderInfo,
          returnUrl,
          returnUrl.replace("return", "cancel")
        );

      case "vnpay":
        return vnpayService.createPaymentUrl(
          amount,
          orderInfo,
          orderId,
          returnUrl
        );

      case "momo":
        return await momoService.createPaymentRequest(
          amount,
          orderInfo,
          orderId,
          returnUrl
        );

      default:
        return { success: false, error: "Unsupported payment provider" };
    }
  },

  // Verify payment
  async verifyPayment(provider, data) {
    switch (provider.toLowerCase()) {
      case "stripe":
        return await stripeService.confirmPayment(data.paymentIntentId);

      case "paypal":
        return await paypalService.executePayment(data.paymentId, data.payerId);

      case "vnpay":
        return vnpayService.verifyPaymentCallback(data);

      case "momo":
        return await momoService.verifyPaymentCallback(data);

      default:
        return { success: false, error: "Unsupported payment provider" };
    }
  },

  // Create refund
  async createRefund(provider, paymentId, amount = null) {
    switch (provider.toLowerCase()) {
      case "stripe":
        return await stripeService.createRefund(paymentId, amount);

      case "paypal":
        // PayPal refund implementation would go here
        return { success: false, error: "PayPal refund not implemented" };

      default:
        return {
          success: false,
          error: "Refund not supported for this provider",
        };
    }
  },

  // Get supported providers
  getSupportedProviders() {
    return [
      {
        id: "stripe",
        name: "Stripe",
        currencies: ["USD", "EUR", "GBP"],
        icon: "/icons/stripe.png",
      },
      {
        id: "paypal",
        name: "PayPal",
        currencies: ["USD", "EUR", "GBP"],
        icon: "/icons/paypal.png",
      },
      {
        id: "vnpay",
        name: "VNPay",
        currencies: ["VND"],
        icon: "/icons/vnpay.png",
      },
      {
        id: "momo",
        name: "MoMo",
        currencies: ["VND"],
        icon: "/icons/momo.png",
      },
    ];
  },
};

export default paymentService;
