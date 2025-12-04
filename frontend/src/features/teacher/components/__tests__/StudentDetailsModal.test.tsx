import { render, screen, waitFor } from "@testing-library/react";

import { StudentDetailsModal } from "../StudentDetailsModal";

const mockOnClose = vi.fn();

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
    CLASS: {
      GET_STUDENT_DETAILS: (classId: string, studentId: string) =>
        `/classes/${classId}/students/${studentId}`,
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

import api from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

describe("StudentDetailsModal", () => {
  beforeEach(() => {
    mockOnClose.mockClear();
    vi.clearAllMocks();
  });

  const mockStudentData = {
    student: {
      id: "student-1",
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      externalId: "EXT123",
    },
    stats: {
      totalQuizzes: 10,
      completedQuizzes: 7,
      averageScore: 0.85,
      lastActivity: new Date("2024-01-15").toISOString(),
    },
    recentResponses: [
      {
        id: "response-1",
        score: 0.9,
        submittedAt: new Date("2024-01-15").toISOString(),
        quiz: {
          id: "quiz-1",
          title: "Algebra Quiz 1",
        },
      },
      {
        id: "response-2",
        score: 0.8,
        submittedAt: new Date("2024-01-14").toISOString(),
        quiz: {
          id: "quiz-2",
          title: "Calculus Quiz 1",
        },
      },
    ],
  };

  it("renders loading state", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(
      <StudentDetailsModal
        classId="class-1"
        studentId="student-1"
        open
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(
      <StudentDetailsModal
        classId="class-1"
        studentId="student-1"
        open={false}
        onClose={mockOnClose}
      />,
    );

    expect(
      screen.queryByText("teacher.classes.students.details.title"),
    ).not.toBeInTheDocument();
  });

  it("renders student information", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockStudentData,
      isLoading: false,
    } as any);

    render(
      <StudentDetailsModal
        classId="class-1"
        studentId="student-1"
        open
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText(/EXT123/i)).toBeInTheDocument();
  });

  it("displays completion rate", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockStudentData,
      isLoading: false,
    });

    render(
      <StudentDetailsModal
        classId="class-1"
        studentId="student-1"
        open
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("70%")).toBeInTheDocument(); // 7/10 * 100
  });

  it("displays average score", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockStudentData,
      isLoading: false,
    });

    render(
      <StudentDetailsModal
        classId="class-1"
        studentId="student-1"
        open
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("85%")).toBeInTheDocument(); // 0.85 * 100
  });

  it("displays recent responses", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockStudentData,
      isLoading: false,
    });

    render(
      <StudentDetailsModal
        classId="class-1"
        studentId="student-1"
        open
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("Algebra Quiz 1")).toBeInTheDocument();
    expect(screen.getByText("Calculus Quiz 1")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument(); // 0.9 * 100
    expect(screen.getByText("80%")).toBeInTheDocument(); // 0.8 * 100
  });

  it("displays empty state when no responses", () => {
    const dataWithoutResponses = {
      ...mockStudentData,
      recentResponses: [],
    };

    vi.mocked(useQuery).mockReturnValue({
      data: dataWithoutResponses,
      isLoading: false,
    });

    render(
      <StudentDetailsModal
        classId="class-1"
        studentId="student-1"
        open
        onClose={mockOnClose}
      />,
    );

    expect(
      screen.getByText("teacher.classes.students.details.noResponses"),
    ).toBeInTheDocument();
  });

  it("does not query when studentId is null", () => {
    render(
      <StudentDetailsModal
        classId="class-1"
        studentId={null}
        open
        onClose={mockOnClose}
      />,
    );

    const queryOptions = vi.mocked(useQuery).mock.calls[0]?.[0];
    expect(queryOptions?.enabled).toBe(false);
  });

  it("does not query when classId is missing", () => {
    render(
      <StudentDetailsModal
        classId=""
        studentId="student-1"
        open
        onClose={mockOnClose}
      />,
    );

    const queryOptions = vi.mocked(useQuery).mock.calls[0]?.[0];
    expect(queryOptions?.enabled).toBe(false);
  });
});

