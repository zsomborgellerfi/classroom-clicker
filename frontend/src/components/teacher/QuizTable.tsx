import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PreviewIcon from "@mui/icons-material/Preview";
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

import { Quiz } from "@shared/types";

import { useTranslation } from "../../hooks/useTranslation";
import api from "../../lib/api";
import { ENDPOINTS } from "../../lib/api";

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

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t("teacher.quizzes.table.title")}</TableCell>
            <TableCell align="center">
              {t("teacher.quizzes.table.questions")}
            </TableCell>
            <TableCell align="center">
              {t("teacher.quizzes.table.responses")}
            </TableCell>
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
              <TableCell align="center">
                {quiz._count?.questions ?? 0}
              </TableCell>
              <TableCell align="center">
                {quiz._count?.responses ?? 0}
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
