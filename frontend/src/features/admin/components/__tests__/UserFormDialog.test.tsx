import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UserRole } from "@/enums/userRole";
import api from "@/lib/api";

import { UserFormDialog } from "../UserFormDialog";

const mockOnClose = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: any) => {
    const mutation = {
      mutate: vi.fn((data) => {
        if (options?.mutationFn) {
          Promise.resolve(options.mutationFn(data))
            .then((result) => options?.onSuccess?.(result))
            .catch((error) => options?.onError?.(error));
        }
      }),
      isPending: false,
    };
    return mutation;
  },
  useQueryClient: () => ({
    invalidateQueries: vi.fn(),
  }),
}));

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
    put: vi.fn(),
  },
  ENDPOINTS: {
    ADMIN: {
      USERS: {
        CREATE: () => "/admin/users",
        UPDATE: (id: string) => `/admin/users/${id}`,
      },
    },
  },
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("UserFormDialog", () => {
  beforeEach(() => {
    mockOnClose.mockClear();
    vi.clearAllMocks();
  });

  it("renders create dialog when user is not provided", () => {
    render(<UserFormDialog open onClose={mockOnClose} />);

    expect(screen.getByText("admin.users.create.title")).toBeInTheDocument();
  });

  it("renders edit dialog when user is provided", () => {
    const user = {
      id: "user-1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: UserRole.STUDENT,
      externalId: "EXT123",
      createdAt: new Date().toISOString(),
    };

    render(<UserFormDialog open user={user} onClose={mockOnClose} />);

    expect(screen.getByText("admin.users.edit.title")).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(<UserFormDialog open={false} onClose={mockOnClose} />);

    expect(
      screen.queryByText("admin.users.create.title"),
    ).not.toBeInTheDocument();
  });

  it("pre-fills form fields in edit mode", () => {
    const user = {
      id: "user-1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: UserRole.TEACHER,
      externalId: "EXT123",
      createdAt: new Date().toISOString(),
    };

    render(<UserFormDialog open user={user} onClose={mockOnClose} />);

    const firstNameInput = screen.getByLabelText(
      /admin.users.firstName.label/i,
    ) as HTMLInputElement;
    const lastNameInput = screen.getByLabelText(
      /admin.users.lastName.label/i,
    ) as HTMLInputElement;
    const emailInput = screen.getByLabelText(
      /admin.users.email.label/i,
    ) as HTMLInputElement;

    expect(firstNameInput.value).toBe("John");
    expect(lastNameInput.value).toBe("Doe");
    expect(emailInput.value).toBe("test@example.com");
  });

  it("does not show password field in edit mode", () => {
    const user = {
      id: "user-1",
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
      role: UserRole.STUDENT,
      createdAt: new Date().toISOString(),
    };

    render(<UserFormDialog open user={user} onClose={mockOnClose} />);

    expect(
      screen.queryByLabelText(/admin.users.password.label/i),
    ).not.toBeInTheDocument();
  });

  it("shows password field in create mode", () => {
    render(<UserFormDialog open onClose={mockOnClose} />);

    expect(
      screen.getByLabelText(/admin.users.password.label/i),
    ).toBeInTheDocument();
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    render(<UserFormDialog open onClose={mockOnClose} />);

    const emailInput = screen.getByLabelText(/admin.users.email.label/i);
    await user.type(emailInput, "invalid-email");

    // Fill other required fields
    await user.type(
      screen.getByLabelText(/admin.users.firstName.label/i),
      "John",
    );
    await user.type(
      screen.getByLabelText(/admin.users.lastName.label/i),
      "Doe",
    );
    await user.type(
      screen.getByLabelText(/admin.users.password.label/i),
      "password123",
    );

    // Try to submit to trigger validation
    const submitButton = screen.getByRole("button", {
      name: /admin.users.create.button/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid email address/i)).toBeInTheDocument();
    });
  });

  it("shows validation error for short password", async () => {
    const user = userEvent.setup();
    render(<UserFormDialog open onClose={mockOnClose} />);

    await user.type(
      screen.getByLabelText(/admin.users.firstName.label/i),
      "John",
    );
    await user.type(
      screen.getByLabelText(/admin.users.lastName.label/i),
      "Doe",
    );
    await user.type(
      screen.getByLabelText(/admin.users.email.label/i),
      "john@example.com",
    );

    const passwordInput = screen.getByLabelText(/admin.users.password.label/i);
    await user.type(passwordInput, "123");

    // Try to submit to trigger validation
    const submitButton = screen.getByRole("button", {
      name: /admin.users.create.button/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Password must be at least 6 characters/i),
      ).toBeInTheDocument();
    });
  });

  it("submits create form with valid data", async () => {
    const user = userEvent.setup();
    const mockPost = vi.mocked(api.post);
    mockPost.mockResolvedValue({ data: { id: "new-user-1" } } as any);

    render(<UserFormDialog open onClose={mockOnClose} />);

    await user.type(
      screen.getByLabelText(/admin.users.firstName.label/i),
      "Jane",
    );
    await user.type(
      screen.getByLabelText(/admin.users.lastName.label/i),
      "Smith",
    );
    await user.type(
      screen.getByLabelText(/admin.users.email.label/i),
      "jane@example.com",
    );
    await user.type(
      screen.getByLabelText(/admin.users.password.label/i),
      "password123",
    );

    const submitButton = screen.getByRole("button", {
      name: /admin.users.create.button/i,
    });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<UserFormDialog open onClose={mockOnClose} />);

    const cancelButton = screen.getByRole("button", { name: /common.cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
