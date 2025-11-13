import type { Lesson } from "./lesson";
import type { Question } from "./question";
import type { StudentResponse } from "./response";

export interface Quiz {
  id: string;
  title: string;
  isActive: boolean;
  lessonId: string;
  createdAt: string;
  updatedAt: string;
  timeLimitSeconds?: number | null;
  availableUntil?: string | null;
  attemptLimit?: number | null;
  activatedAt?: string | null;
  lesson?: Lesson;
  questions: Question[];
  latestStudentResponse?: StudentResponse | null;
  studentAttemptCount?: number;
  _count?: {
    questions: number;
    responses: number;
  };
}
