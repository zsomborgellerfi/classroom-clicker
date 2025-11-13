import { zodResolver } from "@hookform/resolvers/zod";
import { LoadingButton } from "@mui/lab";
import { Stack, TextField } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { z } from "zod";

import { useTranslation } from "@/hooks/useTranslation";
import api, { ENDPOINTS } from "@/lib/api";

const schema = z
  .object({
    token: z.string().min(10),
    password: z.string().min(6),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "auth.passwordMismatch",
    path: ["confirmPassword"],
  });

type ResetPasswordData = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const defaultToken = useMemo(() => params.get("token") ?? "", [params]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(schema),
    defaultValues: {
      token: defaultToken,
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: ResetPasswordData) => {
      const response = await api.post(ENDPOINTS.AUTH.RESET_PASSWORD(), {
        token: payload.token,
        password: payload.password,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success(t("auth.resetSuccess"));
      navigate("/login");
    },
    onError: () => {
      toast.error(t("auth.resetFailed"));
    },
  });

  const formatErrorMessage = (message?: string) => {
    if (!message) {
      return undefined;
    }
    return message.startsWith("auth.") ? t(message) : message;
  };

  const onSubmit = (data: ResetPasswordData) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={3}>
        <TextField
          {...register("token")}
          label={t("auth.resetToken")}
          error={!!errors.token}
          helperText={formatErrorMessage(errors.token?.message)}
          fullWidth
        />
        <TextField
          {...register("password")}
          type="password"
          label={t("auth.newPassword")}
          error={!!errors.password}
          helperText={errors.password?.message}
          fullWidth
        />
        <TextField
          {...register("confirmPassword")}
          type="password"
          label={t("auth.confirmPassword")}
          error={!!errors.confirmPassword}
          helperText={formatErrorMessage(errors.confirmPassword?.message)}
          fullWidth
        />
        <LoadingButton
          type="submit"
          loading={mutation.isPending}
          variant="contained"
          fullWidth
        >
          {t("auth.resetPasswordTitle")}
        </LoadingButton>
      </Stack>
    </form>
  );
}
