import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import StudentQuiz from "../StudentQuiz";

const mockNavigate = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => mockUseQuery(options),
  useMutation: vi.fn((options: any) => ({
    mutate: vi.fn((data) => {
      if (options?.mutationFn) {
        Promise.resolve(options.mutationFn(data))
          .then(() => options?.onSuccess?.())
          .catch(() => options?.onError?.());
      }
    }),
    isPending: false,
  })),
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({
    classId: "class-123",
    lessonId: "lesson-123",
    quizId: "quiz-123",
  }),
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  ENDPOINTS: {
    STUDENT: {
      QUIZ: {
        GET: (classId: string, lessonId: string, quizId: string) =>
          `/student/classes/${classId}/lessons/${lessonId}/quizzes/${quizId}`,
      },
      RESPONSE: {
        CREATE: (classId: string, lessonId: string, quizId: string) =>
          `/student/classes/${classId}/lessons/${lessonId}/quizzes/${quizId}/responses`,
      },
    },
  },
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/layouts/StudentLayout", () => ({
  StudentLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="student-layout">{children}</div>
  ),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("StudentQuiz", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockInvalidateQueries.mockClear();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it("renders the quiz page", () => {
    render(<StudentQuiz />);

    expect(screen.getByTestId("student-layout")).toBeInTheDocument();
  });

  it("displays quiz data when loaded", async () => {
    const mockQuiz = {
      id: "quiz-123",
      title: "Math Quiz",
      isActive: true,
      questions: [
        {
          id: "question-1",
          text: "What is 2+2?",
          options: [
            { id: "opt-1", text: "3", isCorrect: false },
            { id: "opt-2", text: "4", isCorrect: true },
          ],
        },
      ],
    };

    mockUseQuery.mockReturnValue({
      data: mockQuiz,
      isLoading: false,
    });

    render(<StudentQuiz />);

    await waitFor(() => {
      expect(screen.getByText("Math Quiz")).toBeInTheDocument();
      expect(screen.getByText("What is 2+2?")).toBeInTheDocument();
    });
  });

});

