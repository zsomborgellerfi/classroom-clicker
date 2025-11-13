import { ThemeProvider as MuiThemeProvider } from "@mui/material";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

import { darkTheme, lightTheme, ThemeMode } from "@/theme";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  resolvedMode: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "classroom-clicker-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (stored && (stored === "light" || stored === "dark" || stored === "system")) {
      return stored;
    }
    return "system";
  });

  const [resolvedMode, setResolvedMode] = useState<"light" | "dark">(() => {
    if (mode === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return mode;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (mode === "system") {
        setResolvedMode(mediaQuery.matches ? "dark" : "light");
      }
    };

    if (mode === "system") {
      setResolvedMode(mediaQuery.matches ? "dark" : "light");
      mediaQuery.addEventListener("change", handleChange);
    } else {
      setResolvedMode(mode);
    }

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [mode]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(THEME_STORAGE_KEY, newMode);
  };

  const theme = resolvedMode === "dark" ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ mode, setMode, resolvedMode }}>
      <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

