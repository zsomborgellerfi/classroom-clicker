import { Box, Button, Stack, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import type { User } from "@shared/types";
import { UserFormDialog } from "@/features/admin/components/UserFormDialog";
import { UserImportDialog, downloadUserImportTemplate } from "@/features/admin/components/UserImportDialog";
import { UserTable } from "@/features/admin/components/UserTable";
import { useTranslation } from "@/hooks/useTranslation";
import { AdminLayout } from "@/layouts/AdminLayout";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/api";
import { AlertDialog } from "@/shared/ui/AlertDialog";

export default function UserManagement() {
  const { t } = useTranslation();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(ENDPOINTS.ADMIN.USERS.DELETE(userId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("admin.users.delete.success"));
    },
    onError: () => {
      toast.error(t("admin.users.delete.error"));
    },
  });

  const handleEdit = (user: User) => {
    setEditingUser(user);
  };

  const handleDelete = (user: User) => {
    setDeleteUser(user);
  };

  const handleConfirmDelete = () => {
    if (deleteUser) {
      deleteUserMutation.mutate(deleteUser.id);
    }
  };

  const handleImportComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["users"] });
  };

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 3,
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="h4">{t("admin.users.title")}</Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" onClick={downloadUserImportTemplate}>
              {t("admin.users.import.downloadTemplate")}
            </Button>
            <Button variant="outlined" onClick={() => setIsImportDialogOpen(true)}>
              {t("admin.users.import.openButton")}
            </Button>
            <Button variant="contained" onClick={() => setIsCreateDialogOpen(true)}>
              {t("admin.users.create.button")}
            </Button>
          </Stack>
        </Box>

        <UserTable onEdit={handleEdit} onDelete={handleDelete} />

        <UserFormDialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} />
        <UserFormDialog
          user={editingUser}
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
        />

        <AlertDialog
          open={!!deleteUser}
          title={t("admin.users.delete.title")}
          message={t("admin.users.delete.confirm")}
          confirmText={t("common.delete")}
          severity="error"
          onConfirm={handleConfirmDelete}
          onClose={() => setDeleteUser(null)}
        />

        <UserImportDialog
          open={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
          onComplete={handleImportComplete}
        />
      </Box>
    </AdminLayout>
  );
}
