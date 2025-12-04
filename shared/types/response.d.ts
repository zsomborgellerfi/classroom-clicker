import type { QuizOption } from "./quizOption";
import type { Question } from "./question";
import type { User } from "./user";

export interface QuizResponseAnswer {
  id: string;
  questionId: string;
  selectedOptionId: string;
  question?: Question;
  selectedOption?: QuizOption;
  isCorrect?: boolean;
}

export interface StudentResponse {
  id: string;
  quizId: string;
  userId: string;
  user: Pick<User, "id" | "firstName" | "lastName" | "externalId">;
  answers: QuizResponseAnswer[];
  score: number;
  attemptNumber: number;
  submittedAt: string;
}
