import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

import { UserRole } from "../enums/userRole";

const prisma = new PrismaClient();

class AdminController {
  async getUsers(req: Request, res: Response) {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const sortBy = String(req.query.sortBy || "name");
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
            name: true,
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
      const { name, email, role } = req.body;

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
          name,
          email,
          role: role as UserRole,
        },
        select: {
          id: true,
          name: true,
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
}

export default new AdminController();
