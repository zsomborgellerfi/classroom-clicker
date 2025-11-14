import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/hooks/useTranslation";
import api, { ENDPOINTS } from "@/lib/api";

interface ClassJoinDialogProps {
  open: boolean;
  onClose: () => void;
  onJoined?: () => void;
}

export function ClassJoinDialog({
  open,
  onClose,
  onJoined,
}: ClassJoinDialogProps) {
  const { t } = useTranslation();
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    if (!open) {
      setJoinCode("");
    }
  }, [open]);

  const joinClassMutation = useMutation({
    mutationFn: async () => {
      await api.post(ENDPOINTS.STUDENT.JOIN(), {
        code: joinCode.trim(),
      });
    },
    onSuccess: () => {
      toast.success(t("student.classes.join.success"));
      setJoinCode("");
      onJoined?.();
      onClose();
    },
    onError: () => {
      toast.error(t("student.classes.join.error"));
    },
  });

  const handleJoinClass = () => {
    if (!joinCode.trim()) {
      toast.error(t("student.classes.join.required"));
      return;
    }
    joinClassMutation.mutate();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("student.classes.join.title")}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
          {t("student.classes.join.subtitle")}
        </Typography>
        <TextField
          label={t("student.classes.join.placeholder")}
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleJoinClass();
            }
          }}
          fullWidth
          margin="normal"
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t("common.cancel")}</Button>
        <Button
          variant="contained"
          disabled={joinClassMutation.isPending}
          onClick={handleJoinClass}
        >
          {joinClassMutation.isPending
            ? t("student.classes.join.submitting")
            : t("student.classes.join.button")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

