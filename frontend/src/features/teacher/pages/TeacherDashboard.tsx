import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "@/hooks/useTranslation";
import { TeacherLayout } from "@/layouts/TeacherLayout";
import api, { ENDPOINTS } from "@/lib/api";

interface DashboardStats {
  totals: {
    classes: number;
    lessons: number;
    quizzes: number;
    students: number;
  };
  latestQuiz: {
    id: string;
    title: string;
    isActive: boolean;
    lesson: {
      id: string;
      title: string;
      class: {
        id: string;
        name: string;
      };
    };
    _count: {
      responses: number;
    };
  } | null;
  recentResponses: Array<{
    id: string;
    score: number;
    submittedAt: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
    };
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
  }>;
}

export default function TeacherDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ["teacher-dashboard"],
    queryFn: async () => {
      const response = await api.get<DashboardStats>(
        ENDPOINTS.TEACHER.DASHBOARD(),
      );
      return response.data;
    },
  });
  const latestQuiz = data?.latestQuiz ?? null;
  const recentResponses = data?.recentResponses ?? [];

  const stats = [
    {
      key: "classes",
      value: data?.totals.classes ?? 0,
      label: t("teacher.dashboard.stats.classes"),
    },
    {
      key: "lessons",
      value: data?.totals.lessons ?? 0,
      label: t("teacher.dashboard.stats.lessons"),
    },
    {
      key: "students",
      value: data?.totals.students ?? 0,
      label: t("teacher.dashboard.stats.students"),
    },
    {
      key: "quizzes",
      value: data?.totals.quizzes ?? 0,
      label: t("teacher.dashboard.stats.quizzes"),
    },
  ];

  return (
    <TeacherLayout>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {t("teacher.dashboard.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("teacher.dashboard.welcome")}
          </Typography>
        </Box>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {t("teacher.dashboard.stats.title")}
            </Typography>
            <Grid container spacing={2}>
              {stats.map((stat) => (
                <Grid item xs={6} md={3} key={stat.key}>
                  {isLoading ? (
                    <Skeleton variant="rounded" height={80} />
                  ) : (
                    <Box
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        p: 2,
                      }}
                    >
                      <Typography variant="h4">{stat.value}</Typography>
                      <Typography color="text.secondary">
                        {stat.label}
                      </Typography>
                    </Box>
                  )}
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t("teacher.dashboard.latestQuiz.title")}
                </Typography>
                {isLoading ? (
                  <Skeleton variant="rectangular" height={160} />
                ) : latestQuiz ? (
                  <Stack spacing={1}>
                    <Typography variant="h5">
                      {latestQuiz.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {t("teacher.dashboard.latestQuiz.classLabel")}:{" "}
                      {latestQuiz.lesson.class.name}
                    </Typography>
                    <Typography color="text.secondary">
                      {t("teacher.dashboard.latestQuiz.lessonLabel")}:{" "}
                      {latestQuiz.lesson.title}
                    </Typography>
                    <Chip
                      size="small"
                      label={
                        latestQuiz.isActive
                          ? t("teacher.quizzes.table.active")
                          : t("teacher.quizzes.table.inactive")
                      }
                      color={latestQuiz.isActive ? "success" : "default"}
                    />
                    <Typography color="text.secondary">
                      {t("teacher.dashboard.latestQuiz.responses", {
                        count: latestQuiz._count.responses,
                      })}
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() =>
                        navigate(
                          `/teacher/classes/${latestQuiz.lesson.class.id}/lessons/${latestQuiz.lesson.id}/quizzes/${latestQuiz.id}`,
                        )
                      }
                    >
                      {t("teacher.dashboard.latestQuiz.viewQuiz")}
                    </Button>
                  </Stack>
                ) : (
                  <Alert severity="info">
                    {t("teacher.dashboard.latestQuiz.noQuiz")}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t("teacher.dashboard.recentResponses.title")}
                </Typography>
                {isLoading ? (
                  <Skeleton variant="rectangular" height={160} />
                ) : recentResponses.length ? (
                  <List dense>
                    {recentResponses.map((response) => (
                      <ListItem
                        key={response.id}
                        divider
                        secondaryAction={
                          <Chip
                            color="primary"
                            label={`${t("teacher.dashboard.recentResponses.score")}: ${Math.min(Math.round(response.score * 100), 100)}%`}
                            size="small"
                          />
                        }
                      >
                        <ListItemText
                          primary={`${response.quiz.title} · ${response.user.firstName} ${response.user.lastName}`}
                          secondary={`${t("teacher.dashboard.recentResponses.submittedBy")}: ${new Date(response.submittedAt).toLocaleString()}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">
                    {t("teacher.dashboard.recentResponses.empty")}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </TeacherLayout>
  );
}
