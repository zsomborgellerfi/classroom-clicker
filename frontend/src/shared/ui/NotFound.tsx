import { Box, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "@/hooks/useTranslation";

export function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        textAlign: "center",
        p: 3,
      }}
    >
      <Typography variant="h1" sx={{ mb: 2, fontSize: "6rem" }}>
        404
      </Typography>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t("common.notFound.title")}
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        {t("common.notFound.message")}
      </Typography>
      <Button variant="contained" onClick={() => navigate("/")}>
        {t("common.notFound.backHome")}
      </Button>
    </Box>
  );
} 