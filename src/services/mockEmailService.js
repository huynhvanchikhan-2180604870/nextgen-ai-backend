import { logAuth, logError } from "../config/logger.js";

// Mock Email Service for development without real email credentials
export const mockEmailService = {
  // Send OTP email
  async sendOTPEmail(email, otp) {
    try {
      logAuth.info("Mock OTP email sent", { email, otp });

      console.log(`📧 Mock OTP Email sent to: ${email}`);
      console.log(`🔐 OTP Code: ${otp}`);
      console.log(`⏰ Expires in: 10 minutes`);

      return {
        success: true,
        messageId: `mock-${Date.now()}`,
        message: "OTP email sent successfully (mock)",
      };
    } catch (error) {
      logError.error("Mock OTP email failed", { error: error.message, email });
      return {
        success: false,
        error: "Failed to send OTP email",
      };
    }
  },

  // Send welcome email
  async sendWelcomeEmail(email, name) {
    try {
      logAuth.info("Mock welcome email sent", { email, name });

      console.log(`📧 Mock Welcome Email sent to: ${email}`);
      console.log(`👋 Welcome ${name}!`);
      console.log(`🚀 Your account is ready to explore the Tech Universe!`);

      return {
        success: true,
        messageId: `mock-welcome-${Date.now()}`,
        message: "Welcome email sent successfully (mock)",
      };
    } catch (error) {
      logError.error("Mock welcome email failed", {
        error: error.message,
        email,
      });
      return {
        success: false,
        error: "Failed to send welcome email",
      };
    }
  },

  // Send password reset email
  async sendPasswordResetEmail(email, resetToken) {
    try {
      logAuth.info("Mock password reset email sent", { email });

      console.log(`📧 Mock Password Reset Email sent to: ${email}`);
      console.log(
        `🔗 Reset Link: http://localhost:3000/reset-password?token=${resetToken}`
      );
      console.log(`⏰ Expires in: 1 hour`);

      return {
        success: true,
        messageId: `mock-reset-${Date.now()}`,
        message: "Password reset email sent successfully (mock)",
      };
    } catch (error) {
      logError.error("Mock password reset email failed", {
        error: error.message,
        email,
      });
      return {
        success: false,
        error: "Failed to send password reset email",
      };
    }
  },

  // Send project update email
  async sendProjectUpdateEmail(email, projectName, updateType) {
    try {
      logAuth.info("Mock project update email sent", {
        email,
        projectName,
        updateType,
      });

      console.log(`📧 Mock Project Update Email sent to: ${email}`);
      console.log(`📁 Project: ${projectName}`);
      console.log(`🔄 Update Type: ${updateType}`);

      return {
        success: true,
        messageId: `mock-update-${Date.now()}`,
        message: "Project update email sent successfully (mock)",
      };
    } catch (error) {
      logError.error("Mock project update email failed", {
        error: error.message,
        email,
      });
      return {
        success: false,
        error: "Failed to send project update email",
      };
    }
  },

  // Send purchase confirmation email
  async sendPurchaseConfirmationEmail(email, orderDetails) {
    try {
      logAuth.info("Mock purchase confirmation email sent", {
        email,
        orderId: orderDetails.orderId,
      });

      console.log(`📧 Mock Purchase Confirmation Email sent to: ${email}`);
      console.log(`🛒 Order ID: ${orderDetails.orderId}`);
      console.log(`💰 Total: $${orderDetails.total}`);
      console.log(`📦 Items: ${orderDetails.items.length} projects`);

      return {
        success: true,
        messageId: `mock-purchase-${Date.now()}`,
        message: "Purchase confirmation email sent successfully (mock)",
      };
    } catch (error) {
      logError.error("Mock purchase confirmation email failed", {
        error: error.message,
        email,
      });
      return {
        success: false,
        error: "Failed to send purchase confirmation email",
      };
    }
  },

  // Send payment success email
  async sendPaymentSuccessEmail(email, paymentDetails) {
    try {
      logAuth.info("Mock payment success email sent", {
        email,
        amount: paymentDetails.amount,
      });

      console.log(`📧 Mock Payment Success Email sent to: ${email}`);
      console.log(`💰 Amount: $${paymentDetails.amount}`);
      console.log(`💳 Method: ${paymentDetails.method}`);
      console.log(`🆔 Transaction ID: ${paymentDetails.transactionId}`);

      return {
        success: true,
        messageId: `mock-payment-success-${Date.now()}`,
        message: "Payment success email sent successfully (mock)",
      };
    } catch (error) {
      logError.error("Mock payment success email failed", {
        error: error.message,
        email,
      });
      return {
        success: false,
        error: "Failed to send payment success email",
      };
    }
  },

  // Send payment failed email
  async sendPaymentFailedEmail(email, paymentDetails) {
    try {
      logAuth.info("Mock payment failed email sent", {
        email,
        amount: paymentDetails.amount,
      });

      console.log(`📧 Mock Payment Failed Email sent to: ${email}`);
      console.log(`💰 Amount: $${paymentDetails.amount}`);
      console.log(`💳 Method: ${paymentDetails.method}`);
      console.log(
        `❌ Reason: ${paymentDetails.reason || "Payment processing failed"}`
      );

      return {
        success: true,
        messageId: `mock-payment-failed-${Date.now()}`,
        message: "Payment failed email sent successfully (mock)",
      };
    } catch (error) {
      logError.error("Mock payment failed email failed", {
        error: error.message,
        email,
      });
      return {
        success: false,
        error: "Failed to send payment failed email",
      };
    }
  },

  // Send AI plan ready email
  async sendAIPlanReadyEmail(email, planDetails) {
    try {
      logAuth.info("Mock AI plan ready email sent", {
        email,
        planId: planDetails.planId,
      });

      console.log(`📧 Mock AI Plan Ready Email sent to: ${email}`);
      console.log(`🤖 Plan ID: ${planDetails.planId}`);
      console.log(`📋 Project: ${planDetails.projectName}`);
      console.log(`⏱️ Estimated Time: ${planDetails.estimatedTime}`);

      return {
        success: true,
        messageId: `mock-ai-plan-${Date.now()}`,
        message: "AI plan ready email sent successfully (mock)",
      };
    } catch (error) {
      logError.error("Mock AI plan ready email failed", {
        error: error.message,
        email,
      });
      return {
        success: false,
        error: "Failed to send AI plan ready email",
      };
    }
  },

  // Send system announcement email
  async sendSystemAnnouncementEmail(email, announcement) {
    try {
      logAuth.info("Mock system announcement email sent", {
        email,
        title: announcement.title,
      });

      console.log(`📧 Mock System Announcement Email sent to: ${email}`);
      console.log(`📢 Title: ${announcement.title}`);
      console.log(`📝 Content: ${announcement.content.substring(0, 100)}...`);

      return {
        success: true,
        messageId: `mock-announcement-${Date.now()}`,
        message: "System announcement email sent successfully (mock)",
      };
    } catch (error) {
      logError.error("Mock system announcement email failed", {
        error: error.message,
        email,
      });
      return {
        success: false,
        error: "Failed to send system announcement email",
      };
    }
  },

  // Send bulk email
  async sendBulkEmail(recipients, subject, content) {
    try {
      logAuth.info("Mock bulk email sent", {
        recipientCount: recipients.length,
        subject,
      });

      console.log(`📧 Mock Bulk Email sent to ${recipients.length} recipients`);
      console.log(`📋 Subject: ${subject}`);
      console.log(`📝 Content: ${content.substring(0, 100)}...`);

      return {
        success: true,
        messageId: `mock-bulk-${Date.now()}`,
        message: `Bulk email sent successfully to ${recipients.length} recipients (mock)`,
      };
    } catch (error) {
      logError.error("Mock bulk email failed", {
        error: error.message,
        recipientCount: recipients.length,
      });
      return {
        success: false,
        error: "Failed to send bulk email",
      };
    }
  },

  // Send email verification
  async sendEmailVerification(email, verificationToken) {
    try {
      logAuth.info("Mock email verification sent", { email });

      console.log(`📧 Mock Email Verification sent to: ${email}`);
      console.log(
        `🔗 Verification Link: http://localhost:3000/verify-email?token=${verificationToken}`
      );
      console.log(`⏰ Expires in: 24 hours`);

      return {
        success: true,
        messageId: `mock-verification-${Date.now()}`,
        message: "Email verification sent successfully (mock)",
      };
    } catch (error) {
      logError.error("Mock email verification failed", {
        error: error.message,
        email,
      });
      return {
        success: false,
        error: "Failed to send email verification",
      };
    }
  },
};
