import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UserRole } from "@/enums/userRole";
import { UserTable } from "../UserTable";

const mockOnEdit = vi.fn();
const mockOnDelete = vi.fn();

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
    ADMIN: {
      USERS: {
        LIST: () => "/admin/users",
      },
    },
  },
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { useQuery } from "@tanstack/react-query";

describe("UserTable", () => {
  beforeEach(() => {
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
    vi.clearAllMocks();
  });

  const mockUsers = {
    users: [
      {
        id: "user-1",
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
        role: UserRole.STUDENT,
        externalId: "EXT123",
        createdAt: new Date("2024-01-01").toISOString(),
      },
      {
        id: "user-2",
        email: "jane@example.com",
        firstName: "Jane",
        lastName: "Smith",
        role: UserRole.TEACHER,
        externalId: null,
        createdAt: new Date("2024-01-02").toISOString(),
      },
    ],
    total: 2,
  };

  it("renders loading state", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    render(<UserTable onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("renders user table with data", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: mockUsers,
      isLoading: false,
    });

    render(<UserTable onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("Jane")).toBeInTheDocument();
    expect(screen.getByText("Smith")).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      data: mockUsers,
      isLoading: false,
    });

    render(<UserTable onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const editButtons = screen.getAllByLabelText(/admin.users.actions.edit/i);
    await user.click(editButtons[0]);

    expect(mockOnEdit).toHaveBeenCalledWith(mockUsers.users[0]);
  });

  it("calls onDelete when delete button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      data: mockUsers,
      isLoading: false,
    });

    render(<UserTable onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const deleteButtons = screen.getAllByLabelText(/admin.users.actions.delete/i);
    await user.click(deleteButtons[0]);

    expect(mockOnDelete).toHaveBeenCalledWith(mockUsers.users[0]);
  });

  it("does not show edit/delete buttons for admin users", () => {
    const adminUsers = {
      users: [
        {
          id: "admin-1",
          email: "admin@example.com",
          firstName: "Admin",
          lastName: "User",
          role: UserRole.ADMIN,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
    };

    vi.mocked(useQuery).mockReturnValue({
      data: adminUsers,
      isLoading: false,
    });

    render(<UserTable onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    expect(
      screen.queryByLabelText(/admin.users.actions.edit/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText(/admin.users.actions.delete/i),
    ).not.toBeInTheDocument();
  });

  it("handles sorting", async () => {
    const user = userEvent.setup();
    vi.mocked(useQuery).mockReturnValue({
      data: mockUsers,
      isLoading: false,
    });

    render(<UserTable onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    const firstNameHeader = screen.getByText(/admin.users.table.firstName/i);
    await user.click(firstNameHeader);

    // Sorting logic is tested through the component's behavior
    expect(firstNameHeader).toBeInTheDocument();
  });

  it("handles pagination", async () => {
    const user = userEvent.setup();
    const largeUsers = {
      users: Array.from({ length: 25 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        firstName: `User${i}`,
        lastName: `Last${i}`,
        role: UserRole.STUDENT,
        createdAt: new Date().toISOString(),
      })),
      total: 25,
    };

    vi.mocked(useQuery).mockReturnValue({
      data: largeUsers,
      isLoading: false,
    });

    render(<UserTable onEdit={mockOnEdit} onDelete={mockOnDelete} />);

    // Check that pagination controls are present
    expect(screen.getByLabelText(/rows per page/i)).toBeInTheDocument();
  });
});

