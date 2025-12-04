import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import StudentClasses from "../StudentClasses";

const mockRefetch = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => mockUseQuery(options),
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
  },
  ENDPOINTS: {
    STUDENT: {
      CLASSES: {
        LIST: () => "/student/classes",
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

vi.mock("@/features/student/components/ClassCard", () => ({
  ClassCard: ({ classItem }: { classItem: any }) => (
    <div data-testid={`class-card-${classItem.id}`}>{classItem.name}</div>
  ),
}));

vi.mock("@/features/student/components/ClassJoinDialog", () => ({
  ClassJoinDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="class-join-dialog">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

describe("StudentClasses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockClear();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });
  });

  it("renders the page title", () => {
    render(<StudentClasses />);

    expect(screen.getByText("student.classes.title")).toBeInTheDocument();
    expect(screen.getByText("student.classes.subtitle")).toBeInTheDocument();
  });

  it("renders join button", () => {
    render(<StudentClasses />);

    const joinButton = screen.getByLabelText("student.classes.join.title");
    expect(joinButton).toBeInTheDocument();
  });

  it("opens join dialog when join button is clicked", async () => {
    const user = userEvent.setup();
    render(<StudentClasses />);

    const joinButton = screen.getByLabelText("student.classes.join.title");
    await user.click(joinButton);

    expect(screen.getByTestId("class-join-dialog")).toBeInTheDocument();
  });

  it("displays classes when loaded", async () => {
    const mockClasses = [
      {
        id: "class-1",
        name: "Math 101",
        description: "Mathematics course",
      },
      {
        id: "class-2",
        name: "Physics 201",
        description: "Physics course",
      },
    ];

    mockUseQuery.mockReturnValue({
      data: mockClasses,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    render(<StudentClasses />);

    await waitFor(() => {
      expect(screen.getByTestId("class-card-class-1")).toBeInTheDocument();
      expect(screen.getByTestId("class-card-class-2")).toBeInTheDocument();
    });
  });

  it("displays empty state when no classes", () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    render(<StudentClasses />);

    expect(screen.getByText("student.classes.empty")).toBeInTheDocument();
  });

});

