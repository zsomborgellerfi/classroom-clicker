import {
  Alert,
  Box,
  Card,
  CardContent,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { Breadcrumbs } from "@/shared/ui/Breadcrumbs";
import { useTranslation } from "@/hooks/useTranslation";
import { TeacherLayout } from "@/layouts/TeacherLayout";
import api, { ENDPOINTS } from "@/lib/api";

type ClassProgressResponse = {
  id: string;
  score: number;
  submittedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  quiz: {
    id: string;
    title: string;
  };
};

export default function ClassProgress() {
  const { t } = useTranslation();
  const { classId } = useParams<{ classId: string }>();

  const { data: classInfo } = useQuery({
    queryKey: ["class", classId],
    queryFn: async () => {
      const response = await api.get<{ id: string; name: string }>(
        ENDPOINTS.CLASS.GET(classId!),
      );
      return response.data;
    },
    enabled: !!classId,
  });

  const {
    data: responses,
    isLoading,
    isError,
    refetch,
  } = useQuery<ClassProgressResponse[]>({
    queryKey: ["class-progress", classId],
    queryFn: async () => {
      const response = await api.get<ClassProgressResponse[]>(
        ENDPOINTS.CLASS.PROGRESS(classId!),
      );
      return response.data;
    },
    enabled: !!classId,
  });

  const studentStats = useMemo(() => {
    if (!responses) {
      return [];
    }
    const map = new Map<
      string,
      {
        name: string;
        email: string;
        attempts: number;
        avgScore: number;
        lastSubmittedAt: string;
      }
    >();
    responses.forEach((response) => {
      const existing = map.get(response.user.id);
      const attemptData = {
        name: `${response.user.firstName} ${response.user.lastName}`,
        email: response.user.email ?? "",
        attempts: 1,
        avgScore: response.score,
        lastSubmittedAt: response.submittedAt,
      };
      if (!existing) {
        map.set(response.user.id, attemptData);
      } else {
        const attempts = existing.attempts + 1;
        const avgScore =
          (existing.avgScore * existing.attempts + response.score) / attempts;
        const lastSubmittedAt =
          new Date(response.submittedAt) > new Date(existing.lastSubmittedAt)
            ? response.submittedAt
            : existing.lastSubmittedAt;
        map.set(response.user.id, {
          ...existing,
          attempts,
          avgScore,
          lastSubmittedAt,
        });
      }
    });
    return Array.from(map.entries()).map(([id, value]) => ({
      id,
      ...value,
    }));
  }, [responses]);

  const breadcrumbItems = [
    { label: t("teacher.dashboard.title"), path: "/teacher" },
    { label: t("teacher.classes.title"), path: "/teacher/classes" },
    { label: classInfo?.name || t("teacher.progress.title") },
  ];

  return (
    <TeacherLayout>
      <Breadcrumbs items={breadcrumbItems} />
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          {classInfo?.name ?? t("teacher.progress.title")}
        </Typography>
        <Typography color="text.secondary">
          {t("teacher.progress.subtitle")}
        </Typography>
      </Box>

      {isLoading && (
        <Box sx={{ display: "grid", gap: 2 }}>
          <Skeleton variant="rectangular" height={220} />
          <Skeleton variant="rectangular" height={180} />
        </Box>
      )}

      {isError && (
        <Alert severity="error" onClose={() => refetch()}>
          {t("teacher.progress.error")}
        </Alert>
      )}

      {!isLoading && !isError && (
        <Box sx={{ display: "grid", gap: 3 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {t("teacher.progress.summary")}
              </Typography>
              {studentStats.length === 0 ? (
                <Typography color="text.secondary">
                  {t("teacher.progress.empty")}
                </Typography>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t("teacher.progress.table.student")}</TableCell>
                        <TableCell>{t("teacher.progress.table.email")}</TableCell>
                        <TableCell align="right">
                          {t("teacher.progress.table.attempts")}
                        </TableCell>
                        <TableCell align="right">
                          {t("teacher.progress.table.averageScore")}
                        </TableCell>
                        <TableCell>{t("teacher.progress.table.lastSubmitted")}</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {studentStats.map((stat) => (
                        <TableRow key={stat.id}>
                          <TableCell>{stat.name}</TableCell>
                          <TableCell>{stat.email}</TableCell>
                          <TableCell align="right">{stat.attempts}</TableCell>
                          <TableCell align="right">
                            {Math.round(stat.avgScore * 100)}%
                          </TableCell>
                          <TableCell>
                            {new Date(stat.lastSubmittedAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {responses && responses.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t("teacher.progress.recentSubmissions")}
                </Typography>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>{t("teacher.progress.table.quiz")}</TableCell>
                        <TableCell>{t("teacher.progress.table.student")}</TableCell>
                        <TableCell align="right">
                          {t("teacher.progress.table.score")}
                        </TableCell>
                        <TableCell>
                          {t("teacher.progress.table.submittedAt")}
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {responses.slice(0, 10).map((response) => (
                        <TableRow key={response.id}>
                          <TableCell>{response.quiz.title}</TableCell>
                          <TableCell>{`${response.user.firstName} ${response.user.lastName}`}</TableCell>
                          <TableCell align="right">
                            {Math.round(response.score * 100)}%
                          </TableCell>
                          <TableCell>
                            {new Date(response.submittedAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </Box>
      )}
    </TeacherLayout>
  );
}
