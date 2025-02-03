import { alpha, createTheme } from "@mui/material";

declare module "@mui/material/styles" {
  interface Palette {
    tertiary: Palette["primary"];
  }
  interface PaletteOptions {
    tertiary?: PaletteOptions["primary"];
  }
}

export const theme = createTheme({
  palette: {
    primary: {
      main: "#2563eb", // Blue
      light: "#60a5fa",
      dark: "#1e40af",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#7c3aed", // Purple
      light: "#a78bfa",
      dark: "#5b21b6",
      contrastText: "#ffffff",
    },
    tertiary: {
      main: "#059669", // Green
      light: "#34d399",
      dark: "#065f46",
      contrastText: "#ffffff",
    },
    error: {
      main: "#dc2626",
      light: "#ef4444",
      dark: "#991b1b",
    },
    warning: {
      main: "#d97706",
      light: "#f59e0b",
      dark: "#b45309",
    },
    info: {
      main: "#0891b2",
      light: "#06b6d4",
      dark: "#0e7490",
    },
    success: {
      main: "#059669",
      light: "#10b981",
      dark: "#047857",
    },
    grey: {
      50: "#f9fafb",
      100: "#f3f4f6",
      200: "#e5e7eb",
      300: "#d1d5db",
      400: "#9ca3af",
      500: "#6b7280",
      600: "#4b5563",
      700: "#374151",
      800: "#1f2937",
      900: "#111827",
    },
    background: {
      default: "#f9fafb",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h1: {
      fontSize: "2.5rem",
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: "1.5rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.5,
    },
    button: {
      textTransform: "none",
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: "8px",
          padding: "8px 16px",
          fontWeight: 500,
        },
        contained: ({ theme }) => ({
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
            backgroundColor: alpha(theme.palette.primary.main, 0.9),
          },
        }),
        outlined: ({ theme }) => ({
          borderColor: theme.palette.grey[300],
          "&:hover": {
            backgroundColor: theme.palette.grey[50],
            borderColor: theme.palette.grey[400],
          },
        }),
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        size: "medium",
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: "12px",
        },
        elevation1: {
          boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.05)",
        },
        elevation2: {
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.07)",
        },
      },
    },
  },
});
