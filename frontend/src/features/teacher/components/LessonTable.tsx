import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import QuizIcon from "@mui/icons-material/Quiz";
import {
  Box,
  Button,
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

import { Lesson } from "@shared/types";

import { useTranslation } from "@/hooks/useTranslation";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/api";

interface LessonTableProps {
  classId: string;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
}

type LessonsResponse = Lesson[];

export function LessonTable({ classId, onEdit, onDelete }: LessonTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { data: lessons, isLoading } = useQuery<LessonsResponse>({
    queryKey: ["lessons", classId],
    queryFn: async () => {
      const response = await api.get<LessonsResponse>(
        ENDPOINTS.LESSON.LIST(classId),
      );
      return response.data;
    },
  });

  if (isLoading) {
    return <Typography>{t("common.loading")}</Typography>;
  }

  if (!lessons?.length) {
    return <Typography>{t("teacher.lessons.empty")}</Typography>;
  }

  if (isMobile) {
    return (
      <Stack spacing={2}>
        {lessons.map((lesson) => (
          <Paper key={lesson.id} sx={{ p: 2 }}>
            <Typography variant="h6">{lesson.title}</Typography>
            {lesson.content && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {lesson.content.length > 120
                  ? `${lesson.content.slice(0, 120)}...`
                  : lesson.content}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
              {new Date(lesson.createdAt).toLocaleDateString()}
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<QuizIcon />}
                onClick={() =>
                  navigate(
                    `/teacher/classes/${classId}/lessons/${lesson.id}/quizzes`,
                  )
                }
              >
                {t("teacher.lessons.actions.viewQuizzes")}
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => onEdit(lesson)}
              >
                {t("teacher.lessons.actions.edit")}
              </Button>
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={() => onDelete(lesson)}
              >
                {t("teacher.lessons.actions.delete")}
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
            <TableCell>{t("teacher.lessons.table.title")}</TableCell>
            <TableCell>{t("teacher.lessons.table.content")}</TableCell>
            <TableCell>{t("teacher.lessons.table.createdAt")}</TableCell>
            <TableCell align="right">
              {t("teacher.lessons.table.actions")}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lessons.map((lesson) => (
            <TableRow key={lesson.id}>
              <TableCell>{lesson.title}</TableCell>
              <TableCell>{lesson.content}</TableCell>
              <TableCell>
                {new Date(lesson.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell align="right">
                <Tooltip title={t("teacher.lessons.actions.viewQuizzes")}>
                  <IconButton
                    onClick={() =>
                      navigate(
                        `/teacher/classes/${classId}/lessons/${lesson.id}/quizzes`,
                      )
                    }
                    size="small"
                  >
                    <QuizIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t("teacher.lessons.actions.edit")}>
                  <IconButton onClick={() => onEdit(lesson)} size="small">
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t("teacher.lessons.actions.delete")}>
                  <IconButton
                    onClick={() => onDelete(lesson)}
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
