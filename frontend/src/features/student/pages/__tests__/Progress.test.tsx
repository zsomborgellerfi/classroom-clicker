import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import Progress from "../Progress";

const mockNavigate = vi.fn();
const mockRefetch = vi.fn();
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
    STUDENT: {
      PROGRESS: () => "/student/progress",
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

describe("Progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockRefetch.mockClear();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });
  });

  it("renders the progress page", () => {
    render(<Progress />);

    expect(screen.getByText("student.progress.title")).toBeInTheDocument();
  });

  it("displays progress data when loaded", async () => {
    const mockProgress = [
      {
        id: "response-1",
        score: 0.85,
        submittedAt: new Date().toISOString(),
        attemptNumber: 1,
        quiz: {
          id: "quiz-1",
          title: "Quiz 1",
          attemptLimit: 3,
          isActive: true,
          availableUntil: null,
          timeLimitSeconds: null,
          activatedAt: new Date().toISOString(),
          lesson: {
            id: "lesson-1",
            title: "Lesson 1",
            class: {
              id: "class-1",
              name: "Math 101",
            },
          },
        },
      },
    ];

    mockUseQuery.mockReturnValue({
      data: mockProgress,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    render(<Progress />);

    await waitFor(() => {
      expect(screen.getByText("Math 101")).toBeInTheDocument();
    });
  });

  it("displays empty state when no progress", () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    render(<Progress />);

    expect(screen.getByText("student.progress.empty")).toBeInTheDocument();
  });

});

