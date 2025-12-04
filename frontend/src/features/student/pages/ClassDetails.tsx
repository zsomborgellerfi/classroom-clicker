import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Skeleton,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import type { Class, User } from "@shared/types";

import { useTranslation } from "@/hooks/useTranslation";
import { StudentLayout } from "@/layouts/StudentLayout";
import api, { ENDPOINTS } from "@/lib/api";

type StudentQuizSummary = {
  id: string;
  title: string;
  isActive: boolean;
  attemptLimit?: number | null;
  availableUntil?: string | null;
  studentAttemptCount?: number;
  canTakeQuiz?: boolean;
};

type StudentLesson = {
  id: string;
  title: string;
  content?: string;
  createdAt: string | Date;
  quizzes?: StudentQuizSummary[];
};

type StudentClassDetail = Class & {
  teacher?: User;
  students?: User[];
  lessons?: StudentLesson[];
};

export default function ClassDetails() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    data: classData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["student-class", classId],
    enabled: Boolean(classId),
    queryFn: async () => {
      const response = await api.get<StudentClassDetail>(
        ENDPOINTS.STUDENT.CLASSES.GET(classId!),
      );
      return response.data;
    },
  });

  const renderLessons = () => {
    if (!classData?.lessons || classData.lessons.length === 0) {
      return (
        <Alert severity="info">{t("student.classDetails.lessons.empty")}</Alert>
      );
    }

    return (
      <Grid container spacing={3}>
        {classData.lessons.map((lesson) => (
          <Grid item xs={12} md={6} key={lesson.id}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {lesson.title}
                </Typography>
                {lesson.content && (
                  <Typography variant="body2" color="text.secondary">
                    {t("student.classDetails.lessons.contentLabel")}:{" "}
                    {lesson.content.length > 120
                      ? `${lesson.content.slice(0, 120)}...`
                      : lesson.content}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {new Date(lesson.createdAt).toLocaleDateString()}
                </Typography>
                {lesson.quizzes && lesson.quizzes.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {t("student.classDetails.quizzes.title")}
                    </Typography>
                    {lesson.quizzes.map((quiz) => {
                      // Determine if quiz can actually be taken
                      // canTakeQuiz is calculated on backend, but we also check here for safety
                      const canTakeQuiz =
                        quiz.canTakeQuiz ??
                        (quiz.isActive &&
                          (quiz.studentAttemptCount ?? 0) <
                            (quiz.attemptLimit ?? 1) &&
                          (!quiz.availableUntil ||
                            new Date(quiz.availableUntil).getTime() >
                              Date.now()));

                      return (
                        <Box
                          key={quiz.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mb: 1,
                            gap: 2,
                          }}
                        >
                          <Typography variant="body2">{quiz.title}</Typography>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              alignItems: "center",
                            }}
                          >
                            <Chip
                              label={
                                canTakeQuiz
                                  ? t("student.classDetails.quizzes.active")
                                  : t("student.classDetails.quizzes.inactive")
                              }
                              color={canTakeQuiz ? "success" : "default"}
                              size="small"
                            />
                            <Button
                              variant={canTakeQuiz ? "contained" : "outlined"}
                              size="small"
                              onClick={() =>
                                navigate(
                                  `/student/classes/${classData.id}/lessons/${lesson.id}/quizzes/${quiz.id}`,
                                )
                              }
                            >
                              {canTakeQuiz
                                ? t("student.classDetails.quizzes.takeQuiz")
                                : t("student.classDetails.quizzes.viewQuiz")}
                            </Button>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <StudentLayout>
      <Button
        variant="text"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 2 }}
        onClick={() => navigate("/student")}
      >
        {t("student.classDetails.back")}
      </Button>

      {isLoading && (
        <Box>
          <Skeleton variant="text" width={300} height={40} />
          <Skeleton variant="rectangular" height={120} sx={{ my: 2 }} />
          <Skeleton variant="rectangular" height={300} />
        </Box>
      )}

      {isError && <Alert severity="error">{t("student.classes.error")}</Alert>}

      {classData && (
        <Box>
          <Typography variant="h4" gutterBottom>
            {classData.name}
          </Typography>
          {classData.description && (
            <Typography variant="body1" color="text.secondary" gutterBottom>
              {classData.description}
            </Typography>
          )}

          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
            <Chip
              label={`${t("student.classDetails.teacher")}: ${
                classData.teacher?.firstName && classData.teacher?.lastName
                  ? `${classData.teacher.firstName} ${classData.teacher.lastName}`
                  : "—"
              }`}
            />
            <Chip
              label={`${t("student.classDetails.stats.students")}: ${
                classData.students?.length ?? 0
              }`}
            />
            <Chip
              label={`${t("student.classDetails.stats.lessons")}: ${
                classData.lessons?.length ?? 0
              }`}
            />
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" gutterBottom>
            {t("student.classDetails.lessons.title")}
          </Typography>
          {renderLessons()}
        </Box>
      )}
    </StudentLayout>
  );
}
