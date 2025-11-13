import { Box, Button, Card, CardContent, TextField, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { useTranslation } from "@/hooks/useTranslation";
import api, { ENDPOINTS } from "@/lib/api";

interface ClassJoinCardProps {
  onJoined?: () => void;
}

export function ClassJoinCard({ onJoined }: ClassJoinCardProps) {
  const { t } = useTranslation();
  const [joinCode, setJoinCode] = useState("");

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
    <Card variant="outlined" sx={{ mb: 4, maxWidth: 480 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {t("student.classes.join.title")}
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
          {t("student.classes.join.subtitle")}
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
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
            sx={{ flexGrow: 1, minWidth: 200 }}
          />
          <Button
            variant="contained"
            disabled={joinClassMutation.isPending}
            onClick={handleJoinClass}
          >
            {joinClassMutation.isPending
              ? t("student.classes.join.submitting")
              : t("student.classes.join.button")}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
