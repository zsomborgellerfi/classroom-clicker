import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { Quiz } from "@shared/types";

import { useTranslation } from "@/hooks/useTranslation";
import { StudentLayout } from "@/layouts/StudentLayout";
import api, { ENDPOINTS } from "@/lib/api";

export default function StudentQuiz() {
  const { classId, lessonId, quizId } = useParams<{
    classId: string;
    lessonId: string;
    quizId: string;
  }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string>("");

  const { data: quiz, isLoading } = useQuery<Quiz>({
    queryKey: ["student-quiz", quizId],
    queryFn: async () => {
      const response = await api.get<Quiz>(
        ENDPOINTS.QUIZ.GET(classId!, lessonId!, quizId!),
      );
      return response.data;
    },
    enabled: Boolean(classId && lessonId && quizId),
  });

  const question = quiz?.questions?.[0];

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!question || !selectedOption) {
        throw new Error("missing-data");
      }
      await api.post(
        ENDPOINTS.STUDENT.QUIZ.SUBMIT(classId!, lessonId!, quizId!),
        {
          answers: [
            {
              questionId: question.id,
              selectedOptionId: selectedOption,
            },
          ],
        },
      );
    },
    onSuccess: () => {
      toast.success(t("student.quizzes.success"));
      navigate(`/student/classes/${classId}`);
    },
    onError: (error: unknown) => {
      if (error instanceof Error && error.message === "missing-data") {
        toast.error(t("student.quizzes.unanswered"));
        return;
      }
      toast.error(t("student.quizzes.error"));
    },
  });

  const handleSubmit = () => {
    if (!selectedOption) {
      toast.error(t("student.quizzes.unanswered"));
      return;
    }
    submitMutation.mutate();
  };

  return (
    <StudentLayout>
      <Card variant="outlined">
        <CardContent>
          {isLoading && <Typography>{t("common.loading")}</Typography>}
          {!isLoading && !quiz && (
            <Alert severity="error">{t("student.quizzes.error")}</Alert>
          )}
          {!isLoading && quiz && (
            <>
              <Typography variant="h4" gutterBottom>
                {quiz.title}
              </Typography>
              {!quiz.isActive && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {t("student.quizzes.inactive")}
                </Alert>
              )}
              {question ? (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {question.text}
                  </Typography>
                  <RadioGroup
                    value={selectedOption}
                    onChange={(event) => setSelectedOption(event.target.value)}
                  >
                    {question.options.map((option) => (
                      <FormControlLabel
                        key={option.id}
                        value={option.id}
                        control={<Radio />}
                        label={option.text}
                        disabled={!quiz.isActive}
                      />
                    ))}
                  </RadioGroup>
                </Box>
              ) : (
                <Typography color="text.secondary">
                  {t("student.quizzes.error")}
                </Typography>
              )}
              <Box sx={{ mt: 3, display: "flex", gap: 2 }}>
                <Button variant="outlined" onClick={() => navigate(-1)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="contained"
                  disabled={!quiz?.isActive || submitMutation.isPending}
                  onClick={handleSubmit}
                >
                  {submitMutation.isPending
                    ? t("student.quizzes.submitting")
                    : t("student.quizzes.submit")}
                </Button>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </StudentLayout>
  );
}
