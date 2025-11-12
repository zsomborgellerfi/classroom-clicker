import { PrismaClient } from "@prisma/client";
import { Response } from "express";

import { UserRole } from "../enums/userRole";
import { AuthRequest } from "../types";

const prisma = new PrismaClient();

class TeacherController {
  async getStudents(req: AuthRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== UserRole.TEACHER) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const students = await prisma.user.findMany({
        where: {
          role: UserRole.STUDENT,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      res.json(students);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getDashboard(req: AuthRequest, res: Response) {
    try {
      if (!req.user || req.user.role !== UserRole.TEACHER) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const teacherId = req.user.id;

      const [classes, totalLessons, totalQuizzes] = await Promise.all([
        prisma.class.findMany({
          where: { teacherId },
          include: {
            students: {
              select: { id: true },
            },
          },
        }),
        prisma.lesson.count({
          where: { class: { teacherId } },
        }),
        prisma.quiz.count({
          where: { lesson: { class: { teacherId } } },
        }),
      ]);

      const uniqueStudentIds = new Set<string>();
      classes.forEach((c) => {
        c.students.forEach((student) => uniqueStudentIds.add(student.id));
      });

      const latestQuiz = await prisma.quiz.findFirst({
        where: {
          lesson: {
            class: {
              teacherId,
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
          _count: {
            select: {
              responses: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      const recentResponses = await prisma.response.findMany({
        where: {
          quiz: {
            lesson: {
              class: {
                teacherId,
              },
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
          quiz: {
            select: {
              id: true,
              title: true,
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
        take: 5,
      });

      res.json({
        totals: {
          classes: classes.length,
          lessons: totalLessons,
          quizzes: totalQuizzes,
          students: uniqueStudentIds.size,
        },
        latestQuiz,
        recentResponses,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}

export default new TeacherController();
