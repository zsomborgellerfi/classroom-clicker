import { Box, Button, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { AlertDialog } from "@/shared/ui/AlertDialog";
import { ClassFormDialog } from "@/features/teacher/components/ClassFormDialog";
import {
  ClassListItem,
  ClassTable,
} from "@/features/teacher/components/ClassTable";
import { useTranslation } from "@/hooks/useTranslation";
import { TeacherLayout } from "@/layouts/TeacherLayout";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/api";

export default function TeacherClasses() {
  const { t } = useTranslation();
  const [editingClass, setEditingClass] = useState<ClassListItem | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteClass, setDeleteClass] = useState<ClassListItem | null>(null);
  const queryClient = useQueryClient();

  const deleteClassMutation = useMutation({
    mutationFn: async (classId: string) => {
      await api.delete(ENDPOINTS.CLASS.DELETE(classId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success(t("teacher.classes.delete.success"));
      setDeleteClass(null);
    },
    onError: () => {
      toast.error(t("teacher.classes.delete.error"));
    },
  });

  const handleDelete = (classData: ClassListItem) => {
    setDeleteClass(classData);
  };

  const handleConfirmDelete = () => {
    if (deleteClass) {
      deleteClassMutation.mutate(deleteClass.id);
    }
  };

  return (
    <TeacherLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h4">{t("teacher.classes.title")}</Typography>
          <Button
            variant="contained"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            {t("teacher.classes.create.button")}
          </Button>
        </Box>

        <ClassTable onEdit={setEditingClass} onDelete={handleDelete} />

        <ClassFormDialog
          open={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
        />

        <ClassFormDialog
          classData={editingClass}
          open={!!editingClass}
          onClose={() => setEditingClass(null)}
        />

        <AlertDialog
          open={!!deleteClass}
          title={t("teacher.classes.delete.title")}
          message={t("teacher.classes.delete.confirm")}
          confirmText={t("common.delete")}
          severity="error"
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteClass(null)}
        />
      </Box>
    </TeacherLayout>
  );
}
