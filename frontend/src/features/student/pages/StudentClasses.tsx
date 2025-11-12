import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Grid,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import type { Class, User } from "@shared/types";

import { useTranslation } from "@/hooks/useTranslation";
import { StudentLayout } from "@/layouts/StudentLayout";
import api, { ENDPOINTS } from "@/lib/api";

export default function StudentClasses() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState("");

  type StudentClass = Class & {
    teacher?: Pick<User, "id" | "name">;
    _count?: {
      students: number;
      lessons: number;
    };
  };

  const {
    data: classes,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["student-classes"],
    queryFn: async () => {
      const response = await api.get<StudentClass[]>(
        ENDPOINTS.STUDENT.CLASSES.LIST(),
      );
      return response.data;
    },
  });

  const joinClassMutation = useMutation({
    mutationFn: async () => {
      await api.post(ENDPOINTS.STUDENT.JOIN(), {
        code: joinCode.trim(),
      });
    },
    onSuccess: () => {
      toast.success(t("student.classes.join.success"));
      setJoinCode("");
      refetch();
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

  const renderContent = () => {
    if (isLoading) {
      return (
        <Grid container spacing={3}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Skeleton variant="rectangular" height={180} />
            </Grid>
          ))}
        </Grid>
      );
    }

    if (isError) {
      return (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => refetch()}>
              {t("student.classes.retry")}
            </Button>
          }
        >
          {t("student.classes.error")}
        </Alert>
      );
    }

    if (!classes || classes.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t("student.classes.empty")}
        </Alert>
      );
    }

    return (
      <Grid container spacing={3}>
        {classes.map((classItem) => (
          <Grid item xs={12} md={6} lg={4} key={classItem.id}>
            <Card
              variant="outlined"
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {classItem.name}
                </Typography>
                {classItem.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {classItem.description}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  {t("student.classes.card.teacher")}: {classItem.teacher?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("student.classes.card.lessons")}:{" "}
                  {classItem._count?.lessons ?? 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t("student.classes.card.students")}:{" "}
                  {classItem._count?.students ?? 0}
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => navigate(`/student/classes/${classItem.id}`)}
                >
                  {t("student.classes.actions.viewDetails")}
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  return (
    <StudentLayout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t("student.classes.title")}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {t("student.classes.subtitle")}
        </Typography>
      </Box>
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
      {renderContent()}
    </StudentLayout>
  );
}
