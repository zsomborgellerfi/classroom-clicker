import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import TeacherClasses from "../TeacherClasses";

const mockInvalidateQueries = vi.fn();

vi.mock("@tanstack/react-query", () => ({
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

vi.mock("@/lib/api", () => ({
  default: {
    delete: vi.fn(),
  },
  ENDPOINTS: {
    CLASS: {
      DELETE: (id: string) => `/classes/${id}`,
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

vi.mock("@/features/teacher/components/ClassTable", () => ({
  ClassTable: ({
    onEdit,
    onDelete,
  }: {
    onEdit: (classData: any) => void;
    onDelete: (classData: any) => void;
  }) => (
    <div data-testid="class-table">
      <button
        onClick={() =>
          onEdit({
            id: "class-1",
            name: "Math 101",
          })
        }
      >
        Edit Class
      </button>
      <button
        onClick={() =>
          onDelete({
            id: "class-1",
            name: "Math 101",
          })
        }
      >
        Delete Class
      </button>
    </div>
  ),
  ClassListItem: {},
}));

vi.mock("@/features/teacher/components/ClassFormDialog", () => ({
  ClassFormDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="class-form-dialog">
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

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("TeacherClasses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvalidateQueries.mockClear();
  });

  it("renders the classes page", () => {
    render(<TeacherClasses />);

    expect(screen.getByText("teacher.classes.title")).toBeInTheDocument();
    expect(screen.getByTestId("class-table")).toBeInTheDocument();
  });

  it("opens create dialog when create button is clicked", async () => {
    const user = userEvent.setup();
    render(<TeacherClasses />);

    const createButton = screen.getByText("teacher.classes.create.button");
    await user.click(createButton);

    expect(screen.getByTestId("class-form-dialog")).toBeInTheDocument();
  });

  it("opens edit dialog when edit is triggered", async () => {
    const user = userEvent.setup();
    render(<TeacherClasses />);

    const editButton = screen.getByText("Edit Class");
    await user.click(editButton);

    expect(screen.getByTestId("class-form-dialog")).toBeInTheDocument();
  });

  it("opens delete confirmation dialog when delete is triggered", async () => {
    const user = userEvent.setup();
    render(<TeacherClasses />);

    const deleteButton = screen.getByText("Delete Class");
    await user.click(deleteButton);

    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
  });

  it("deletes class when confirmed", async () => {
    const user = userEvent.setup();
    const api = await import("@/lib/api");
    vi.mocked(api.default.delete).mockResolvedValue({} as any);

    render(<TeacherClasses />);

    const deleteButton = screen.getByText("Delete Class");
    await user.click(deleteButton);

    const confirmButton = screen.getByText("Confirm");
    await user.click(confirmButton);

    await waitFor(() => {
      expect(api.default.delete).toHaveBeenCalled();
      expect(mockInvalidateQueries).toHaveBeenCalled();
    });
  });
});

