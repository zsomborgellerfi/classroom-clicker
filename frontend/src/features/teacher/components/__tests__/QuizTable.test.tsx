import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { QuizTable } from "../QuizTable";

const mockOnEdit = vi.fn();
const mockOnDelete = vi.fn();
const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({
    data: undefined,
    isLoading: false,
  })),
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
  ENDPOINTS: {
    QUIZ: {
      LIST: (classId: string, lessonId: string) =>
        `/classes/${classId}/lessons/${lessonId}/quizzes`,
    },
  },
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (params) {
        return `${key} ${JSON.stringify(params)}`;
      }
      return key;
    },
  }),
}));

import { useQuery } from "@tanstack/react-query";

describe("QuizTable", () => {
  beforeEach(() => {
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  const mockQuizzes = [
    {
      id: "quiz-1",
      title: "Algebra Quiz 1",
      isActive: true,
      classId: "class-1",
      lessonId: "lesson-1",
      attemptLimit: 3,
      timeLimitSeconds: 1800,
      availableUntil: null,
      createdAt: new Date("2024-01-01").toISOString(),
      _count: {
        questions: 5,
        responses: 10,
      },
    },
    {
      id: "quiz-2",
      title: "Calculus Quiz 1",
      isActive: false,
      classId: "class-1",
      lessonId: "lesson-1",
      attemptLimit: null,
      timeLimitSeconds: null,
      availableUntil: new Date("2024-12-31").toISOString(),
      createdAt: new Date("2024-01-02").toISOString(),
      _count: {
        questions: 3,
        responses: 5,
      },
    },
  ];

  it("renders loading state", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(
      <QuizTable
        classId="class-1"
        lessonId="lesson-1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText("common.loading")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(
      <QuizTable
        classId="class-1"
        lessonId="lesson-1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText("teacher.quizzes.empty")).toBeInTheDocument();
  });

  it("renders quizzes table with data", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockQuizzes,
      isLoading: false,
    });

    render(
      <QuizTable
        classId="class-1"
        lessonId="lesson-1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText("Algebra Quiz 1")).toBeInTheDocument();
    expect(screen.getByText("Calculus Quiz 1")).toBeInTheDocument();
  });

  it("displays active status chip", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockQuizzes,
      isLoading: false,
    });

    render(
      <QuizTable
        classId="class-1"
        lessonId="lesson-1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText("teacher.quizzes.table.active")).toBeInTheDocument();
    expect(screen.getByText("teacher.quizzes.table.inactive")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      data: mockQuizzes,
      isLoading: false,
    });

    render(
      <QuizTable
        classId="class-1"
        lessonId="lesson-1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    const editButtons = screen.getAllByLabelText(/teacher.quizzes.actions.edit/i);
    await user.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockQuizzes[0]);
  });

  it("calls onDelete when delete button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      data: mockQuizzes,
      isLoading: false,
    });

    render(
      <QuizTable
        classId="class-1"
        lessonId="lesson-1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    const deleteButtons = screen.getAllByLabelText(/teacher.quizzes.actions.delete/i);
    await user.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith(mockQuizzes[0]);
  });

  it("navigates to quiz details when view button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      data: mockQuizzes,
      isLoading: false,
    });

    render(
      <QuizTable
        classId="class-1"
        lessonId="lesson-1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    const viewButtons = screen.getAllByLabelText(/teacher.quizzes.actions.view/i);
    await user.click(viewButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith(
      "/teacher/classes/class-1/lessons/lesson-1/quizzes/quiz-1",
    );
  });
});

