import { render, screen } from "@testing-library/react";

import ForgotPassword from "../ForgotPassword";

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/features/auth/components/ForgotPasswordForm", () => ({
  ForgotPasswordForm: () => (
    <div data-testid="forgot-password-form">ForgotPasswordForm</div>
  ),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

describe("ForgotPassword", () => {
  it("renders the forgot password page", () => {
    render(<ForgotPassword />);

    expect(screen.getByText("auth.forgotPassword")).toBeInTheDocument();
    expect(screen.getByTestId("forgot-password-form")).toBeInTheDocument();
  });

  it("renders link to reset password page", () => {
    render(<ForgotPassword />);

    const resetLink = screen.getByText("auth.goToReset");
    expect(resetLink.closest("a")).toHaveAttribute("href", "/reset-password");
  });

  it("renders link back to login", () => {
    render(<ForgotPassword />);

    const loginLink = screen.getByText("auth.backToLogin");
    expect(loginLink.closest("a")).toHaveAttribute("href", "/login");
  });

  it("renders with correct container structure", () => {
    const { container } = render(<ForgotPassword />);

    const mainContainer = container.querySelector("main");
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass("auth-container");
  });
});

