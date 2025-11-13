import { CssBaseline } from "@mui/material";
import React from "react";
import ReactDOM from "react-dom/client";
import { I18nextProvider } from "react-i18next";

import App from "./App";
import { ThemeProvider } from "./contexts/ThemeContext";
import i18n from "./i18n/config";
import "./styles/main.scss";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <ThemeProvider>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </I18nextProvider>
  </React.StrictMode>,
);
