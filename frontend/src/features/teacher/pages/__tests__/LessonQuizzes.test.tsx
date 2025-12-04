import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import LessonQuizzes from "../LessonQuizzes";

const mockInvalidateQueries = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => mockUseQuery(options),
  useMutation: vi.fn((options: any) => ({
    mutate: vi.fn((id: string) => {
      if (options?.mutationFn) {
        Promise.resolve(options.mutationFn(id))
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
  useParams: () => ({
    classId: "class-123",
    lessonId: "lesson-123",
  }),
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  },
  ENDPOINTS: {
    LESSON: {
      GET: (classId: string, lessonId: string) =>
        `/classes/${classId}/lessons/${lessonId}`,
    },
    QUIZ: {
      GET: (classId: string, lessonId: string, quizId: string) =>
        `/classes/${classId}/lessons/${lessonId}/quizzes/${quizId}`,
      DELETE: (classId: string, lessonId: string, quizId: string) =>
        `/classes/${classId}/lessons/${lessonId}/quizzes/${quizId}`,
    },
  },
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/layouts/TeacherLayout", () => ({
  TeacherLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="teacher-layout">{children}</div>
  ),
}));

vi.mock("@/features/teacher/components/QuizTable", () => ({
  QuizTable: ({
    onEdit,
    onDelete,
  }: {
    onEdit: (quiz: any) => void;
    onDelete: (quiz: any) => void;
  }) => (
    <div data-testid="quiz-table">
      <button
        onClick={() =>
          onEdit({
            id: "quiz-1",
            title: "Quiz 1",
          })
        }
      >
        Edit Quiz
      </button>
      <button
        onClick={() =>
          onDelete({
            id: "quiz-1",
            title: "Quiz 1",
          })
        }
      >
        Delete Quiz
      </button>
    </div>
  ),
}));

vi.mock("@/features/teacher/components/QuizFormDialog", () => ({
  QuizFormDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="quiz-form-dialog">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/ui/AlertDialog", () => ({
  AlertDialog: ({
    open,
    onConfirm,
    onClose,
  }: {
    open: boolean;
    onConfirm: () => void;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="alert-dialog">
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/ui/Breadcrumbs", () => ({
  Breadcrumbs: ({ items }: { items: any[] }) => (
    <div data-testid="breadcrumbs">{items.map((item) => item.label).join(" > ")}</div>
  ),
}));

vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("LessonQuizzes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvalidateQueries.mockClear();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it("renders the lesson quizzes page", () => {
    render(<LessonQuizzes />);

    expect(screen.getByTestId("teacher-layout")).toBeInTheDocument();
  });

  it("opens create quiz dialog when button is clicked", async () => {
    const user = userEvent.setup();
    const mockLessonData = {
      id: "lesson-123",
      title: "Lesson 1",
      class: {
        name: "Math 101",
      },
    };

    mockUseQuery.mockReturnValue({
      data: mockLessonData,
      isLoading: false,
    });

    render(<LessonQuizzes />);

    const createButton = screen.getByText("teacher.quizzes.create.button");
    await user.click(createButton);

    expect(screen.getByTestId("quiz-form-dialog")).toBeInTheDocument();
  });

  it("opens delete confirmation dialog when delete is triggered", async () => {
    const user = userEvent.setup();
    render(<LessonQuizzes />);

    const deleteButton = screen.getByText("Delete Quiz");
    await user.click(deleteButton);

    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
  });
});

