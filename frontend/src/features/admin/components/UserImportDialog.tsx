import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { UserRole } from "@/enums/userRole";
import { useTranslation } from "@/hooks/useTranslation";
import api, { ENDPOINTS } from "@/lib/api";

export const downloadUserImportTemplate = () => {
  const header = "firstName,lastName,email,password,role\n";
  const sample = "Jane,Doe,jane@example.com,Pass123,TEACHER\n";
  const blob = new Blob([header + sample], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "user-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
};

interface ImportPreviewRow {
  firstName: string;
  lastName: string;
  name?: string; // Legacy support
  email: string;
  password: string;
  role: string;
}

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: (summary: { created: number; skipped: number }) => void;
}

export function UserImportDialog({
  open,
  onClose,
  onComplete,
}: ImportDialogProps) {
  const { t } = useTranslation();
  const [previewRows, setPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(ENDPOINTS.ADMIN.USERS.IMPORT(), {
        users: previewRows,
      });
      return response.data as { created: number; skipped: number };
    },
    onSuccess: (data) => {
      toast.success(
        t("admin.users.import.success", {
          created: data.created,
          skipped: data.skipped,
        }),
      );
      setPreviewRows([]);
      setImportError(null);
      setSelectedFileName(null);
      onClose();
      onComplete(data);
    },
    onError: () => {
      toast.error(t("admin.users.import.error"));
    },
  });

  const resetState = () => {
    setPreviewRows([]);
    setImportError(null);
    setSelectedFileName(null);
  };

  const parseCsv = (text: string) => {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      throw new Error(t("admin.users.import.errors.empty"));
    }

    const headers = lines[0]
      .split(",")
      .map((header) => header.trim().toLowerCase());

    // Support both new format (firstName, lastName) and legacy format (name)
    const hasNewFormat =
      headers.includes("firstname") && headers.includes("lastname");

    const required = hasNewFormat
      ? ["firstname", "lastname", "email", "password", "role"]
      : ["name", "email", "password", "role"];
    const missing = required.filter((field) => !headers.includes(field));
    if (missing.length) {
      throw new Error(
        t("admin.users.import.errors.headers", { fields: missing.join(", ") }),
      );
    }

    return lines.slice(1).map((line) => {
      const values = line.split(",");
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = (values[index] || "").trim();
      });
      const normalizedRole = (record.role || UserRole.STUDENT).toUpperCase();

      // Handle both formats
      if (hasNewFormat) {
        return {
          firstName: record.firstname,
          lastName: record.lastname,
          email: record.email,
          password: record.password,
          role: normalizedRole,
        };
      } else {
        // Legacy format: split name
        const nameParts = record.name.split(/\s+/);
        return {
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          email: record.email,
          password: record.password,
          role: normalizedRole,
        };
      }
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result?.toString() || "";
        const parsed = parseCsv(text);
        setPreviewRows(parsed);
        setImportError(null);
      } catch (error) {
        setPreviewRows([]);
        setImportError((error as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!previewRows.length || importMutation.isPending) {
      return;
    }
    importMutation.mutate();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t("admin.users.import.title")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="body2" color="text.secondary">
          {t("admin.users.import.description")}
        </Typography>
        <Button variant="outlined" component="label">
          {t("admin.users.import.selectFile")}
          <input
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={handleFileChange}
          />
        </Button>
        {selectedFileName && (
          <Typography variant="body2">
            {t("admin.users.import.selectedFile", { name: selectedFileName })}
          </Typography>
        )}
        {importError && <Alert severity="error">{importError}</Alert>}
        {previewRows.length > 0 ? (
          <>
            <Typography variant="subtitle2" gutterBottom>
              {t("admin.users.import.previewTitle", {
                count: previewRows.length,
              })}
            </Typography>
            <List dense sx={{ maxHeight: 220, overflowY: "auto" }}>
              {previewRows.slice(0, 5).map((user, index) => (
                <ListItem key={`${user.email}-${user.role}-${index}`} divider>
                  <ListItemText
                    primary={`${user.firstName} ${user.lastName}`}
                    secondary={`${user.email} · ${user.role}`}
                  />
                </ListItem>
              ))}
            </List>
            {previewRows.length > 5 && (
              <Typography variant="caption" color="text.secondary">
                {t("admin.users.import.previewMore", {
                  count: previewRows.length - 5,
                })}
              </Typography>
            )}
          </>
        ) : (
          !importError && (
            <Typography variant="body2" color="text.secondary">
              {t("admin.users.import.emptyState")}
            </Typography>
          )
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{t("common.cancel")}</Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!previewRows.length || importMutation.isPending}
        >
          {importMutation.isPending
            ? t("common.loading")
            : t("admin.users.import.importButton")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
