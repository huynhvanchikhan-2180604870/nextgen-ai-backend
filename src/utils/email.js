import nodemailer from "nodemailer";

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Send OTP email
export const sendOTPEmail = async (email, otp, fullName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || "NextGenAI <noreply@nextgenai.com>",
      to: email,
      subject: "🔐 NextGenAI - Xác thực OTP",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Xác thực OTP - NextGenAI</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { color: #00ff88; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 15px; padding: 30px; border: 1px solid rgba(255, 255, 255, 0.2); }
            .otp-code { background: linear-gradient(45deg, #00ff88, #00d4ff); color: #000; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; border-radius: 10px; margin: 20px 0; letter-spacing: 5px; }
            .warning { background: rgba(255, 193, 7, 0.2); border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0; color: #ffc107; }
            .footer { text-align: center; margin-top: 30px; color: #888; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🌌 NextGenAI</div>
              <h2 style="color: #fff; margin: 0;">Chào mừng đến với Tech Universe!</h2>
            </div>
            
            <div class="card">
              <h3 style="color: #00ff88; margin-top: 0;">Xin chào ${fullName}!</h3>
              <p style="color: #fff; line-height: 1.6;">
                Cảm ơn bạn đã đăng ký tài khoản NextGenAI. Để hoàn tất quá trình đăng ký, 
                vui lòng sử dụng mã OTP bên dưới:
              </p>
              
              <div class="otp-code">${otp}</div>
              
              <div class="warning">
                <strong>⚠️ Lưu ý quan trọng:</strong><br>
                • Mã OTP này có hiệu lực trong 5 phút<br>
                • Không chia sẻ mã này với bất kỳ ai<br>
                • Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này
              </div>
              
              <p style="color: #fff; line-height: 1.6;">
                Sau khi xác thực thành công, bạn sẽ có thể truy cập vào vũ trụ công nghệ 
                và khám phá những dự án tuyệt vời!
              </p>
            </div>
            
            <div class="footer">
              <p>© 2024 NextGenAI. Tất cả quyền được bảo lưu.</p>
              <p>Email này được gửi tự động, vui lòng không trả lời.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("OTP email sent successfully:", result.messageId);
    return result;
  } catch (error) {
    console.error("Error sending OTP email:", error);
    throw new Error("Failed to send OTP email");
  }
};

// Send welcome email
export const sendWelcomeEmail = async (email, fullName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || "NextGenAI <noreply@nextgenai.com>",
      to: email,
      subject: "🎉 Chào mừng đến với NextGenAI!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Chào mừng - NextGenAI</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { color: #00ff88; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 15px; padding: 30px; border: 1px solid rgba(255, 255, 255, 0.2); }
            .cta-button { display: inline-block; background: linear-gradient(45deg, #00ff88, #00d4ff); color: #000; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #888; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🌌 NextGenAI</div>
              <h2 style="color: #fff; margin: 0;">Chào mừng đến với Tech Universe!</h2>
            </div>
            
            <div class="card">
              <h3 style="color: #00ff88; margin-top: 0;">Xin chào ${fullName}!</h3>
              <p style="color: #fff; line-height: 1.6;">
                Chúc mừng! Tài khoản của bạn đã được xác thực thành công. 
                Bây giờ bạn có thể khám phá vũ trụ công nghệ NextGenAI!
              </p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}" class="cta-button">
                  🚀 Khám phá ngay
                </a>
              </div>
              
              <h4 style="color: #00ff88;">Những gì bạn có thể làm:</h4>
              <ul style="color: #fff; line-height: 1.8;">
                <li>🛍️ Khám phá và mua source code chất lượng cao</li>
                <li>🤖 Sử dụng AI Planner để lập kế hoạch dự án</li>
                <li>💎 Quản lý vault cá nhân với các dự án đã mua</li>
                <li>⭐ Lưu dự án yêu thích</li>
                <li>💰 Quản lý ví và giao dịch</li>
              </ul>
            </div>
            
            <div class="footer">
              <p>© 2024 NextGenAI. Tất cả quyền được bảo lưu.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Welcome email sent successfully:", result.messageId);
    return result;
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw new Error("Failed to send welcome email");
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken, fullName) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || "NextGenAI <noreply@nextgenai.com>",
      to: email,
      subject: "🔒 NextGenAI - Đặt lại mật khẩu",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Đặt lại mật khẩu - NextGenAI</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { color: #00ff88; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .card { background: rgba(255, 255, 255, 0.1); backdrop-filter: blur(10px); border-radius: 15px; padding: 30px; border: 1px solid rgba(255, 255, 255, 0.2); }
            .cta-button { display: inline-block; background: linear-gradient(45deg, #ff6b6b, #ffa500); color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
            .warning { background: rgba(255, 107, 107, 0.2); border: 1px solid #ff6b6b; border-radius: 8px; padding: 15px; margin: 20px 0; color: #ff6b6b; }
            .footer { text-align: center; margin-top: 30px; color: #888; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🌌 NextGenAI</div>
              <h2 style="color: #fff; margin: 0;">Đặt lại mật khẩu</h2>
            </div>
            
            <div class="card">
              <h3 style="color: #00ff88; margin-top: 0;">Xin chào ${fullName}!</h3>
              <p style="color: #fff; line-height: 1.6;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. 
                Nhấp vào nút bên dưới để tạo mật khẩu mới:
              </p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="cta-button">
                  🔒 Đặt lại mật khẩu
                </a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Lưu ý bảo mật:</strong><br>
                • Link này có hiệu lực trong 1 giờ<br>
                • Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này<br>
                • Không chia sẻ link này với bất kỳ ai
              </div>
            </div>
            
            <div class="footer">
              <p>© 2024 NextGenAI. Tất cả quyền được bảo lưu.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent successfully:", result.messageId);
    return result;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};
