import { render, screen, waitFor } from "@testing-library/react";

import ClassProgress from "../ClassProgress";

const mockNavigate = vi.fn();
const mockRefetch = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => mockUseQuery(options),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ classId: "class-123" }),
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
  ENDPOINTS: {
    CLASS: {
      GET: (id: string) => `/classes/${id}`,
      PROGRESS: (id: string) => `/classes/${id}/progress`,
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

vi.mock("@/shared/ui/Breadcrumbs", () => ({
  Breadcrumbs: ({ items }: { items: any[] }) => (
    <div data-testid="breadcrumbs">{items.map((item) => item.label).join(" > ")}</div>
  ),
}));

describe("ClassProgress", () => {
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

  it("renders the class progress page", () => {
    render(<ClassProgress />);

    expect(screen.getByTestId("teacher-layout")).toBeInTheDocument();
  });

  it("displays progress data when loaded", async () => {
    const mockClassData = {
      id: "class-123",
      name: "Math 101",
    };

    const mockProgress = [
      {
        id: "response-1",
        score: 0.85,
        submittedAt: new Date().toISOString(),
        user: {
          id: "student-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
        quiz: {
          id: "quiz-1",
          title: "Quiz 1",
        },
      },
    ];

    mockUseQuery.mockImplementation((options: any) => {
      if (options.queryKey[0] === "class") {
        return {
          data: mockClassData,
          isLoading: false,
          isError: false,
          refetch: mockRefetch,
        };
      }
      return {
        data: mockProgress,
        isLoading: false,
        isError: false,
        refetch: mockRefetch,
      };
    });

    render(<ClassProgress />);

    await waitFor(() => {
      expect(screen.getByText("Math 101")).toBeInTheDocument();
    });
  });

});

