import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { Quiz, StudentResponse } from "@shared/types";

import { useTranslation } from "@/hooks/useTranslation";
import { StudentLayout } from "@/layouts/StudentLayout";
import api, { ENDPOINTS } from "@/lib/api";

type AnswerPayload = {
  questionId: string;
  selectedOptionId: string;
};

const formatTimer = (value: number) => {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const computeDeadline = (quiz: Quiz) => {
  const deadlines: number[] = [];
  if (quiz.availableUntil) {
    deadlines.push(new Date(quiz.availableUntil).getTime());
  }
  if (quiz.timeLimitSeconds && quiz.activatedAt) {
    deadlines.push(
      new Date(quiz.activatedAt).getTime() + quiz.timeLimitSeconds * 1000,
    );
  }
  if (!deadlines.length) {
    return null;
  }
  return Math.min(...deadlines);
};

export default function StudentQuiz() {
  const { classId, lessonId, quizId } = useParams<{
    classId: string;
    lessonId: string;
    quizId: string;
  }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    {},
  );
  const [reviewResponse, setReviewResponse] = useState<StudentResponse | null>(
    null,
  );
  const [showExistingReview, setShowExistingReview] = useState(true);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isAnswering, setIsAnswering] = useState(true);

  const { data: quiz, isLoading } = useQuery<Quiz>({
    queryKey: ["student-quiz", classId, lessonId, quizId],
    queryFn: async () => {
      const response = await api.get<Quiz>(
        ENDPOINTS.STUDENT.QUIZ.GET(classId!, lessonId!, quizId!),
      );
      return response.data;
    },
    enabled: Boolean(classId && lessonId && quizId),
  });

  useEffect(() => {
    setSelectedOptions({});
    setReviewResponse(null);
    setShowExistingReview(true);
    setIsAnswering(true);
  }, [quizId]);

  const deadlineMs = useMemo(() => {
    if (!quiz) {
      return null;
    }
    return computeDeadline(quiz);
  }, [quiz]);

  useEffect(() => {
    if (!deadlineMs || !quiz?.isActive) {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const diff = Math.floor((deadlineMs - Date.now()) / 1000);
      setTimeLeft(diff > 0 ? diff : 0);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [deadlineMs, quiz?.isActive]);

  useEffect(() => {
    if (!quiz) {
      return;
    }
    const attemptsTakenValue = quiz.studentAttemptCount ?? 0;
    const attemptLimitValue = quiz.attemptLimit ?? 1;
    const attemptsRemainingValue = Math.max(
      attemptLimitValue - attemptsTakenValue,
      0,
    );
    const shouldPauseBeforeRetake =
      attemptsTakenValue > 0 && attemptsRemainingValue > 0;

    setIsAnswering(!shouldPauseBeforeRetake);

    if (!shouldPauseBeforeRetake) {
      setSelectedOptions({});
    }
  }, [quiz?.id, quiz?.studentAttemptCount, quiz?.attemptLimit]);

  const attemptLimit = quiz?.attemptLimit ?? 1;
  const attemptsTaken = quiz?.studentAttemptCount ?? 0;
  const attemptsRemaining = Math.max(attemptLimit - attemptsTaken, 0);
  const hasAttemptsLeft = attemptsRemaining > 0;
  const isExpired =
    Boolean(deadlineMs) && (timeLeft !== null ? timeLeft <= 0 : false);
  const canSubmit = Boolean(quiz?.isActive && hasAttemptsLeft && !isExpired);
  const shouldShowRetakeButton =
    !isAnswering && hasAttemptsLeft && !isExpired && Boolean(quiz?.isActive);
  const shouldShowSubmitButton = isAnswering && canSubmit;

  const effectiveReview =
    reviewResponse ??
    (showExistingReview ? quiz?.latestStudentResponse ?? null : null);

  const submitMutation = useMutation({
    mutationFn: async (answers: AnswerPayload[]) => {
      const response = await api.post<StudentResponse>(
        ENDPOINTS.STUDENT.QUIZ.SUBMIT(classId!, lessonId!, quizId!),
        { answers },
      );
      return response.data;
    },
    onSuccess: (data) => {
      setReviewResponse(data);
      setShowExistingReview(true);
      setSelectedOptions({});
      setIsAnswering(false);
      toast.success(t("student.quizzes.success"));
      if (classId && lessonId && quizId) {
        queryClient.invalidateQueries({
          queryKey: ["student-quiz", classId, lessonId, quizId],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["student-dashboard"] });
    },
    onError: () => {
      toast.error(t("student.quizzes.error"));
    },
  });

  const handleSubmit = () => {
    if (!quiz) {
      return;
    }
    if (!canSubmit || !isAnswering) {
      toast.error(t("student.quizzes.answersLocked"));
      return;
    }
    const answers: AnswerPayload[] = [];
    for (const question of quiz.questions ?? []) {
      const selected = selectedOptions[question.id];
      if (!selected) {
        toast.error(t("student.quizzes.unanswered"));
        return;
      }
      answers.push({
        questionId: question.id,
        selectedOptionId: selected,
      });
    }
    submitMutation.mutate(answers);
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleRetake = () => {
    if (!hasAttemptsLeft || isExpired || !quiz?.isActive) {
      return;
    }
    setReviewResponse(null);
    setShowExistingReview(false);
    setSelectedOptions({});
    setIsAnswering(true);
  };

  if (isLoading || !quiz) {
    return (
      <StudentLayout>
        <Typography>{t("common.loading")}</Typography>
      </StudentLayout>
    );
  }

  const deadlineLabel = deadlineMs
    ? new Date(deadlineMs).toLocaleString()
    : null;
  const metadataChips = [
    t("student.quizzes.attemptLimit", { count: attemptLimit }),
    t("student.quizzes.attemptsRemaining", { count: attemptsRemaining }),
    deadlineLabel
      ? t("student.quizzes.deadline", { value: deadlineLabel })
      : null,
    timeLeft !== null
      ? t("student.quizzes.timer", { value: formatTimer(timeLeft) })
      : null,
  ].filter(Boolean) as string[];

  const questions = quiz.questions ?? [];
  const showCorrectAnswers = !hasAttemptsLeft || !quiz.isActive || isExpired;
  const goBackLabel = t("student.quizzes.goBack");

  return (
    <StudentLayout>
      <Card variant="outlined">
        <CardContent>
          <Typography variant="h4" gutterBottom>
            {quiz.title}
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
            {metadataChips.map((chip) => (
              <Chip key={chip} label={chip} size="small" />
            ))}
          </Box>
          {!quiz.isActive && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t("student.quizzes.inactive")}
            </Alert>
          )}
          {isExpired && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t("student.quizzes.expired")}
            </Alert>
          )}
          {!hasAttemptsLeft && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t("student.quizzes.noAttempts")}
            </Alert>
          )}
          {questions.map((question, index) => (
            <Box key={question.id} sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                {t("teacher.quizzes.questionPrefix")} {index + 1}
              </Typography>
              <Typography sx={{ mb: 1 }}>{question.text}</Typography>
              <RadioGroup
                value={selectedOptions[question.id] ?? ""}
                onChange={(event) =>
                  handleSelectOption(question.id, event.target.value)
                }
              >
                {question.options.map((option) => (
                  <FormControlLabel
                    key={option.id}
                    value={option.id}
                    control={
                      <Radio
                        disabled={
                          !shouldShowSubmitButton || submitMutation.isPending
                        }
                      />
                    }
                    label={option.text}
                  />
                ))}
              </RadioGroup>
            </Box>
          ))}
          <Divider sx={{ my: 3 }} />
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button variant="outlined" onClick={() => navigate(-1)}>
              {goBackLabel}
            </Button>
            {shouldShowSubmitButton && (
              <Button
                variant="contained"
                disabled={submitMutation.isPending}
                onClick={handleSubmit}
              >
                {submitMutation.isPending
                  ? t("student.quizzes.submitting")
                  : t("student.quizzes.submit")}
              </Button>
            )}
            {effectiveReview && shouldShowRetakeButton && (
              <Button onClick={handleRetake}>
                {t("student.quizzes.retake")}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {effectiveReview && (
        <Card variant="outlined" sx={{ mt: 4 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              {t("student.quizzes.reviewTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {t("student.quizzes.attemptNumber", {
                value: effectiveReview.attemptNumber,
              })}{" "}
              ·{" "}
              {t("student.quizzes.submittedAt", {
                value: new Date(effectiveReview.submittedAt).toLocaleString(),
              })}{" "}
              ·{" "}
              {t("student.quizzes.scoreLabel", {
                value: Math.round((effectiveReview.score || 0) * 100),
              })}
            </Typography>
            {effectiveReview.answers.map((answer, index) => {
              const question = answer.question;
              const selectedOption = answer.selectedOption;
              const correctOption =
                showCorrectAnswers && question
                  ? question.options.find((opt) => opt.isCorrect)
                  : undefined;
              const isCorrect = selectedOption?.isCorrect ?? false;
              return (
                <Box key={answer.id} sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Typography variant="subtitle1">
                      {t("teacher.quizzes.questionPrefix")} {index + 1}
                    </Typography>
                    <Chip
                      label={
                        isCorrect
                          ? t("student.quizzes.answerCorrect")
                          : t("student.quizzes.answerIncorrect")
                      }
                      color={isCorrect ? "success" : "error"}
                      size="small"
                    />
                  </Box>
                  <Typography sx={{ mb: 1 }}>{question?.text}</Typography>
                  {selectedOption && (
                    <Typography>
                      {t("student.quizzes.yourAnswer", {
                        value: selectedOption.text,
                      })}
                    </Typography>
                  )}
                  {showCorrectAnswers && correctOption && (
                    <Typography color="text.secondary">
                      {t("student.quizzes.correctAnswerLabel", {
                        value: correctOption.text,
                      })}
                    </Typography>
                  )}
                  {showCorrectAnswers && question?.explanation && (
                    <Typography sx={{ mt: 1 }}>
                      {t("student.quizzes.explanation", {
                        value: question.explanation,
                      })}
                    </Typography>
                  )}
                  <Divider sx={{ mt: 2 }} />
                </Box>
              );
            })}
          </CardContent>
        </Card>
      )}
    </StudentLayout>
  );
}
