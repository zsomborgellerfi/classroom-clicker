import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { UserRole } from "../enums/userRole";

// Mock Prisma before importing app
const mockPrismaInstance = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  class: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  lesson: {
    count: jest.fn(),
  },
  quiz: {
    count: jest.fn(),
  },
};

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrismaInstance),
}));
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
jest.mock("../services/email.service", () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

import app from "../app";

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;

describe("Auth Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

  describe("POST /api/auth/register", () => {
    it("registers a new user successfully", async () => {
      const userData = {
        email: "newuser@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue("hashed-password" as never);
      mockPrismaInstance.user.create.mockResolvedValue({
        id: "user-123",
        ...userData,
        role: UserRole.STUDENT,
        externalId: null,
      } as never);
      mockedJwt.sign.mockReturnValue("jwt-token" as never);

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user.email).toBe(userData.email);
    });

    it("returns 400 for invalid email", async () => {
      const userData = {
        email: "invalid-email",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("returns 400 if user already exists", async () => {
      const userData = {
        email: "existing@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue({
        id: "existing-user",
        email: "existing@example.com",
      } as never);

      const response = await request(app)
        .post("/api/auth/register")
        .send(userData)
        .expect(400);

      expect(response.body.error).toBe("User already exists");
    });
  });

  describe("POST /api/auth/login", () => {
    it("logs in user successfully", async () => {
      const loginData = {
        email: "user@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "user-123",
        email: "user@example.com",
        password: "hashed-password",
        firstName: "John",
        lastName: "Doe",
        role: UserRole.STUDENT,
        externalId: null,
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(mockUser as never);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedJwt.sign.mockReturnValue("jwt-token" as never);

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty("token");
      expect(response.body).toHaveProperty("user");
    });

    it("returns 401 for invalid credentials", async () => {
      const loginData = {
        email: "user@example.com",
        password: "wrong-password",
      };

      const mockUser = {
        id: "user-123",
        email: "user@example.com",
        password: "hashed-password",
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(mockUser as never);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      const response = await request(app)
        .post("/api/auth/login")
        .send(loginData)
        .expect(401);

      expect(response.body.error).toBe("Invalid credentials");
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns current user information", async () => {
      const mockUser = {
        id: "user-123",
        email: "user@example.com",
        firstName: "John",
        lastName: "Doe",
        role: UserRole.STUDENT,
        externalId: null,
        createdAt: new Date(),
      };

      mockedJwt.verify.mockReturnValue({
        id: "user-123",
        email: "user@example.com",
        role: UserRole.STUDENT,
      } as never);
      mockPrismaInstance.user.findUnique.mockResolvedValue(mockUser as never);

      const response = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer valid-token")
        .expect(200);

      expect(response.body.email).toBe("user@example.com");
    });

    it("returns 401 without token", async () => {
      const response = await request(app).get("/api/auth/me").expect(401);

      expect(response.body.error).toBe("Authentication required");
    });
  });

  describe("POST /api/auth/password/forgot", () => {
    it("sends password reset email", async () => {
      const mockUser = {
        id: "user-123",
        email: "user@example.com",
        firstName: "John",
        lastName: "Doe",
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(mockUser as never);
      mockPrismaInstance.user.update.mockResolvedValue({} as never);

      const response = await request(app)
        .post("/api/auth/password/forgot")
        .send({ email: "user@example.com" })
        .expect(200);

      expect(response.body).toHaveProperty("message");
    });
  });

  describe("POST /api/auth/password/reset", () => {
    it("resets password successfully", async () => {
      const resetData = {
        token: "valid-reset-token",
        password: "newpassword123",
      };

      const mockUser = {
        id: "user-123",
        passwordResetToken: "valid-reset-token",
        passwordResetExpires: new Date(Date.now() + 3600000),
      };

      mockPrismaInstance.user.findFirst.mockResolvedValue(mockUser as never);
      mockedBcrypt.hash.mockResolvedValue("new-hashed-password" as never);
      mockPrismaInstance.user.update.mockResolvedValue({} as never);

      const response = await request(app)
        .post("/api/auth/password/reset")
        .send(resetData)
        .expect(200);

      expect(response.body.message).toBe("Password reset successful");
    });

    it("returns 400 for invalid token", async () => {
      mockPrismaInstance.user.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/auth/password/reset")
        .send({
          token: "invalid-token",
          password: "newpassword123",
        })
        .expect(400);

      expect(response.body.error).toBe("Invalid or expired token");
    });
  });
});

