import { Container, Paper, Typography } from "@mui/material";

import { LoginForm } from "../containers/LoginForm";
import { useTranslation } from "../hooks/useTranslation";

export default function Login() {
  const { t } = useTranslation();
  return (
    <Container component="main" maxWidth="xs" className="auth-container">
      <Paper elevation={3} className="auth-paper" sx={{ p: 4 }}>
        <Typography component="h1" variant="h5" align="center" gutterBottom>
          {t("auth.signIn")}
        </Typography>
        <LoginForm />
      </Paper>
    </Container>
  );
}
