import type { User } from './user';

export interface Class {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
  teacher: User;
  students: User[];
  createdAt: Date;
  updatedAt: Date;
} 