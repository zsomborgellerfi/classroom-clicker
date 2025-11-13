import { zodResolver } from "@hookform/resolvers/zod";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { Quiz } from "@shared/types";

import { useTranslation } from "@/hooks/useTranslation";
import api, { ENDPOINTS } from "@/lib/api";

interface QuizFormDialogProps {
  classId: string;
  lessonId: string;
  quiz?: (Quiz & { _count?: { responses: number } }) | null;
  open: boolean;
  onClose: () => void;
}

const optionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "teacher.quizzes.validation.optionText"),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(5, "teacher.quizzes.validation.questionText"),
  explanation: z.string().optional(),
  options: optionSchema
    .array()
    .min(2, "teacher.quizzes.validation.minOptions")
    .max(10, "teacher.quizzes.validation.maxOptions")
    .refine(
      (options) => options.filter((opt) => opt.isCorrect).length === 1,
      "teacher.quizzes.validation.correctOption",
    ),
});

const quizSchema = z.object({
  title: z.string().min(2, "teacher.quizzes.validation.title"),
  isActive: z.boolean().default(false),
  timeLimitMinutes: z
    .string()
    .optional()
    .refine(
      (value) => !value || Number(value) > 0,
      "teacher.quizzes.validation.timeLimit",
    ),
  availableUntil: z
    .string()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(new Date(value).getTime()),
      "teacher.quizzes.validation.deadline",
    ),
  attemptLimit: z
    .string()
    .optional()
    .refine(
      (value) => !value || Number(value) >= 1,
      "teacher.quizzes.validation.attemptLimit",
    ),
  questions: questionSchema
    .array()
    .min(1, "teacher.quizzes.validation.minQuestions"),
});

type QuizFormData = z.infer<typeof quizSchema>;

const createDefaultValues = (): QuizFormData => ({
  title: "",
  isActive: false,
  timeLimitMinutes: "",
  availableUntil: "",
  attemptLimit: "1",
  questions: [
    {
      text: "",
      explanation: "",
      options: [
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
      ],
    },
  ],
});

const secondsToMinutes = (value?: number | null) => {
  if (!value) {
    return "";
  }
  return Math.max(1, Math.round(value / 60)).toString();
};

const minutesToSeconds = (value?: string) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  const minutes = Number(trimmed);
  if (Number.isNaN(minutes) || minutes <= 0) {
    return null;
  }
  return Math.round(minutes * 60);
};

