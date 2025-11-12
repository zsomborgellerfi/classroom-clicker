import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Skeleton,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { StudentLayout } from "@/layouts/StudentLayout";
import api, { ENDPOINTS } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

type StudentProgressItem = {
  id: string;
  score: number;
  submittedAt: string;
  quiz: {
    id: string;
    title: string;
    lesson: {
      id: string;
      title: string;
      class: {
        id: string;
        name: string;
      };
    };
  };
};

export default function StudentProgress() {
  const { t } = useTranslation();

  const {
    data: progress,
    isLoading,
    isError,
    refetch,
  } = useQuery<StudentProgressItem[]>({
    queryKey: ["student-progress"],
    queryFn: async () => {
      const response = await api.get<StudentProgressItem[]>(
        ENDPOINTS.STUDENT.PROGRESS(),
      );
      return response.data;
    },
  });

  const stats = useMemo(() => {
    if (!progress?.length) {
      return null;
    }
    const totalScore = progress.reduce((sum, item) => sum + item.score, 0);
    const avg = totalScore / progress.length;
    const classes = new Set(progress.map((item) => item.quiz.lesson.class.id));
    return {
      responses: progress.length,
      averageScore: avg,
      classes: classes.size,
    };
  }, [progress]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: "grid", gap: 2 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={120} />
          ))}
        </Box>
      );
    }

    if (isError) {
      return (
        <Alert severity="error" onClose={() => refetch()}>
          {t("student.progress.error")}
        </Alert>
      );
    }

    if (!progress || progress.length === 0) {
      return (
        <Alert severity="info">{t("student.progress.empty")}</Alert>
      );
    }

    return (
      <Box sx={{ display: "grid", gap: 2 }}>
        {progress.map((item) => (
          <Card key={item.id} variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                {item.quiz.title}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {item.quiz.lesson.class.name} · {item.quiz.lesson.title}
              </Typography>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", mt: 2 }}>
                <Chip
                  label={`${t("student.progress.score")}: ${Math.round(item.score * 100)}%`}
                  color="primary"
                />
                <Typography variant="caption" color="text.secondary">
                  {new Date(item.submittedAt).toLocaleString()}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  return (
    <StudentLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t("student.progress.title")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("student.progress.subtitle")}
        </Typography>
      </Box>
      {stats && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(1, 1fr)", md: "repeat(3, 1fr)" },
            gap: 2,
            mb: 4,
          }}
        >
          <Card>
            <CardContent>
              <Typography variant="h3">
                {Math.round(stats.averageScore * 100)}%
              </Typography>
              <Typography color="text.secondary">
                {t("student.progress.averageScore")}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h3">{stats.responses}</Typography>
              <Typography color="text.secondary">
                {t("student.progress.quizzesCompleted")}
              </Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Typography variant="h3">{stats.classes}</Typography>
              <Typography color="text.secondary">
                {t("student.progress.classes")}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}
      {renderContent()}
    </StudentLayout>
  );
}
