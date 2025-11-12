import { PrismaClient } from "@prisma/client";
import { Response } from "express";

import { UserRole } from "../enums/userRole";
import { AuthRequest } from "../types";

const prisma = new PrismaClient();

async function getClassForUser(classId: string, user?: AuthRequest["user"]) {
  if (!user) {
    return null;
  }

  if (user.role === UserRole.TEACHER) {
    return prisma.class.findFirst({
      where: {
        id: classId,
        teacherId: user.id,
      },
    });
  }

  if (user.role === UserRole.STUDENT) {
    return prisma.class.findFirst({
      where: {
        id: classId,
        students: {
          some: {
            id: user.id,
          },
        },
      },
    });
  }

  if (user.role === UserRole.ADMIN) {
    return prisma.class.findUnique({ where: { id: classId } });
  }

  return null;
}

class QuizController {
  async getAll(req: AuthRequest, res: Response) {
    try {
      const { classId, lessonId } = req.params;

      const classData = await getClassForUser(classId, req.user);

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      const lesson = await prisma.lesson.findFirst({
        where: {
          id: lessonId,
          classId,
        },
      });

      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const quizzes = await prisma.quiz.findMany({
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
          questions: {
            include: {
              options: true,
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

      const classData = await getClassForUser(classId, req.user);

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      const quiz = await prisma.quiz.findFirst({
        where: {
          id: quizId,
          lessonId,
          lesson: {
            classId,
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
      const { title, question, options, isActive } = req.body;

      if (req.user?.role !== UserRole.TEACHER) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (
        !Array.isArray(options) ||
        options.length < 2 ||
        options.length > 10
      ) {
        return res.status(400).json({
          error: "Quiz must have between 2 and 10 options",
        });
      }

      const correctOptions = options.filter(
        (opt: { isCorrect: boolean }) => opt.isCorrect,
      );
      if (correctOptions.length !== 1) {
        return res.status(400).json({
          error: "Quiz must have exactly one correct answer",
        });
      }

      const classData = await prisma.class.findFirst({
        where: {
          id: classId,
          teacherId: req.user.id,
        },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      const lesson = await prisma.lesson.findFirst({
        where: {
          id: lessonId,
          classId,
        },
      });

      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const quiz = await prisma.$transaction(async (tx) => {
        const newQuiz = await tx.quiz.create({
          data: {
            title,
            lessonId,
            isActive: Boolean(isActive),
          },
        });

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
      const { title, question, options, isActive } = req.body;

      if (req.user?.role !== UserRole.TEACHER) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (
        !Array.isArray(options) ||
        options.length < 2 ||
        options.length > 10
      ) {
        return res.status(400).json({
          error: "Quiz must have between 2 and 10 options",
        });
      }

      const correctOptions = options.filter(
        (opt: { isCorrect: boolean }) => opt.isCorrect,
      );
      if (correctOptions.length !== 1) {
        return res.status(400).json({
          error: "Quiz must have exactly one correct answer",
        });
      }

      const classData = await prisma.class.findFirst({
        where: {
          id: classId,
          teacherId: req.user.id,
        },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      const lesson = await prisma.lesson.findFirst({
        where: {
          id: lessonId,
          classId,
        },
      });

      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const existingQuiz = await prisma.quiz.findFirst({
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

      const updatedQuiz = await prisma.$transaction(async (tx) => {
        const quiz = await tx.quiz.update({
          where: { id: quizId },
          data: { title, isActive: Boolean(isActive) },
        });

        const existingQuestion = existingQuiz.questions[0];

        const updatedQuestion = await tx.question.update({
          where: { id: existingQuestion.id },
          data: {
            text: question,
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

      if (req.user?.role !== UserRole.TEACHER) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const classData = await prisma.class.findFirst({
        where: {
          id: classId,
          teacherId: req.user.id,
        },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      const lesson = await prisma.lesson.findFirst({
        where: {
          id: lessonId,
          classId,
        },
      });

      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      await prisma.quiz.delete({
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
      const { classId, quizId } = req.params;

      if (req.user?.role !== UserRole.TEACHER) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const classData = await prisma.class.findFirst({
        where: {
          id: classId,
          teacherId: req.user.id,
        },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      const quiz = await prisma.quiz.findFirst({
        where: {
          id: quizId,
          lesson: {
            classId,
          },
        },
      });

      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      const responses = await prisma.response.findMany({
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

  async submitResponse(req: AuthRequest, res: Response) {
    try {
      const { classId, lessonId, quizId } = req.params;
      const student = req.user;
      const { answers } = req.body as {
        answers: { questionId: string; selectedOptionId: string }[];
      };

      if (!student || student.role !== UserRole.STUDENT) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const classData = await getClassForUser(classId, student);

      if (!classData) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const quiz = await prisma.quiz.findFirst({
        where: {
          id: quizId,
          lessonId,
          lesson: {
            classId,
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

      if (!quiz || !quiz.isActive) {
        return res.status(400).json({ error: "Quiz is not active" });
      }

      if (quiz.questions.length === 0) {
        return res.status(400).json({ error: "Quiz has no questions" });
      }

      const existingResponse = await prisma.response.findFirst({
        where: {
          quizId,
          userId: student.id,
        },
      });

      if (existingResponse) {
        return res.status(400).json({ error: "Quiz already submitted" });
      }

      if (!Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ error: "Answers are required" });
      }

      if (answers.length !== quiz.questions.length) {
        return res.status(400).json({ error: "All questions must be answered" });
      }

      const questionMap = new Map(
        quiz.questions.map((question) => [question.id, question]),
      );

      let correctCount = 0;

      for (const answer of answers) {
        const question = questionMap.get(answer.questionId);
        if (!question) {
          return res.status(400).json({ error: "Invalid question" });
        }

        const option = question.options.find(
          (opt) => opt.id === answer.selectedOptionId,
        );
        if (!option) {
          return res.status(400).json({ error: "Invalid option" });
        }

        if (option.isCorrect) {
          correctCount += 1;
        }
      }

      const score = correctCount / quiz.questions.length;

      const responseRecord = await prisma.response.create({
        data: {
          quizId,
          userId: student.id,
          score,
          answers: {
            create: answers.map((answer) => ({
              questionId: answer.questionId,
              selectedOptionId: answer.selectedOptionId,
            })),
          },
        },
        include: {
          answers: true,
        },
      });

      res.status(201).json(responseRecord);
    } catch (error) {
      console.error("Error submitting quiz response:", error);
      res.status(500).json({ error: "Failed to submit response" });
    }
  }
}

export default new QuizController();
