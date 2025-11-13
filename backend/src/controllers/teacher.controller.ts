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

      const search = (req.query.search as string) || "";
      const limit = Math.min(
        parseInt((req.query.limit as string) || "50", 10),
        100,
      );
      const offset = parseInt((req.query.offset as string) || "0", 10);
      const validOrderBy = ["firstName", "lastName", "email"];
      const orderByParam = (req.query.orderBy as string) || "firstName";
      const orderBy = validOrderBy.includes(orderByParam)
        ? orderByParam
        : "firstName";
      const order = (req.query.order as string) === "desc" ? "desc" : "asc";

      const searchFilter = search
        ? {
            OR: [
              { firstName: { contains: search, mode: "insensitive" as const } },
              { lastName: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

      const where = {
        role: UserRole.STUDENT,
        ...searchFilter,
      };

      const [students, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
          orderBy: {
            [orderBy]: order,
          },
          take: limit,
          skip: offset,
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        data: students,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      });
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
              firstName: true,
              lastName: true,
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
