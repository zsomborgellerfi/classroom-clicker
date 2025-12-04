import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LessonTable } from "../LessonTable";

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
    LESSON: {
      LIST: (classId: string) => `/classes/${classId}/lessons`,
    },
  },
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { useQuery } from "@tanstack/react-query";

describe("LessonTable", () => {
  beforeEach(() => {
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
    mockNavigate.mockClear();
    vi.clearAllMocks();
  });

  const mockLessons = [
    {
      id: "lesson-1",
      title: "Introduction to Algebra",
      content: "This lesson covers basic algebraic concepts",
      classId: "class-1",
      createdAt: new Date("2024-01-01").toISOString(),
    },
    {
      id: "lesson-2",
      title: "Advanced Calculus",
      content: "This lesson covers advanced calculus topics",
      classId: "class-1",
      createdAt: new Date("2024-01-02").toISOString(),
    },
  ];

  it("renders loading state", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    render(
      <LessonTable
        classId="class-1"
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
      <LessonTable
        classId="class-1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText("teacher.lessons.empty")).toBeInTheDocument();
  });

  it("renders lessons table with data", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockLessons,
      isLoading: false,
    });

    render(
      <LessonTable
        classId="class-1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    expect(screen.getByText("Introduction to Algebra")).toBeInTheDocument();
    expect(screen.getByText("Advanced Calculus")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      data: mockLessons,
      isLoading: false,
    });

    render(
      <LessonTable
        classId="class-1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    const editButtons = screen.getAllByLabelText(/teacher.lessons.actions.edit/i);
    await user.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockLessons[0]);
  });

  it("calls onDelete when delete button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      data: mockLessons,
      isLoading: false,
    });

    render(
      <LessonTable
        classId="class-1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    const deleteButtons = screen.getAllByLabelText(/teacher.lessons.actions.delete/i);
    await user.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith(mockLessons[0]);
  });

  it("navigates to quizzes when view quizzes button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      data: mockLessons,
      isLoading: false,
    });

    render(
      <LessonTable
        classId="class-1"
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />,
    );

    const viewQuizzesButtons = screen.getAllByLabelText(
      /teacher.lessons.actions.viewQuizzes/i,
    );
    await user.click(viewQuizzesButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith(
      "/teacher/classes/class-1/lessons/lesson-1/quizzes",
    );
  });
});

