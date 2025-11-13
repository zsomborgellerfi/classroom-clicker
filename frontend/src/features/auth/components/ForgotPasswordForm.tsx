import { zodResolver } from "@hookform/resolvers/zod";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { LoadingButton } from "@mui/lab";
import {
  Alert,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";

import { useTranslation } from "@/hooks/useTranslation";
import api, { ENDPOINTS } from "@/lib/api";

const schema = z.object({
  email: z.string().email(),
});

type ForgotPasswordFormData = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const [latestToken, setLatestToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: async (payload: ForgotPasswordFormData) => {
      const response = await api.post<{ message: string; resetToken?: string }>(
        ENDPOINTS.AUTH.REQUEST_RESET(),
        payload,
      );
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(t("auth.resetRequestSent"));
      setLatestToken(data.resetToken ?? null);
      reset();
    },
    onError: () => {
      toast.error(t("auth.resetRequestFailed"));
    },
  });

  const onSubmit = (data: ForgotPasswordFormData) => {
    mutation.mutate(data);
  };

  const handleCopyToken = async () => {
    if (!latestToken) {
      return;
    }
    try {
      await navigator.clipboard.writeText(latestToken);
      toast.success(t("auth.tokenCopied"));
    } catch (error) {
      console.error("Clipboard error", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={3}>
        <Typography variant="body2">{t("auth.forgotPasswordDescription")}</Typography>
        <TextField
          {...register("email")}
          type="email"
          label={t("auth.email")}
          error={!!errors.email}
          helperText={errors.email?.message}
          fullWidth
        />
        <LoadingButton
          type="submit"
          loading={mutation.isPending}
          variant="contained"
          fullWidth
        >
          {t("auth.sendResetLink")}
        </LoadingButton>
        {latestToken && (
          <Alert severity="info">
            <Stack spacing={1}>
              <Typography variant="subtitle2">{t("auth.resetToken")}</Typography>
              <TextField
                value={latestToken}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton aria-label={t("auth.copyToken")} onClick={handleCopyToken}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {t("auth.checkInbox")}
              </Typography>
            </Stack>
          </Alert>
        )}
      </Stack>
    </form>
  );
}
