import { zodResolver } from "@hookform/resolvers/zod";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { User } from "@shared/types";

import { UserRole } from "../../enums/userRole";
import { useTranslation } from "../../hooks/useTranslation";
import api from "../../lib/api";
import { ENDPOINTS } from "../../lib/api";

interface UserFormDialogProps {
  user?: User | null;
  open: boolean;
  onClose: () => void;
}

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.nativeEnum(UserRole),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional(),
});

type UserFormData = z.infer<typeof userSchema>;

export function UserFormDialog({ user, open, onClose }: UserFormDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditMode = !!user;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: UserRole.STUDENT,
    },
  });

  useEffect(() => {
    if (user && open) {
      reset({
        email: user.email,
        name: user.name,
        role: user.role,
      });
    } else if (!open) {
      reset({
        email: "",
        name: "",
        role: UserRole.STUDENT,
        password: "",
      });
    }
  }, [user, open, reset]);

  const userMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const url = isEditMode
        ? ENDPOINTS.ADMIN.USERS.UPDATE(user!.id)
        : ENDPOINTS.ADMIN.USERS.CREATE();
      const response = await (isEditMode
        ? api.put(url, data)
        : api.post(url, data));
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(
        t(
          isEditMode
            ? "admin.users.edit.success"
            : "admin.users.create.success",
        ),
      );
      onClose();
    },
    onError: () => {
      toast.error(
        t(isEditMode ? "admin.users.edit.error" : "admin.users.create.error"),
      );
    },
  });

  const onSubmit = (data: UserFormData) => {
    userMutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>
          {t(
            isEditMode ? "admin.users.edit.title" : "admin.users.create.title",
          )}
        </DialogTitle>
        <DialogContent>
          <TextField
            {...register("name")}
            label={t("admin.users.name.label")}
            error={!!errors.name}
            helperText={errors.name?.message}
            fullWidth
            margin="normal"
          />
          <TextField
            {...register("email")}
            label={t("admin.users.email.label")}
            error={!!errors.email}
            helperText={errors.email?.message}
            fullWidth
            margin="normal"
          />
          {!isEditMode && (
            <TextField
              {...register("password")}
              label={t("admin.users.password.label")}
              type="password"
              error={!!errors.password}
              helperText={errors.password?.message}
              fullWidth
              margin="normal"
            />
          )}
          <FormControl fullWidth margin="normal">
            <InputLabel>{t("admin.users.role.label")}</InputLabel>
            <Select {...register("role")} label={t("admin.users.role.label")}>
              <MenuItem value={UserRole.STUDENT}>
                {t("admin.users.role.student")}
              </MenuItem>
              <MenuItem value={UserRole.TEACHER}>
                {t("admin.users.role.teacher")}
              </MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t("common.cancel")}</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={userMutation.isPending}
          >
            {userMutation.isPending
              ? t(
                  isEditMode
                    ? "admin.users.edit.loading"
                    : "admin.users.create.loading",
                )
              : t(
                  isEditMode
                    ? "admin.users.edit.button"
                    : "admin.users.create.button",
                )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
