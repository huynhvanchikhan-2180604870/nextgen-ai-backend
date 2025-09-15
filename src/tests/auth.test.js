import request from "supertest";
import { connectDB, disconnectDB } from "../config/database.js";
import User from "../models/User.js";
import app from "../server.js";

describe("Authentication API", () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data.verificationRequired).toBe(true);
    });

    it("should not register user with invalid email", async () => {
      const userData = {
        email: "invalid-email",
        password: "password123",
        fullName: "Test User",
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Validation failed");
    });

    it("should not register user with short password", async () => {
      const userData = {
        email: "test@example.com",
        password: "123",
        fullName: "Test User",
      };

      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it("should not register duplicate email", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
      };

      // Register first user
      await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post("/api/v1/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("User already exists with this email");
    });
  });

  describe("POST /api/v1/auth/verify-otp", () => {
    it("should verify OTP successfully", async () => {
      // First register a user
      const userData = {
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
      };

      await request(app).post("/api/v1/auth/register").send(userData);

      // Get the user and their OTP
      const user = await User.findOne({ email: userData.email });
      const otp = user.otpCode;

      const response = await request(app)
        .post("/api/v1/auth/verify-otp")
        .send({
          email: userData.email,
          otp: otp,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.verified).toBe(true);
    });

    it("should not verify with invalid OTP", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
      };

      await request(app).post("/api/v1/auth/register").send(userData);

      const response = await request(app)
        .post("/api/v1/auth/verify-otp")
        .send({
          email: userData.email,
          otp: "000000",
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid or expired OTP");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    beforeEach(async () => {
      // Create a verified user
      const user = new User({
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
        verified: true,
      });
      await user.save();
    });

    it("should login successfully with valid credentials", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "test@example.com",
          password: "password123",
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.email).toBe("test@example.com");
    });

    it("should not login with invalid password", async () => {
      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "test@example.com",
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid credentials");
    });

    it("should not login with unverified email", async () => {
      // Create unverified user
      const user = new User({
        email: "unverified@example.com",
        password: "password123",
        fullName: "Unverified User",
        verified: false,
      });
      await user.save();

      const response = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "unverified@example.com",
          password: "password123",
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Please verify your email address first"
      );
    });
  });
});
