import type { Class } from './class';
import type { Quiz } from './quiz';

export interface Lesson {
  id: string;
  title: string;
  content?: string;
  classId: string;
  class: Class;
  quizzes: Quiz[];
  createdAt: Date;
  updatedAt: Date;
} 