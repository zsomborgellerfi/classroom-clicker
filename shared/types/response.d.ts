import type { User } from './user';
import type { Quiz } from './quiz';
import type { Question } from './question';

export interface Response {
  id: string;
  selectedOption: number;
  userId: string;
  user: User;
  quizId: string;
  quiz: Quiz;
  questionId: string;
  question: Question;
  createdAt: Date;
} 