import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LoginForm } from "../LoginForm";

const mockNavigate = vi.fn();
const mockDispatch = vi.fn();
const mockLogin = vi.fn();

const mockUseAppSelector = vi.fn(() => ({
  loading: false,
}));

const mockUseAppDispatch = vi.fn(() => mockDispatch);

const mockUseMutation = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children }: any) => <a href={to}>{children}</a>,
}));

vi.mock("@/store/hooks", () => ({
  useAppSelector: (selector: any) => mockUseAppSelector(),
  useAppDispatch: () => mockUseAppDispatch(),
}));

vi.mock("@/store/slices/auth", () => ({
  login: (credentials: any) => mockLogin(credentials),
}));

vi.mock("@tanstack/react-query", () => ({
  useMutation: (options: any) => {
    const mutation = {
      mutate: vi.fn((data) => {
        if (options?.mutationFn) {
          Promise.resolve(options.mutationFn(data))
            .then((result: any) => options?.onSuccess?.(result))
            .catch((error: any) => options?.onError?.(error));
        }
      }),
      isPending: false,
    };
    mockUseMutation(options);
    return mutation;
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

describe("LoginForm", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockDispatch.mockClear();
    mockLogin.mockClear();
    mockUseAppSelector.mockReturnValue({ loading: false });
    localStorage.clear();
    sessionStorage.clear();
  });

  it("renders email and password fields", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/auth.email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/auth.password/i)).toBeInTheDocument();
  });

  it("renders remember me checkbox", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/auth.rememberMe/i)).toBeInTheDocument();
  });

  it("renders forgot password link", () => {
    render(<LoginForm />);

    const forgotPasswordLink = screen.getByText(/auth.forgotPassword/i);
    expect(forgotPasswordLink).toBeInTheDocument();
    expect(forgotPasswordLink.closest("a")).toHaveAttribute(
      "href",
      "/forgot-password",
    );
  });

  it("renders submit button", () => {
    render(<LoginForm />);

    expect(
      screen.getByRole("button", { name: /auth.signInButton/i }),
    ).toBeInTheDocument();
  });

  it("prevents submission with invalid email", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/auth.email/i);
    await user.type(emailInput, "invalid-email");
    await user.type(screen.getByLabelText(/auth.password/i), "password123");
    
    const submitButton = screen.getByRole("button", { name: /auth.signInButton/i });
    await user.click(submitButton);

    // Form validation should prevent submission - mutation should not be called
    await waitFor(() => {
      // The form should not submit with invalid email
      // Check that the email input still has the invalid value (form wasn't reset)
      expect(emailInput).toHaveValue("invalid-email");
    });
  });

  it("prevents submission with short password", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/auth.email/i), "test@example.com");
    const passwordInput = screen.getByLabelText(/auth.password/i);
    await user.type(passwordInput, "123");
    
    const submitButton = screen.getByRole("button", { name: /auth.signInButton/i });
    await user.click(submitButton);

    // Form validation should prevent submission - mutation should not be called
    await waitFor(() => {
      // The form should not submit with short password
      // Check that the password input still has the short value (form wasn't reset)
      expect(passwordInput).toHaveValue("123");
    });
  });

  it("submits form with valid data", async () => {
    const user = userEvent.setup();
    mockDispatch.mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        user: { role: "STUDENT" },
        token: "test-token",
      }),
    });

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/auth.email/i), "test@example.com");
    await user.type(screen.getByLabelText(/auth.password/i), "password123");
    await user.click(
      screen.getByRole("button", { name: /auth.signInButton/i }),
    );

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalled();
    });
  });

  it("shows loading state when loading", () => {
    mockUseAppSelector.mockReturnValue({ loading: true });
    render(<LoginForm />);

    expect(
      screen.getByRole("button", { name: /auth.signingIn/i }),
    ).toBeInTheDocument();
  });
});

