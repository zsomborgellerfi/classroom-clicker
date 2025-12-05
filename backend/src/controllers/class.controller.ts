import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { Request, Response } from "express";

import { UserRole } from "../enums/userRole";
import { AuthRequest } from "../types";

const prisma = new PrismaClient();

const generateUniqueInviteCode = async () => {
  while (true) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const existing = await prisma.classInvite.findUnique({
      where: { code },
    });
    if (!existing) {
      return code;
    }
  }
};

class ClassController {
  async create(req: AuthRequest, res: Response) {
    try {
      const { name, description } = req.body;
      const teacherId = req.user?.id;

      if (!teacherId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify teacher exists
      const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const newClass = await prisma.class.create({
        data: {
          name,
          description,
          teacherId,
        },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              externalId: true,
            },
          },
        },
      });

      res.status(201).json(newClass);
    } catch (error) {
      console.error("Error creating class:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getAll(req: AuthRequest, res: Response) {
    try {
      const teacherId = req.user?.id;

      if (!teacherId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Verify teacher exists
      const teacher = await prisma.user.findUnique({
        where: { id: teacherId },
        include: {
          classes: true,
        },
      });

      if (!teacher) {
        return res.status(404).json({ error: "Teacher not found" });
      }

      const classes = await prisma.class.findMany({
        where: {
          teacherId,
        },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              externalId: true,
            },
          },
          _count: {
            select: {
              students: true,
              lessons: true,
            },
          },
        },
      });

      res.json(classes);
    } catch (error) {
      console.error("Error fetching classes:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const classData = await prisma.class.findUnique({
        where: { id },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              externalId: true,
            },
          },
          students: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          lessons: {
            include: {
              quizzes: {
                select: {
                  id: true,
                  title: true,
                  isActive: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      if (req.user?.role === UserRole.TEACHER) {
        if (classData.teacherId !== req.user.id) {
          return res.status(403).json({ error: "Unauthorized" });
        }
      } else if (req.user?.role === UserRole.STUDENT) {
        const isEnrolled = classData.students.some(
          (student) => student.id === req.user?.id,
        );
        if (!isEnrolled) {
          return res.status(403).json({ error: "Unauthorized" });
        }

        // For students, enrich quiz data with attempt information
        if (classData.lessons && req.user?.id) {
          const studentId = req.user.id;
          const quizIds = classData.lessons.flatMap((lesson) =>
            lesson.quizzes.map((quiz) => quiz.id),
          );

          // Get all student attempts for quizzes in this class
          const studentAttempts = await prisma.response.groupBy({
            by: ["quizId"],
            where: {
              quizId: { in: quizIds },
              userId: studentId,
            },
            _count: {
              id: true,
            },
          });

          const attemptCountMap = new Map(
            studentAttempts.map((attempt) => [
              attempt.quizId,
              attempt._count.id,
            ]),
          );

          // Enrich each quiz with attempt information
          classData.lessons = classData.lessons.map((lesson) => ({
            ...lesson,
            quizzes: lesson.quizzes.map((quiz) => {
              const studentAttemptCount = attemptCountMap.get(quiz.id) ?? 0;
              return {
                ...quiz,
                attemptLimit: null, // Will be fetched from full quiz data if needed
                availableUntil: null, // Will be fetched from full quiz data if needed
                studentAttemptCount,
              };
            }),
          }));

          // Fetch full quiz data to get attemptLimit and availableUntil
          const fullQuizzes = await prisma.quiz.findMany({
            where: { id: { in: quizIds } },
            select: {
              id: true,
              attemptLimit: true,
              availableUntil: true,
              timeLimitSeconds: true,
              activatedAt: true,
            },
          });

          const quizDataMap = new Map(
            fullQuizzes.map((q) => [
              q.id,
              {
                attemptLimit: q.attemptLimit,
                availableUntil: q.availableUntil,
                timeLimitSeconds: q.timeLimitSeconds,
                activatedAt: q.activatedAt,
              },
            ]),
          );

          // Merge full quiz data
          classData.lessons = classData.lessons.map((lesson) => ({
            ...lesson,
            quizzes: lesson.quizzes.map((quiz) => {
              const fullData = quizDataMap.get(quiz.id);
              if (!fullData) return quiz;

              const studentAttemptCount = attemptCountMap.get(quiz.id) ?? 0;
              const attemptLimit = fullData.attemptLimit ?? 1;
              const remainingAttempts = Math.max(
                attemptLimit - studentAttemptCount,
                0,
              );

              // Calculate deadline (same logic as getQuizDeadline)
              const deadlineCandidates: number[] = [];
              if (fullData.availableUntil) {
                deadlineCandidates.push(
                  new Date(fullData.availableUntil).getTime(),
                );
              }
              if (fullData.timeLimitSeconds && fullData.activatedAt) {
                deadlineCandidates.push(
                  new Date(fullData.activatedAt).getTime() +
                    fullData.timeLimitSeconds * 1000,
                );
              }
              const deadline =
                deadlineCandidates.length > 0
                  ? new Date(Math.min(...deadlineCandidates))
                  : null;

              const isExpired = deadline
                ? deadline.getTime() <= Date.now()
                : false;
              const canTakeQuiz =
                quiz.isActive && remainingAttempts > 0 && !isExpired;

              return {
                ...quiz,
                attemptLimit: fullData.attemptLimit,
                availableUntil: fullData.availableUntil,
                studentAttemptCount,
                canTakeQuiz,
              };
            }),
          }));
        }
      }

      res.json(classData);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const teacherId = req.user?.id;

      const existingClass = await prisma.class.findUnique({
        where: { id },
      });

      if (!existingClass) {
        return res.status(404).json({ error: "Class not found" });
      }

      if (existingClass.teacherId !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updatedClass = await prisma.class.update({
        where: { id },
        data: {
          name,
          description,
        },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              externalId: true,
            },
          },
        },
      });

      res.json(updatedClass);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const teacherId = req.user?.id;

      const existingClass = await prisma.class.findUnique({
        where: { id },
      });

      if (!existingClass) {
        return res.status(404).json({ error: "Class not found" });
      }

      if (existingClass.teacherId !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await prisma.class.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async addStudent(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { studentId } = req.body;
      const teacherId = req.user?.id;

      const existingClass = await prisma.class.findUnique({
        where: { id },
      });

      if (!existingClass) {
        return res.status(404).json({ error: "Class not found" });
      }

      if (existingClass.teacherId !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const student = await prisma.user.findFirst({
        where: {
          id: studentId,
          role: UserRole.STUDENT,
        },
      });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      const updatedClass = await prisma.class.update({
        where: { id },
        data: {
          students: {
            connect: { id: studentId },
          },
        },
        include: {
          students: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      res.json(updatedClass);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async bulkAddStudents(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { studentIds } = req.body;
      const teacherId = req.user?.id;

      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        return res
          .status(400)
          .json({ error: "studentIds must be a non-empty array" });
      }

      const existingClass = await prisma.class.findUnique({
        where: { id },
      });

      if (!existingClass) {
        return res.status(404).json({ error: "Class not found" });
      }

      if (existingClass.teacherId !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Verify all students exist and are actually students
      const students = await prisma.user.findMany({
        where: {
          id: { in: studentIds },
          role: UserRole.STUDENT,
        },
        select: { id: true },
      });

      if (students.length !== studentIds.length) {
        return res.status(400).json({ error: "Some student IDs are invalid" });
      }

      const updatedClass = await prisma.class.update({
        where: { id },
        data: {
          students: {
            connect: studentIds.map((studentId: string) => ({ id: studentId })),
          },
        },
        include: {
          students: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      res.json(updatedClass);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async removeStudent(req: AuthRequest, res: Response) {
    try {
      const { id, studentId } = req.params;
      const teacherId = req.user?.id;

      const existingClass = await prisma.class.findUnique({
        where: { id },
      });

      if (!existingClass) {
        return res.status(404).json({ error: "Class not found" });
      }

      if (existingClass.teacherId !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const updatedClass = await prisma.class.update({
        where: { id },
        data: {
          students: {
            disconnect: { id: studentId },
          },
        },
        include: {
          students: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      res.json(updatedClass);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getInvites(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const teacherId = req.user?.id;

      const classData = await prisma.class.findUnique({ where: { id } });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      if (classData.teacherId !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const invites = await prisma.classInvite.findMany({
        where: { classId: id },
        orderBy: { createdAt: "desc" },
      });

      res.json(invites);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async createInvite(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { expiresInHours, maxUses } = req.body as {
        expiresInHours?: number;
        maxUses?: number;
      };
      const teacherId = req.user?.id;

      const classData = await prisma.class.findUnique({ where: { id } });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      if (classData.teacherId !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const code = await generateUniqueInviteCode();
      const sanitizedMaxUses =
        maxUses && maxUses > 0 ? Math.floor(maxUses) : null;
      const effectiveExpires =
        expiresInHours && expiresInHours > 0 ? expiresInHours : 48; // default 48 hours
      const expiresAt = new Date(
        Date.now() + effectiveExpires * 60 * 60 * 1000,
      );

      const invite = await prisma.classInvite.create({
        data: {
          classId: id,
          code,
          createdBy: teacherId,
          maxUses: sanitizedMaxUses,
          expiresAt,
        },
      });

      res.status(201).json(invite);
    } catch (error) {
      console.error("Error creating invite:", error);
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async deleteInvite(req: AuthRequest, res: Response) {
    try {
      const { classId, inviteId } = req.params;
      const teacherId = req.user?.id;

      const classData = await prisma.class.findUnique({
        where: { id: classId },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      if (classData.teacherId !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const invite = await prisma.classInvite.findFirst({
        where: {
          id: inviteId,
          classId,
        },
      });

      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      await prisma.classInvite.delete({ where: { id: inviteId } });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async joinWithInviteCode(req: AuthRequest, res: Response) {
    try {
      const { code } = req.body as { code: string };
      const student = req.user;

      if (!student || student.role !== UserRole.STUDENT) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const normalizedCode = code?.trim().toUpperCase();

      if (!normalizedCode) {
        return res.status(400).json({ error: "Invite code is required" });
      }

      const invite = await prisma.classInvite.findUnique({
        where: { code: normalizedCode },
      });

      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      if (invite.expiresAt && invite.expiresAt < new Date()) {
        return res.status(400).json({ error: "Invite expired" });
      }

      if (invite.maxUses && invite.uses >= invite.maxUses) {
        return res.status(400).json({ error: "Invite has no remaining uses" });
      }

      const alreadyEnrolled = await prisma.class.findFirst({
        where: {
          id: invite.classId,
          students: {
            some: {
              id: student.id,
            },
          },
        },
      });

      if (alreadyEnrolled) {
        return res.status(400).json({ error: "Already enrolled" });
      }

      try {
        await prisma.$transaction(async (tx) => {
          await tx.class.update({
            where: { id: invite.classId },
            data: {
              students: {
                connect: { id: student.id },
              },
            },
          });

          const updateResult = await tx.classInvite.updateMany({
            where: {
              id: invite.id,
              ...(invite.maxUses != null
                ? {
                    uses: {
                      lt: invite.maxUses,
                    },
                  }
                : {}),
            },
            data: {
              uses: {
                increment: 1,
              },
            },
          });

          if (updateResult.count === 0) {
            throw new Error("INVITE_LIMIT");
          }
        });
      } catch (error) {
        if ((error as Error).message === "INVITE_LIMIT") {
          return res
            .status(400)
            .json({ error: "Invite has no remaining uses" });
        }
        throw error;
      }

      res.status(200).json({ message: "Joined class successfully" });
    } catch (error) {
      console.error("Error joining class via invite:", error);
      res.status(500).json({ error: "Failed to join class" });
    }
  }

  async getEnrolled(req: AuthRequest, res: Response) {
    try {
      const studentId = req.user?.id;

      const enrolledClasses = await prisma.class.findMany({
        where: {
          students: {
            some: {
              id: studentId,
            },
          },
        },
        include: {
          teacher: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              students: true,
              lessons: true,
            },
          },
        },
      });

      res.json(enrolledClasses);
    } catch (error) {
      console.error("Error fetching enrolled classes:", error);
      res.status(500).json({ error: "Failed to fetch enrolled classes" });
    }
  }

  async getStudentProgress(req: AuthRequest, res: Response) {
    try {
      const studentId = req.user?.id;

      const responses = await prisma.response.findMany({
        where: {
          userId: studentId,
        },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
              attemptLimit: true,
              isActive: true,
              availableUntil: true,
              timeLimitSeconds: true,
              activatedAt: true,
              lesson: {
                select: {
                  id: true,
                  title: true,
                  class: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
      });

      res.json(responses);
    } catch (error) {
      console.error("Error fetching student progress:", error);
      res.status(500).json({ error: "Failed to fetch progress" });
    }
  }

  async getClassProgress(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const teacherId = req.user?.id;

      const classData = await prisma.class.findUnique({
        where: { id },
        select: {
          id: true,
          teacherId: true,
        },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      if (classData.teacherId !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const responses = await prisma.response.findMany({
        where: {
          quiz: {
            lesson: {
              classId: id,
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              externalId: true,
            },
          },
          quiz: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
      });

      res.json(responses);
    } catch (error) {
      console.error("Error fetching class progress:", error);
      res.status(500).json({ error: "Failed to fetch class progress" });
    }
  }

  async getStudentDetails(req: AuthRequest, res: Response) {
    try {
      const { id, studentId } = req.params;
      const teacherId = req.user?.id;

      const classData = await prisma.class.findUnique({
        where: { id },
        select: {
          id: true,
          teacherId: true,
        },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      if (classData.teacherId !== teacherId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Verify student is enrolled in this class
      const student = await prisma.user.findFirst({
        where: {
          id: studentId,
          role: UserRole.STUDENT,
          enrolledIn: {
            some: { id },
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          externalId: true,
        },
      });

      if (!student) {
        return res
          .status(404)
          .json({ error: "Student not found or not enrolled" });
      }

      // Get all quizzes for this class
      const classQuizzes = await prisma.quiz.findMany({
        where: {
          lesson: {
            classId: id,
          },
        },
        select: {
          id: true,
          title: true,
          createdAt: true,
        },
      });

      // Get ALL student's responses for quizzes in this class (for accurate stats)
      const allResponses = await prisma.response.findMany({
        where: {
          userId: studentId,
          quiz: {
            lesson: {
              classId: id,
            },
          },
        },
        include: {
          quiz: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
      });

      // Get recent 10 responses for display
      const recentResponses = allResponses.slice(0, 10);

      // Calculate stats
      const totalQuizzes = classQuizzes.length;
      const completedQuizzes = new Set(allResponses.map((r) => r.quizId)).size;

      // Calculate average score by averaging quiz-level averages (not all responses)
      // This ensures each quiz counts equally regardless of number of attempts
      const quizScoreMap = new Map<string, number[]>();
      for (const response of allResponses) {
        const cappedScore = Math.min(response.score, 1.0); // Cap at 100%
        const existing = quizScoreMap.get(response.quizId) || [];
        existing.push(cappedScore);
        quizScoreMap.set(response.quizId, existing);
      }

      const quizAverages: number[] = [];
      for (const [quizId, scores] of quizScoreMap.entries()) {
        if (scores.length > 0) {
          const quizAverage =
            scores.reduce((sum, s) => sum + s, 0) / scores.length;
          quizAverages.push(quizAverage);
        }
      }

      const averageScore =
        quizAverages.length > 0
          ? quizAverages.reduce((sum, s) => sum + s, 0) / quizAverages.length
          : 0;

      const lastActivity =
        allResponses.length > 0 ? allResponses[0].submittedAt : null;

      res.json({
        student,
        stats: {
          totalQuizzes,
          completedQuizzes,
          averageScore,
          lastActivity,
        },
        recentResponses: recentResponses,
      });
    } catch (error) {
      console.error("Error fetching student details:", error);
      res.status(500).json({ error: "Failed to fetch student details" });
    }
  }

  async getStudentDashboard(req: AuthRequest, res: Response) {
    try {
      const studentId = req.user?.id;

      if (!studentId || req.user?.role !== UserRole.STUDENT) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const [
        pastQuizzes,
        candidateQuizzes,
        totalQuizzes,
        completedQuizzes,
        avgScore,
      ] = await Promise.all([
        prisma.quiz.findMany({
          where: {
            responses: {
              some: {
                userId: studentId,
              },
            },
            lesson: {
              class: {
                students: {
                  some: {
                    id: studentId,
                  },
                },
              },
            },
          },
          include: {
            lesson: {
              select: {
                id: true,
                title: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            responses: {
              where: {
                userId: studentId,
              },
              select: {
                id: true,
                score: true,
                submittedAt: true,
                attemptNumber: true,
              },
              orderBy: {
                submittedAt: "desc",
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 20,
        }),
        prisma.quiz.findMany({
          where: {
            lesson: {
              class: {
                students: {
                  some: {
                    id: studentId,
                  },
                },
              },
            },
          },
          select: {
            id: true,
            title: true,
            createdAt: true,
            isActive: true,
            activatedAt: true,
            availableUntil: true,
            timeLimitSeconds: true,
            attemptLimit: true,
            lesson: {
              select: {
                id: true,
                title: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            responses: {
              where: {
                userId: studentId,
              },
              select: {
                id: true,
              },
            },
          },
          orderBy: [{ createdAt: "asc" }],
        }),
        prisma.quiz.count({
          where: {
            lesson: {
              class: {
                students: {
                  some: {
                    id: studentId,
                  },
                },
              },
            },
          },
        }),
        prisma.response.count({
          where: {
            userId: studentId,
          },
        }),
        prisma.response.aggregate({
          where: {
            userId: studentId,
          },
          _avg: {
            score: true,
          },
        }),
      ]);

      const computeDeadline = (quiz: {
        availableUntil: Date | null;
        timeLimitSeconds: number | null;
        activatedAt: Date | null;
      }) => {
        const candidates: number[] = [];
        if (quiz.availableUntil) {
          candidates.push(quiz.availableUntil.getTime());
        }
        if (quiz.timeLimitSeconds && quiz.activatedAt) {
          candidates.push(
            quiz.activatedAt.getTime() + quiz.timeLimitSeconds * 1000,
          );
        }
        if (!candidates.length) {
          return null;
        }
        return new Date(Math.min(...candidates));
      };

      const mapQuizSummary = (quiz: {
        id: string;
        title: string;
        activatedAt: Date | null;
        createdAt: Date;
        availableUntil: Date | null;
        timeLimitSeconds: number | null;
        attemptLimit: number | null;
        isActive: boolean;
        lesson: {
          id: string;
          title: string;
          class: {
            id: string;
            name: string;
          };
        };
        responses?: Array<{ id: string }>;
      }) => ({
        id: quiz.id,
        title: quiz.title,
        opensAt: quiz.activatedAt ?? quiz.createdAt,
        closesAt: computeDeadline(quiz),
        lesson: quiz.lesson,
      });

      // Filter past quizzes: closed quizzes (inactive or deadline passed) where student has responses
      const now = new Date();
      const closedPastQuizzes = pastQuizzes
        .filter((quiz) => {
          const deadline = computeDeadline(quiz);
          const isClosed =
            !quiz.isActive ||
            (deadline !== null && deadline.getTime() <= now.getTime());
          return isClosed && quiz.responses.length > 0;
        })
        .slice(0, 5)
        .map((quiz) => ({
          ...mapQuizSummary(quiz),
          bestScore:
            quiz.responses.length > 0
              ? Math.max(...quiz.responses.map((r) => Math.min(r.score, 1.0)))
              : 0,
          latestResponse: quiz.responses[0]
            ? {
                score: Math.min(quiz.responses[0].score, 1.0),
                submittedAt: quiz.responses[0].submittedAt,
                attemptNumber: quiz.responses[0].attemptNumber,
              }
            : null,
        }));

      const sortedCandidates = candidateQuizzes
        .map((quiz) => ({
          quiz,
          opensAt: quiz.activatedAt ?? quiz.createdAt,
          closesAt: computeDeadline(quiz),
          attempts: {
            count: quiz.responses?.length ?? 0,
            limit: quiz.attemptLimit ?? 1,
          },
        }))
        .sort((a, b) => a.opensAt.getTime() - b.opensAt.getTime());

      const findFillable = (entry: {
        quiz: {
          isActive: boolean;
          responses?: Array<{ id: string }>;
        };
        closesAt: Date | null;
        attempts: { count: number; limit: number };
      }) => {
        const hasAttemptsLeft = entry.attempts.count < entry.attempts.limit;
        const isNotExpired =
          entry.closesAt === null || entry.closesAt.getTime() > now.getTime();
        return entry.quiz.isActive && hasAttemptsLeft && isNotExpired;
      };

      const nextFillable = sortedCandidates.find(findFillable);
      const nextFuture = sortedCandidates.find((entry) => {
        const hasAttemptsLeft = entry.attempts.count < entry.attempts.limit;
        const isNotExpired =
          entry.closesAt === null || entry.closesAt.getTime() > now.getTime();
        return (
          hasAttemptsLeft &&
          isNotExpired &&
          entry.opensAt.getTime() > now.getTime()
        );
      });

      const upcomingQuizEntry = nextFillable ?? nextFuture ?? null;
      const upcomingQuiz = upcomingQuizEntry?.quiz ?? null;
      const nextQuizFillable = Boolean(
        upcomingQuizEntry && nextFillable?.quiz === upcomingQuizEntry.quiz,
      );

      res.json({
        pastQuizzes: closedPastQuizzes,
        nextQuiz: upcomingQuiz
          ? {
              ...mapQuizSummary(upcomingQuiz),
              isFillable: nextQuizFillable,
            }
          : null,
        stats: {
          totalQuizzes,
          completedQuizzes,
          averageScore: avgScore._avg.score ?? 0,
        },
      });
    } catch (error) {
      console.error("Error fetching student dashboard:", error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  }
}

export default new ClassController();
