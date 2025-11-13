import { Alert, Box, Grid, Skeleton, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";

import type { Class, User } from "@shared/types";

import { ClassJoinCard } from "@/features/student/components/ClassJoinCard";
import { ClassCard } from "@/features/student/components/ClassCard";
import { useTranslation } from "@/hooks/useTranslation";
import { StudentLayout } from "@/layouts/StudentLayout";
import api, { ENDPOINTS } from "@/lib/api";

type StudentClass = Class & {
  teacher?: Pick<User, "id" | "firstName" | "lastName">;
  _count?: {
    students: number;
    lessons: number;
  };
};

export default function StudentClasses() {
  const { t } = useTranslation();

  const {
    data: classes,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["student-classes"],
    queryFn: async () => {
      const response = await api.get<StudentClass[]>(
        ENDPOINTS.STUDENT.CLASSES.LIST(),
      );
      return response.data;
    },
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <Grid container spacing={3}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Skeleton variant="rectangular" height={180} />
            </Grid>
          ))}
        </Grid>
      );
    }

    if (isError) {
      return (
        <Alert
          severity="error"
          action={
            <Typography
              component="button"
              onClick={() => refetch()}
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}
            >
              {t("student.classes.retry")}
            </Typography>
          }
        >
          {t("student.classes.error")}
        </Alert>
      );
    }

    if (!classes || classes.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t("student.classes.empty")}
        </Alert>
      );
    }

    return (
      <Grid container spacing={3}>
        {classes.map((classItem) => (
          <Grid item xs={12} md={6} lg={4} key={classItem.id}>
            <ClassCard classItem={classItem} />
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <StudentLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t("student.classes.title")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("student.classes.subtitle")}
        </Typography>
      </Box>
      <ClassJoinCard onJoined={refetch} />
      {renderContent()}
    </StudentLayout>
  );
}
