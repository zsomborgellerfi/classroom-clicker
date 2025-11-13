import { Box, Container, Link, Paper, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { useTranslation } from "@/hooks/useTranslation";

export default function ResetPassword() {
  const { t } = useTranslation();

  return (
    <Container component="main" maxWidth="xs" className="auth-container">
      <Paper elevation={3} className="auth-paper" sx={{ p: 4 }}>
        <Typography component="h1" variant="h5" align="center" gutterBottom>
          {t("auth.resetPasswordTitle")}
        </Typography>
        <ResetPasswordForm />
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Link component={RouterLink} to="/login">
            {t("auth.backToLogin")}
          </Link>
        </Box>
      </Paper>
    </Container>
  );
}
