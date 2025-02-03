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

import { Class } from "@shared/types";

import { useTranslation } from "../../hooks/useTranslation";
import api from "../../lib/api";
import { ENDPOINTS } from "../../lib/api";

interface ClassFormDialogProps {
  classData?: Class | null;
  open: boolean;
  onClose: () => void;
}

const classSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

type ClassFormData = z.infer<typeof classSchema>;

export function ClassFormDialog({
  classData,
  open,
  onClose,
}: ClassFormDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditMode = !!classData;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
  });

  useEffect(() => {
    if (classData && open) {
      reset({
        name: classData.name,
        description: classData.description,
      });
    } else if (!open) {
      reset({
        name: "",
        description: "",
      });
    }
  }, [classData, open, reset]);

  const classMutation = useMutation({
    mutationFn: async (data: ClassFormData) => {
      const url = isEditMode
        ? ENDPOINTS.CLASS.UPDATE(classData!.id)
        : ENDPOINTS.CLASS.CREATE();
      const response = await (isEditMode
        ? api.put(url, data)
        : api.post(url, data));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success(
        t(
          isEditMode
            ? "teacher.classes.edit.success"
            : "teacher.classes.create.success",
        ),
      );
      onClose();
    },
    onError: () => {
      toast.error(
        t(
          isEditMode
            ? "teacher.classes.edit.error"
            : "teacher.classes.create.error",
        ),
      );
    },
  });

  const onSubmit = (data: ClassFormData) => {
    classMutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {t(
            isEditMode
              ? "teacher.classes.edit.title"
              : "teacher.classes.create.title",
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            {...register("name")}
            label={t("teacher.classes.name.label")}
            error={!!errors.name}
            helperText={errors.name?.message}
            fullWidth
            margin="normal"
          />
          <TextField
            {...register("description")}
            label={t("teacher.classes.description.label")}
            error={!!errors.description}
            helperText={errors.description?.message}
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
            disabled={classMutation.isPending}
          >
            {classMutation.isPending
              ? t(
                  isEditMode
                    ? "teacher.classes.edit.loading"
                    : "teacher.classes.create.loading",
                )
              : t(
                  isEditMode
                    ? "teacher.classes.edit.button"
                    : "teacher.classes.create.button",
                )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
