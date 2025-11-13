import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Request, Response } from "express";

import { UserRole } from "../enums/userRole";

const prisma = new PrismaClient();

class AdminController {
  async getUsers(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const sortBy = String(req.query.sortBy || "firstName");
      const order = String(req.query.order || "asc");

      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          skip,
          take: limit,
          orderBy: {
            [sortBy]: order.toLowerCase(),
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            createdAt: true,
          },
        }),
        prisma.user.count(),
      ]);

      res.json({
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  }

  async updateUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, role } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (existingUser.role === UserRole.ADMIN || role === UserRole.ADMIN) {
        return res.status(403).json({
          error: "Admin roles cannot be modified through this endpoint",
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: {
          firstName,
          lastName,
          email,
          role: role as UserRole,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  }

  async deleteUser(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const existingUser = await prisma.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (existingUser.role === UserRole.ADMIN) {
        return res.status(403).json({
          error: "Admin users cannot be deleted through this endpoint",
        });
      }

      await prisma.user.delete({
        where: { id },
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  }

  async getInsights(req: Request, res: Response) {
    try {
      const [totalUsers, teacherCount, studentCount, adminCount, classCount, lessonCount, quizCount] =
        await Promise.all([
          prisma.user.count(),
          prisma.user.count({ where: { role: UserRole.TEACHER } }),
          prisma.user.count({ where: { role: UserRole.STUDENT } }),
          prisma.user.count({ where: { role: UserRole.ADMIN } }),
          prisma.class.count(),
          prisma.lesson.count(),
          prisma.quiz.count(),
        ]);

      const recentUsers = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      const topClasses = await prisma.class.findMany({
        take: 5,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: {
            select: {
              students: true,
              lessons: true,
            },
          },
        },
      });

      res.json({
        totals: {
          users: totalUsers,
          teachers: teacherCount,
          students: studentCount,
          admins: adminCount,
          classes: classCount,
          lessons: lessonCount,
          quizzes: quizCount,
        },
        recentUsers,
        topClasses,
      });
    } catch (error) {
      console.error("Error fetching admin insights:", error);
      res.status(500).json({ error: "Failed to fetch insights" });
    }
  }

  async importUsers(req: Request, res: Response) {
    try {
      const { users } = req.body as {
        users?: Array<{
          firstName?: string;
          lastName?: string;
          name?: string; // Support legacy format for backward compatibility
          email?: string;
          password?: string;
          role?: string;
        }>;
      };

      if (!Array.isArray(users) || users.length === 0) {
        return res.status(400).json({ error: "No users provided" });
      }

      const summary = {
        created: 0,
        skipped: 0,
        errors: [] as Array<{ email?: string; reason: string }>,
      };

      for (const rawUser of users) {
        // Support both new format (firstName/lastName) and legacy format (name)
        let firstName: string | undefined;
        let lastName: string | undefined;
        
        if (rawUser.firstName && rawUser.lastName) {
          firstName = rawUser.firstName.trim();
          lastName = rawUser.lastName.trim();
        } else if (rawUser.name) {
          // Legacy format: split name on first space
          const nameParts = rawUser.name.trim().split(/\s+/);
          firstName = nameParts[0] || "";
          lastName = nameParts.slice(1).join(" ") || "";
        }
        
        const email = rawUser.email?.trim().toLowerCase();
        const password = rawUser.password;
        const role = (rawUser.role || UserRole.STUDENT).toUpperCase();

        if (!firstName || !lastName || !email || !password) {
          summary.skipped += 1;
          summary.errors.push({ email: rawUser.email, reason: "Missing required fields" });
          continue;
        }

        if (![UserRole.ADMIN, UserRole.TEACHER, UserRole.STUDENT].includes(role as UserRole)) {
          summary.skipped += 1;
          summary.errors.push({ email, reason: "Invalid role" });
          continue;
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          summary.skipped += 1;
          summary.errors.push({ email, reason: "Email already exists" });
          continue;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
          data: {
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role: role as UserRole,
          },
        });

        summary.created += 1;
      }

      res.json(summary);
    } catch (error) {
      console.error("Error importing users:", error);
      res.status(500).json({ error: "Failed to import users" });
    }
  }
}

export default new AdminController();
