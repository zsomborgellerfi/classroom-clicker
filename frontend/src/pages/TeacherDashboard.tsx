import { Typography } from "@mui/material";

import { useTranslation } from "../hooks/useTranslation";
import { TeacherLayout } from "../layouts/TeacherLayout";

export default function TeacherDashboard() {
  const { t } = useTranslation();

  return (
    <TeacherLayout>
      <Typography variant="h4" gutterBottom>
        {t("teacher.dashboard.welcome")}
      </Typography>
    </TeacherLayout>
  );
}
