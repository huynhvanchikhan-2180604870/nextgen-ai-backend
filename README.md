# 🚀 NextGenAI API

Backend API cho NextGenAI - Nền tảng bán mã nguồn và AI Planner hàng đầu.

## ✨ Tính năng chính

### 🔐 Authentication & Authorization

- Đăng ký/Đăng nhập với OTP verification
- Social login (Google, GitHub)
- JWT token authentication
- Role-based access control (User, Author, Admin)
- Password reset functionality

### 🛒 Marketplace

- Quản lý dự án (CRUD operations)
- Tìm kiếm và lọc dự án
- Đánh giá và review system
- Featured projects
- Project analytics

### 🤖 AI Planner

- Tạo kế hoạch dự án thông minh
- Chat với AI về dự án
- Phân tích độ phức tạp
- Đề xuất công nghệ phù hợp
- Real-time WebSocket communication

### 💰 Payment System

- Hỗ trợ nhiều payment gateway:
  - Stripe (USD, EUR, GBP)
  - PayPal
  - VNPay (VND)
  - MoMo (VND)
- Wallet system
- Transaction history
- Refund processing

### 📧 Email Service

- OTP verification emails
- Welcome emails
- Purchase confirmations
- Newsletter system
- System announcements

### 🔒 Security Features

- Rate limiting
- Data sanitization
- XSS protection
- CSRF protection
- Brute force protection
- Security headers

### 📊 Monitoring & Logging

- Comprehensive logging system
- Performance monitoring
- Error tracking
- Health checks
- Analytics

## 🛠️ Tech Stack

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Memory Cache** - In-memory caching & sessions
- **Socket.IO** - Real-time communication

### Authentication & Security

- **JWT** - Token-based authentication
- **bcryptjs** - Password hashing
- **Helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **express-mongo-sanitize** - NoSQL injection protection

### AI & Machine Learning

- **Google Gemini** - AI project planning and chat functionality
- **Natural language processing** - Advanced AI capabilities

### Payment Processing

- **Stripe** - International payments
- **PayPal** - Global payments
- **VNPay** - Vietnamese payments
- **MoMo** - Mobile payments

### File Management

- **Cloudinary** - Image/video storage
- **Multer** - File upload handling
- **Sharp** - Image processing

### Email & Communication

- **Nodemailer** - Email sending
- **Handlebars** - Email templates
- **Socket.IO** - Real-time notifications

### Development & Testing

- **Jest** - Testing framework
- **Supertest** - API testing
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Swagger** - API documentation

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **MongoDB** 5.0+
- **Memory Cache** (built-in, no external service needed)
- **Git**

### Installation

1. **Clone repository**

```bash
git clone https://github.com/your-username/nextgen-ai-api.git
cd nextgen-ai-api
```

2. **Install dependencies**

```bash
npm install
```

3. **Environment setup**

```bash
cp .env.example .env
# Cấu hình các biến môi trường trong file .env
```

4. **Database setup**

```bash
# Khởi động MongoDB
# Khởi động Redis (optional)
```

5. **Seed database (optional)**

```bash
npm run seed
```

6. **Start development server**

```bash
npm run dev
```

### Environment Variables

Tạo file `.env` từ `.env.example` và cấu hình:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/nextgen-ai

# Memory Cache (no configuration needed)

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# AI Configuration
GEMINI_API_KEY=AIzaSyABoPIFxN29VegcjENIiwJ1-Z9fv21hiBg

# Payment Gateways
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_CLIENT_ID=your-paypal-client-id
VNPAY_TMN_CODE=your-vnpay-code
MOMO_PARTNER_CODE=your-momo-code

# File Upload
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## 📚 API Documentation

### Swagger Documentation

Truy cập `/api-docs` khi server đang chạy để xem API documentation đầy đủ.

### Main Endpoints

#### Authentication

- `POST /api/v1/auth/register` - Đăng ký user
- `POST /api/v1/auth/verify-otp` - Xác thực OTP
- `POST /api/v1/auth/login` - Đăng nhập
- `POST /api/v1/auth/refresh-token` - Refresh token
- `POST /api/v1/auth/logout` - Đăng xuất

#### Projects

- `GET /api/v1/projects` - Lấy danh sách dự án
- `GET /api/v1/projects/featured` - Dự án nổi bật
- `GET /api/v1/projects/:id` - Chi tiết dự án
- `POST /api/v1/projects` - Tạo dự án mới
- `PUT /api/v1/projects/:id` - Cập nhật dự án
- `DELETE /api/v1/projects/:id` - Xóa dự án

#### AI Planner

- `POST /api/v1/ai-planner/sessions` - Tạo AI session
- `GET /api/v1/ai-planner/sessions` - Lấy danh sách sessions
- `GET /api/v1/ai-planner/sessions/:id` - Chi tiết session
- `POST /api/v1/ai-planner/sessions/:id/message` - Gửi tin nhắn

#### Wallet & Payment

- `GET /api/v1/wallet/balance` - Số dư ví
- `POST /api/v1/wallet/topup` - Nạp tiền
- `GET /api/v1/wallet/transactions` - Lịch sử giao dịch
- `POST /api/v1/wallet/payment` - Thanh toán

#### User Management

- `GET /api/v1/user/profile` - Thông tin user
- `PUT /api/v1/user/profile` - Cập nhật profile
- `GET /api/v1/user/vault` - Dự án đã mua
- `GET /api/v1/user/favorites` - Dự án yêu thích

## 🧪 Testing

### Run Tests

```bash
# Chạy tất cả tests
npm test

# Chạy tests với coverage
npm run test:coverage

# Chạy tests cụ thể
npm run test:auth
npm run test:projects

# Watch mode
npm run test:watch
```

### Test Structure

```
src/tests/
├── setup.js          # Test setup
├── auth.test.js      # Authentication tests
├── projects.test.js  # Projects tests
└── ...
```

## 🐳 Docker Deployment

### Build & Run

```bash
# Build image
npm run docker:build

# Run container
npm run docker:run

# Docker Compose
npm run docker:compose
```

### Docker Compose Services

- **API Server** - Node.js application
- **MongoDB** - Database
- **Memory Cache** - In-memory cache & sessions
- **Nginx** - Reverse proxy

## 📊 Monitoring & Logging

### Log Files

- `logs/error-*.log` - Error logs
- `logs/combined-*.log` - All logs
- `logs/http-*.log` - HTTP requests
- `logs/api-*.log` - API requests
- `logs/auth-*.log` - Authentication events
- `logs/payments-*.log` - Payment transactions
- `logs/ai-*.log` - AI operations

### Health Checks

- `GET /health` - Server health
- Database connection check
- Memory cache status check
- External service status

## 🔧 Development

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database Management

```bash
# Seed sample data
npm run seed

# Reset database
npm run db:reset
```

## 🚀 Production Deployment

### Environment Setup

1. Set `NODE_ENV=production`
2. Configure production database
3. Configure payment gateways
4. Set up email service
5. Configure file storage
6. Set up monitoring

### Performance Optimization

- Enable memory caching
- Configure CDN for static files
- Set up load balancing
- Enable compression
- Configure rate limiting
- Set up monitoring

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

- **Email**: support@nextgenai.com
- **Documentation**: [API Docs](http://localhost:5000/api-docs)
- **Issues**: [GitHub Issues](https://github.com/your-username/nextgen-ai-api/issues)

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- MongoDB for database
- Express.js community
- All contributors and users

---

**NextGenAI** - Nền tảng mã nguồn và AI Planner hàng đầu! 🚀
