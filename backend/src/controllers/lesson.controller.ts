import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

import { UserRole } from "../enums/userRole";
import { AuthRequest } from "../types";

const prisma = new PrismaClient();

class LessonController {
  async create(req: AuthRequest, res: Response) {
    try {
      const { classId } = req.params;
      const { title, content } = req.body;
      const teacherId = req.user?.id;

      if (req.user?.role !== UserRole.TEACHER) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Verify class exists and belongs to teacher
      const classData = await prisma.class.findFirst({
        where: {
          id: classId,
          teacherId,
        },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      const lesson = await prisma.lesson.create({
        data: {
          title,
          content,
          classId,
        },
      });

      res.status(201).json(lesson);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getAll(req: AuthRequest, res: Response) {
    try {
      const { classId } = req.params;
      const user = req.user;

      if (user?.role === UserRole.TEACHER) {
        const classData = await prisma.class.findFirst({
          where: {
            id: classId,
            teacherId: user.id,
          },
        });

        if (!classData) {
          return res.status(404).json({ error: "Class not found" });
        }
      } else if (user?.role === UserRole.STUDENT) {
        const isEnrolled = await prisma.class.findFirst({
          where: {
            id: classId,
            students: {
              some: {
                id: user.id,
              },
            },
          },
        });

        if (!isEnrolled) {
          return res.status(403).json({ error: "Unauthorized" });
        }
      } else {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const lessons = await prisma.lesson.findMany({
        where: {
          classId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      res.json(lessons);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { classId, lessonId } = req.params;
      const { title, content } = req.body;
      const teacherId = req.user?.id;

      if (req.user?.role !== UserRole.TEACHER) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Verify class belongs to teacher
      const classData = await prisma.class.findFirst({
        where: {
          id: classId,
          teacherId,
        },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      const lesson = await prisma.lesson.update({
        where: {
          id: lessonId,
          classId,
        },
        data: {
          title,
          content,
        },
      });

      res.json(lesson);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { classId, lessonId } = req.params;
      const teacherId = req.user?.id;

      if (req.user?.role !== UserRole.TEACHER) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Verify class belongs to teacher
      const classData = await prisma.class.findFirst({
        where: {
          id: classId,
          teacherId,
        },
      });

      if (!classData) {
        return res.status(404).json({ error: "Class not found" });
      }

      await prisma.lesson.delete({
        where: {
          id: lessonId,
          classId,
        },
      });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { classId, lessonId } = req.params;
      const user = req.user;

      if (user?.role === UserRole.TEACHER) {
        const classData = await prisma.class.findFirst({
          where: {
            id: classId,
            teacherId: user.id,
          },
        });

        if (!classData) {
          return res.status(404).json({ error: "Class not found" });
        }
      } else if (user?.role === UserRole.STUDENT) {
        const isEnrolled = await prisma.class.findFirst({
          where: {
            id: classId,
            students: {
              some: {
                id: user.id,
              },
            },
          },
        });

        if (!isEnrolled) {
          return res.status(403).json({ error: "Unauthorized" });
        }
      } else {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const lesson = await prisma.lesson.findUnique({
        where: {
          id: lessonId,
          classId,
        },
        include: {
          class: {
            select: {
              id: true,
              name: true,
            },
          },
          quizzes: true,
        },
      });

      if (!lesson) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      res.json(lesson);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}

export default new LessonController(); 
