import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { UserImportDialog, downloadUserImportTemplate } from "../UserImportDialog";

const mockOnClose = vi.fn();
const mockOnComplete = vi.fn();

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
}));

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(),
  },
  ENDPOINTS: {
    ADMIN: {
      USERS: {
        IMPORT: () => "/admin/users/import",
      },
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

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import api from "@/lib/api";

describe("UserImportDialog", () => {
  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnComplete.mockClear();
    vi.clearAllMocks();
  });

  it("renders import dialog", () => {
    render(
      <UserImportDialog open onClose={mockOnClose} onComplete={mockOnComplete} />,
    );

    expect(screen.getByText("admin.users.import.title")).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(
      <UserImportDialog
        open={false}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />,
    );

    expect(
      screen.queryByText("admin.users.import.title"),
    ).not.toBeInTheDocument();
  });

  it("renders file input button", () => {
    render(
      <UserImportDialog open onClose={mockOnClose} onComplete={mockOnComplete} />,
    );

    expect(
      screen.getByRole("button", { name: /admin.users.import.selectFile/i }),
    ).toBeInTheDocument();
  });

  it("displays selected file name after file selection", async () => {
    const user = userEvent.setup();
    const file = new File(
      ["firstName,lastName,email,password,role\nJohn,Doe,john@example.com,Pass123,STUDENT"],
      "users.csv",
      { type: "text/csv" },
    );

    render(
      <UserImportDialog open onClose={mockOnClose} onComplete={mockOnComplete} />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText(/admin.users.import.selectedFile/i)).toBeInTheDocument();
    });
  });

  it("displays preview rows after parsing CSV", async () => {
    const user = userEvent.setup();
    const csvContent = `firstName,lastName,email,password,role
John,Doe,john@example.com,Pass123,STUDENT
Jane,Smith,jane@example.com,Pass456,TEACHER`;
    const file = new File([csvContent], "users.csv", { type: "text/csv" });

    render(
      <UserImportDialog open onClose={mockOnClose} onComplete={mockOnComplete} />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    });
  });

  it("displays error for invalid CSV format", async () => {
    const user = userEvent.setup();
    const file = new File(["invalid csv"], "users.csv", { type: "text/csv" });

    render(
      <UserImportDialog open onClose={mockOnClose} onComplete={mockOnComplete} />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  it("disables import button when no file is selected", () => {
    render(
      <UserImportDialog open onClose={mockOnClose} onComplete={mockOnComplete} />,
    );

    const importButton = screen.getByRole("button", {
      name: /admin.users.import.importButton/i,
    });
    expect(importButton).toBeDisabled();
  });

  it("enables import button when file is parsed successfully", async () => {
    const user = userEvent.setup();
    const csvContent = `firstName,lastName,email,password,role
John,Doe,john@example.com,Pass123,STUDENT`;
    const file = new File([csvContent], "users.csv", { type: "text/csv" });

    render(
      <UserImportDialog open onClose={mockOnClose} onComplete={mockOnComplete} />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      const importButton = screen.getByRole("button", {
        name: /admin.users.import.importButton/i,
      });
      expect(importButton).not.toBeDisabled();
    });
  });

  it("calls onComplete after successful import", async () => {
    const user = userEvent.setup();
    const csvContent = `firstName,lastName,email,password,role
John,Doe,john@example.com,Pass123,STUDENT`;
    const file = new File([csvContent], "users.csv", { type: "text/csv" });
    vi.mocked(api.post).mockResolvedValue({ data: { created: 1, skipped: 0 } });

    render(
      <UserImportDialog open onClose={mockOnClose} onComplete={mockOnComplete} />,
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      const importButton = screen.getByRole("button", {
        name: /admin.users.import.importButton/i,
      });
      expect(importButton).not.toBeDisabled();
    });

    const importButton = screen.getByRole("button", {
      name: /admin.users.import.importButton/i,
    });
    await user.click(importButton);

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalledWith({
        created: 1,
        skipped: 0,
      });
    });
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <UserImportDialog open onClose={mockOnClose} onComplete={mockOnComplete} />,
    );

    const cancelButton = screen.getByRole("button", { name: /common.cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});


