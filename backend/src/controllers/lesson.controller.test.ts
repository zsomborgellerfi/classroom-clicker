import { Response } from "express";

import { UserRole } from "../enums/userRole";
import { AuthRequest } from "../types";

// Mock Prisma before importing the controller
const mockPrismaInstance = {
  class: {
    findFirst: jest.fn(),
  },
  lesson: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrismaInstance),
}));

import lessonController from "./lesson.controller";

describe("LessonController", () => {
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
      send: jest.fn().mockReturnThis(),
    };
  });

  describe("create", () => {
    it("creates a lesson successfully", async () => {
      mockReq.params = { classId: "class-123" };
      mockReq.body = {
        title: "Introduction to Algebra",
        content: "This lesson covers basic algebraic concepts",
      };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      const mockLesson = {
        id: "lesson-123",
        title: "Introduction to Algebra",
        content: "This lesson covers basic algebraic concepts",
        classId: "class-123",
      };

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.lesson.create.mockResolvedValue(mockLesson as never);

      await lessonController.create(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.class.findFirst).toHaveBeenCalledWith({
        where: {
          id: "class-123",
          teacherId: "teacher-123",
        },
      });
      expect(mockPrismaInstance.lesson.create).toHaveBeenCalledWith({
        data: {
          title: "Introduction to Algebra",
          content: "This lesson covers basic algebraic concepts",
          classId: "class-123",
        },
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockLesson);
    });

    it("returns 403 if user is not a teacher", async () => {
      mockReq.user = {
        id: "student-123",
        email: "student@example.com",
        role: UserRole.STUDENT,
      };
      mockReq.params = { classId: "class-123" };
      mockReq.body = {
        title: "Introduction to Algebra",
        content: "Content",
      };

      await lessonController.create(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
      expect(mockPrismaInstance.lesson.create).not.toHaveBeenCalled();
    });

    it("returns 404 if class not found", async () => {
      mockReq.params = { classId: "nonexistent-class" };
      mockReq.body = {
        title: "Introduction to Algebra",
        content: "Content",
      };

      mockPrismaInstance.class.findFirst.mockResolvedValue(null);

      await lessonController.create(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Class not found" });
    });
  });

  describe("getAll", () => {
    it("returns lessons for teacher", async () => {
      mockReq.params = { classId: "class-123" };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      const mockLessons = [
        {
          id: "lesson-1",
          title: "Lesson 1",
          classId: "class-123",
        },
        {
          id: "lesson-2",
          title: "Lesson 2",
          classId: "class-123",
        },
      ];

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.lesson.findMany.mockResolvedValue(mockLessons as never);

      await lessonController.getAll(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.class.findFirst).toHaveBeenCalled();
      expect(mockPrismaInstance.lesson.findMany).toHaveBeenCalledWith({
        where: { classId: "class-123" },
        orderBy: { createdAt: "desc" },
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockLessons);
    });

    it("returns lessons for enrolled student", async () => {
      mockReq.user = {
        id: "student-123",
        email: "student@example.com",
        role: UserRole.STUDENT,
      };
      mockReq.params = { classId: "class-123" };

      const mockClass = {
        id: "class-123",
        students: [{ id: "student-123" }],
      };

      const mockLessons = [
        {
          id: "lesson-1",
          title: "Lesson 1",
          classId: "class-123",
        },
      ];

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.lesson.findMany.mockResolvedValue(mockLessons as never);

      await lessonController.getAll(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(mockLessons);
    });

    it("returns 403 if student is not enrolled", async () => {
      mockReq.user = {
        id: "student-123",
        email: "student@example.com",
        role: UserRole.STUDENT,
      };
      mockReq.params = { classId: "class-123" };

      mockPrismaInstance.class.findFirst.mockResolvedValue(null);

      await lessonController.getAll(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });
  });

  describe("update", () => {
    it("updates lesson successfully", async () => {
      mockReq.params = { classId: "class-123", lessonId: "lesson-123" };
      mockReq.body = {
        title: "Updated Title",
        content: "Updated content",
      };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      const mockLesson = {
        id: "lesson-123",
        title: "Updated Title",
        content: "Updated content",
        classId: "class-123",
      };

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.lesson.update.mockResolvedValue(mockLesson as never);

      await lessonController.update(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.lesson.update).toHaveBeenCalledWith({
        where: {
          id: "lesson-123",
          classId: "class-123",
        },
        data: {
          title: "Updated Title",
          content: "Updated content",
        },
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockLesson);
    });

    it("returns 403 if user is not a teacher", async () => {
      mockReq.user = {
        id: "student-123",
        email: "student@example.com",
        role: UserRole.STUDENT,
      };
      mockReq.params = { classId: "class-123", lessonId: "lesson-123" };

      await lessonController.update(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });
  });

  describe("delete", () => {
    it("deletes lesson successfully", async () => {
      mockReq.params = { classId: "class-123", lessonId: "lesson-123" };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.lesson.delete.mockResolvedValue({} as never);

      await lessonController.delete(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.lesson.delete).toHaveBeenCalledWith({
        where: {
          id: "lesson-123",
          classId: "class-123",
        },
      });
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it("returns 403 if user is not a teacher", async () => {
      mockReq.user = {
        id: "student-123",
        email: "student@example.com",
        role: UserRole.STUDENT,
      };
      mockReq.params = { classId: "class-123", lessonId: "lesson-123" };

      await lessonController.delete(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });
  });

  describe("getById", () => {
    it("returns lesson by id for teacher", async () => {
      mockReq.params = { classId: "class-123", lessonId: "lesson-123" };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      const mockLesson = {
        id: "lesson-123",
        title: "Lesson Title",
        classId: "class-123",
        class: {
          id: "class-123",
          name: "Class Name",
        },
        quizzes: [],
      };

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.lesson.findUnique.mockResolvedValue(mockLesson as never);

      await lessonController.getById(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.lesson.findUnique).toHaveBeenCalledWith({
        where: {
          id: "lesson-123",
          classId: "class-123",
        },
        include: expect.any(Object),
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockLesson);
    });

    it("returns 404 if lesson not found", async () => {
      mockReq.params = { classId: "class-123", lessonId: "nonexistent-lesson" };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.lesson.findUnique.mockResolvedValue(null);

      await lessonController.getById(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Lesson not found" });
    });
  });
});

