import { Box, Container, Link, Paper, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import { useTranslation } from "@/hooks/useTranslation";

export default function ForgotPassword() {
  const { t } = useTranslation();

  return (
    <Container component="main" maxWidth="xs" className="auth-container">
      <Paper elevation={3} className="auth-paper" sx={{ p: 4 }}>
        <Typography component="h1" variant="h5" align="center" gutterBottom>
          {t("auth.forgotPassword")}
        </Typography>
        <ForgotPasswordForm />
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2">
            {t("auth.haveToken")}{" "}
            <Link component={RouterLink} to="/reset-password">
              {t("auth.goToReset")}
            </Link>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <Link component={RouterLink} to="/login">
              {t("auth.backToLogin")}
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
