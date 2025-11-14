import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { Lesson } from "@shared/types";

import { useTranslation } from "@/hooks/useTranslation";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/api";

interface LessonFormDialogProps {
  classId: string;
  lesson?: Lesson | null;
  open: boolean;
  onClose: () => void;
}

const lessonSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
});

type LessonFormData = z.infer<typeof lessonSchema>;

export function LessonFormDialog({
  classId,
  lesson,
  open,
  onClose,
}: LessonFormDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditMode = !!lesson;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
  });

  useEffect(() => {
    if (lesson && open) {
      reset({
        title: lesson.title,
        content: lesson.content,
      });
    } else if (!open) {
      reset({
        title: "",
        content: "",
      });
    }
  }, [lesson, open, reset]);

  const lessonMutation = useMutation({
    mutationFn: async (data: LessonFormData) => {
      const url = isEditMode
        ? ENDPOINTS.LESSON.UPDATE(classId, lesson!.id)
        : ENDPOINTS.LESSON.CREATE(classId);
      const response = await (isEditMode
        ? api.put(url, data)
        : api.post(url, data));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", classId] });
      toast.success(
        t(
          isEditMode
            ? "teacher.lessons.edit.success"
            : "teacher.lessons.create.success",
        ),
      );
      onClose();
    },
    onError: () => {
      toast.error(
        t(
          isEditMode
            ? "teacher.lessons.edit.error"
            : "teacher.lessons.create.error",
        ),
      );
    },
  });

  const onSubmit = (data: LessonFormData) => {
    lessonMutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {t(
            isEditMode
              ? "teacher.lessons.edit.title"
              : "teacher.lessons.create.title",
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            {...register("title")}
            label={t("teacher.lessons.titleInput.label")}
            error={!!errors.title}
            helperText={errors.title?.message}
            fullWidth
            margin="normal"
          />
          <TextField
            {...register("content")}
            label={t("teacher.lessons.content.label")}
            error={!!errors.content}
            helperText={errors.content?.message}
            multiline
            rows={4}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={lessonMutation.isPending}
          >
            {lessonMutation.isPending
              ? t(
                  isEditMode
                    ? "teacher.lessons.edit.loading"
                    : "teacher.lessons.create.loading",
                )
              : t(
                  isEditMode
                    ? "teacher.lessons.edit.button"
                    : "teacher.lessons.create.button",
                )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
