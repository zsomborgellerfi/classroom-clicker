import { render, screen, waitFor } from "@testing-library/react";

import AdminDashboard from "../AdminDashboard";

const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => mockUseQuery(options),
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
  ENDPOINTS: {
    ADMIN: {
      INSIGHTS: () => "/admin/insights",
    },
  },
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/layouts/AdminLayout", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="admin-layout">{children}</div>
  ),
}));

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  it("renders the dashboard title", () => {
    render(<AdminDashboard />);

    expect(screen.getByText("admin.dashboard.title")).toBeInTheDocument();
    expect(screen.getByText("admin.dashboard.subtitle")).toBeInTheDocument();
  });

  it("renders stats cards", () => {
    render(<AdminDashboard />);

    expect(screen.getByText("admin.dashboard.insights.users")).toBeInTheDocument();
    expect(screen.getByText("admin.dashboard.insights.teachers")).toBeInTheDocument();
    expect(screen.getByText("admin.dashboard.insights.students")).toBeInTheDocument();
    expect(screen.getByText("admin.dashboard.insights.admins")).toBeInTheDocument();
    expect(screen.getByText("admin.dashboard.insights.classes")).toBeInTheDocument();
    expect(screen.getByText("admin.dashboard.insights.lessons")).toBeInTheDocument();
    expect(screen.getByText("admin.dashboard.insights.quizzes")).toBeInTheDocument();
  });

  it("displays data when loaded", async () => {
    const mockData = {
      totals: {
        users: 100,
        teachers: 10,
        students: 85,
        admins: 5,
        classes: 20,
        lessons: 50,
        quizzes: 100,
      },
      recentUsers: [
        {
          id: "user-1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          role: "STUDENT",
          createdAt: new Date().toISOString(),
        },
      ],
      topClasses: [
        {
          id: "class-1",
          name: "Math 101",
          createdAt: new Date().toISOString(),
          _count: {
            students: 25,
            lessons: 10,
          },
        },
      ],
    };

    mockUseQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    });

    render(<AdminDashboard />);

    await waitFor(() => {
      expect(screen.getAllByText("100").length).toBeGreaterThan(0);
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Math 101")).toBeInTheDocument();
    });
  });
});

