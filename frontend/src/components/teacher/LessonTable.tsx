import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import QuizIcon from "@mui/icons-material/Quiz";
import {
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { Lesson } from "@shared/types";

import { useTranslation } from "../../hooks/useTranslation";
import api from "../../lib/api";
import { ENDPOINTS } from "../../lib/api";

interface LessonTableProps {
  classId: string;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
}

type LessonsResponse = Lesson[];

export function LessonTable({ classId, onEdit, onDelete }: LessonTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
