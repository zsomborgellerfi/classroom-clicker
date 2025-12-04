import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import UserManagement from "../UserManagement";

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
    ADMIN: {
      USERS: {
        DELETE: (id: string) => `/admin/users/${id}`,
      },
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

vi.mock("@/features/admin/components/UserTable", () => ({
  UserTable: ({
    onEdit,
    onDelete,
  }: {
    onEdit: (user: any) => void;
    onDelete: (user: any) => void;
  }) => (
    <div data-testid="user-table">
      <button
        onClick={() =>
          onEdit({
            id: "user-1",
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
          })
        }
      >
        Edit User
      </button>
      <button
        onClick={() =>
          onDelete({
            id: "user-1",
            firstName: "John",
            lastName: "Doe",
            email: "john@example.com",
          })
        }
      >
        Delete User
      </button>
    </div>
  ),
}));

vi.mock("@/features/admin/components/UserFormDialog", () => ({
  UserFormDialog: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="user-form-dialog">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}));

vi.mock("@/features/admin/components/UserImportDialog", () => ({
  UserImportDialog: ({
    open,
    onClose,
  }: {
    open: boolean;
    onClose: () => void;
  }) =>
    open ? (
      <div data-testid="user-import-dialog">
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
  downloadUserImportTemplate: vi.fn(),
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

describe("UserManagement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvalidateQueries.mockClear();
  });

  it("renders the user management page", () => {
    render(<UserManagement />);

    expect(screen.getByText("admin.users.title")).toBeInTheDocument();
    expect(screen.getByTestId("user-table")).toBeInTheDocument();
  });

  it("opens create dialog when create button is clicked", async () => {
    const user = userEvent.setup();
    render(<UserManagement />);

    const createButton = screen.getByText("admin.users.create.button");
    await user.click(createButton);

    expect(screen.getByTestId("user-form-dialog")).toBeInTheDocument();
  });

  it("opens import dialog when import button is clicked", async () => {
    const user = userEvent.setup();
    render(<UserManagement />);

    const importButton = screen.getByText("admin.users.import.openButton");
    await user.click(importButton);

    expect(screen.getByTestId("user-import-dialog")).toBeInTheDocument();
  });

  it("opens edit dialog when edit is triggered", async () => {
    const user = userEvent.setup();
    render(<UserManagement />);

    const editButton = screen.getByText("Edit User");
    await user.click(editButton);

    expect(screen.getByTestId("user-form-dialog")).toBeInTheDocument();
  });

  it("opens delete confirmation dialog when delete is triggered", async () => {
    const user = userEvent.setup();
    render(<UserManagement />);

    const deleteButton = screen.getByText("Delete User");
    await user.click(deleteButton);

    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
  });

  it("deletes user when confirmed", async () => {
    const user = userEvent.setup();
    const apiModule = await import("@/lib/api");
    const mockDelete = vi.mocked(apiModule.default.delete);
    mockDelete.mockResolvedValue({} as any);

    render(<UserManagement />);

    const deleteButton = screen.getByText("Delete User");
    await user.click(deleteButton);

    const confirmButton = screen.getByText("Confirm");
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalled();
      expect(mockInvalidateQueries).toHaveBeenCalled();
    });
  });
});

