import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";

import { UserRole } from "../enums/userRole";
import { AuthRequest } from "../types";
import { User } from "../types";

export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
      role: User["role"];
    };
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const roleCheck = (roles: User["role"][]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Allow ADMIN access to all routes
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      console.log("Required roles:", roles);
      console.log("User role:", req.user.role);
      return res.status(403).json({
        error: "Unauthorized",
        requiredRoles: roles,
        userRole: req.user.role,
      });
    }
    next();
  };
};
