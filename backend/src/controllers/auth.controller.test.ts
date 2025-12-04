import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

import { UserRole } from "../enums/userRole";
import { AuthRequest } from "../types";
import * as emailService from "../services/email.service";

// Mock Prisma before importing the controller
const mockPrismaInstance = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrismaInstance),
}));
jest.mock("bcryptjs");
jest.mock("jsonwebtoken");
jest.mock("../services/email.service");

import authController from "./auth.controller";

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;
const mockedJwt = jwt as jest.Mocked<typeof jwt>;
const mockedEmailService = emailService as jest.Mocked<typeof emailService>;

describe("AuthController", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      body: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe("register", () => {
    it("creates a new user successfully", async () => {
      mockReq.body = {
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue("hashed-password" as never);
      mockPrismaInstance.user.create.mockResolvedValue({
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: UserRole.STUDENT,
        externalId: null,
      } as never);
      mockedJwt.sign.mockReturnValue("jwt-token" as never);

      await authController.register(mockReq as Request, mockRes as Response);

      expect(mockPrismaInstance.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(mockPrismaInstance.user.create).toHaveBeenCalled();
      expect(mockedJwt.sign).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        token: "jwt-token",
        user: expect.objectContaining({
          email: "test@example.com",
          firstName: "John",
          lastName: "Doe",
        }),
      });
    });

    it("returns 400 if user already exists", async () => {
      mockReq.body = {
        email: "existing@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue({
        id: "existing-user",
        email: "existing@example.com",
      } as never);

      await authController.register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "User already exists" });
      expect(mockPrismaInstance.user.create).not.toHaveBeenCalled();
    });

    it("handles errors gracefully", async () => {
      mockReq.body = {
        email: "test@example.com",
        password: "password123",
        firstName: "John",
        lastName: "Doe",
      };

      mockPrismaInstance.user.findUnique.mockRejectedValue(new Error("Database error"));

      await authController.register(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Database error" });
    });
  });

  describe("login", () => {
    it("logs in user with valid credentials", async () => {
      mockReq.body = {
        email: "test@example.com",
        password: "password123",
      };

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed-password",
        firstName: "John",
        lastName: "Doe",
        role: UserRole.STUDENT,
        externalId: null,
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(mockUser as never);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      mockedJwt.sign.mockReturnValue("jwt-token" as never);

      await authController.login(mockReq as Request, mockRes as Response);

      expect(mockPrismaInstance.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(mockedBcrypt.compare).toHaveBeenCalledWith("password123", "hashed-password");
      expect(mockedJwt.sign).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        token: "jwt-token",
        user: expect.objectContaining({
          email: "test@example.com",
        }),
      });
    });

    it("returns 401 if user not found", async () => {
      mockReq.body = {
        email: "nonexistent@example.com",
        password: "password123",
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await authController.login(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Invalid credentials" });
    });

    it("returns 401 if password is invalid", async () => {
      mockReq.body = {
        email: "test@example.com",
        password: "wrong-password",
      };

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        password: "hashed-password",
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(mockUser as never);
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await authController.login(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Invalid credentials" });
    });
  });

  describe("me", () => {
    it("returns current user information", async () => {
      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
        role: UserRole.STUDENT,
        externalId: null,
        createdAt: new Date(),
      };

      const mockAuthReq = {
        user: {
          id: "user-123",
          email: "test@example.com",
          role: UserRole.STUDENT,
        },
      } as AuthRequest;

      mockPrismaInstance.user.findUnique.mockResolvedValue(mockUser as never);

      await authController.me(mockAuthReq, mockRes as Response);

      expect(mockPrismaInstance.user.findUnique).toHaveBeenCalledWith({
        where: { id: "user-123" },
        select: expect.any(Object),
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockUser);
    });

    it("returns 401 if user is not authenticated", async () => {
      const mockAuthReq = {} as AuthRequest;

      await authController.me(mockAuthReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Authentication required" });
    });

    it("returns 404 if user not found", async () => {
      const mockAuthReq = {
        user: {
          id: "user-123",
          email: "test@example.com",
          role: UserRole.STUDENT,
        },
      } as AuthRequest;

      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await authController.me(mockAuthReq, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "User not found" });
    });
  });

  describe("requestPasswordReset", () => {
    it("generates reset token for existing user", async () => {
      mockReq.body = { email: "test@example.com" };

      const mockUser = {
        id: "user-123",
        email: "test@example.com",
        firstName: "John",
        lastName: "Doe",
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(mockUser as never);
      mockPrismaInstance.user.update.mockResolvedValue({} as never);
      mockedEmailService.sendPasswordResetEmail.mockResolvedValue(undefined as never);

      await authController.requestPasswordReset(mockReq as Request, mockRes as Response);

      expect(mockPrismaInstance.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test@example.com" },
      });
      expect(mockPrismaInstance.user.update).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("password reset link"),
        }),
      );
    });

    it("returns success even if user does not exist (security)", async () => {
      mockReq.body = { email: "nonexistent@example.com" };

      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await authController.requestPasswordReset(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("password reset link"),
        }),
      );
      expect(mockPrismaInstance.user.update).not.toHaveBeenCalled();
    });
  });

  describe("resetPassword", () => {
    it("resets password with valid token", async () => {
      mockReq.body = {
        token: "valid-token",
        password: "newpassword123",
      };

      const mockUser = {
        id: "user-123",
        passwordResetToken: "valid-token",
        passwordResetExpires: new Date(Date.now() + 3600000),
      };

      mockPrismaInstance.user.findFirst.mockResolvedValue(mockUser as never);
      mockedBcrypt.hash.mockResolvedValue("new-hashed-password" as never);
      mockPrismaInstance.user.update.mockResolvedValue({} as never);

      await authController.resetPassword(mockReq as Request, mockRes as Response);

      expect(mockPrismaInstance.user.findFirst).toHaveBeenCalled();
      expect(mockedBcrypt.hash).toHaveBeenCalledWith("newpassword123", 10);
      expect(mockPrismaInstance.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          password: "new-hashed-password",
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });
      expect(mockRes.json).toHaveBeenCalledWith({ message: "Password reset successful" });
    });

    it("returns 400 for invalid or expired token", async () => {
      mockReq.body = {
        token: "invalid-token",
        password: "newpassword123",
      };

      mockPrismaInstance.user.findFirst.mockResolvedValue(null);

      await authController.resetPassword(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
      expect(mockPrismaInstance.user.update).not.toHaveBeenCalled();
    });
  });
});

