import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { ClassInvite, Lesson } from "@shared/types";

import { AlertDialog } from "../../components/common/AlertDialog";
import { Breadcrumbs } from "../../components/common/Breadcrumbs";
import { LessonFormDialog } from "../../components/teacher/LessonFormDialog";
import { LessonTable } from "../../components/teacher/LessonTable";
import { useTranslation } from "../../hooks/useTranslation";
import { TeacherLayout } from "../../layouts/TeacherLayout";
import api from "../../lib/api";
import { ENDPOINTS } from "../../lib/api";

interface StudentSummary {
  id: string;
  name: string;
  email: string;
}

interface ClassResponse {
  id: string;
  name: string;
  description?: string;
  students: StudentSummary[];
}

export default function ClassDetails() {
  const { t } = useTranslation();
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [deleteLesson, setDeleteLesson] = useState<Lesson | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(
    null,
  );
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    maxUses: "",
    expiresInHours: "48",
  });
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

  const { data: studentDirectory } = useQuery<StudentSummary[]>({
    queryKey: ["teacher-students"],
    queryFn: async () => {
      const response = await api.get<StudentSummary[]>(
        ENDPOINTS.TEACHER.STUDENTS(),
      );
      return response.data;
    },
    enabled: !!classId,
  });

  const {
    data: invites,
    isLoading: invitesLoading,
  } = useQuery<ClassInvite[]>({
    queryKey: ["class-invites", classId],
    queryFn: async () => {
      const response = await api.get<ClassInvite[]>(
        ENDPOINTS.CLASS.INVITES.LIST(classId!),
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

  const assignStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      await api.post(ENDPOINTS.CLASS.ASSIGN_STUDENT(classId!), {
        studentId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class", classId] });
      toast.success(t("teacher.classes.students.success"));
      setIsAssignDialogOpen(false);
      setSelectedStudent(null);
    },
    onError: () => {
      toast.error(t("teacher.classes.students.error"));
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: async () => {
      const payload: { maxUses?: number; expiresInHours?: number } = {};
      if (inviteForm.maxUses) {
        payload.maxUses = Number(inviteForm.maxUses);
      }
      if (inviteForm.expiresInHours) {
        payload.expiresInHours = Number(inviteForm.expiresInHours);
      }
      await api.post(ENDPOINTS.CLASS.INVITES.CREATE(classId!), payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-invites", classId] });
      toast.success(t("teacher.classes.invites.success"));
      setInviteForm({ maxUses: "", expiresInHours: "48" });
      setIsInviteDialogOpen(false);
    },
    onError: () => {
      toast.error(t("teacher.classes.invites.error"));
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      await api.delete(ENDPOINTS.CLASS.INVITES.DELETE(classId!, inviteId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-invites", classId] });
      toast.success(t("teacher.classes.invites.deleteSuccess"));
    },
    onError: () => {
      toast.error(t("teacher.classes.invites.error"));
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

  const handleAssignStudent = () => {
    if (selectedStudent) {
      assignStudentMutation.mutate(selectedStudent.id);
    }
  };

  const handleCreateInvite = () => {
    createInviteMutation.mutate();
  };

  const handleCopyInvite = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(t("teacher.classes.invites.copySuccess"));
    } catch (error) {
      console.error("Clipboard error", error);
      toast.error(t("teacher.classes.invites.copyError"));
    }
  };

  const handleDeleteInvite = (inviteId: string) => {
    deleteInviteMutation.mutate(inviteId);
  };

  const breadcrumbItems = [
    { label: t("teacher.dashboard.title"), path: "/teacher" },
    { label: t("teacher.classes.title"), path: "/teacher/classes" },
    { label: classData?.name || "" },
  ];

  const availableStudents =
    studentDirectory?.filter(
      (student) =>
        !classData?.students?.some(
          (enrolledStudent) => enrolledStudent.id === student.id,
        ),
    ) ?? [];

  return (
    <TeacherLayout>
      <Breadcrumbs items={breadcrumbItems} />
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
          alignItems: "center",
        }}
      >
        <Typography variant="h4">{classData?.name}</Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(`/teacher/classes/${classId}/progress`)}
          >
            {t("teacher.classes.actions.viewProgress")}
          </Button>
          <Button
            variant="contained"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            {t("teacher.lessons.create.button")}
          </Button>
        </Box>
      </Box>
      {classData?.description && (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          {classData.description}
        </Typography>
      )}

      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h5">
            {t("teacher.classes.students.title")}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setIsAssignDialogOpen(true)}
            disabled={!availableStudents.length}
          >
            {t("teacher.classes.students.add")}
          </Button>
        </Box>
        {classData?.students?.length ? (
          <List>
            {classData.students.map((student) => (
              <ListItem key={student.id} divider>
                <ListItemText
                  primary={student.name}
                  secondary={student.email}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">
            {t("teacher.classes.students.empty")}
          </Typography>
        )}
      </Box>

      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="h5">
            {t("teacher.classes.invites.title")}
          </Typography>
          <Button variant="outlined" onClick={() => setIsInviteDialogOpen(true)}>
            {t("teacher.classes.invites.createButton")}
          </Button>
        </Box>
        {invitesLoading ? (
          <Skeleton variant="rectangular" height={120} />
        ) : invites && invites.length ? (
          <List>
            {invites.map((invite) => (
              <ListItem key={invite.id} divider secondaryAction={
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Tooltip title={t("teacher.classes.invites.copyCode")}>
                      <IconButton onClick={() => handleCopyInvite(invite.code)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("teacher.classes.invites.delete") }>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteInvite(invite.id)}
                        disabled={deleteInviteMutation.isPending}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }>
                <ListItemText
                  primary={invite.code}
                  secondary={
                    `${t("teacher.classes.invites.uses", {
                      used: invite.uses,
                      max: invite.maxUses ?? t("teacher.classes.invites.unlimited"),
                    })} · ${invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : t("teacher.classes.invites.noExpiry")}`
                  }
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography color="text.secondary">
            {t("teacher.classes.invites.empty")}
          </Typography>
        )}
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

      <Dialog
        open={isAssignDialogOpen}
        onClose={() => {
          setIsAssignDialogOpen(false);
          setSelectedStudent(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("teacher.classes.students.add")}</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={availableStudents}
            value={selectedStudent}
            onChange={(_, value) => setSelectedStudent(value)}
            getOptionLabel={(option) =>
              `${option.name} (${option.email ?? ""})`
            }
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t("teacher.classes.students.selectLabel")}
              />
            )}
            noOptionsText={t("teacher.classes.students.empty")}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsAssignDialogOpen(false);
              setSelectedStudent(null);
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            disabled={
              !selectedStudent || assignStudentMutation.isPending
            }
            onClick={handleAssignStudent}
          >
            {assignStudentMutation.isPending
              ? t("common.loading")
              : t("teacher.classes.students.add")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isInviteDialogOpen}
        onClose={() => setIsInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("teacher.classes.invites.createTitle")}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label={t("teacher.classes.invites.maxUses")}
            type="number"
            inputProps={{ min: 1 }}
            value={inviteForm.maxUses}
            onChange={(e) => setInviteForm((prev) => ({ ...prev, maxUses: e.target.value }))}
            placeholder={t("teacher.classes.invites.optional")}
          />
          <TextField
            label={t("teacher.classes.invites.expiresInHours")}
            type="number"
            inputProps={{ min: 1 }}
            value={inviteForm.expiresInHours}
            onChange={(e) =>
              setInviteForm((prev) => ({ ...prev, expiresInHours: e.target.value }))
            }
            helperText={t("teacher.classes.invites.expiresHelp")}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsInviteDialogOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateInvite}
            disabled={createInviteMutation.isPending}
          >
            {createInviteMutation.isPending
              ? t("common.loading")
              : t("teacher.classes.invites.createButton")}
          </Button>
        </DialogActions>
      </Dialog>

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
