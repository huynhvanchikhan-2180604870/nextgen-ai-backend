import { create } from "express-handlebars";
import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";
import { logError } from "../config/logger.js";
import { mockEmailService } from "./mockEmailService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we have real email credentials
const hasRealEmailCredentials =
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASS &&
  process.env.EMAIL_USER !== "test@gmail.com" &&
  process.env.EMAIL_PASS !== "test-password";

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Setup Handlebars for email templates
const hbs = create({
  extname: ".hbs",
  layoutsDir: path.join(__dirname, "../templates/email/layouts"),
  partialsDir: path.join(__dirname, "../templates/email/partials"),
  defaultLayout: "main",
});

// Email templates
const templates = {
  welcome: "welcome",
  otp: "otp",
  passwordReset: "password-reset",
  projectUpdate: "project-update",
  purchaseConfirmation: "purchase-confirmation",
  paymentSuccess: "payment-success",
  paymentFailed: "payment-failed",
  aiPlanReady: "ai-plan-ready",
  newsletter: "newsletter",
  systemAnnouncement: "system-announcement",
};

// Send email with template
export const sendEmail = async (to, subject, template, data = {}) => {
  try {
    const transporter = createTransporter();

    // Render email template
    const html = await hbs.render(
      path.join(__dirname, `../templates/email/${template}.hbs`),
      {
        ...data,
        year: new Date().getFullYear(),
        appName: "NextGenAI",
        appUrl: process.env.FRONTEND_URL,
        supportEmail: process.env.SUPPORT_EMAIL || "support@nextgenai.com",
      }
    );

    const mailOptions = {
      from: {
        name: "NextGenAI",
        address: process.env.EMAIL_FROM || "noreply@nextgenai.com",
      },
      to,
      subject,
      html,
      text: data.textContent || "", // Fallback text content
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error("Email sending error:", error);
    logError(error);
    throw new Error("Failed to send email");
  }
};

// Send OTP email
export const sendOTPEmail = async (email, otp, fullName) => {
  // Use mock service if no real email credentials
  if (!hasRealEmailCredentials) {
    return await mockEmailService.sendOTPEmail(email, otp);
  }

  return sendEmail(email, "🔐 NextGenAI - Xác thực OTP", templates.otp, {
    fullName,
    otp,
    textContent: `Mã OTP của bạn là: ${otp}. Mã này có hiệu lực trong 5 phút.`,
  });
};

// Send welcome email
export const sendWelcomeEmail = async (email, fullName) => {
  // Use mock service if no real email credentials
  if (!hasRealEmailCredentials) {
    return await mockEmailService.sendWelcomeEmail(email, fullName);
  }

  return sendEmail(
    email,
    "🎉 Chào mừng đến với NextGenAI!",
    templates.welcome,
    {
      fullName,
      textContent: `Chào mừng ${fullName} đến với NextGenAI! Tài khoản của bạn đã được xác thực thành công.`,
    }
  );
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken, fullName) => {
  const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

  return sendEmail(
    email,
    "🔒 NextGenAI - Đặt lại mật khẩu",
    templates.passwordReset,
    {
      fullName,
      resetUrl,
      textContent: `Để đặt lại mật khẩu, vui lòng truy cập: ${resetUrl}`,
    }
  );
};

// Send project update notification
export const sendProjectUpdateEmail = async (
  email,
  fullName,
  projectTitle,
  version,
  changelog
) => {
  return sendEmail(
    email,
    `📦 ${projectTitle} - Cập nhật phiên bản ${version}`,
    templates.projectUpdate,
    {
      fullName,
      projectTitle,
      version,
      changelog,
      textContent: `Dự án ${projectTitle} đã được cập nhật lên phiên bản ${version}.`,
    }
  );
};

// Send purchase confirmation email
export const sendPurchaseConfirmationEmail = async (
  email,
  fullName,
  projectTitle,
  amount,
  downloadUrl
) => {
  return sendEmail(
    email,
    `✅ NextGenAI - Xác nhận mua hàng`,
    templates.purchaseConfirmation,
    {
      fullName,
      projectTitle,
      amount,
      downloadUrl,
      textContent: `Cảm ơn bạn đã mua ${projectTitle} với giá $${amount}.`,
    }
  );
};

// Send payment success email
export const sendPaymentSuccessEmail = async (
  email,
  fullName,
  amount,
  transactionId
) => {
  return sendEmail(
    email,
    "💰 NextGenAI - Thanh toán thành công",
    templates.paymentSuccess,
    {
      fullName,
      amount,
      transactionId,
      textContent: `Thanh toán $${amount} đã được xử lý thành công. Mã giao dịch: ${transactionId}`,
    }
  );
};

// Send payment failed email
export const sendPaymentFailedEmail = async (
  email,
  fullName,
  amount,
  reason
) => {
  return sendEmail(
    email,
    "❌ NextGenAI - Thanh toán thất bại",
    templates.paymentFailed,
    {
      fullName,
      amount,
      reason,
      textContent: `Thanh toán $${amount} đã thất bại. Lý do: ${reason}`,
    }
  );
};

// Send AI plan ready email
export const sendAIPlanReadyEmail = async (
  email,
  fullName,
  projectName,
  sessionId
) => {
  const planUrl = `${process.env.FRONTEND_URL}/ai-planner/sessions/${sessionId}`;

  return sendEmail(
    email,
    "🤖 NextGenAI - Kế hoạch dự án đã sẵn sàng",
    templates.aiPlanReady,
    {
      fullName,
      projectName,
      planUrl,
      textContent: `Kế hoạch dự án "${projectName}" đã được tạo xong. Truy cập: ${planUrl}`,
    }
  );
};

// Send newsletter email
export const sendNewsletterEmail = async (email, fullName, newsletterData) => {
  return sendEmail(
    email,
    `📰 NextGenAI Newsletter - ${newsletterData.title}`,
    templates.newsletter,
    {
      fullName,
      ...newsletterData,
      textContent: newsletterData.content,
    }
  );
};

// Send system announcement email
export const sendSystemAnnouncementEmail = async (
  email,
  fullName,
  announcement
) => {
  return sendEmail(
    email,
    `📢 NextGenAI - Thông báo hệ thống`,
    templates.systemAnnouncement,
    {
      fullName,
      ...announcement,
      textContent: announcement.content,
    }
  );
};

// Bulk email sending
export const sendBulkEmail = async (
  recipients,
  subject,
  template,
  data = {}
) => {
  const results = [];
  const batchSize = 10; // Send 10 emails at a time

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const promises = batch.map(async (recipient) => {
      try {
        const result = await sendEmail(recipient.email, subject, template, {
          ...data,
          fullName: recipient.fullName,
        });
        return { success: true, email: recipient.email, result };
      } catch (error) {
        return { success: false, email: recipient.email, error: error.message };
      }
    });

    const batchResults = await Promise.all(promises);
    results.push(...batchResults);

    // Wait 1 second between batches to avoid rate limiting
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
};

// Email verification
export const sendEmailVerification = async (
  email,
  fullName,
  verificationToken
) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;

  return sendEmail(
    email,
    "✉️ NextGenAI - Xác thực email",
    templates.otp, // Reuse OTP template
    {
      fullName,
      verificationUrl,
      textContent: `Vui lòng xác thực email của bạn bằng cách truy cập: ${verificationUrl}`,
    }
  );
};

// Email service health check
export const checkEmailService = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { status: "healthy", message: "Email service is working" };
  } catch (error) {
    return { status: "unhealthy", message: error.message };
  }
};

// Email analytics
export const trackEmailEvent = async (email, event, data = {}) => {
  // This would integrate with your analytics service
  console.log(`Email event: ${event} for ${email}`, data);
};

export default {
  sendEmail,
  sendOTPEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendProjectUpdateEmail,
  sendPurchaseConfirmationEmail,
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
  sendAIPlanReadyEmail,
  sendNewsletterEmail,
  sendSystemAnnouncementEmail,
  sendBulkEmail,
  sendEmailVerification,
  checkEmailService,
  trackEmailEvent,
};
