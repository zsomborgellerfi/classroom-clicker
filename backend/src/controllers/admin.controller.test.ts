import { Request, Response } from "express";
import bcrypt from "bcryptjs";

import { UserRole } from "../enums/userRole";

// Mock Prisma before importing the controller
const mockPrismaInstance = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  class: {
    count: jest.fn(),
    findMany: jest.fn(),
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

import adminController from "./admin.controller";

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe("AdminController", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      params: {},
      query: {},
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
  });

  describe("getUsers", () => {
    it("returns paginated users", async () => {
      const mockUsers = [
        {
          id: "user-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          role: UserRole.STUDENT,
        },
        {
          id: "user-2",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          role: UserRole.TEACHER,
        },
      ];

      mockPrismaInstance.user.findMany.mockResolvedValue(mockUsers as never);
      mockPrismaInstance.user.count.mockResolvedValue(2);

      await adminController.getUsers(mockReq as Request, mockRes as Response);

      expect(mockPrismaInstance.user.findMany).toHaveBeenCalled();
      expect(mockPrismaInstance.user.count).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({
        users: mockUsers,
        total: 2,
        page: 1,
        totalPages: 1,
      });
    });

    it("handles pagination parameters", async () => {
      mockReq.query = { page: "2", limit: "5" };

      mockPrismaInstance.user.findMany.mockResolvedValue([] as never);
      mockPrismaInstance.user.count.mockResolvedValue(10);

      await adminController.getUsers(mockReq as Request, mockRes as Response);

      expect(mockPrismaInstance.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        users: [],
        total: 10,
        page: 2,
        totalPages: 2,
      });
    });
  });

  describe("createUser", () => {
    it("creates a user successfully", async () => {
      mockReq.body = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "password123",
        role: UserRole.STUDENT,
      };

      const mockUser = {
        id: "user-123",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        role: UserRole.STUDENT,
        externalId: null,
        createdAt: new Date(),
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue("hashed-password" as never);
      mockPrismaInstance.user.create.mockResolvedValue(mockUser as never);

      await adminController.createUser(mockReq as Request, mockRes as Response);

      expect(mockPrismaInstance.user.findUnique).toHaveBeenCalledWith({
        where: { email: "john@example.com" },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalledWith("password123", 10);
      expect(mockPrismaInstance.user.create).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockUser);
    });

    it("returns 400 if required fields are missing", async () => {
      mockReq.body = {
        firstName: "John",
        // Missing lastName, email, password
      };

      await adminController.createUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Missing required fields" });
      expect(mockPrismaInstance.user.create).not.toHaveBeenCalled();
    });

    it("returns 400 if user already exists", async () => {
      mockReq.body = {
        firstName: "John",
        lastName: "Doe",
        email: "existing@example.com",
        password: "password123",
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue({
        id: "existing-user",
        email: "existing@example.com",
      } as never);

      await adminController.createUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "User with this email already exists",
      });
    });
  });

  describe("updateUser", () => {
    it("updates user successfully", async () => {
      mockReq.params = { id: "user-123" };
      mockReq.body = {
        firstName: "Updated",
        lastName: "Name",
        email: "updated@example.com",
        role: UserRole.TEACHER,
      };

      const existingUser = {
        id: "user-123",
        role: UserRole.STUDENT,
        externalId: null,
      };

      const updatedUser = {
        id: "user-123",
        firstName: "Updated",
        lastName: "Name",
        email: "updated@example.com",
        role: UserRole.TEACHER,
        externalId: null,
        createdAt: new Date(),
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(existingUser as never);
      mockPrismaInstance.user.update.mockResolvedValue(updatedUser as never);

      await adminController.updateUser(mockReq as Request, mockRes as Response);

      expect(mockPrismaInstance.user.update).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(updatedUser);
    });

    it("returns 404 if user not found", async () => {
      mockReq.params = { id: "nonexistent-user" };
      mockReq.body = {
        firstName: "Updated",
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await adminController.updateUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    it("returns 403 if trying to modify admin role", async () => {
      mockReq.params = { id: "admin-user" };
      mockReq.body = {
        role: UserRole.TEACHER,
      };

      const existingUser = {
        id: "admin-user",
        role: UserRole.ADMIN,
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(existingUser as never);

      await adminController.updateUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Admin roles cannot be modified through this endpoint",
      });
    });
  });

  describe("deleteUser", () => {
    it("deletes user successfully", async () => {
      mockReq.params = { id: "user-123" };

      const existingUser = {
        id: "user-123",
        role: UserRole.STUDENT,
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(existingUser as never);
      mockPrismaInstance.user.delete.mockResolvedValue({} as never);

      await adminController.deleteUser(mockReq as Request, mockRes as Response);

      expect(mockPrismaInstance.user.delete).toHaveBeenCalledWith({
        where: { id: "user-123" },
      });
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it("returns 404 if user not found", async () => {
      mockReq.params = { id: "nonexistent-user" };

      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await adminController.deleteUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "User not found" });
    });

    it("returns 403 if trying to delete admin", async () => {
      mockReq.params = { id: "admin-user" };

      const existingUser = {
        id: "admin-user",
        role: UserRole.ADMIN,
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(existingUser as never);

      await adminController.deleteUser(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Admin users cannot be deleted through this endpoint",
      });
    });
  });

  describe("getInsights", () => {
    it("returns admin insights", async () => {
      mockPrismaInstance.user.count
        .mockResolvedValueOnce(100) // total users
        .mockResolvedValueOnce(10) // teachers
        .mockResolvedValueOnce(85) // students
        .mockResolvedValueOnce(5); // admins
      mockPrismaInstance.class.count.mockResolvedValue(20);
      mockPrismaInstance.lesson.count.mockResolvedValue(50);
      mockPrismaInstance.quiz.count.mockResolvedValue(100);

      const mockRecentUsers = [
        {
          id: "user-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          role: UserRole.STUDENT,
          createdAt: new Date(),
        },
      ];

      const mockTopClasses = [
        {
          id: "class-1",
          name: "Math 101",
          createdAt: new Date(),
          _count: { students: 25, lessons: 10 },
        },
      ];

      mockPrismaInstance.user.findMany.mockResolvedValue(mockRecentUsers as never);
      mockPrismaInstance.class.findMany.mockResolvedValue(mockTopClasses as never);

      await adminController.getInsights(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        totals: {
          users: 100,
          teachers: 10,
          students: 85,
          admins: 5,
          classes: 20,
          lessons: 50,
          quizzes: 100,
        },
        recentUsers: mockRecentUsers,
        topClasses: mockTopClasses,
      });
    });
  });

  describe("importUsers", () => {
    it("imports users successfully", async () => {
      mockReq.body = {
        users: [
          {
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
            password: "password123",
            role: UserRole.STUDENT,
          },
          {
            firstName: "Jane",
            lastName: "Smith",
            email: "jane@example.com",
            password: "password456",
            role: UserRole.TEACHER,
          },
        ],
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue("hashed-password" as never);
      mockPrismaInstance.user.create.mockResolvedValue({} as never);

      await adminController.importUsers(mockReq as Request, mockRes as Response);

      expect(mockPrismaInstance.user.create).toHaveBeenCalledTimes(2);
      expect(mockRes.json).toHaveBeenCalledWith({
        created: 2,
        skipped: 0,
        errors: [],
      });
    });

    it("skips users with missing fields", async () => {
      mockReq.body = {
        users: [
          {
            firstName: "John",
            // Missing lastName, email, password
          },
          {
            firstName: "Jane",
            lastName: "Smith",
            email: "jane@example.com",
            password: "password456",
            role: UserRole.TEACHER,
          },
        ],
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue("hashed-password" as never);
      mockPrismaInstance.user.create.mockResolvedValue({} as never);

      await adminController.importUsers(mockReq as Request, mockRes as Response);

      expect(mockPrismaInstance.user.create).toHaveBeenCalledTimes(1);
      expect(mockRes.json).toHaveBeenCalledWith({
        created: 1,
        skipped: 1,
        errors: expect.arrayContaining([
          expect.objectContaining({ reason: "Missing required fields" }),
        ]),
      });
    });

    it("returns 400 if no users provided", async () => {
      mockReq.body = {
        users: [],
      };

      await adminController.importUsers(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "No users provided" });
    });
  });
});

