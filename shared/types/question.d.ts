import type { Quiz } from "./quiz";
import type { QuizOption } from "./quizOption";

export interface Question {
  id: string;
  text: string;
  explanation?: string | null;
  order: number;
  quizId: string;
  quiz: Quiz;
  options: QuizOption[];
  createdAt: string;
  updatedAt: string;
}
