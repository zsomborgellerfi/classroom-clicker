import { zodResolver } from "@hookform/resolvers/zod";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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

import { Question } from "@shared/types";

import { useTranslation } from "@/hooks/useTranslation";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/api";

interface QuizFormDialogProps {
  classId: string;
  lessonId: string;
  quiz?: {
    id: string;
    title: string;
    isActive?: boolean;
    questions: Question[];
  } | null;
  open: boolean;
  onClose: () => void;
}

const quizSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  question: z.string().min(5, "Question must be at least 5 characters"),
  options: z
    .array(
      z.object({
        text: z.string().min(1, "Option text is required"),
        isCorrect: z.boolean(),
      }),
    )
    .min(2, "Must have at least 2 options")
    .max(10, "Cannot have more than 10 options")
    .refine((options) => options.filter((opt) => opt.isCorrect).length === 1, {
      message: "Must select exactly one correct answer",
    }),
  isActive: z.boolean().default(false),
});

type QuizFormData = z.infer<typeof quizSchema>;

export function QuizFormDialog({
  classId,
  lessonId,
  quiz,
  open,
  onClose,
}: QuizFormDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditMode = !!quiz;

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
    defaultValues: {
      title: "",
      question: "",
      options: [
        { text: "", isCorrect: false },
        { text: "", isCorrect: false },
      ],
      isActive: false,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });

  const correctAnswerIndex = watch("options").findIndex((opt) => opt.isCorrect);
  const options = watch("options");

  useEffect(() => {
    if (quiz && open && quiz.questions.length > 0) {
      const question = quiz.questions[0];
      reset({
        title: quiz.title,
        question: question.text,
        options: question.options.map((opt) => ({
          text: opt.text,
          isCorrect: opt.isCorrect,
        })),
        isActive: Boolean(quiz.isActive),
      });
    } else if (!open) {
      reset();
    }
  }, [quiz, open, reset]);

  const handleCorrectAnswerChange = (index: number) => {
    fields.forEach((_, i) => {
      setValue(`options.${i}.isCorrect`, false);
    });
    setValue(`options.${index}.isCorrect`, true);
  };

  const quizMutation = useMutation({
    mutationFn: async (data: QuizFormData) => {
      const url = isEditMode
        ? ENDPOINTS.QUIZ.UPDATE(classId, lessonId, quiz!.id)
        : ENDPOINTS.QUIZ.CREATE(classId, lessonId);
      const response = await (isEditMode
        ? api.put(url, data)
        : api.post(url, data));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes", lessonId] });
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

  const handleAddOption = () => {
    if (options.length < 10) {
      append({ text: "", isCorrect: false });
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      if (options[index].isCorrect) {
        setValue(`options.${0}.isCorrect`, true);
      }
      remove(index);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {t(
            isEditMode
              ? "teacher.quizzes.edit.title"
              : "teacher.quizzes.create.title",
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            {...register("title")}
            label={t("teacher.quizzes.titleInput.label")}
            error={!!errors.title}
            helperText={errors.title?.message}
            fullWidth
            margin="normal"
          />
          <TextField
            {...register("question")}
            label={t("teacher.quizzes.question.label")}
            error={!!errors.question}
            helperText={errors.question?.message}
            fullWidth
            margin="normal"
            multiline
            rows={2}
          />
          <Box sx={{ mt: 1 }}>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(event) =>
                        field.onChange(event.target.checked)
                      }
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
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}
            >
              <Typography variant="subtitle1">
                {t("teacher.quizzes.options.title")}
              </Typography>
              <Tooltip title={t("teacher.quizzes.options.add")}>
                <IconButton
                  onClick={handleAddOption}
                  disabled={options.length >= 10}
                  color="primary"
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Box>
            <RadioGroup
              value={correctAnswerIndex === -1 ? "" : correctAnswerIndex}
              onChange={(e) =>
                handleCorrectAnswerChange(Number(e.target.value))
              }
            >
              {fields.map((field, index) => (
                <Box
                  key={field.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1,
                  }}
                >
                  <Radio value={index} />
                  <TextField
                    {...register(`options.${index}.text` as const)}
                    label={t("teacher.quizzes.option.label", {
                      number: index + 1,
                    })}
                    error={!!errors.options?.[index]?.text}
                    helperText={errors.options?.[index]?.text?.message}
                    fullWidth
                  />
                  <Tooltip title={t("teacher.quizzes.options.remove")}>
                    <span>
                      <IconButton
                        onClick={() => handleRemoveOption(index)}
                        disabled={options.length <= 2}
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
            {typeof errors.options?.message === "string" && (
              <Typography variant="body2" color="error">
                {errors.options.message}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="contained">
            {isEditMode
              ? t("teacher.quizzes.edit.button")
              : t("teacher.quizzes.create.button")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
