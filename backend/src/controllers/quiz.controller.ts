import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

import { AuthRequest } from "../types";

const prismaClient = new PrismaClient();

class QuizController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { classId, lessonId } = req.params;
      const teacherId = req.user?.id;

      // Verify class belongs to teacher
      const classData = await prismaClient.class.findFirst({
        where: {
          id: classId,
          teacherId,
        },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      // Verify lesson belongs to class
      const lesson = await prismaClient.lesson.findFirst({
        where: {
          id: lessonId,
          classId,
        },
      });

      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const quizzes = await prismaClient.quiz.findMany({
        where: {
          lessonId,
        },
        include: {
          _count: {
            select: {
              questions: true,
              responses: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(quizzes);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { classId, lessonId, quizId } = req.params;
      const teacherId = req.user?.id;

      const quiz = await prismaClient.quiz.findFirst({
        where: {
          id: quizId,
          lessonId,
          lesson: {
            classId,
            class: {
              teacherId,
            },
          },
        },
        include: {
          questions: {
            include: {
              options: true,
            },
          },
        },
      });

      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      res.json(quiz);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const { classId, lessonId } = req.params;
      const { title, question, options } = req.body;
      const teacherId = req.user?.id;

      // Validate number of options
      if (
        !Array.isArray(options) ||
        options.length < 2 ||
        options.length > 10
      ) {
        return res.status(400).json({
          error: "Quiz must have between 2 and 10 options",
        });
      }

      // Validate correct answer
      const correctOptions = options.filter(
        (opt: { isCorrect: boolean }) => opt.isCorrect,
      );
      if (correctOptions.length !== 1) {
        return res.status(400).json({
          error: "Quiz must have exactly one correct answer",
        });
      }

      // Verify class belongs to teacher
      const classData = await prismaClient.class.findFirst({
        where: {
          id: classId,
          teacherId,
        },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      // Verify lesson belongs to class
      const lesson = await prismaClient.lesson.findFirst({
        where: {
          id: lessonId,
          classId,
        },
      });

      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      // Create quiz with question and options in a transaction
      const quiz = await prismaClient.$transaction(async (tx) => {
        // Create the quiz
        const newQuiz = await tx.quiz.create({
          data: {
            title,
            lessonId,
          },
        });

        // Create the question
        const newQuestion = await tx.question.create({
          data: {
            text: question,
            quizId: newQuiz.id,
            options: {
              create: options.map(
                (opt: { text: string; isCorrect: boolean }) => ({
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                }),
              ),
            },
          },
          include: {
            options: true,
          },
        });

        return {
          ...newQuiz,
          questions: [newQuestion],
        };
      });

      res.status(201).json(quiz);
    } catch (error) {
      console.error("Error creating quiz:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { classId, lessonId, quizId } = req.params;
      const { title, question, options } = req.body;
      const teacherId = req.user?.id;

      // Validate number of options
      if (
        !Array.isArray(options) ||
        options.length < 2 ||
        options.length > 10
      ) {
        return res.status(400).json({
          error: "Quiz must have between 2 and 10 options",
        });
      }

      // Validate correct answer
      const correctOptions = options.filter(
        (opt: { isCorrect: boolean }) => opt.isCorrect,
      );
      if (correctOptions.length !== 1) {
        return res.status(400).json({
          error: "Quiz must have exactly one correct answer",
        });
      }

      // Verify class belongs to teacher
      const classData = await prismaClient.class.findFirst({
        where: {
          id: classId,
          teacherId,
        },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      // Verify lesson belongs to class
      const lesson = await prismaClient.lesson.findFirst({
        where: {
          id: lessonId,
          classId,
        },
      });

      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      // Verify quiz exists and belongs to lesson
      const existingQuiz = await prismaClient.quiz.findFirst({
        where: {
          id: quizId,
          lessonId,
        },
        include: {
          questions: {
            include: {
              options: true,
            },
          },
        },
      });

      if (!existingQuiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      // Update quiz with question and options in a transaction
      const updatedQuiz = await prismaClient.$transaction(async (tx) => {
        // Update quiz title
        const quiz = await tx.quiz.update({
          where: { id: quizId },
          data: { title },
        });

        // Get the existing question (assuming one question per quiz)
        const existingQuestion = existingQuiz.questions[0];

        // Update question and options
        const updatedQuestion = await tx.question.update({
          where: { id: existingQuestion.id },
          data: {
            text: question,
            // Delete existing options and create new ones
            options: {
              deleteMany: {},
              create: options.map(
                (opt: { text: string; isCorrect: boolean }) => ({
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                }),
              ),
            },
          },
          include: {
            options: true,
          },
        });

        return {
          ...quiz,
          questions: [updatedQuestion],
        };
      });

      res.json(updatedQuiz);
    } catch (error) {
      console.error("Error updating quiz:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { classId, lessonId, quizId } = req.params;
      const teacherId = req.user?.id;

      // Verify class belongs to teacher
      const classData = await prismaClient.class.findFirst({
        where: {
          id: classId,
          teacherId,
        },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      // Verify lesson belongs to class
      const lesson = await prismaClient.lesson.findFirst({
        where: {
          id: lessonId,
          classId,
        },
      });

      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      // Delete quiz and all related data (questions, options, responses)
      await prismaClient.quiz.delete({
        where: {
          id: quizId,
          lessonId,
        },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting quiz:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getResponses(req: AuthRequest, res: Response) {
    try {
      const { quizId } = req.params;

      const responses = await prismaClient.response.findMany({
        where: { quizId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          answers: true,
        },
        orderBy: {
          submittedAt: "desc",
        },
      });

      res.json(responses);
    } catch (error) {
      console.error("Error fetching quiz responses:", error);
      res.status(500).json({ error: "Failed to fetch quiz responses" });
    }
  }
}

export default new QuizController();
