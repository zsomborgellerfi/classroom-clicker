import { Response } from "express";

import { UserRole } from "../enums/userRole";
import { AuthRequest } from "../types";
import * as socketService from "../services/socket.service";

// Mock Prisma before importing the controller
const mockPrismaInstance = {
  class: {
    findFirst: jest.fn(),
  },
  lesson: {
    findFirst: jest.fn(),
  },
  quiz: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  question: {
    create: jest.fn(),
  },
  response: {
    count: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn(() => mockPrismaInstance),
}));
jest.mock("../services/socket.service");

import quizController from "./quiz.controller";

const mockedSocketService = socketService as jest.Mocked<typeof socketService>;

describe("QuizController", () => {
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

  describe("getAll", () => {
    it("returns quizzes for a lesson", async () => {
      mockReq.params = { classId: "class-123", lessonId: "lesson-123" };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      const mockLesson = {
        id: "lesson-123",
        classId: "class-123",
      };

      const mockQuizzes = [
        {
          id: "quiz-1",
          title: "Quiz 1",
          lessonId: "lesson-123",
          _count: { questions: 5, responses: 10 },
          questions: [],
        },
      ];

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.lesson.findFirst.mockResolvedValue(mockLesson as never);
      mockPrismaInstance.quiz.findMany.mockResolvedValue(mockQuizzes as never);

      await quizController.getAll(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.quiz.findMany).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockQuizzes);
    });

    it("returns 404 if class not found", async () => {
      mockReq.params = { classId: "nonexistent-class", lessonId: "lesson-123" };

      mockPrismaInstance.class.findFirst.mockResolvedValue(null);

      await quizController.getAll(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Class not found" });
    });

    it("returns 404 if lesson not found", async () => {
      mockReq.params = { classId: "class-123", lessonId: "nonexistent-lesson" };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.lesson.findFirst.mockResolvedValue(null);

      await quizController.getAll(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Lesson not found" });
    });
  });

  describe("create", () => {
    it("creates a quiz successfully", async () => {
      mockReq.params = { classId: "class-123", lessonId: "lesson-123" };
      mockReq.body = {
        title: "Math Quiz",
        questions: [
          {
            text: "What is 2+2?",
            options: [
              { text: "3", isCorrect: false },
              { text: "4", isCorrect: true },
              { text: "5", isCorrect: false },
            ],
          },
        ],
        isActive: false,
      };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      const mockLesson = {
        id: "lesson-123",
        classId: "class-123",
      };

      const mockQuiz = {
        id: "quiz-123",
        title: "Math Quiz",
        lessonId: "lesson-123",
        isActive: false,
        questions: [],
      };

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.lesson.findFirst.mockResolvedValue(mockLesson as never);
      mockPrismaInstance.$transaction.mockImplementation(async (callback) => {
        const tx = {
          quiz: {
            create: jest.fn().mockResolvedValue(mockQuiz),
          },
          question: {
            create: jest.fn().mockResolvedValue({
              id: "question-1",
              text: "What is 2+2?",
              options: [],
            }),
          },
        };
        return callback(tx);
      });

      await quizController.create(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.$transaction).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it("returns 403 if user is not a teacher", async () => {
      mockReq.user = {
        id: "student-123",
        email: "student@example.com",
        role: UserRole.STUDENT,
      };
      mockReq.params = { classId: "class-123", lessonId: "lesson-123" };
      mockReq.body = {
        title: "Math Quiz",
        questions: [],
      };

      await quizController.create(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });

    it("returns 400 if title is missing", async () => {
      mockReq.params = { classId: "class-123", lessonId: "lesson-123" };
      mockReq.body = {
        questions: [
          {
            text: "Question?",
            options: [
              { text: "Option 1", isCorrect: true },
              { text: "Option 2", isCorrect: false },
            ],
          },
        ],
      };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      const mockLesson = {
        id: "lesson-123",
        classId: "class-123",
      };

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.lesson.findFirst.mockResolvedValue(mockLesson as never);

      await quizController.create(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Quiz title is required",
      });
    });

    it("returns 400 if questions array is empty", async () => {
      mockReq.params = { classId: "class-123", lessonId: "lesson-123" };
      mockReq.body = {
        title: "Math Quiz",
        questions: [],
      };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      const mockLesson = {
        id: "lesson-123",
        classId: "class-123",
      };

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.lesson.findFirst.mockResolvedValue(mockLesson as never);

      await quizController.create(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Quiz must include at least one question",
      });
    });
  });

  describe("getById", () => {
    it("returns quiz by id for teacher", async () => {
      mockReq.params = {
        classId: "class-123",
        lessonId: "lesson-123",
        quizId: "quiz-123",
      };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      const mockQuiz = {
        id: "quiz-123",
        title: "Math Quiz",
        lessonId: "lesson-123",
        questions: [],
        _count: { responses: 5 },
      };

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.quiz.findFirst.mockResolvedValue(mockQuiz as never);

      await quizController.getById(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.quiz.findFirst).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockQuiz);
    });

    it("returns 404 if quiz not found", async () => {
      mockReq.params = {
        classId: "class-123",
        lessonId: "lesson-123",
        quizId: "nonexistent-quiz",
      };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.quiz.findFirst.mockResolvedValue(null);

      await quizController.getById(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Quiz not found" });
    });
  });

  describe("delete", () => {
    it("deletes quiz successfully", async () => {
      mockReq.params = {
        classId: "class-123",
        lessonId: "lesson-123",
        quizId: "quiz-123",
      };

      const mockClass = {
        id: "class-123",
        teacherId: "teacher-123",
      };

      const mockLesson = {
        id: "lesson-123",
        classId: "class-123",
      };

      const mockQuiz = {
        id: "quiz-123",
        lessonId: "lesson-123",
      };

      mockPrismaInstance.class.findFirst.mockResolvedValue(mockClass as never);
      mockPrismaInstance.lesson.findFirst.mockResolvedValue(mockLesson as never);
      mockPrismaInstance.quiz.findFirst.mockResolvedValue(mockQuiz as never);
      mockPrismaInstance.quiz.delete.mockResolvedValue({} as never);

      await quizController.delete(mockReq as AuthRequest, mockRes as Response);

      expect(mockPrismaInstance.quiz.delete).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it("returns 403 if user is not a teacher", async () => {
      mockReq.user = {
        id: "student-123",
        email: "student@example.com",
        role: UserRole.STUDENT,
      };
      mockReq.params = {
        classId: "class-123",
        lessonId: "lesson-123",
        quizId: "quiz-123",
      };

      await quizController.delete(mockReq as AuthRequest, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    });
  });
});

