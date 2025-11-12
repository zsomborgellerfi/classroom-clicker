import { Box, Button, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import type { User } from "@shared/types";
import { UserFormDialog } from "@/features/admin/components/UserFormDialog";
import { UserTable } from "@/features/admin/components/UserTable";
import { AlertDialog } from "@/shared/ui/AlertDialog";
import { useTranslation } from "@/hooks/useTranslation";
import { AdminLayout } from "@/layouts/AdminLayout";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/api";

export default function UserManagement() {
  const { t } = useTranslation();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

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

  return (
    <AdminLayout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
          <Typography variant="h4">{t("admin.users.title")}</Typography>
          <Button
            variant="contained"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            {t("admin.users.create.button")}
          </Button>
        </Box>

        <UserTable onEdit={handleEdit} onDelete={handleDelete} />

        <UserFormDialog
          open={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
        />

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
      </Box>
    </AdminLayout>
  );
}
