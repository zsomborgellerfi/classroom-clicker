import { PrismaClient } from "@prisma/client";
import { Response } from "express";

import { UserRole } from "../enums/userRole";
import { AuthRequest } from "../types";
import classController from "./class.controller";

// Mock Prisma before importing the controller
jest.mock("@prisma/client", () => {
  const mockPrismaInstance = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    class: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    classInvite: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaInstance),
  };
});

const mockedPrisma = PrismaClient as jest.MockedClass<typeof PrismaClient>;
const mockPrismaInstance = new mockedPrisma() as any;

describe("ClassController", () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      body: {},
      params: {},
      user: {
        id: "teacher-123",
        email: "teacher@example.com",
        role: UserRole.TEACHER,
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("creates a new class successfully", async () => {
      mockReq.body = {
        name: "Mathematics 101",
        description: "Introduction to Mathematics",
      };

      const mockTeacher = {
        id: "teacher-123",
        email: "teacher@example.com",
      };

      const mockClass = {
        id: "class-123",
        name: "Mathematics 101",
        description: "Introduction to Mathematics",
        teacherId: "teacher-123",
        teacher: mockTeacher,
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(
        mockTeacher as never,
      );
      mockPrismaInstance.class.create.mockResolvedValue(mockClass as never);

      await classController.create(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.user.findUnique).toHaveBeenCalledWith({
        where: { id: "teacher-123" },
      });
      expect(mockPrismaInstance.class.create).toHaveBeenCalledWith({
        data: {
          name: "Mathematics 101",
          description: "Introduction to Mathematics",
          teacherId: "teacher-123",
        },
        include: expect.any(Object),
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockClass);
    });

    it("returns 401 if user is not authenticated", async () => {
      mockReq.user = undefined;
      mockReq.body = {
        name: "Mathematics 101",
        description: "Introduction to Mathematics",
      };

      await classController.create(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
      expect(mockPrismaInstance.class.create).not.toHaveBeenCalled();
    });

    it("returns 404 if teacher not found", async () => {
      mockReq.body = {
        name: "Mathematics 101",
        description: "Introduction to Mathematics",
      };

      mockPrismaInstance.user.findUnique.mockResolvedValue(null);

      await classController.create(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Teacher not found" });
    });
  });

  describe("getAll", () => {
    it("returns all classes for teacher", async () => {
      const mockTeacher = {
        id: "teacher-123",
        classes: [],
      };

      const mockClasses = [
        {
          id: "class-1",
          name: "Mathematics 101",
          teacherId: "teacher-123",
          _count: { students: 10, lessons: 5 },
        },
        {
          id: "class-2",
          name: "Physics 201",
          teacherId: "teacher-123",
          _count: { students: 15, lessons: 8 },
        },
      ];

      mockPrismaInstance.user.findUnique.mockResolvedValue(
        mockTeacher as never,
      );
      mockPrismaInstance.class.findMany.mockResolvedValue(mockClasses as never);

      await classController.getAll(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.class.findMany).toHaveBeenCalledWith({
        where: { teacherId: "teacher-123" },
        include: expect.any(Object),
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockClasses);
    });

    it("returns 401 if user is not authenticated", async () => {
      mockReq.user = undefined;

      await classController.getAll(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });
  });

  describe("getById", () => {
    it("returns class by id", async () => {
      mockReq.params = { id: "class-123" };

      const mockClass = {
        id: "class-123",
        name: "Mathematics 101",
        teacherId: "teacher-123",
        teacher: {
          id: "teacher-123",
          firstName: "John",
          lastName: "Doe",
        },
        students: [],
        lessons: [],
      };

      mockPrismaInstance.class.findUnique.mockResolvedValue(mockClass as never);

      await classController.getById(
        mockReq as AuthRequest,
        mockRes as Response,
      );

      expect(mockPrismaInstance.class.findUnique).toHaveBeenCalledWith({
        where: { id: "class-123" },
        include: expect.any(Object),
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockClass);
    });

    it("returns 404 if class not found", async () => {
      mockReq.params = { id: "nonexistent-class" };

      mockPrismaInstance.class.findUnique.mockResolvedValue(null);

      await classController.getById(
        mockReq as AuthRequest,
        mockRes as Response,
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Class not found" });
    });
  });

  describe("update", () => {
    it("updates class successfully", async () => {
      mockReq.params = { id: "class-123" };
      mockReq.body = {
        name: "Updated Mathematics 101",
        description: "Updated description",
      };

      const mockClass = {
        id: "class-123",
        name: "Updated Mathematics 101",
        description: "Updated description",
        teacherId: "teacher-123",
      };

      mockPrismaInstance.class.findUnique.mockResolvedValue({
        id: "class-123",
        teacherId: "teacher-123",
      } as never);
      mockPrismaInstance.class.update.mockResolvedValue(mockClass as never);

      await classController.update(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.class.findUnique).toHaveBeenCalledWith({
        where: { id: "class-123" },
      });
      expect(mockPrismaInstance.class.update).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockClass);
    });

    it("returns 404 if class not found", async () => {
      mockReq.params = { id: "nonexistent-class" };
      mockReq.body = {
        name: "Updated Name",
      };

      mockPrismaInstance.class.findUnique.mockResolvedValue(null);

      await classController.update(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Class not found" });
    });
  });

  describe("delete", () => {
    it("deletes class successfully", async () => {
      mockReq.params = { id: "class-123" };

      mockPrismaInstance.class.findUnique.mockResolvedValue({
        id: "class-123",
        teacherId: "teacher-123",
      } as never);
      mockPrismaInstance.class.delete.mockResolvedValue({} as never);

      await classController.delete(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.class.findUnique).toHaveBeenCalledWith({
        where: { id: "class-123" },
      });
      expect(mockPrismaInstance.class.delete).toHaveBeenCalledWith({
        where: { id: "class-123" },
      });
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it("returns 404 if class not found", async () => {
      mockReq.params = { id: "nonexistent-class" };

      mockPrismaInstance.class.findUnique.mockResolvedValue(null);

      await classController.delete(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Class not found" });
    });
  });

  describe("addStudent", () => {
    it("adds student to class successfully", async () => {
      mockReq.params = { id: "class-123" };
      mockReq.body = { studentId: "student-123" };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      const mockStudent = {
        id: "student-123",
        email: "student@example.com",
        role: UserRole.STUDENT,
      };

      mockPrismaInstance.class.findUnique.mockResolvedValue(mockClass as never);
      mockPrismaInstance.user.findFirst.mockResolvedValue(mockStudent as never);
      mockPrismaInstance.class.update.mockResolvedValue({
        ...mockClass,
        students: [mockStudent],
      } as never);

      await classController.addStudent(
        mockReq as AuthRequest,
        mockRes as Response,
      );

      expect(mockPrismaInstance.class.findUnique).toHaveBeenCalledWith({
        where: { id: "class-123" },
      });
      expect(mockPrismaInstance.user.findFirst).toHaveBeenCalledWith({
        where: {
          id: "student-123",
          role: UserRole.STUDENT,
        },
      });
      expect(mockPrismaInstance.class.update).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalled();
    });

    it("returns 404 if class not found", async () => {
      mockReq.params = { id: "nonexistent-class" };
      mockReq.body = { studentId: "student-123" };

      mockPrismaInstance.class.findUnique.mockResolvedValue(null);

      await classController.addStudent(
        mockReq as AuthRequest,
        mockRes as Response,
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Class not found" });
    });

    it("returns 404 if student not found", async () => {
      mockReq.params = { id: "class-123" };
      mockReq.body = { studentId: "nonexistent-student" };

      mockPrismaInstance.class.findUnique.mockResolvedValue({
        id: "class-123",
        teacherId: "teacher-123",
      } as never);
      mockPrismaInstance.user.findFirst.mockResolvedValue(null);

      await classController.addStudent(
        mockReq as AuthRequest,
        mockRes as Response,
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Student not found" });
    });
  });
});
