import { Box, Button, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

import { Lesson } from "@shared/types";

import { AlertDialog } from "../../components/common/AlertDialog";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { LessonFormDialog } from "../../components/teacher/LessonFormDialog";
import { LessonTable } from "../../components/teacher/LessonTable";
import { useTranslation } from "../../hooks/useTranslation";
import { TeacherLayout } from "../../layouts/TeacherLayout";
import api from "../../lib/api";
import { ENDPOINTS } from "../../lib/api";

interface ClassResponse {
  id: string;
  name: string;
  description: string;
  class: {
    name: string;
  };
}

export default function ClassDetails() {
  const { t } = useTranslation();
  const { classId } = useParams<{ classId: string }>();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [deleteLesson, setDeleteLesson] = useState<Lesson | null>(null);
  const queryClient = useQueryClient();

  const { data: classData } = useQuery<ClassResponse>({
    queryKey: ["class", classId],
    queryFn: async () => {
      const response = await api.get<ClassResponse>(
        ENDPOINTS.CLASS.GET(classId!),
      );
      return response.data;
    },
    enabled: !!classId,
  });

  const deleteLessonMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      await api.delete(ENDPOINTS.LESSON.DELETE(classId!, lessonId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lessons", classId] });
      toast.success(t("teacher.lessons.delete.success"));
    },
    onError: () => {
      toast.error(t("teacher.lessons.delete.error"));
    },
  });

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
  };

  const handleDelete = (lesson: Lesson) => {
    setDeleteLesson(lesson);
  };

  const handleConfirmDelete = () => {
    if (deleteLesson) {
      deleteLessonMutation.mutate(deleteLesson.id);
    }
  };

  const breadcrumbItems = [
    { label: t("teacher.dashboard.title"), path: "/teacher" },
    { label: t("teacher.classes.title"), path: "/teacher/classes" },
    { label: classData?.name || "" },
  ];

  return (
    <TeacherLayout>
      <Breadcrumbs items={breadcrumbItems} />
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">{classData?.name}</Typography>
        <Button variant="contained" onClick={() => setIsCreateDialogOpen(true)}>
          {t("teacher.lessons.create.button")}
        </Button>
      </Box>

      <LessonTable
        classId={classId!}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <LessonFormDialog
        classId={classId!}
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />

      <LessonFormDialog
        classId={classId!}
        lesson={editingLesson}
        open={!!editingLesson}
        onClose={() => setEditingLesson(null)}
      />

      <AlertDialog
        open={!!deleteLesson}
        title={t("teacher.lessons.delete.title")}
        message={t("teacher.lessons.delete.confirm")}
        confirmText={t("common.delete")}
        severity="error"
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteLesson(null)}
      />
    </TeacherLayout>
  );
}
