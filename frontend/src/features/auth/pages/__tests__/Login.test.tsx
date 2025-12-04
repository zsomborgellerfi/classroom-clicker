import { render, screen } from "@testing-library/react";

import Login from "../Login";

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/features/auth/components/LoginForm", () => ({
  LoginForm: () => <div data-testid="login-form">LoginForm</div>,
}));

describe("Login", () => {
  it("renders the login page", () => {
    render(<Login />);

    expect(screen.getByText("auth.signIn")).toBeInTheDocument();
    expect(screen.getByTestId("login-form")).toBeInTheDocument();
  });

  it("renders with correct container structure", () => {
    const { container } = render(<Login />);

    const mainContainer = container.querySelector("main");
    expect(mainContainer).toBeInTheDocument();
    expect(mainContainer).toHaveClass("auth-container");
  });
});

