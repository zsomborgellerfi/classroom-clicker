import api, { ENDPOINTS } from "@/lib/api";

export interface QuizSummary {
  id: string;
  title: string;
  opensAt: string | null;
  closesAt: string | null;
  lesson: {
    id: string;
    title: string;
    class: {
      id: string;
      name: string;
    };
  };
  isFillable?: boolean;
}

export interface PastQuizSummary extends QuizSummary {
  bestScore: number;
  latestResponse: {
    score: number;
    submittedAt: string;
    attemptNumber: number;
  } | null;
}

export interface StudentDashboardResponse {
  pastQuizzes: PastQuizSummary[];
  nextQuiz: (QuizSummary & { isFillable?: boolean }) | null;
  stats: {
    totalQuizzes: number;
    completedQuizzes: number;
    averageScore: number;
  };
}

export async function fetchStudentDashboard() {
  const response = await api.get<StudentDashboardResponse>(
    ENDPOINTS.STUDENT.DASHBOARD(),
  );
  return response.data;
}
