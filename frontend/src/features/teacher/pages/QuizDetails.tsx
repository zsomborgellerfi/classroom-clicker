import FileDownloadIcon from "@mui/icons-material/FileDownload";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

import { Quiz, StudentResponse } from "@shared/types";

import { QuizFormDialog } from "@/features/teacher/components/QuizFormDialog";
import { useTranslation } from "@/hooks/useTranslation";
import { TeacherLayout } from "@/layouts/TeacherLayout";
import api, { ENDPOINTS } from "@/lib/api";
import { exportQuizResults } from "@/lib/export";
import { connectSocket } from "@/lib/socket";
import { Breadcrumbs } from "@/shared/ui/Breadcrumbs";
import { useAppSelector } from "@/store/hooks";

export function QuizDetails() {
  const { classId, lessonId, quizId } = useParams();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { token } = useAppSelector((state) => state.auth);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { data: quiz } = useQuery<Quiz>({
    queryKey: ["quiz", quizId],
    queryFn: async () => {
      const response = await api.get<Quiz>(
        ENDPOINTS.QUIZ.GET(classId!, lessonId!, quizId!),
      );
      return response.data;
    },
  });

  const { data: responses } = useQuery<StudentResponse[]>({
    queryKey: ["quiz-responses", quizId],
    queryFn: async () => {
      const response = await api.get<StudentResponse[]>(
        ENDPOINTS.QUIZ.RESPONSES(classId!, lessonId!, quizId!),
      );
      return response.data;
    },
  });
  const { data: classInfo } = useQuery<{
    id: string;
    name: string;
    students: { id: string }[];
  }>({
    queryKey: ["class", classId],
    queryFn: async () => {
      const response = await api.get<{
        id: string;
        name: string;
        students: { id: string }[];
      }>(ENDPOINTS.CLASS.GET(classId!));
      return response.data;
    },
    enabled: Boolean(classId),
  });

  const { data: lessonData } = useQuery<{
    id: string;
    title: string;
    class: {
      id: string;
      name: string;
    };
  }>({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const response = await api.get<{
        id: string;
        title: string;
        class: {
          id: string;
          name: string;
        };
      }>(ENDPOINTS.LESSON.GET(classId!, lessonId!));
      return response.data;
    },
    enabled: Boolean(classId) && Boolean(lessonId),
  });

  // Add sorting state
  const [orderBy, setOrderBy] = useState<"name" | "score" | "submittedAt">(
    "submittedAt",
  );
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const activateQuizMutation = useMutation({
    mutationFn: async (quizData: Quiz) => {
      const response = await api.put<Quiz>(
        ENDPOINTS.QUIZ.UPDATE(classId!, lessonId!, quizId!),
        {
          title: quizData.title,
          isActive: true,
          timeLimitSeconds: quizData.timeLimitSeconds,
          availableUntil: quizData.availableUntil,
          attemptLimit: quizData.attemptLimit,
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
      queryClient.invalidateQueries({ queryKey: ["quizzes", lessonId] });
      toast.success(t("teacher.quizzes.activate.success"));
    },
    onError: () => {
      toast.error(t("teacher.quizzes.activate.error"));
    },
  });

  const handleActivate = () => {
    if (quiz) {
      activateQuizMutation.mutate(quiz);
    }
  };

  useEffect(() => {
    if (!token || !quizId || !lessonId || !classId) {
      return;
    }

    const socket = connectSocket(token);
    if (!socket) {
      return;
    }

    const handleResponsesUpdated = (payload: {
      quizId: string;
      lessonId: string;
      classId: string;
    }) => {
      if (
        payload.quizId === quizId &&
        payload.lessonId === lessonId &&
        payload.classId === classId
      ) {
        queryClient.invalidateQueries({ queryKey: ["quiz", quizId] });
        queryClient.invalidateQueries({ queryKey: ["quiz-responses", quizId] });
        queryClient.invalidateQueries({ queryKey: ["class", classId] });
      }
    };

    socket.on("quiz:responses-updated", handleResponsesUpdated);

    return () => {
      socket.off("quiz:responses-updated", handleResponsesUpdated);
    };
  }, [token, quizId, lessonId, classId, queryClient]);

  // Sorting handler
  const handleSort = (property: typeof orderBy) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Sort function
  const sortResponses = (responses: StudentResponse[]) => {
    return [...responses].sort((a, b) => {
      const multiplier = order === "asc" ? 1 : -1;

      switch (orderBy) {
        case "name":
          const nameA = `${a.user.firstName} ${a.user.lastName}`;
          const nameB = `${b.user.firstName} ${b.user.lastName}`;
          return multiplier * nameA.localeCompare(nameB);
        case "score":
          return multiplier * (a.score - b.score);
        case "submittedAt":
          return (
            multiplier *
            (new Date(a.submittedAt).getTime() -
              new Date(b.submittedAt).getTime())
          );
        default:
          return 0;
      }
    });
  };

  if (!quiz) return null;

  // Check if quiz has started (has responses)
  const hasStarted = (responses?.length ?? 0) > 0;

  // Check if quiz is finished (deadline has passed)
  const isFinished = (() => {
    if (!quiz.isActive && !hasStarted) {
      return false; // Not started yet
    }

    const deadlines: number[] = [];
    if (quiz.availableUntil) {
      deadlines.push(new Date(quiz.availableUntil).getTime());
    }
    if (quiz.timeLimitSeconds && quiz.activatedAt) {
      deadlines.push(
        new Date(quiz.activatedAt).getTime() + quiz.timeLimitSeconds * 1000,
      );
    }

    if (deadlines.length === 0) {
      return false; // No deadline, not finished
    }

    const deadline = Math.min(...deadlines);
    return Date.now() > deadline;
  })();

  // Hide buttons if quiz has started or is finished
  const canEdit = !hasStarted && !isFinished;

  // Calculate statistics
  const totalResponses = responses?.length || 0;
  const eligibleStudents = classInfo?.students?.length ?? 0;
  const submittedStudentIds = new Set(
    (responses ?? []).map((response) => response.user.id),
  );
  const submittedCount = submittedStudentIds.size;
  const remainingStudents = Math.max(eligibleStudents - submittedCount, 0);

  const metadata: { label: string; color?: "default" | "success" }[] = [
    {
      label: quiz.isActive
        ? t("teacher.quizzes.table.active")
        : t("teacher.quizzes.table.inactive"),
      color: quiz.isActive ? "success" : "default",
    },
    {
      label: (() => {
        if (!quiz.isActive && (responses?.length ?? 0) === 0) {
          return t("teacher.quizzes.details.statusIdle");
        }
        if (quiz.isActive && remainingStudents > 0) {
          return t("teacher.quizzes.details.statusOngoing");
        }
        return t("teacher.quizzes.details.statusFinished");
      })(),
    },
    {
      label: quiz.attemptLimit
        ? t("teacher.quizzes.details.attemptLimit", {
            count: quiz.attemptLimit,
          })
        : t("teacher.quizzes.details.attemptLimit", { count: 1 }),
    },
    {
      label: quiz.timeLimitSeconds
        ? t("teacher.quizzes.details.timeLimit", {
            minutes: Math.round(quiz.timeLimitSeconds / 60),
          })
        : t("teacher.quizzes.details.timeLimitNone"),
    },
    {
      label: quiz.availableUntil
        ? t("teacher.quizzes.details.deadlineValue", {
            value: new Date(quiz.availableUntil).toLocaleString(),
          })
        : t("teacher.quizzes.details.deadlineNone"),
    },
    {
      label: t("teacher.quizzes.details.eligibleStudents", {
        count: eligibleStudents,
      }),
    },
    {
      label: t("teacher.quizzes.details.remainingStudents", {
        count: remainingStudents,
      }),
    },
  ];

  const questionStats = quiz.questions.map((question) => {
    const optionStats = question.options.map((option) => {
      const selectedCount =
        responses?.filter((r) =>
          r.answers.some(
            (a) =>
              a.questionId === question.id && a.selectedOptionId === option.id,
          ),
        ).length || 0;
      return {
        ...option,
        selectedCount,
        percentage: totalResponses ? (selectedCount / totalResponses) * 100 : 0,
      };
    });
    return { ...question, optionStats };
  });

  const breadcrumbItems = [
    { label: t("teacher.dashboard.title"), path: "/teacher" },
    { label: t("teacher.classes.title"), path: "/teacher/classes" },
    {
      label: lessonData?.class?.name || classInfo?.name || "",
      path: classId ? `/teacher/classes/${classId}` : undefined,
    },
    {
      label: lessonData?.title || "",
      path:
        classId && lessonId
          ? `/teacher/classes/${classId}/lessons/${lessonId}/quizzes`
          : undefined,
    },
    { label: quiz?.title || "" },
  ];

  return (
    <TeacherLayout>
      <Breadcrumbs items={breadcrumbItems} />
      <Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            gap: 2,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Typography variant="h4" gutterBottom sx={{ mb: 0 }}>
            {t("teacher.quizzes.title")}
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              flexWrap: "wrap",
              justifyContent: { xs: "flex-start", md: "flex-end" },
            }}
          >
            {!quiz.isActive && canEdit && (
              <Button
                variant="contained"
                color="success"
                onClick={handleActivate}
                disabled={activateQuizMutation.isPending}
              >
                {t("teacher.quizzes.actions.activate")}
              </Button>
            )}
            {responses && responses.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={() => exportQuizResults(responses, quiz.title)}
              >
                {t("teacher.quizzes.export")}
              </Button>
            )}
            {canEdit && (
              <Button
                variant="contained"
                onClick={() => setIsEditDialogOpen(true)}
              >
                {t("teacher.quizzes.actions.edit")}
              </Button>
            )}
          </Box>
        </Box>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 3 }}>
          {metadata.map(({ label, color }) => (
            <Chip
              key={label}
              label={label}
              size="small"
              color={color ?? "default"}
            />
          ))}
        </Box>

        {/* Overall Statistics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">
                  {t("teacher.quizzes.stats.totalResponses")}
                </Typography>
                <Typography variant="h3">{totalResponses}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">
                  {t("teacher.quizzes.stats.averageScore")}
                </Typography>
                <Typography variant="h3">
                  {responses
                    ? `${Math.min(
                        100,
                        Math.round(
                          (responses.reduce(
                            (acc, r) => acc + Math.min(r.score || 0, 1), // Clamp individual scores to 0-1
                            0,
                          ) /
                            responses.length) *
                            100,
                        ),
                      )}%`
                    : t("teacher.quizzes.stats.noResponses")}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Question Statistics */}
        {questionStats.map((question, index) => (
          <Paper key={question.id} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {`${t("teacher.quizzes.questionPrefix")} ${index + 1}: ${question.text}`}
            </Typography>
            <Box sx={{ mb: 2 }}>
              {question.optionStats.map((option) => (
                <Box key={option.id} sx={{ mb: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                    <Typography sx={{ flexGrow: 1 }}>
                      {option.text}
                      {option.isCorrect && (
                        <Chip
                          label={t("teacher.quizzes.correctAnswer")}
                          color="success"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Typography>
                    <Typography>{`${option.selectedCount} (${Math.round(
                      option.percentage,
                    )}%)`}</Typography>
                  </Box>
                  <Box
                    sx={{
                      height: 8,
                      bgcolor: "grey.200",
                      borderRadius: 1,
                      overflow: "hidden",
                    }}
                  >
                    <Box
                      sx={{
                        width: `${option.percentage}%`,
                        height: "100%",
                        bgcolor: option.isCorrect
                          ? "success.main"
                          : "primary.main",
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>
        ))}

        {/* Individual Responses */}
        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          {t("teacher.quizzes.individualResponses")}
        </Typography>
        {isMobile ? (
          <Stack spacing={2}>
            {responses &&
              sortResponses(responses).map((response) => (
                <Paper key={response.id} sx={{ p: 2 }}>
                  <Typography variant="subtitle1">
                    {`${response.user.firstName} ${response.user.lastName}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("teacher.quizzes.score")}:{" "}
                    {`${Math.min(100, Math.round(Math.min(response.score, 1) * 100))}%`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {t("teacher.quizzes.submittedAt")}:{" "}
                    {new Date(response.submittedAt).toLocaleString()}
                  </Typography>
                </Paper>
              ))}
          </Stack>
        ) : (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === "name"}
                      direction={orderBy === "name" ? order : "asc"}
                      onClick={() => handleSort("name")}
                    >
                      {t("teacher.quizzes.student")}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    {t("teacher.classes.students.table.externalId")}
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === "score"}
                      direction={orderBy === "score" ? order : "asc"}
                      onClick={() => handleSort("score")}
                    >
                      {t("teacher.quizzes.score")}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === "submittedAt"}
                      direction={orderBy === "submittedAt" ? order : "asc"}
                      onClick={() => handleSort("submittedAt")}
                    >
                      {t("teacher.quizzes.submittedAt")}
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {responses &&
                  sortResponses(responses).map((response) => (
                    <TableRow key={response.id}>
                      <TableCell>{`${response.user.firstName} ${response.user.lastName}`}</TableCell>
                      <TableCell>{response.user.externalId || "—"}</TableCell>
                      <TableCell>{`${Math.min(100, Math.round(Math.min(response.score, 1) * 100))}%`}</TableCell>
                      <TableCell>
                        {new Date(response.submittedAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <QuizFormDialog
        classId={classId!}
        lessonId={lessonId!}
        quiz={quiz}
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
      />
    </TeacherLayout>
  );
}
