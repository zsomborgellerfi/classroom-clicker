import { render, screen, waitFor } from "@testing-library/react";

import StudentDashboard from "../StudentDashboard";

const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => mockUseQuery(options),
}));

vi.mock("@/features/student/api/dashboard", () => ({
  fetchStudentDashboard: vi.fn(),
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

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

describe("StudentDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  it("renders the dashboard title", () => {
    render(<StudentDashboard />);

    expect(screen.getByText("student.dashboard.title")).toBeInTheDocument();
    expect(screen.getByText("student.dashboard.subtitle")).toBeInTheDocument();
  });

  it("renders stats cards", () => {
    render(<StudentDashboard />);

    expect(
      screen.getByText("student.dashboard.stats.totalQuizzes"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("student.dashboard.stats.completed"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("student.dashboard.stats.averageScore"),
    ).toBeInTheDocument();
  });

  it("displays data when loaded", async () => {
    const mockData = {
      stats: {
        totalQuizzes: 10,
        completedQuizzes: 5,
        averageScore: 0.85,
      },
      pastQuizzes: [],
      upcomingQuizzes: [],
    };

    mockUseQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    });

    render(<StudentDashboard />);

    await waitFor(() => {
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("85%")).toBeInTheDocument();
    });
  });

});

