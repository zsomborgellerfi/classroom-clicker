import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { User } from "../types";
import { AuthRequest } from "../types";
import { sendPasswordResetEmail } from "../services/email.service";

const prisma = new PrismaClient();

class AuthController {
  async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName, role } = req.body as {
        email: string;
        password: string;
        firstName: string;
        lastName: string;
        role?: User["role"];
      };

      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: role || "STUDENT",
        },
      });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: "24h" },
      );

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body as {
        email: string;
        password: string;
      };

      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET!,
        { expiresIn: "24h" },
      );

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async me(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          createdAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body as { email: string };

      const user = await prisma.user.findUnique({
        where: { email },
      });

      let resetToken: string | null = null;

      if (user) {
        resetToken = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

        await prisma.user.update({
          where: { id: user.id },
          data: {
            passwordResetToken: resetToken,
            passwordResetExpires: expiresAt,
          },
        });

        try {
          await sendPasswordResetEmail({
            to: user.email,
            token: resetToken,
            recipientName: `${user.firstName} ${user.lastName}`,
          });
        } catch (emailError) {
          console.error("Failed to send password reset email:", emailError);
        }
      }

      const responsePayload: Record<string, unknown> = {
        message:
          "If an account exists for that email, a password reset link has been generated.",
      };

      if (
        process.env.NODE_ENV !== "production" &&
        resetToken &&
        process.env.EXPOSE_RESET_TOKEN !== "false"
      ) {
        responsePayload.resetToken = resetToken;
      }

      if (resetToken) {
        console.log(
          `[Password Reset] Generated token for ${email}: ${resetToken}`,
        );
      }

      res.json(responsePayload);
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ error: "Failed to initiate password reset" });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { token, password } = req.body as {
        token: string;
        password: string;
      };

      const user = await prisma.user.findFirst({
        where: {
          passwordResetToken: token,
          passwordResetExpires: {
            gt: new Date(),
          },
        },
      });

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired token" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });

      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  }
}

export default new AuthController();