const formatDateTimeLocal = (value?: string | null) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (num: number) => num.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export function QuizFormDialog({
  classId,
  lessonId,
  quiz,
  open,
  onClose,
}: QuizFormDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditMode = Boolean(quiz);
  const responsesCount = quiz?._count?.responses ?? 0;
  const questionsLocked = isEditMode && responsesCount > 0;

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<QuizFormData>({
    resolver: zodResolver(quizSchema),
    defaultValues: createDefaultValues(),
  });

  const { fields: questionFields, append, remove } = useFieldArray({
    control,
    name: "questions",
  });

  const questionsValue = watch("questions");

  useEffect(() => {
    if (quiz && open) {
      reset({
        title: quiz.title,
        isActive: Boolean(quiz.isActive),
        timeLimitMinutes: secondsToMinutes(quiz.timeLimitSeconds ?? null),
        availableUntil: formatDateTimeLocal(quiz.availableUntil as string | null),
        attemptLimit: (quiz.attemptLimit ?? 1).toString(),
        questions:
          quiz.questions.length > 0
            ? quiz.questions.map((question) => ({
                id: question.id,
                text: question.text,
                explanation: question.explanation ?? "",
                options: question.options.map((option) => ({
                  id: option.id,
                  text: option.text,
                  isCorrect: option.isCorrect,
                })),
              }))
            : createDefaultValues().questions,
      });
    } else if (!open) {
      reset(createDefaultValues());
    }
  }, [quiz, open, reset]);

  const handleAddQuestion = () => {
    append({
      text: "",
      explanation: "",
      options: [
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
      ],
    });
  };

  const handleRemoveQuestion = (index: number) => {
    if (questionFields.length > 1) {
      remove(index);
    }
  };

  const handleAddOption = (questionIndex: number) => {
    const current = questionsValue?.[questionIndex]?.options ?? [];
    if (current.length >= 10) {
      return;
    }
    const nextOptions = [
      ...current.map((option) => ({ ...option })),
      { text: "", isCorrect: false },
    ];
    setValue(`questions.${questionIndex}.options`, nextOptions, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleRemoveOption = (questionIndex: number, optionIndex: number) => {
    const current = questionsValue?.[questionIndex]?.options ?? [];
    if (current.length <= 2) {
      return;
    }
    const nextOptions = current.map((option) => ({ ...option }));
    const removed = nextOptions.splice(optionIndex, 1);
    if (removed[0]?.isCorrect && nextOptions.length > 0) {
      nextOptions[0].isCorrect = true;
    }
    setValue(`questions.${questionIndex}.options`, nextOptions, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleCorrectAnswerChange = (questionIndex: number, optionIndex: number) => {
    const current = questionsValue?.[questionIndex]?.options ?? [];
    const nextOptions = current.map((option, index) => ({
      ...option,
      isCorrect: index === optionIndex,
    }));
    setValue(`questions.${questionIndex}.options`, nextOptions, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const buildPayload = (data: QuizFormData) => {
    const timeLimitSeconds = minutesToSeconds(data.timeLimitMinutes);
    const deadline =
      data.availableUntil && data.availableUntil.trim().length
        ? new Date(data.availableUntil).toISOString()
        : null;
    const attemptLimitValue = data.attemptLimit?.trim()
      ? Number(data.attemptLimit)
      : null;

    const payload: Record<string, unknown> = {
      title: data.title.trim(),
      isActive: data.isActive,
      timeLimitSeconds,
      availableUntil: deadline,
      attemptLimit: attemptLimitValue,
    };

    if (!questionsLocked) {
      payload.questions = data.questions.map((question) => ({
        id: question.id,
        text: question.text.trim(),
        explanation: question.explanation?.trim() || undefined,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text.trim(),
          isCorrect: option.isCorrect,
        })),
      }));
    }

    return payload;
  };

  const quizMutation = useMutation({
    mutationFn: async (data: QuizFormData) => {
      const payload = buildPayload(data);
      const url = isEditMode
        ? ENDPOINTS.QUIZ.UPDATE(classId, lessonId, quiz!.id)
        : ENDPOINTS.QUIZ.CREATE(classId, lessonId);
      const response = await (isEditMode
        ? api.put(url, payload)
        : api.post(url, payload));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes", lessonId] });
      if (quiz?.id) {
        queryClient.invalidateQueries({ queryKey: ["quiz", quiz.id] });
      }
      toast.success(
        t(
          isEditMode
            ? "teacher.quizzes.edit.success"
            : "teacher.quizzes.create.success",
        ),
      );
      onClose();
    },
    onError: () => {
      toast.error(
        t(
          isEditMode
            ? "teacher.quizzes.edit.error"
            : "teacher.quizzes.create.error",
        ),
      );
    },
  });

  const onSubmit = (data: QuizFormData) => {
    quizMutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {t(
            isEditMode
              ? "teacher.quizzes.edit.title"
              : "teacher.quizzes.create.title",
          )}
        </DialogTitle>
        <DialogContent dividers>
          {questionsLocked && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {t("teacher.quizzes.questions.locked", { count: responsesCount })}
            </Alert>
          )}
          <TextField
            {...register("title")}
            label={t("teacher.quizzes.titleInput.label")}
            error={!!errors.title}
            helperText={errors.title?.message && t(errors.title.message)}
            fullWidth
            margin="normal"
          />
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <TextField
              type="number"
              inputProps={{ min: 1 }}
              {...register("timeLimitMinutes")}
              label={t("teacher.quizzes.timeLimit.label")}
              helperText={t("teacher.quizzes.timeLimit.hint")}
              margin="normal"
              error={!!errors.timeLimitMinutes}
              fullWidth
            />
            <TextField
              type="number"
              inputProps={{ min: 1 }}
              {...register("attemptLimit")}
              label={t("teacher.quizzes.attemptLimit.label")}
              helperText={t("teacher.quizzes.attemptLimit.hint")}
              margin="normal"
              error={!!errors.attemptLimit}
              fullWidth
            />
            <TextField
              type="datetime-local"
              {...register("availableUntil")}
              label={t("teacher.quizzes.deadline.label")}
              helperText={t("teacher.quizzes.deadline.hint")}
              InputLabelProps={{ shrink: true }}
              margin="normal"
              error={!!errors.availableUntil}
              fullWidth
            />
          </Box>
          <Box sx={{ mt: 1 }}>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                    />
                  }
                  label={t("teacher.quizzes.isActive")}
                />
              )}
            />
            <Typography variant="caption" color="text.secondary">
              {t("teacher.quizzes.inactiveHint")}
            </Typography>
          </Box>
          <Divider sx={{ my: 3 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6">
              {t("teacher.quizzes.questions.title")}
            </Typography>
            <Button
              onClick={handleAddQuestion}
              startIcon={<AddIcon />}
              disabled={questionsLocked}
            >
              {t("teacher.quizzes.questions.add")}
            </Button>
          </Box>
          {questionFields.map((questionField, questionIndex) => {
            const options = questionsValue?.[questionIndex]?.options ?? [];
            const correctIndex = options.findIndex((option) => option.isCorrect);
            const questionError = errors.questions?.[questionIndex];

            return (
              <Box
                key={questionField.id}
                sx={{
                  mb: 3,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 2,
                    gap: 1,
                  }}
                >
                  <Typography variant="subtitle1">
                    {t("teacher.quizzes.questions.label", {
                      number: questionIndex + 1,
                    })}
                  </Typography>
                  <Tooltip title={t("teacher.quizzes.questions.remove")}>
                    <span>
                      <IconButton
                        onClick={() => handleRemoveQuestion(questionIndex)}
                        disabled={questionFields.length <= 1 || questionsLocked}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
                <TextField
                  {...register(`questions.${questionIndex}.text` as const)}
                  label={t("teacher.quizzes.question.label")}
                  error={!!questionError?.text}
                  helperText={
                    questionError?.text?.message &&
                    t(questionError.text.message as string)
                  }
                  fullWidth
                  margin="normal"
                  disabled={questionsLocked}
                  multiline
                />
                <TextField
                  {...register(`questions.${questionIndex}.explanation` as const)}
                  label={t("teacher.quizzes.questions.explanation")}
                  fullWidth
                  margin="normal"
                  disabled={questionsLocked}
                  multiline
                  minRows={2}
                />
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mt: 2,
                  }}
                >
                  <Typography variant="subtitle2">
                    {t("teacher.quizzes.options.title")}
                  </Typography>
                  <Tooltip title={t("teacher.quizzes.options.add")}>
                    <span>
                      <IconButton
                        onClick={() => handleAddOption(questionIndex)}
                        disabled={options.length >= 10 || questionsLocked}
                        color="primary"
                      >
                        <AddIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
                <RadioGroup
                  value={correctIndex === -1 ? "" : String(correctIndex)}
                  onChange={(event) =>
                    handleCorrectAnswerChange(
                      questionIndex,
                      Number(event.target.value),
                    )
                  }
                >
                  {options.map((_, optionIndex) => (
                    <Box
                      key={`${questionField.id}-${optionIndex}`}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Radio
                        value={optionIndex}
                        disabled={questionsLocked}
                      />
                      <TextField
                        {...register(
                          `questions.${questionIndex}.options.${optionIndex}.text` as const,
                        )}
                        label={t("teacher.quizzes.option.label", {
                          number: optionIndex + 1,
                        })}
                        error={Boolean(
                          questionError?.options?.[optionIndex]?.text,
                        )}
                        helperText={
                          questionError?.options?.[optionIndex]?.text?.message &&
                          t(
                            questionError.options[optionIndex].text
                              .message as string,
                          )
                        }
                        fullWidth
                        disabled={questionsLocked}
                      />
                      <Tooltip title={t("teacher.quizzes.options.remove")}>
                        <span>
                          <IconButton
                            onClick={() =>
                              handleRemoveOption(questionIndex, optionIndex)
                            }
                            disabled={options.length <= 2 || questionsLocked}
                            color="error"
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  ))}
                </RadioGroup>
                {typeof questionError?.options?.message === "string" && (
                  <Typography variant="body2" color="error">
                    {t(questionError.options.message)}
                  </Typography>
                )}
              </Box>
            );
          })}
          {typeof errors.questions?.message === "string" && (
            <Typography variant="body2" color="error">
              {t(errors.questions.message)}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={quizMutation.isPending}
          >
            {t(
              isEditMode
                ? "teacher.quizzes.edit.button"
                : "teacher.quizzes.create.button",
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
