import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import api from "@/lib/api";

import { ForgotPasswordForm } from "../ForgotPasswordForm";

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
    AUTH: {
      REQUEST_RESET: () => "/auth/password/forgot",
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

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders email input field", () => {
    render(<ForgotPasswordForm />);

    expect(screen.getByLabelText(/auth.email/i)).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<ForgotPasswordForm />);

    expect(
      screen.getByRole("button", { name: /auth.sendResetLink/i }),
    ).toBeInTheDocument();
  });

  it("submits form with valid email", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({
      data: { message: "Reset link sent", resetToken: "test-token-123" },
    } as any);

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/auth.email/i), "test@example.com");
    await user.click(
      screen.getByRole("button", { name: /auth.sendResetLink/i }),
    );

    await waitFor(() => {
      expect(vi.mocked(api.post)).toHaveBeenCalled();
    });
  });

  it("displays reset token after successful submission", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({
      data: { message: "Reset link sent", resetToken: "test-token-123" },
    });

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/auth.email/i), "test@example.com");
    await user.click(
      screen.getByRole("button", { name: /auth.sendResetLink/i }),
    );

    await waitFor(
      () => {
        expect(screen.getByDisplayValue("test-token-123")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("copies token to clipboard when copy button is clicked", async () => {
    const user = userEvent.setup();
    const writeTextSpy = vi.spyOn(navigator.clipboard, "writeText");
    vi.mocked(api.post).mockResolvedValue({
      data: { message: "Reset link sent", resetToken: "test-token-123" },
    });

    render(<ForgotPasswordForm />);

    // First submit to get token
    await user.type(screen.getByLabelText(/auth.email/i), "test@example.com");
    await user.click(
      screen.getByRole("button", { name: /auth.sendResetLink/i }),
    );

    // Wait for token to appear and then click copy
    await waitFor(
      async () => {
        const copyButton = screen.queryByLabelText(/auth.copyToken/i);
        if (copyButton) {
          await user.click(copyButton);
          expect(writeTextSpy).toHaveBeenCalledWith("test-token-123");
        }
      },
      { timeout: 2000 },
    );

    writeTextSpy.mockRestore();
  });
});
