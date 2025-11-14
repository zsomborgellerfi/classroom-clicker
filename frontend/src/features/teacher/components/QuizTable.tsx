import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PreviewIcon from "@mui/icons-material/Preview";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

import { Quiz } from "@shared/types";

import { useTranslation } from "@/hooks/useTranslation";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/api";

type QuizResponse = Quiz[];

interface QuizTableProps {
  classId: string;
  lessonId: string;
  onEdit: (quiz: Quiz) => void;
  onDelete: (quiz: Quiz) => void;
}

export function QuizTable({
  classId,
  lessonId,
  onEdit,
  onDelete,
}: QuizTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { data: quizzes, isLoading } = useQuery<QuizResponse>({
    queryKey: ["quizzes", lessonId],
    queryFn: async () => {
      const response = await api.get<QuizResponse>(
        ENDPOINTS.QUIZ.LIST(classId, lessonId),
      );
      return response.data;
    },
  });

  if (isLoading) {
    return <Typography>{t("common.loading")}</Typography>;
  }

  if (!quizzes?.length) {
    return <Typography>{t("teacher.quizzes.empty")}</Typography>;
  }

  if (isMobile) {
    return (
      <Stack spacing={2}>
        {quizzes.map((quiz) => (
          <Paper key={quiz.id} sx={{ p: 2 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 1,
                mb: 1,
              }}
            >
              <Typography variant="h6">{quiz.title}</Typography>
              <Chip
                label={
                  quiz.isActive
                    ? t("teacher.quizzes.table.active")
                    : t("teacher.quizzes.table.inactive")
                }
                color={quiz.isActive ? "success" : "default"}
                size="small"
              />
            </Box>
            <Typography variant="body2" color="text.secondary">
              {t("teacher.quizzes.table.questions")}:{" "}
              {quiz._count?.questions ?? 0} ·{" "}
              {t("teacher.quizzes.table.responses")}:{" "}
              {quiz._count?.responses ?? 0}
            </Typography>
            <Box sx={{ mt: 1, display: "grid", gap: 0.5 }}>
              <Typography variant="body2">
                {quiz.attemptLimit
                  ? t("teacher.quizzes.table.attemptsLabel", {
                      count: quiz.attemptLimit,
                    })
                  : t("teacher.quizzes.table.attemptsUnlimited")}
              </Typography>
              <Typography variant="body2">
                {quiz.timeLimitSeconds
                  ? t("teacher.quizzes.table.timeLimitValue", {
                      minutes: Math.round((quiz.timeLimitSeconds ?? 0) / 60),
                    })
                  : t("teacher.quizzes.table.timeLimitNone")}
              </Typography>
              <Typography variant="body2">
                {quiz.availableUntil
                  ? t("teacher.quizzes.table.deadlineValue", {
                      value: new Date(quiz.availableUntil).toLocaleString(),
                    })
                  : t("teacher.quizzes.table.deadlineNone")}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={() =>
                  navigate(
                    `/teacher/classes/${classId}/lessons/${lessonId}/quizzes/${quiz.id}`,
                  )
                }
              >
                {t("teacher.quizzes.actions.view")}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => onEdit(quiz)}
              >
                {t("teacher.quizzes.actions.edit")}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => onDelete(quiz)}
              >
                {t("teacher.quizzes.actions.delete")}
              </Button>
            </Box>
          </Paper>
        ))}
      </Stack>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t("teacher.quizzes.table.title")}</TableCell>
            <TableCell>{t("teacher.quizzes.table.status")}</TableCell>
            <TableCell align="center">
              {t("teacher.quizzes.table.questions")}
            </TableCell>
            <TableCell align="center">
              {t("teacher.quizzes.table.responses")}
            </TableCell>
            <TableCell>{t("teacher.quizzes.table.rules")}</TableCell>
            <TableCell>{t("teacher.quizzes.table.createdAt")}</TableCell>
            <TableCell align="right">
              {t("teacher.quizzes.table.actions")}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {quizzes.map((quiz) => (
            <TableRow key={quiz.id}>
              <TableCell>{quiz.title}</TableCell>
              <TableCell>
                <Chip
                  label={
                    quiz.isActive
                      ? t("teacher.quizzes.table.active")
                      : t("teacher.quizzes.table.inactive")
                  }
                  color={quiz.isActive ? "success" : "default"}
                  size="small"
                />
              </TableCell>
              <TableCell align="center">
                {quiz._count?.questions ?? 0}
              </TableCell>
              <TableCell align="center">
                {quiz._count?.responses ?? 0}
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {quiz.attemptLimit
                    ? t("teacher.quizzes.table.attemptsLabel", {
                        count: quiz.attemptLimit,
                      })
                    : t("teacher.quizzes.table.attemptsUnlimited")}
                </Typography>
                <Typography variant="body2">
                  {quiz.timeLimitSeconds
                    ? t("teacher.quizzes.table.timeLimitValue", {
                        minutes: Math.round((quiz.timeLimitSeconds ?? 0) / 60),
                      })
                    : t("teacher.quizzes.table.timeLimitNone")}
                </Typography>
                <Typography variant="body2">
                  {quiz.availableUntil
                    ? t("teacher.quizzes.table.deadlineValue", {
                        value: new Date(quiz.availableUntil).toLocaleString(),
                      })
                    : t("teacher.quizzes.table.deadlineNone")}
                </Typography>
              </TableCell>
              <TableCell>
                {new Date(quiz.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell align="right">
                <Tooltip title={t("teacher.quizzes.actions.view")}>
                  <IconButton
                    onClick={() =>
                      navigate(
                        `/teacher/classes/${classId}/lessons/${lessonId}/quizzes/${quiz.id}`,
                      )
                    }
                    size="small"
                  >
                    <PreviewIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t("teacher.quizzes.actions.edit")}>
                  <IconButton onClick={() => onEdit(quiz)} size="small">
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t("teacher.quizzes.actions.delete")}>
                  <IconButton
                    onClick={() => onDelete(quiz)}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
