import { PrismaClient } from "@prisma/client";
import { Response } from "express";

import { UserRole } from "../enums/userRole";
import { AuthRequest } from "../types";
import socketService from "../services/socket.service";

const prisma = new PrismaClient();

class ValidationError extends Error {}

type OptionPayload = {
  id?: string;
  text: string;
  isCorrect: boolean;
};

type QuestionPayload = {
  id?: string;
  text: string;
  explanation?: string;
  options: OptionPayload[];
};

function normalizeQuestionsPayload(payload: unknown): QuestionPayload[] {
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new ValidationError("Quiz must include at least one question");
  }

  return payload.map((question, questionIndex) => {
    if (!question || typeof question !== "object") {
      throw new ValidationError(`Question #${questionIndex + 1} is invalid`);
    }

    const rawText = (question as { text?: unknown }).text;
    const text = typeof rawText === "string" ? rawText.trim() : "";
    if (!text) {
      throw new ValidationError(`Question #${questionIndex + 1} must include text`);
    }

    const rawExplanation = (question as { explanation?: unknown }).explanation;
    const explanation =
      typeof rawExplanation === "string" && rawExplanation.trim().length > 0
        ? rawExplanation.trim()
        : undefined;

    const rawOptions = (question as { options?: unknown }).options;
    if (!Array.isArray(rawOptions) || rawOptions.length < 2 || rawOptions.length > 10) {
      throw new ValidationError(
        `Question #${questionIndex + 1} must have between 2 and 10 options`,
      );
    }

    const options = rawOptions.map((option, optionIndex) => {
      if (!option || typeof option !== "object") {
        throw new ValidationError(
          `Question #${questionIndex + 1} option #${optionIndex + 1} is invalid`,
        );
      }
      const rawOptionText = (option as { text?: unknown }).text;
      const optionText =
        typeof rawOptionText === "string" ? rawOptionText.trim() : "";
      if (!optionText) {
        throw new ValidationError(
          `Question #${questionIndex + 1} option #${optionIndex + 1} must include text`,
        );
      }

      const optionIdValue = (option as { id?: unknown }).id;
      const optionId =
        typeof optionIdValue === "string" ? optionIdValue : undefined;

      return {
        id: optionId,
        text: optionText,
        isCorrect: Boolean((option as { isCorrect?: unknown }).isCorrect),
      };
    });

    const correctCount = options.filter((opt) => opt.isCorrect).length;
    if (correctCount !== 1) {
      throw new ValidationError(
        `Question #${questionIndex + 1} must have exactly one correct option`,
      );
    }

    const questionIdValue = (question as { id?: unknown }).id;
    const questionId =
      typeof questionIdValue === "string" ? questionIdValue : undefined;

    return {
      id: questionId,
      text,
      explanation,
      options,
    };
  });
}

function parseOptionalPositiveInt(
  value: unknown,
  fieldLabel: string,
  { allowNull = true, allowZero = false }: { allowNull?: boolean; allowZero?: boolean } = {},
): number | null {
  if (value === undefined || value === null || value === "") {
    return allowNull ? null : null;
  }

  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`${fieldLabel} must be a number`);
  }

  if (!allowZero && parsed <= 0) {
    throw new ValidationError(`${fieldLabel} must be greater than 0`);
  }

  if (allowZero && parsed < 0) {
    throw new ValidationError(`${fieldLabel} must be at least 0`);
  }

  return Math.floor(parsed);
}

