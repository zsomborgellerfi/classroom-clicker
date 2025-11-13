import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "@/hooks/useTranslation";
import { StudentLayout } from "@/layouts/StudentLayout";
import {
  fetchStudentDashboard,
  StudentDashboardResponse,
} from "@/features/student/api/dashboard";

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

export default function StudentDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery<StudentDashboardResponse>({
    queryKey: ["student-dashboard"],
    queryFn: fetchStudentDashboard,
  });

  const stats = [
    {
      label: t("student.dashboard.stats.totalQuizzes"),
      value: data?.stats.totalQuizzes ?? 0,
    },
    {
      label: t("student.dashboard.stats.completed"),
      value: data?.stats.completedQuizzes ?? 0,
    },
    {
      label: t("student.dashboard.stats.averageScore"),
      value: `${Math.round((data?.stats.averageScore ?? 0) * 100)}%`,
    },
  ];

  return (
    <StudentLayout>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {t("student.dashboard.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("student.dashboard.subtitle")}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {stats.map((stat) => (
            <Grid item xs={12} sm={4} key={stat.label}>
              <Card>
                <CardContent>
                  {isLoading ? (
                    <Skeleton variant="rectangular" height={80} />
                  ) : (
                    <>
                      <Typography variant="h4">{stat.value}</Typography>
                      <Typography color="text.secondary">
                        {stat.label}
                      </Typography>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t("student.dashboard.activeQuizzes.title")}
                </Typography>
                {isLoading ? (
                  <Skeleton variant="rectangular" height={200} />
                ) : isError ? (
                  <Alert severity="error">
                    {t("student.dashboard.error")}
                  </Alert>
                ) : data?.activeQuizzes?.length ? (
                  <List>
                    {data.activeQuizzes.map((quiz) => (
                      <ListItem
                        key={quiz.id}
                        divider
                        sx={{ alignItems: "flex-start", cursor: "pointer" }}
                        onClick={() =>
                          navigate(
                            `/student/classes/${quiz.lesson.class.id}/lessons/${quiz.lesson.id}/quizzes/${quiz.id}`,
                          )
                        }
                      >
                        <ListItemText
                          primary={quiz.title}
                          secondary={
                            <>
                              <Typography component="span" variant="body2">
                                {quiz.lesson.class.name} · {quiz.lesson.title}
                              </Typography>
                              <br />
                              <Typography component="span" variant="caption">
                                {t("student.dashboard.activeQuizzes.opens")}:{" "}
                                {formatDateTime(quiz.opensAt)}
                              </Typography>
                              {quiz.closesAt && (
                                <>
                                  <br />
                                  <Typography component="span" variant="caption">
                                    {t("student.dashboard.activeQuizzes.closes")}:{" "}
                                    {formatDateTime(quiz.closesAt)}
                                  </Typography>
                                </>
                              )}
                            </>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">
                    {t("student.dashboard.activeQuizzes.empty")}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t("student.dashboard.nextQuiz.title")}
                </Typography>
                {isLoading ? (
                  <Skeleton variant="rectangular" height={200} />
                ) : data?.nextQuiz ? (
                  (() => {
                    const nextQuiz = data.nextQuiz;
                    return (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <Typography variant="h5">{nextQuiz.title}</Typography>
                        <Typography color="text.secondary">
                          {nextQuiz.lesson.class.name} · {nextQuiz.lesson.title}
                        </Typography>
                        <Typography variant="body2">
                          {t("student.dashboard.nextQuiz.opens")}:{" "}
                          {formatDateTime(nextQuiz.opensAt)}
                        </Typography>
                        <Typography variant="body2">
                          {t("student.dashboard.nextQuiz.closes")}:{" "}
                          {formatDateTime(nextQuiz.closesAt)}
                        </Typography>
                        <Chip
                          label={t("student.dashboard.nextQuiz.cta")}
                          color="primary"
                          onClick={() =>
                            navigate(
                              `/student/classes/${nextQuiz.lesson.class.id}/lessons/${nextQuiz.lesson.id}/quizzes/${nextQuiz.id}`,
                            )
                          }
                        />
                      </Box>
                    );
                  })()
                ) : (
                  <Alert severity="info">
                    {t("student.dashboard.nextQuiz.empty")}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </StudentLayout>
  );
}
