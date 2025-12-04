import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import StudentManagement from "../StudentManagement";

const mockNavigate = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => mockUseQuery(options),
  useMutation: vi.fn((options: any) => ({
    mutate: vi.fn((data) => {
      if (options?.mutationFn) {
        Promise.resolve(options.mutationFn(data))
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
    post: vi.fn(),
    delete: vi.fn(),
  },
  ENDPOINTS: {
    CLASS: {
      GET: (id: string) => `/classes/${id}`,
      STUDENTS: {
        LIST: (id: string) => `/classes/${id}/students`,
        ADD: (id: string) => `/classes/${id}/students`,
        REMOVE: (classId: string, studentId: string) =>
          `/classes/${classId}/students/${studentId}`,
      },
    },
    TEACHER: {
      STUDENTS: {
        LIST: () => "/teacher/students",
      },
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

vi.mock("@/features/teacher/components/StudentDetailsModal", () => ({
  StudentDetailsModal: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="student-details-modal">
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

vi.mock("@/lib/export", () => ({
  exportClassRoster: vi.fn(),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("StudentManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
    mockInvalidateQueries.mockClear();
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
  });

  it("renders the student management page", () => {
    render(<StudentManagement />);

    expect(screen.getByTestId("teacher-layout")).toBeInTheDocument();
  });

});

