import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

import { useTranslation } from "@/hooks/useTranslation";

interface AlertDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
  severity?: "warning" | "error" | "info";
}

export function AlertDialog({
  open,
  title,
  message,
  onConfirm,
  onClose,
  confirmText,
  cancelText,
  severity = "warning",
}: AlertDialogProps) {
  const { t } = useTranslation();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{title}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {cancelText || t("common.cancel")}
        </Button>
        <Button
          onClick={handleConfirm}
          color={severity}
          variant="contained"
          autoFocus
        >
          {confirmText || t("common.confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 