import { zodResolver } from "@hookform/resolvers/zod";
import { LoadingButton } from "@mui/lab";
import { Checkbox, FormControlLabel, Stack, TextField } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

import { useTranslation } from "@/hooks/useTranslation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { login } from "@/store/slices/auth";
import type { LoginCredentials } from "@/types/auth";

export function LoginForm() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.auth);
  const { t } = useTranslation();

  const loginSchema = z.object({
    email: z.string().email(t("admin.users.email.invalid")),
    password: z.string().min(6, t("admin.users.password.min")),
    rememberMe: z.boolean(),
  });

  type LoginFormData = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      rememberMe: false,
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const result = await dispatch(login(credentials)).unwrap();
      const storage = credentials.rememberMe ? localStorage : sessionStorage;
      const otherStorage = credentials.rememberMe
        ? sessionStorage
        : localStorage;
      otherStorage.removeItem("user");
      otherStorage.removeItem("token");
      localStorage.setItem("rememberMe", credentials.rememberMe.toString());
      storage.setItem("user", JSON.stringify(result.user));
      storage.setItem("token", result.token);
      return result;
    },
    onSuccess: (data) => {
      if (data.user.role === "ADMIN") {
        navigate("/admin");
      } else if (data.user.role === "TEACHER") {
        navigate("/teacher");
      } else {
        navigate("/student");
      }
      toast.success("Login successful!");
    },
    onError: (error) => {
      toast.error("Login failed. Please check your credentials.");
      console.error("Login error:", error);
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={3}>
        <TextField
          {...register("email")}
          label={t("auth.email")}
          type="email"
          error={!!errors.email}
          helperText={errors.email?.message}
          fullWidth
        />
        <TextField
          {...register("password")}
          label={t("auth.password")}
          type="password"
          error={!!errors.password}
          helperText={errors.password?.message}
          fullWidth
        />
        <FormControlLabel
          control={<Checkbox {...register("rememberMe")} color="primary" />}
          label={t("auth.rememberMe")}
        />
        <LoadingButton
          type="submit"
          loading={loading}
          variant="contained"
          fullWidth
          size="large"
        >
          {loading ? t("auth.signingIn") : t("auth.signInButton")}
        </LoadingButton>
      </Stack>
    </form>
  );
}
