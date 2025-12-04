import { render, screen, waitFor } from "@testing-library/react";

import ClassDetails from "../ClassDetails";

const mockNavigate = vi.fn();
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
    STUDENT: {
      CLASSES: {
        GET: (id: string) => `/student/classes/${id}`,
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

describe("ClassDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
  });

  it("renders the class details page", () => {
    render(<ClassDetails />);

    expect(screen.getByTestId("student-layout")).toBeInTheDocument();
  });

  it("displays class data when loaded", async () => {
    const mockClassData = {
      id: "class-123",
      name: "Math 101",
      description: "Mathematics course",
      teacher: {
        id: "teacher-1",
        firstName: "John",
        lastName: "Doe",
      },
      lessons: [
        {
          id: "lesson-1",
          title: "Introduction",
          content: "Lesson content",
          createdAt: new Date().toISOString(),
          quizzes: [],
        },
      ],
    };

    mockUseQuery.mockReturnValue({
      data: mockClassData,
      isLoading: false,
      isError: false,
    });

    render(<ClassDetails />);

    await waitFor(() => {
      expect(screen.getByText("Math 101")).toBeInTheDocument();
      expect(screen.getByText("Introduction")).toBeInTheDocument();
    });
  });

});

