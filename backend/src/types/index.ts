import { Request } from "express";

export interface User {
  id: string;
  email: string;
  password: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: User["role"];
  };
}
