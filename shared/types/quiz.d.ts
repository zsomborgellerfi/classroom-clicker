import type { Lesson } from './lesson';
import type { Question } from './question';
import { QuizOption } from './quizOption';

export interface Quiz {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  lessonId: string;
  questions: Question[];
  _count?: {
    questions: number;
    responses: number;
  };
}

export interface QuizQuestion {
  id: string;
  question: string;
  quizId: string;
  options: QuizOption[];
}

export interface StudentResponse {
  id: string;
  quizId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  answers: {
    questionId: string;
    selectedOptionId: string;
  }[];
  score: number;
  submittedAt: string;
}
