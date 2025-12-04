import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ClassDetails from "../ClassDetails";

const mockNavigate = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => mockUseQuery(options),
  useMutation: vi.fn((options: any) => ({
    mutate: vi.fn((id: string) => {
      if (options?.mutationFn) {
        Promise.resolve(options.mutationFn(id))
          .then(() => options?.onSuccess?.())
          .catch(() => options?.onError?.());
      }
    }),
    isPending: false,
  })),
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ classId: "class-123" }),
}));

vi.mock("@/lib/api", () => ({
  default: {
    get: vi.fn(),
    delete: vi.fn(),
  },
  ENDPOINTS: {
    CLASS: {
      GET: (id: string) => `/classes/${id}`,
    },
    LESSON: {
      DELETE: (classId: string, lessonId: string) =>
        `/classes/${classId}/lessons/${lessonId}`,
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

vi.mock("@/features/teacher/components/LessonTable", () => ({
  LessonTable: ({
    onEdit,
    onDelete,
  }: {
    onEdit: (lesson: any) => void;
    onDelete: (lesson: any) => void;
  }) => (
    <div data-testid="lesson-table">
      <button
        onClick={() =>
          onEdit({
            id: "lesson-1",
            title: "Lesson 1",
          })
        }
      >
        Edit Lesson
      </button>
      <button
        onClick={() =>
          onDelete({
            id: "lesson-1",
            title: "Lesson 1",
          })
        }
      >
        Delete Lesson
      </button>
    </div>
  ),
}));

vi.mock("@/features/teacher/components/LessonFormDialog", () => ({
  LessonFormDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="lesson-form-dialog">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/ui/AlertDialog", () => ({
  AlertDialog: ({
    open,
    onConfirm,
    onClose,
  }: {
    open: boolean;
    onConfirm: () => void;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="alert-dialog">
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null,
}));

vi.mock("@/shared/ui/Breadcrumbs", () => ({
  Breadcrumbs: ({ items }: { items: any[] }) => (
    <div data-testid="breadcrumbs">{items.map((item) => item.label).join(" > ")}</div>
  ),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("ClassDetails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockInvalidateQueries.mockClear();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it("renders the class details page", () => {
    render(<ClassDetails />);

    expect(screen.getByTestId("teacher-layout")).toBeInTheDocument();
  });

  it("displays class data when loaded", async () => {
    const mockClassData = {
      id: "class-123",
      name: "Math 101",
      description: "Mathematics course",
      students: [],
    };

    mockUseQuery.mockReturnValue({
      data: mockClassData,
      isLoading: false,
    });

    render(<ClassDetails />);

    await waitFor(() => {
      expect(screen.getByText("Math 101")).toBeInTheDocument();
    });
  });

  it("opens create lesson dialog when button is clicked", async () => {
    const user = userEvent.setup();
    const mockClassData = {
      id: "class-123",
      name: "Math 101",
      students: [],
    };

    mockUseQuery.mockReturnValue({
      data: mockClassData,
      isLoading: false,
    });

    render(<ClassDetails />);

    const createButton = screen.getByText("teacher.lessons.create.button");
    await user.click(createButton);

    expect(screen.getByTestId("lesson-form-dialog")).toBeInTheDocument();
  });
});