function parseOptionalDate(value: unknown, fieldLabel: string): Date | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value as string);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${fieldLabel} must be a valid date`);
  }

  return date;
}

function getQuizDeadline(quiz: {
  availableUntil: Date | null;
  timeLimitSeconds: number | null;
  activatedAt: Date | null;
}): Date | null {
  const candidates: number[] = [];

  if (quiz.availableUntil) {
    candidates.push(quiz.availableUntil.getTime());
  }

  if (quiz.timeLimitSeconds && quiz.activatedAt) {
    candidates.push(quiz.activatedAt.getTime() + quiz.timeLimitSeconds * 1000);
  }

  if (!candidates.length) {
    return null;
  }

  return new Date(Math.min(...candidates));
}

function sanitizeQuestion(question: any, hideAnswers: boolean) {
  if (!hideAnswers) {
    return question;
  }

  return {
    ...question,
    explanation: undefined,
    options: question.options.map(({ isCorrect, ...option }: any) => option),
  };
}

function sanitizeQuizForStudentView(quiz: any, hideAnswers: boolean) {
  if (!hideAnswers) {
    return quiz;
  }

  return {
    ...quiz,
    questions: quiz.questions.map((question: any) =>
      sanitizeQuestion(question, hideAnswers),
    ),
  };
}

function sanitizeResponseForStudent(response: any, hideAnswers: boolean) {
  if (!response || !hideAnswers) {
    return response;
  }

  return {
    ...response,
    answers: response.answers.map((answer: any) => ({
      ...answer,
      question: answer.question
        ? sanitizeQuestion(answer.question, hideAnswers)
        : undefined,
      selectedOption: answer.selectedOption,
    })),
  };
}

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

async function notifyStudentsAboutQuizActivation(quizId: string) {
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        activatedAt: true,
        availableUntil: true,
        timeLimitSeconds: true,
        lesson: {
          select: {
            id: true,
            title: true,
            class: {
              select: {
                id: true,
                name: true,
                students: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!quiz) {
      return;
    }

    const studentIds = quiz.lesson.class.students.map((student) => student.id);
    if (!studentIds.length) {
      return;
    }

    socketService.emitQuizActivated(studentIds, {
      quizId: quiz.id,
      quizTitle: quiz.title,
      activatedAt: quiz.activatedAt?.toISOString() ?? null,
      availableUntil: quiz.availableUntil?.toISOString() ?? null,
      timeLimitSeconds: quiz.timeLimitSeconds,
      lessonId: quiz.lesson.id,
      lessonTitle: quiz.lesson.title,
      classId: quiz.lesson.class.id,
      className: quiz.lesson.class.name,
    });
  } catch (error) {
    console.error("Error notifying students about quiz activation:", error);
  }
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
            orderBy: {
              order: "asc",
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
          lesson: {
            select: {
              id: true,
              class: {
                select: {
                  id: true,
                  teacherId: true,
                },
              },
            },
          },
          questions: {
            include: {
              options: true,
            },
            orderBy: {
              order: "asc",
            },
          },
          _count: {
            select: {
              responses: true,
            },
          },
        },
      });

      if (!quiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      if (req.user?.role === UserRole.STUDENT && req.user.id) {
        const [studentAttemptCount, latestStudentResponse] = await Promise.all([
          prisma.response.count({
            where: {
              quizId,
              userId: req.user.id,
            },
          }),
          prisma.response.findFirst({
            where: {
              quizId,
              userId: req.user.id,
            },
            include: {
              answers: {
                include: {
                  question: {
                    include: {
                      options: true,
                    },
                  },
                  selectedOption: true,
                },
              },
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: {
              submittedAt: "desc",
            },
          }),
        ]);

        const attemptLimit = quiz.attemptLimit ?? 1;
        const remainingAttempts = Math.max(attemptLimit - studentAttemptCount, 0);
        const deadline = getQuizDeadline(quiz);
        const hasFutureAttempt =
          quiz.isActive && remainingAttempts > 0 && (!deadline || deadline.getTime() > Date.now());

        return res.json({
          ...sanitizeQuizForStudentView(quiz, hasFutureAttempt),
          studentAttemptCount,
          latestStudentResponse: sanitizeResponseForStudent(
            latestStudentResponse,
            hasFutureAttempt,
          ),
        });
      }

      res.json(quiz);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async create(req: AuthRequest, res: Response) {
    try {
      const { classId, lessonId } = req.params;
      const { title, questions, isActive, timeLimitSeconds, availableUntil, attemptLimit } =
        req.body;

      if (req.user?.role !== UserRole.TEACHER) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      if (typeof title !== "string" || !title.trim()) {
        throw new ValidationError("Quiz title is required");
      }

      const normalizedQuestions = normalizeQuestionsPayload(questions);
      const normalizedTimeLimit = parseOptionalPositiveInt(
        timeLimitSeconds,
        "Time limit",
      );
      const normalizedAttemptLimit =
        parseOptionalPositiveInt(attemptLimit, "Attempt limit") ?? 1;
      const normalizedAvailableUntil = parseOptionalDate(
        availableUntil,
        "Available until",
      );

      if (
        normalizedAvailableUntil &&
        normalizedAvailableUntil.getTime() <= Date.now()
      ) {
        throw new ValidationError("Available until must be in the future");
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
        const activeFlag = Boolean(isActive);
        const now = new Date();

        const newQuiz = await tx.quiz.create({
          data: {
            title,
            lessonId,
            isActive: activeFlag,
            timeLimitSeconds: normalizedTimeLimit,
            availableUntil: normalizedAvailableUntil,
            attemptLimit: normalizedAttemptLimit,
            activatedAt: activeFlag ? now : null,
          },
        });

        const createdQuestions = [];

        for (const [index, question] of normalizedQuestions.entries()) {
          const createdQuestion = await tx.question.create({
            data: {
              text: question.text,
              explanation: question.explanation,
              order: index,
              quizId: newQuiz.id,
              options: {
                create: question.options.map((opt) => ({
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                })),
              },
            },
            include: {
              options: true,
            },
          });
          createdQuestions.push(createdQuestion);
        }

        return {
          ...newQuiz,
          questions: createdQuestions,
        };
      });

      if (quiz.isActive) {
        await notifyStudentsAboutQuizActivation(quiz.id);
      }

      res.status(201).json(quiz);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Error creating quiz:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { classId, lessonId, quizId } = req.params;
      const {
        title,
        questions,
        isActive,
        timeLimitSeconds,
        availableUntil,
        attemptLimit,
      } = req.body;

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
            orderBy: {
              order: "asc",
            },
          },
        },
      });

      if (!existingQuiz) {
        return res.status(404).json({ error: "Quiz not found" });
      }

      const responsesCount = await prisma.response.count({
        where: {
          quizId,
        },
      });

      const shouldUpdateQuestions = Object.prototype.hasOwnProperty.call(
        req.body,
        "questions",
      );

      const normalizedQuestions = shouldUpdateQuestions
        ? normalizeQuestionsPayload(questions)
        : null;

      if (normalizedQuestions && responsesCount > 0) {
        throw new ValidationError(
          "Cannot modify questions after students have submitted answers",
        );
      }

      const hasTitleField = Object.prototype.hasOwnProperty.call(req.body, "title");
      if (hasTitleField && (typeof title !== "string" || !title.trim())) {
        throw new ValidationError("Quiz title is required");
      }
      const nextTitle =
        hasTitleField && typeof title === "string" && title.trim()
          ? title
          : existingQuiz.title;

      const hasTimeLimitField = Object.prototype.hasOwnProperty.call(
        req.body,
        "timeLimitSeconds",
      );
      const normalizedTimeLimit = hasTimeLimitField
        ? parseOptionalPositiveInt(timeLimitSeconds, "Time limit")
        : existingQuiz.timeLimitSeconds;

      const hasAttemptLimitField = Object.prototype.hasOwnProperty.call(
        req.body,
        "attemptLimit",
      );
      const normalizedAttemptLimit = hasAttemptLimitField
        ? parseOptionalPositiveInt(attemptLimit, "Attempt limit") ?? 1
        : existingQuiz.attemptLimit ?? 1;

      const hasAvailableUntilField = Object.prototype.hasOwnProperty.call(
        req.body,
        "availableUntil",
      );
      const normalizedAvailableUntil = hasAvailableUntilField
        ? parseOptionalDate(availableUntil, "Available until")
        : existingQuiz.availableUntil ?? null;

      if (
        normalizedAvailableUntil &&
        normalizedAvailableUntil.getTime() <= Date.now()
      ) {
        throw new ValidationError("Available until must be in the future");
      }

      const hasIsActiveField = Object.prototype.hasOwnProperty.call(
        req.body,
        "isActive",
      );
      const nextActiveState = hasIsActiveField
        ? Boolean(isActive)
        : existingQuiz.isActive;

      const updatedQuiz = await prisma.$transaction(async (tx) => {
        const activationData =
          !existingQuiz.isActive && nextActiveState
            ? { activatedAt: new Date() }
            : !nextActiveState
              ? { activatedAt: null }
              : {};

        const quiz = await tx.quiz.update({
          where: { id: quizId },
          data: {
            title: nextTitle,
            isActive: nextActiveState,
            timeLimitSeconds: normalizedTimeLimit,
            availableUntil: normalizedAvailableUntil,
            attemptLimit: normalizedAttemptLimit,
            ...activationData,
          },
        });

        if (!normalizedQuestions) {
          return {
            ...quiz,
            questions: existingQuiz.questions,
          };
        }

        await tx.question.deleteMany({
          where: { quizId },
        });

        const recreatedQuestions = [];
        for (const [index, question] of normalizedQuestions.entries()) {
          const createdQuestion = await tx.question.create({
            data: {
              text: question.text,
              explanation: question.explanation,
              order: index,
              quizId,
              options: {
                create: question.options.map((opt) => ({
                  text: opt.text,
                  isCorrect: opt.isCorrect,
                })),
              },
            },
            include: {
              options: true,
            },
          });
          recreatedQuestions.push(createdQuestion);
        }

        return {
          ...quiz,
          questions: recreatedQuestions,
        };
      });

      if (!existingQuiz.isActive && updatedQuiz.isActive) {
        await notifyStudentsAboutQuizActivation(updatedQuiz.id);
      }

      res.json(updatedQuiz);
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message });
      }
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
              firstName: true,
              lastName: true,
              externalId: true,
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
          lesson: {
            select: {
              id: true,
              class: {
                select: {
                  id: true,
                  teacherId: true,
                },
              },
            },
          },
          questions: {
            include: {
              options: true,
            },
            orderBy: {
              order: "asc",
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

      const attemptsTaken = await prisma.response.count({
        where: {
          quizId,
          userId: student.id,
        },
      });

      const resolvedAttemptLimit = quiz.attemptLimit ?? 1;
      if (resolvedAttemptLimit && attemptsTaken >= resolvedAttemptLimit) {
        return res.status(400).json({ error: "Attempt limit reached" });
      }

      const submissionDeadline = getQuizDeadline({
        availableUntil: quiz.availableUntil ?? null,
        timeLimitSeconds: quiz.timeLimitSeconds ?? null,
        activatedAt: quiz.activatedAt ?? null,
      });

      if (submissionDeadline && Date.now() > submissionDeadline.getTime()) {
        await prisma.quiz.update({
          where: { id: quizId },
          data: { isActive: false },
        });
        return res.status(400).json({ error: "Quiz has expired" });
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
          attemptNumber: attemptsTaken + 1,
          answers: {
            create: answers.map((answer) => ({
              questionId: answer.questionId,
              selectedOptionId: answer.selectedOptionId,
            })),
          },
        },
        include: {
          answers: {
            include: {
              question: {
                include: {
                  options: true,
                },
              },
              selectedOption: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      const attemptLimit = quiz.attemptLimit ?? 1;
      const remainingAttemptsAfterSubmission = Math.max(
        attemptLimit - (attemptsTaken + 1),
        0,
      );
      const reviewDeadline = submissionDeadline ?? getQuizDeadline(quiz);
      const shouldHideAnswers =
        quiz.isActive &&
        remainingAttemptsAfterSubmission > 0 &&
        (!reviewDeadline || reviewDeadline.getTime() > Date.now());

      res.status(201).json(
        sanitizeResponseForStudent(responseRecord, shouldHideAnswers),
      );

      const teacherId = quiz.lesson?.class?.teacherId;
      if (teacherId) {
        socketService.emitQuizResponsesUpdated(teacherId, {
          quizId,
          lessonId,
          classId,
        });
      }
    } catch (error) {
      console.error("Error submitting quiz response:", error);
      res.status(500).json({ error: "Failed to submit response" });
    }
  }
}

export default new QuizController();
