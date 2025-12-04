import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NotFound } from "../NotFound";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("NotFound", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("renders 404 heading", () => {
    render(<NotFound />);
    expect(screen.getByText("404")).toBeInTheDocument();
  });

  it("renders not found title", () => {
    render(<NotFound />);
    expect(screen.getByText("common.notFound.title")).toBeInTheDocument();
  });

  it("renders not found message", () => {
    render(<NotFound />);
    expect(screen.getByText("common.notFound.message")).toBeInTheDocument();
  });

  it("renders back home button", () => {
    render(<NotFound />);
    expect(
      screen.getByRole("button", { name: "common.notFound.backHome" }),
    ).toBeInTheDocument();
  });

  it("navigates to home when back home button is clicked", async () => {
    const user = userEvent.setup();
    render(<NotFound />);

    const backHomeButton = screen.getByRole("button", {
      name: "common.notFound.backHome",
    });
    await user.click(backHomeButton);

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});



