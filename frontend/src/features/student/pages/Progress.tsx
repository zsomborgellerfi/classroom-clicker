import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Divider,
  IconButton,
  LinearProgress,
  Skeleton,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "@/hooks/useTranslation";
import { StudentLayout } from "@/layouts/StudentLayout";
import api, { ENDPOINTS } from "@/lib/api";

type StudentProgressItem = {
  id: string;
  score: number;
  submittedAt: string;
  attemptNumber: number;
  quiz: {
    id: string;
    title: string;
    attemptLimit: number | null;
    isActive: boolean;
    availableUntil: string | null;
    timeLimitSeconds: number | null;
    activatedAt: string | null;
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

type GroupedProgress = {
  classId: string;
  className: string;
  lessons: {
    lessonId: string;
    lessonTitle: string;
    quizzes: {
      quizId: string;
      quizTitle: string;
      responses: StudentProgressItem[];
      averageScore: number;
      bestScore: number;
      canRetake: boolean;
    }[];
  }[];
  averageScore: number;
  totalQuizzes: number;
};

export default function StudentProgress() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(
    new Set(),
  );

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

  const groupedProgress = useMemo<GroupedProgress[]>(() => {
    if (!progress?.length) return [];

    const classMap = new Map<
      string,
      {
        className: string;
        lessonMap: Map<
          string,
          {
            lessonTitle: string;
            quizMap: Map<
              string,
              {
                quizTitle: string;
                responses: StudentProgressItem[];
                attemptLimit: number | null;
                isActive: boolean;
                availableUntil: string | null;
                timeLimitSeconds: number | null;
                activatedAt: string | null;
              }
            >;
          }
        >;
      }
    >();

    progress.forEach((item) => {
      const classId = item.quiz.lesson.class.id;
      const className = item.quiz.lesson.class.name;
      const lessonId = item.quiz.lesson.id;
      const lessonTitle = item.quiz.lesson.title;
      const quizId = item.quiz.id;
      const quizTitle = item.quiz.title;

      if (!classMap.has(classId)) {
        classMap.set(classId, {
          className,
          lessonMap: new Map(),
        });
      }

      const classData = classMap.get(classId)!;
      if (!classData.lessonMap.has(lessonId)) {
        classData.lessonMap.set(lessonId, {
          lessonTitle,
          quizMap: new Map(),
        });
      }

      const lessonData = classData.lessonMap.get(lessonId)!;
      if (!lessonData.quizMap.has(quizId)) {
        lessonData.quizMap.set(quizId, {
          quizTitle,
          responses: [],
          attemptLimit: item.quiz.attemptLimit,
          isActive: item.quiz.isActive,
          availableUntil: item.quiz.availableUntil,
          timeLimitSeconds: item.quiz.timeLimitSeconds,
          activatedAt: item.quiz.activatedAt,
        });
      }

      lessonData.quizMap.get(quizId)!.responses.push(item);
    });

    return Array.from(classMap.entries()).map(([classId, classData]) => {
      const lessons = Array.from(classData.lessonMap.entries()).map(
        ([lessonId, lessonData]) => {
          const quizzes = Array.from(lessonData.quizMap.entries()).map(
            ([quizId, quizData]) => {
              const responses = quizData.responses.sort(
                (a, b) =>
                  new Date(b.submittedAt).getTime() -
                  new Date(a.submittedAt).getTime(),
              );
              const scores = responses.map((r) => Math.min(r.score, 1.0)); // Cap at 100%
              const averageScore =
                scores.length > 0
                  ? scores.reduce((sum, s) => sum + s, 0) / scores.length
                  : 0;
              const bestScore = Math.max(...scores, 0);

              // Check if quiz can be retaken
              const attemptCount = responses.length;
              const attemptLimit = quizData.attemptLimit ?? 1;
              const hasAttemptsLeft = attemptCount < attemptLimit;
              const computeDeadline = () => {
                const deadlines: number[] = [];
                if (quizData.availableUntil) {
                  deadlines.push(new Date(quizData.availableUntil).getTime());
                }
                if (quizData.timeLimitSeconds && quizData.activatedAt) {
                  deadlines.push(
                    new Date(quizData.activatedAt).getTime() +
                      quizData.timeLimitSeconds * 1000,
                  );
                }
                return deadlines.length > 0
                  ? new Date(Math.min(...deadlines))
                  : null;
              };
              const deadline = computeDeadline();
              const isNotExpired = !deadline || deadline.getTime() > Date.now();
              const canRetake =
                quizData.isActive && hasAttemptsLeft && isNotExpired;

              return {
                quizId,
                quizTitle: quizData.quizTitle,
                responses,
                averageScore,
                bestScore,
                canRetake,
              };
            },
          );

          return {
            lessonId,
            lessonTitle: lessonData.lessonTitle,
            quizzes,
          };
        },
      );

      // Calculate class average by averaging quiz-level averages (not all responses)
      // This ensures each quiz counts equally regardless of number of attempts
      const quizAverages = lessons.flatMap((l) =>
        l.quizzes.map((q) => {
          const scores = q.responses.map((r) => Math.min(r.score, 1.0)); // Cap at 100%
          return scores.length > 0
            ? scores.reduce((sum, s) => sum + s, 0) / scores.length
            : 0;
        }),
      );
      const classAverage =
        quizAverages.length > 0
          ? quizAverages.reduce((sum, s) => sum + s, 0) / quizAverages.length
          : 0;
      const totalQuizzes = lessons.reduce(
        (sum, l) => sum + l.quizzes.length,
        0,
      );

      return {
        classId,
        className: classData.className,
        lessons,
        averageScore: classAverage,
        totalQuizzes,
      };
    });
  }, [progress]);

  const stats = useMemo(() => {
    if (!progress?.length) {
      return null;
    }
    // Cap scores at 100% to prevent display issues
    const cappedScores = progress.map((item) => Math.min(item.score, 1.0));
    const totalScore = cappedScores.reduce((sum, s) => sum + s, 0);
    const avg = totalScore / cappedScores.length;
    const classes = new Set(progress.map((item) => item.quiz.lesson.class.id));
    return {
      responses: progress.length,
      averageScore: avg,
      classes: classes.size,
    };
  }, [progress]);

  const toggleClass = (classId: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ display: "grid", gap: 2 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={200} />
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

    if (!groupedProgress || groupedProgress.length === 0) {
      return <Alert severity="info">{t("student.progress.empty")}</Alert>;
    }

    return (
      <Box sx={{ display: "grid", gap: 3 }}>
        {groupedProgress.map((classData) => (
          <Card key={classData.classId} variant="outlined">
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
                onClick={() => toggleClass(classData.classId)}
              >
                <Box>
                  <Typography variant="h6">{classData.className}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("student.progress.classStats", {
                      quizzes: classData.totalQuizzes,
                      average: Math.round(classData.averageScore * 100),
                    })}
                  </Typography>
                </Box>
                <IconButton>
                  {expandedClasses.has(classData.classId) ? (
                    <ExpandLessIcon />
                  ) : (
                    <ExpandMoreIcon />
                  )}
                </IconButton>
              </Box>

              <Collapse
                in={expandedClasses.has(classData.classId)}
                timeout="auto"
                unmountOnExit
              >
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: "grid", gap: 3 }}>
                  {classData.lessons.map((lesson) => (
                    <Box key={lesson.lessonId}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>
                        {lesson.lessonTitle}
                      </Typography>
                      <Box sx={{ display: "grid", gap: 2 }}>
                        {lesson.quizzes.map((quiz) => (
                          <Card
                            key={quiz.quizId}
                            variant="outlined"
                            sx={{
                              backgroundColor: "background.default",
                            }}
                          >
                            <CardContent>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  justifyContent: "space-between",
                                  gap: 2,
                                }}
                              >
                                <Box sx={{ flexGrow: 1 }}>
                                  <Typography variant="subtitle2" gutterBottom>
                                    {quiz.quizTitle}
                                  </Typography>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      gap: 1,
                                      flexWrap: "wrap",
                                      mt: 1,
                                    }}
                                  >
                                    <Chip
                                      label={t("student.progress.bestScore", {
                                        score: Math.round(quiz.bestScore * 100),
                                      })}
                                      color="success"
                                      size="small"
                                    />
                                    {quiz.responses.length > 1 && (
                                      <Chip
                                        label={t(
                                          "student.progress.averageScore",
                                          {
                                            score: Math.round(
                                              quiz.averageScore * 100,
                                            ),
                                          },
                                        )}
                                        size="small"
                                      />
                                    )}
                                    <Chip
                                      label={
                                        quiz.responses.length === 1
                                          ? t("student.progress.attempts", {
                                              count: 1,
                                            })
                                          : t(
                                              "student.progress.attempts_plural",
                                              {
                                                count: quiz.responses.length,
                                              },
                                            )
                                      }
                                      size="small"
                                      variant="outlined"
                                    />
                                    {quiz.canRetake && (
                                      <Chip
                                        label={t("student.progress.canRetake")}
                                        color="primary"
                                        size="small"
                                      />
                                    )}
                                  </Box>
                                </Box>
                                <Box sx={{ display: "flex", gap: 1 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() =>
                                      navigate(
                                        `/student/classes/${classData.classId}/lessons/${lesson.lessonId}/quizzes/${quiz.quizId}`,
                                      )
                                    }
                                  >
                                    {quiz.canRetake
                                      ? t("student.progress.retake")
                                      : t("student.progress.review")}
                                  </Button>
                                </Box>
                              </Box>
                              {quiz.responses.length > 1 && (
                                <Box sx={{ mt: 2 }}>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ mb: 0.5, display: "block" }}
                                  >
                                    {t("student.progress.progressOverTime")}
                                  </Typography>
                                  <Box sx={{ display: "flex", gap: 0.5 }}>
                                    {quiz.responses
                                      .slice()
                                      .reverse()
                                      .map((response) => (
                                        <Box
                                          key={response.id}
                                          sx={{
                                            flex: 1,
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                          }}
                                        >
                                          <LinearProgress
                                            variant="determinate"
                                            value={response.score * 100}
                                            sx={{
                                              width: "100%",
                                              height: 8,
                                              borderRadius: 1,
                                            }}
                                            color={
                                              response.score >= 0.8
                                                ? "success"
                                                : response.score >= 0.6
                                                  ? "warning"
                                                  : "error"
                                            }
                                          />
                                          <Typography
                                            variant="caption"
                                            sx={{ mt: 0.5 }}
                                          >
                                            #{response.attemptNumber}
                                          </Typography>
                                        </Box>
                                      ))}
                                  </Box>
                                </Box>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Collapse>
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
