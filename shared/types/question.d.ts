import type { Quiz } from './quiz';
import type { QuizOption } from './quizOption';

export interface Question {
  id: string;
  text: string;
  quizId: string;
  quiz: Quiz;
  options: QuizOption[];
} 