import { render, screen, waitFor } from "@testing-library/react";

import TeacherDashboard from "../TeacherDashboard";

const mockNavigate = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => mockUseQuery(options),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
  ENDPOINTS: {
    TEACHER: {
      DASHBOARD: () => "/teacher/dashboard",
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

describe("TeacherDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it("renders the dashboard title", () => {
    render(<TeacherDashboard />);

    expect(screen.getByText("teacher.dashboard.title")).toBeInTheDocument();
  });

  it("renders stats cards", () => {
    render(<TeacherDashboard />);

    expect(screen.getByText("teacher.dashboard.stats.classes")).toBeInTheDocument();
    expect(screen.getByText("teacher.dashboard.stats.lessons")).toBeInTheDocument();
    expect(screen.getByText("teacher.dashboard.stats.students")).toBeInTheDocument();
    expect(screen.getByText("teacher.dashboard.stats.quizzes")).toBeInTheDocument();
  });

  it("displays data when loaded", async () => {
    const mockData = {
      totals: {
        classes: 5,
        lessons: 20,
        quizzes: 30,
        students: 50,
      },
      latestQuiz: {
        id: "quiz-1",
        title: "Latest Quiz",
        isActive: true,
        lesson: {
          id: "lesson-1",
          title: "Lesson 1",
          class: {
            id: "class-1",
            name: "Math 101",
          },
        },
        _count: { responses: 10 },
      },
      recentResponses: [],
    };

    mockUseQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
    });

    render(<TeacherDashboard />);

    await waitFor(() => {
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument();
      expect(screen.getByText("30")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
    });
  });
});

