import {
  Box,
  Breadcrumbs,
  Card,
  CardContent,
  Chip,
  Grid,
  Link as MuiLink,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Link as RouterLink } from "react-router-dom";

import { Quiz, StudentResponse } from "@shared/types";

import { useTranslation } from "@/hooks/useTranslation";
import { TeacherLayout } from "@/layouts/TeacherLayout";
import api, { ENDPOINTS } from "@/lib/api";

export function QuizDetails() {
  const { classId, lessonId, quizId } = useParams();
  const { t } = useTranslation();

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

  // Add sorting state
  const [orderBy, setOrderBy] = useState<"name" | "score" | "submittedAt">(
    "submittedAt",
  );
  const [order, setOrder] = useState<"asc" | "desc">("desc");

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

  // Calculate statistics
  const totalResponses = responses?.length || 0;
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

  return (
    <TeacherLayout>
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink
          component={RouterLink}
          to="/teacher/classes"
          color="inherit"
          underline="hover"
        >
          {t("teacher.classes.title")}
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={`/teacher/classes/${classId}`}
          color="inherit"
          underline="hover"
        >
          {t("teacher.lessons.title.label")}
        </MuiLink>
        <MuiLink
          component={RouterLink}
          to={`/teacher/classes/${classId}/lessons/${lessonId}/quizzes`}
          color="inherit"
          underline="hover"
        >
          {t("teacher.quizzes.list.title")}
        </MuiLink>
        <Typography color="text.primary">{quiz.title}</Typography>
      </Breadcrumbs>
      <Box>
        {/* Add Breadcrumbs */}

        <Typography variant="h4" gutterBottom>
          {t("teacher.quizzes.title")}
        </Typography>

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
                    ? `${Math.round(
                        (responses.reduce((acc, r) => acc + (r.score || 0), 0) /
                          responses.length) *
                          100,
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
                    <TableCell>{`${Math.round(response.score * 100)}%`}</TableCell>
                    <TableCell>
                      {new Date(response.submittedAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </TeacherLayout>
  );
}
