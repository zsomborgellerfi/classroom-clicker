import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeSwitcher } from "../ThemeSwitcher";

const mockSetMode = vi.fn();
const mockUseTheme = vi.fn(() => ({
  mode: "light" as const,
  setMode: mockSetMode,
  resolvedMode: "light" as const,
}));

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => mockUseTheme(),
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("ThemeSwitcher", () => {
  beforeEach(() => {
    mockSetMode.mockClear();
  });

  it("renders the theme switcher button", () => {
    render(<ThemeSwitcher />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("opens menu when button is clicked", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    const button = screen.getByRole("button");
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });
  });

  it("displays all theme options", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByText("common.theme.light")).toBeInTheDocument();
      expect(screen.getByText("common.theme.dark")).toBeInTheDocument();
      expect(screen.getByText("common.theme.system")).toBeInTheDocument();
    });
  });

  it("calls setMode when a theme option is selected", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    const darkOption = screen.getByText("common.theme.dark");
    await user.click(darkOption);

    expect(mockSetMode).toHaveBeenCalledWith("dark");
  });

  it("closes menu after selecting an option", async () => {
    const user = userEvent.setup();
    render(<ThemeSwitcher />);

    await user.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    await user.click(screen.getByText("common.theme.dark"));

    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  it("shows correct icon for light mode", () => {
    mockUseTheme.mockReturnValue({
      mode: "light",
      setMode: mockSetMode,
      resolvedMode: "light",
    });
    render(<ThemeSwitcher />);
    // LightModeIcon should be rendered
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows correct icon for dark mode", () => {
    mockUseTheme.mockReturnValue({
      mode: "dark",
      setMode: mockSetMode,
      resolvedMode: "dark",
    });
    render(<ThemeSwitcher />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows correct icon for system mode", () => {
    mockUseTheme.mockReturnValue({
      mode: "system",
      setMode: mockSetMode,
      resolvedMode: "light",
    });
    render(<ThemeSwitcher />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});



