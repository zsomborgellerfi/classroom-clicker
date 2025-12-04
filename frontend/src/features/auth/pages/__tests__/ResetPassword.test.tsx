import { render, screen } from "@testing-library/react";

import ResetPassword from "../ResetPassword";

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/features/auth/components/ResetPasswordForm", () => ({
  ResetPasswordForm: () => (
    <div data-testid="reset-password-form">ResetPasswordForm</div>
  ),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

describe("ResetPassword", () => {
  it("renders the reset password page", () => {
    render(<ResetPassword />);

    expect(screen.getByText("auth.resetPasswordTitle")).toBeInTheDocument();
    expect(screen.getByTestId("reset-password-form")).toBeInTheDocument();
  });

  it("renders link back to login", () => {
    render(<ResetPassword />);

    const loginLink = screen.getByText("auth.backToLogin");
    expect(loginLink.closest("a")).toHaveAttribute("href", "/login");
  });

  it("renders with correct container structure", () => {
    const { container } = render(<ResetPassword />);

    const mainContainer = container.querySelector("main");
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass("auth-container");
  });
});

