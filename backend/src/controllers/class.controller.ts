import crypto from "crypto";

import { PrismaClient } from "@prisma/client";
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
              name: true,
              email: true,
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
              name: true,
              email: true,
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
              name: true,
              email: true,
            },
          },
          students: {
            select: {
              id: true,
              name: true,
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
              name: true,
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
              name: true,
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
      const sanitizedMaxUses = maxUses && maxUses > 0 ? Math.floor(maxUses) : null;
      const effectiveExpires =
        expiresInHours && expiresInHours > 0
          ? expiresInHours
          : 48; // default 48 hours
      const expiresAt = new Date(Date.now() + effectiveExpires * 60 * 60 * 1000);

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

      const classData = await prisma.class.findUnique({ where: { id: classId } });

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
              name: true,
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
              name: true,
              email: true,
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
}

export default new ClassController();
