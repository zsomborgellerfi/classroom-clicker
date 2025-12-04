import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ResetPasswordForm } from "../ResetPasswordForm";

const mockNavigate = vi.fn();
const mockUseSearchParams = vi.fn(() => [
  new URLSearchParams({ token: "test-token-123" }),
]);

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useSearchParams: () => mockUseSearchParams(),
}));

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
      RESET_PASSWORD: () => "/auth/password/reset",
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

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUseSearchParams.mockReturnValue([
      new URLSearchParams({ token: "test-token-123" }),
    ]);
    vi.clearAllMocks();
  });

  it("renders token input field", () => {
    render(<ResetPasswordForm />);

    expect(screen.getByLabelText(/auth.resetToken/i)).toBeInTheDocument();
  });

  it("renders password input fields", () => {
    render(<ResetPasswordForm />);

    expect(screen.getByLabelText(/auth.newPassword/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auth.confirmPassword/i)).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(<ResetPasswordForm />);

    expect(
      screen.getByRole("button", { name: /auth.resetPasswordTitle/i }),
    ).toBeInTheDocument();
  });

  it("pre-fills token from URL search params", () => {
    render(<ResetPasswordForm />);

    const tokenInput = screen.getByLabelText(/auth.resetToken/i) as HTMLInputElement;
    expect(tokenInput.value).toBe("test-token-123");
  });

  it("navigates to login on successful reset", async () => {
    const user = userEvent.setup();
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } } as any);

    render(<ResetPasswordForm />);

    const passwordInput = screen.getByLabelText(/auth.newPassword/i);
    const confirmPasswordInput = screen.getByLabelText(/auth.confirmPassword/i);

    await user.type(passwordInput, "newpassword123");
    await user.type(confirmPasswordInput, "newpassword123");
    await user.click(
      screen.getByRole("button", { name: /auth.resetPasswordTitle/i }),
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    }, { timeout: 3000 });
  });

  it("handles missing token in URL params", () => {
    mockUseSearchParams.mockReturnValue([new URLSearchParams()]);
    render(<ResetPasswordForm />);

    const tokenInput = screen.getByLabelText(/auth.resetToken/i) as HTMLInputElement;
    expect(tokenInput.value).toBe("");
  });
});



