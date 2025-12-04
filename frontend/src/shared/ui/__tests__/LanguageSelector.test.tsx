import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LanguageSelector } from "../LanguageSelector";

const mockChangeLanguage = vi.fn();
const mockI18n = {
  language: "en",
  resolvedLanguage: "en",
  changeLanguage: mockChangeLanguage,
};

const mockUseTranslation = vi.fn(() => ({
  t: (key: string) => key,
  i18n: mockI18n,
}));

vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => mockUseTranslation(),
}));

describe("LanguageSelector", () => {
  beforeEach(() => {
    mockChangeLanguage.mockClear();
    mockI18n.language = "en";
    mockI18n.resolvedLanguage = "en";
    localStorage.clear();
  });

  it("renders the language selector", () => {
    render(<LanguageSelector />);
    expect(screen.getByLabelText("common.language")).toBeInTheDocument();
  });

  it("displays current language", () => {
    render(<LanguageSelector />);
    const selector = screen.getByLabelText("common.language");
    // MUI Select shows the value in the rendered text, not as an attribute
    expect(selector).toBeInTheDocument();
    expect(screen.getByText("common.languages.en")).toBeInTheDocument();
  });

  it("displays available languages", async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);

    const selector = screen.getByLabelText("common.language");
    await user.click(selector);

    // Wait for menu to open and items to be visible
    await waitFor(
      () => {
        const enOption = screen.getByRole("option", { name: /common.languages.en/i });
        const huOption = screen.getByRole("option", { name: /common.languages.hu/i });
        expect(enOption).toBeInTheDocument();
        expect(huOption).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("calls changeLanguage when a language is selected", async () => {
    const user = userEvent.setup();
    render(<LanguageSelector />);

    const selector = screen.getByLabelText("common.language");
    await user.click(selector);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /common.languages.hu/i })).toBeInTheDocument();
    });

    const hungarianOption = screen.getByRole("option", { name: /common.languages.hu/i });
    await user.click(hungarianOption);

    expect(mockChangeLanguage).toHaveBeenCalledWith("hu");
  });

  it("saves selected language to localStorage", async () => {
    const user = userEvent.setup();
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    render(<LanguageSelector />);

    const selector = screen.getByLabelText("common.language");
    await user.click(selector);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /common.languages.hu/i })).toBeInTheDocument();
    });

    const hungarianOption = screen.getByRole("option", { name: /common.languages.hu/i });
    await user.click(hungarianOption);

    expect(setItemSpy).toHaveBeenCalledWith("i18nextLng", "hu");
    setItemSpy.mockRestore();
  });

  it("handles resolvedLanguage correctly", () => {
    mockI18n.resolvedLanguage = "hu";
    mockI18n.language = "hu";
    render(<LanguageSelector />);
    // Check that the Hungarian language label is displayed
    expect(screen.getByText("common.languages.hu")).toBeInTheDocument();
  });

  it("falls back to language if resolvedLanguage is not available", () => {
    mockI18n.resolvedLanguage = null as any;
    mockI18n.language = "en";
    render(<LanguageSelector />);
    // Check that the English language label is displayed
    expect(screen.getByText("common.languages.en")).toBeInTheDocument();
  });
});

