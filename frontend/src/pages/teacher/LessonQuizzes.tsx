import { Box, Button, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { useParams } from "react-router-dom";

import { Quiz } from "@shared/types";

import { AlertDialog } from "../../components/common/AlertDialog";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { QuizFormDialog } from "../../components/teacher/QuizFormDialog";
import { QuizTable } from "../../components/teacher/QuizTable";
import { useTranslation } from "../../hooks/useTranslation";
import { TeacherLayout } from "../../layouts/TeacherLayout";
import api, { ENDPOINTS } from "../../lib/api";

interface LessonResponse {
  id: string;
  title: string;
  class: {
    name: string;
  };
}

export default function LessonQuizzes() {
  const { t } = useTranslation();
  const { classId, lessonId } = useParams<{
    classId: string;
    lessonId: string;
  }>();

  const [isCreateQuizDialogOpen, setIsCreateQuizDialogOpen] = useState(false);
  const [deleteQuiz, setDeleteQuiz] = useState<Quiz | null>(null);
  const [editQuiz, setEditQuiz] = useState<Quiz | null>(null);

  const { data: lessonData } = useQuery<LessonResponse>({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const response = await api.get<LessonResponse>(
        ENDPOINTS.LESSON.GET(classId!, lessonId!),
      );
      return response.data;
    },
  });

  const queryClient = useQueryClient();

  const deleteQuizMutation = useMutation({
    mutationFn: async (quizId: string) => {
      await api.delete(ENDPOINTS.QUIZ.DELETE(classId!, lessonId!, quizId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quizzes", lessonId] });
      toast.success(t("teacher.quizzes.delete.success"));
      setDeleteQuiz(null);
    },
    onError: () => {
      toast.error(t("teacher.quizzes.delete.error"));
    },
  });

  const breadcrumbItems = [
    { label: t("teacher.dashboard.title"), path: "/teacher" },
    { label: t("teacher.classes.title"), path: "/teacher/classes" },
    {
      label: lessonData?.class?.name || "",
      path: `/teacher/classes/${classId}`,
    },
    { label: lessonData?.title || "" },
  ];

  const handleEdit = async (quiz: Quiz) => {
    try {
      const response = await api.get(
        ENDPOINTS.QUIZ.GET(classId!, lessonId!, quiz.id),
      );
      setEditQuiz(response.data);
    } catch (error) {
      toast.error(t("teacher.quizzes.edit.error"));
    }
  };

  const handleDelete = (quiz: Quiz) => {
    setDeleteQuiz(quiz);
  };

  const handleConfirmDelete = () => {
    if (deleteQuiz) {
      deleteQuizMutation.mutate(deleteQuiz.id);
    }
  };

  return (
    <TeacherLayout>
      <Breadcrumbs items={breadcrumbItems} />
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">{lessonData?.title}</Typography>
        <Button
          variant="contained"
          onClick={() => setIsCreateQuizDialogOpen(true)}
        >
          {t("teacher.quizzes.create.button")}
        </Button>
      </Box>

      <QuizTable
        classId={classId!}
        lessonId={lessonId!}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <QuizFormDialog
        classId={classId!}
        lessonId={lessonId!}
        open={isCreateQuizDialogOpen}
        onClose={() => setIsCreateQuizDialogOpen(false)}
      />

      <QuizFormDialog
        classId={classId!}
        lessonId={lessonId!}
        quiz={editQuiz}
        open={!!editQuiz}
        onClose={() => setEditQuiz(null)}
      />

      <AlertDialog
        open={!!deleteQuiz}
        title={t("teacher.quizzes.delete.title")}
        message={t("teacher.quizzes.delete.confirm")}
        confirmText={t("common.delete")}
        severity="error"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteQuiz(null)}
      />
    </TeacherLayout>
  );
}
