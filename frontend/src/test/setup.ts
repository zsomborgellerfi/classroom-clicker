import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

// Mock MUI Material useMediaQuery globally
vi.mock("@mui/material/styles", async () => {
  const actual = await vi.importActual("@mui/material/styles");
  return {
    ...actual,
    useTheme: () => ({
      breakpoints: {
        down: () => "(max-width: 959.95px)",
        up: () => "(min-width: 960px)",
        between: () => "(min-width: 600px) and (max-width: 959.95px)",
        only: () => "(min-width: 960px) and (max-width: 1279.95px)",
        width: () => "md",
      },
      palette: {
        mode: "light",
      },
    }),
  };
});

vi.mock("@mui/material", async () => {
  const actual = await vi.importActual("@mui/material");
  return {
    ...actual,
    useMediaQuery: vi.fn(() => false),
  };
});
