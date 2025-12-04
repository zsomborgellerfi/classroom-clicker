import { Response } from "express";

import { UserRole } from "../enums/userRole";
import { AuthRequest } from "../types";

// Mock Prisma before importing the controller
const mockPrismaInstance = {
  user: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  class: {
    findMany: jest.fn(),
  },
  lesson: {
    count: jest.fn(),
  },
  quiz: {
    count: jest.fn(),
    findFirst: jest.fn(),
  },
  response: {
    findMany: jest.fn(),
  },
};

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrismaInstance),
}));

import teacherController from "./teacher.controller";

describe("TeacherController", () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReq = {
      query: {},
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
  });

  describe("getStudents", () => {
    it("returns paginated students", async () => {
      const mockStudents = [
        {
          id: "student-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          externalId: null,
        },
        {
          id: "student-2",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
          externalId: "EXT123",
        },
      ];

      mockPrismaInstance.user.findMany.mockResolvedValue(mockStudents as never);
      mockPrismaInstance.user.count.mockResolvedValue(2);

      await teacherController.getStudents(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            role: UserRole.STUDENT,
          },
        }),
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockStudents,
        pagination: expect.objectContaining({
          total: 2,
        }),
      });
    });

    it("filters students by search query", async () => {
      mockReq.query = { search: "john" };

      const mockStudents = [
        {
          id: "student-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          externalId: null,
        },
      ];

      mockPrismaInstance.user.findMany.mockResolvedValue(mockStudents as never);
      mockPrismaInstance.user.count.mockResolvedValue(1);

      await teacherController.getStudents(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it("returns 403 if user is not a teacher", async () => {
      mockReq.user = {
        id: "student-123",
        email: "student@example.com",
        role: UserRole.STUDENT,
      };

      await teacherController.getStudents(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });
  });

  describe("getDashboard", () => {
    it("returns teacher dashboard data", async () => {
      const mockClasses = [
        {
          id: "class-1",
          name: "Math 101",
          students: [{ id: "student-1" }, { id: "student-2" }],
        },
        {
          id: "class-2",
          name: "Physics 201",
          students: [{ id: "student-1" }],
        },
      ];

      const mockLatestQuiz = {
        id: "quiz-1",
        title: "Latest Quiz",
        lesson: {
          id: "lesson-1",
          title: "Lesson 1",
          class: {
            id: "class-1",
            name: "Math 101",
          },
        },
        _count: { responses: 10 },
      };

      const mockRecentResponses = [
        {
          id: "response-1",
          user: {
            id: "student-1",
            firstName: "John",
            lastName: "Doe",
          },
          quiz: {
            id: "quiz-1",
            title: "Quiz 1",
            lesson: {
              id: "lesson-1",
              title: "Lesson 1",
              class: {
                id: "class-1",
                name: "Math 101",
              },
            },
          },
        },
      ];

      mockPrismaInstance.class.findMany.mockResolvedValue(mockClasses as never);
      mockPrismaInstance.lesson.count.mockResolvedValue(10);
      mockPrismaInstance.quiz.count.mockResolvedValue(20);
      mockPrismaInstance.quiz.findFirst.mockResolvedValue(mockLatestQuiz as never);
      mockPrismaInstance.response.findMany.mockResolvedValue(mockRecentResponses as never);

      await teacherController.getDashboard(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        totals: {
          classes: 2,
          lessons: 10,
          quizzes: 20,
          students: 2, // Unique students across classes
        },
        latestQuiz: mockLatestQuiz,
        recentResponses: mockRecentResponses,
      });
    });

    it("returns 403 if user is not a teacher", async () => {
      mockReq.user = {
        id: "student-123",
        email: "student@example.com",
        role: UserRole.STUDENT,
      };

      await teacherController.getDashboard(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });
  });
});

