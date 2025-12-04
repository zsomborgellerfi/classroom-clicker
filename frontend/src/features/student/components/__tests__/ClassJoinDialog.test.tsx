import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ClassJoinDialog } from "../ClassJoinDialog";

const mockOnClose = vi.fn();
const mockOnJoined = vi.fn();

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
    STUDENT: {
      JOIN: () => "/student/classes/join",
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

import api from "@/lib/api";

describe("ClassJoinDialog", () => {
  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnJoined.mockClear();
    vi.clearAllMocks();
  });

  it("renders join dialog", () => {
    render(
      <ClassJoinDialog open onClose={mockOnClose} onJoined={mockOnJoined} />,
    );

    expect(screen.getByText("student.classes.join.title")).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(
      <ClassJoinDialog
        open={false}
        onClose={mockOnClose}
        onJoined={mockOnJoined}
      />,
    );

    expect(
      screen.queryByText("student.classes.join.title"),
    ).not.toBeInTheDocument();
  });

  it("renders join code input field", () => {
    render(
      <ClassJoinDialog open onClose={mockOnClose} onJoined={mockOnJoined} />,
    );

    expect(
      screen.getByLabelText(/student.classes.join.placeholder/i),
    ).toBeInTheDocument();
  });

  it("converts join code to uppercase", async () => {
    const user = userEvent.setup();
    render(
      <ClassJoinDialog open onClose={mockOnClose} onJoined={mockOnJoined} />,
    );

    const input = screen.getByLabelText(/student.classes.join.placeholder/i);
    await user.type(input, "abc123");

    expect((input as HTMLInputElement).value).toBe("ABC123");
  });

  it("submits join request when join button is clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } } as any);

    render(
      <ClassJoinDialog open onClose={mockOnClose} onJoined={mockOnJoined} />,
    );

    const input = screen.getByLabelText(/student.classes.join.placeholder/i);
    await user.type(input, "ABC123");

    const joinButton = screen.getByRole("button", {
      name: /student.classes.join.button/i,
    });
    await user.click(joinButton);

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalled();
    });
  });

  it("submits join request when Enter key is pressed", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } } as any);

    render(
      <ClassJoinDialog open onClose={mockOnClose} onJoined={mockOnJoined} />,
    );

    const input = screen.getByLabelText(/student.classes.join.placeholder/i);
    await user.type(input, "ABC123{Enter}");

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalled();
    });
  });

  it("calls onJoined callback after successful join", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } } as any);

    render(
      <ClassJoinDialog open onClose={mockOnClose} onJoined={mockOnJoined} />,
    );

    const input = screen.getByLabelText(/student.classes.join.placeholder/i);
    await user.type(input, "ABC123");

    const joinButton = screen.getByRole("button", {
      name: /student.classes.join.button/i,
    });
    await user.click(joinButton);

    await waitFor(() => {
      expect(mockOnJoined).toHaveBeenCalled();
    });
  });

  it("calls onClose when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ClassJoinDialog open onClose={mockOnClose} onJoined={mockOnJoined} />,
    );

    const cancelButton = screen.getByRole("button", { name: /common.cancel/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("resets join code when dialog is closed", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ClassJoinDialog open onClose={mockOnClose} onJoined={mockOnJoined} />,
    );

    const input = screen.getByLabelText(/student.classes.join.placeholder/i);
    await user.type(input, "ABC123");

    rerender(
      <ClassJoinDialog open={false} onClose={mockOnClose} onJoined={mockOnJoined} />,
    );
    rerender(
      <ClassJoinDialog open onClose={mockOnClose} onJoined={mockOnJoined} />,
    );

    const newInput = screen.getByLabelText(/student.classes.join.placeholder/i);
    expect((newInput as HTMLInputElement).value).toBe("");
  });
});

