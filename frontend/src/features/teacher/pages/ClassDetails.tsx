import PeopleIcon from "@mui/icons-material/People";
import { Box, Button, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { Lesson } from "@shared/types";

import { LessonFormDialog } from "@/features/teacher/components/LessonFormDialog";
import { LessonTable } from "@/features/teacher/components/LessonTable";
import { useTranslation } from "@/hooks/useTranslation";
import { TeacherLayout } from "@/layouts/TeacherLayout";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/api";
import { AlertDialog } from "@/shared/ui/AlertDialog";
import { Breadcrumbs } from "@/shared/ui/Breadcrumbs";

interface ClassResponse {
  id: string;
  name: string;
  description?: string;
  students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  }>;
}

export default function ClassDetails() {
  const { t } = useTranslation();
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
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
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 2,
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ mb: 1 }}>
            {classData?.name}
          </Typography>
          {classData?.description && (
            <Typography variant="body1" color="text.secondary">
              {classData.description}
            </Typography>
          )}
        </Box>
        <Button
          variant="outlined"
          onClick={() => navigate(`/teacher/classes/${classId}/progress`)}
        >
          {t("teacher.classes.actions.viewProgress")}
        </Button>
      </Box>

      <Box sx={{ mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            alignItems: "center",
          }}
        >
          <Typography variant="h5">
            {t("teacher.classes.students.title")}
            {classData?.students?.length ? (
              <Typography
                component="span"
                variant="body2"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                ({classData.students.length})
              </Typography>
            ) : null}
          </Typography>
          <Button
            variant="contained"
            startIcon={<PeopleIcon />}
            onClick={() => navigate(`/teacher/classes/${classId}/students`)}
          >
            {t("teacher.classes.actions.manageStudents")}
          </Button>
        </Box>
        {classData?.students && classData.students.length > 0 ? (
          <Box
            sx={{
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              bgcolor: "background.paper",
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {t("teacher.classes.students.quickView", {
                count: classData.students.length,
              })}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              p: 2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              bgcolor: "background.paper",
              textAlign: "center",
            }}
          >
            <Typography color="text.secondary" variant="body2" gutterBottom>
              {t("teacher.classes.students.empty")}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<PeopleIcon />}
              onClick={() => navigate(`/teacher/classes/${classId}/students`)}
              sx={{ mt: 1 }}
            >
              {t("teacher.classes.students.add")}
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            alignItems: "center",
          }}
        >
          <Typography variant="h5">{t("teacher.lessons.title")}</Typography>
          <Button
            variant="contained"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            {t("teacher.lessons.create.button")}
          </Button>
        </Box>
        <LessonTable
          classId={classId!}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Box>

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
