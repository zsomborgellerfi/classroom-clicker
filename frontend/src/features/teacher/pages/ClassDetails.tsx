import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";

import { ClassInvite, Lesson } from "@shared/types";

import { LessonFormDialog } from "@/features/teacher/components/LessonFormDialog";
import { LessonTable } from "@/features/teacher/components/LessonTable";
import { StudentDetailsModal } from "@/features/teacher/components/StudentDetailsModal";
import { useTranslation } from "@/hooks/useTranslation";
import { TeacherLayout } from "@/layouts/TeacherLayout";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/api";
import { exportClassRoster } from "@/lib/export";
import { AlertDialog } from "@/shared/ui/AlertDialog";
import { Breadcrumbs } from "@/shared/ui/Breadcrumbs";

interface StudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ClassResponse {
  id: string;
  name: string;
  description?: string;
  students: StudentSummary[];
}

interface StudentsResponse {
  data: StudentSummary[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export default function ClassDetails() {
  const { t } = useTranslation();
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [deleteLesson, setDeleteLesson] = useState<Lesson | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [studentSearchDebounced, setStudentSearchDebounced] = useState("");
  const [studentOrderBy, setStudentOrderBy] = useState<
    "firstName" | "lastName" | "email"
  >("firstName");
  const [studentOrder, setStudentOrder] = useState<"asc" | "desc">("asc");
  const [studentToRemove, setStudentToRemove] = useState<StudentSummary | null>(
    null,
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [studentsToRemove, setStudentsToRemove] = useState<Set<string>>(
    new Set(),
  );
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setStudentSearchDebounced(studentSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearchQuery]);

  const { data: studentDirectoryResponse } = useQuery<StudentsResponse>({
    queryKey: [
      "teacher-students",
      studentSearchDebounced,
      studentOrderBy,
      studentOrder,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: studentSearchDebounced,
        limit: "50",
        offset: "0",
        orderBy: studentOrderBy,
        order: studentOrder,
      });
      const response = await api.get<StudentsResponse>(
        `${ENDPOINTS.TEACHER.STUDENTS()}?${params.toString()}`,
      );
      return response.data;
    },
    enabled: !!classId && isAssignDialogOpen,
  });

  const studentDirectory = studentDirectoryResponse?.data ?? [];

  const { data: invites, isLoading: invitesLoading } = useQuery<ClassInvite[]>({
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

  const bulkAssignStudentsMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      await api.post(ENDPOINTS.CLASS.BULK_ASSIGN_STUDENTS(classId!), {
        studentIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class", classId] });
      toast.success(
        t("teacher.classes.students.bulkSuccess", {
          count: selectedStudentIds.size,
        }),
      );
      setIsAssignDialogOpen(false);
      setSelectedStudentIds(new Set());
      setStudentSearchQuery("");
    },
    onError: () => {
      toast.error(t("teacher.classes.students.bulkError"));
    },
  });

  const bulkRemoveStudentsMutation = useMutation({
    mutationFn: async (studentIds: string[]) => {
      await Promise.all(
        studentIds.map((id) =>
          api.delete(ENDPOINTS.CLASS.REMOVE_STUDENT(classId!, id)),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class", classId] });
      toast.success(
        t("teacher.classes.students.bulkRemoveSuccess", {
          count: studentsToRemove.size,
        }),
      );
      setStudentsToRemove(new Set());
    },
    onError: () => {
      toast.error(t("teacher.classes.students.bulkRemoveError"));
    },
  });

  const removeStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      await api.delete(ENDPOINTS.CLASS.REMOVE_STUDENT(classId!, studentId));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class", classId] });
      toast.success(t("teacher.classes.students.removeSuccess"));
      setStudentToRemove(null);
    },
    onError: () => {
      toast.error(t("teacher.classes.students.removeError"));
    },
  });

  const handleRemoveStudent = () => {
    if (studentToRemove) {
      removeStudentMutation.mutate(studentToRemove.id);
    }
  };

  const handleStudentSort = (property: typeof studentOrderBy) => {
    const isAsc = studentOrderBy === property && studentOrder === "asc";
    setStudentOrder(isAsc ? "desc" : "asc");
    setStudentOrderBy(property);
  };

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

  const handleBulkAssign = () => {
    if (selectedStudentIds.size > 0) {
      bulkAssignStudentsMutation.mutate(Array.from(selectedStudentIds));
    }
  };

  const handleBulkRemove = () => {
    if (studentsToRemove.size > 0) {
      bulkRemoveStudentsMutation.mutate(Array.from(studentsToRemove));
    }
  };

  const handleToggleStudentSelect = (studentId: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleToggleStudentRemove = (studentId: string) => {
    setStudentsToRemove((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedStudentIds.size === availableStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(availableStudents.map((s) => s.id)));
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

  const availableStudents = useMemo(() => {
    const enrolledIds = new Set(classData?.students?.map((s) => s.id) ?? []);
    return studentDirectory.filter((student) => !enrolledIds.has(student.id));
  }, [studentDirectory, classData?.students]);

  const sortStudents = (students: StudentSummary[]) => {
    return [...students].sort((a, b) => {
      const multiplier = studentOrder === "asc" ? 1 : -1;
      let aValue: string;
      let bValue: string;

      switch (studentOrderBy) {
        case "firstName":
          aValue = a.firstName;
          bValue = b.firstName;
          break;
        case "lastName":
          aValue = a.lastName;
          bValue = b.lastName;
          break;
        case "email":
          aValue = a.email;
          bValue = b.email;
          break;
        default:
          return 0;
      }

      return multiplier * aValue.localeCompare(bValue);
    });
  };

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
          <Box sx={{ display: "flex", gap: 2 }}>
            {studentsToRemove.size > 0 && (
              <Button
                variant="outlined"
                color="error"
                onClick={handleBulkRemove}
                disabled={bulkRemoveStudentsMutation.isPending}
              >
                {t("teacher.classes.students.removeSelected", {
                  count: studentsToRemove.size,
                })}
              </Button>
            )}
            {classData?.students && classData.students.length > 0 && (
              <Button
                variant="outlined"
                startIcon={<FileDownloadIcon />}
                onClick={() =>
                  exportClassRoster(classData.students, classData.name)
                }
              >
                {t("teacher.classes.students.export")}
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={() => setIsAssignDialogOpen(true)}
            >
              {t("teacher.classes.students.add")}
            </Button>
          </Box>
        </Box>
        {classData?.students?.length ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={
                        studentsToRemove.size > 0 &&
                        studentsToRemove.size < classData.students.length
                      }
                      checked={
                        classData.students.length > 0 &&
                        studentsToRemove.size === classData.students.length
                      }
                      onChange={() => {
                        if (
                          studentsToRemove.size === classData.students.length
                        ) {
                          setStudentsToRemove(new Set());
                        } else {
                          setStudentsToRemove(
                            new Set(classData.students.map((s) => s.id)),
                          );
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={studentOrderBy === "firstName"}
                      direction={
                        studentOrderBy === "firstName" ? studentOrder : "asc"
                      }
                      onClick={() => handleStudentSort("firstName")}
                    >
                      {t("teacher.classes.students.table.firstName")}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={studentOrderBy === "lastName"}
                      direction={
                        studentOrderBy === "lastName" ? studentOrder : "asc"
                      }
                      onClick={() => handleStudentSort("lastName")}
                    >
                      {t("teacher.classes.students.table.lastName")}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>
                    <TableSortLabel
                      active={studentOrderBy === "email"}
                      direction={
                        studentOrderBy === "email" ? studentOrder : "asc"
                      }
                      onClick={() => handleStudentSort("email")}
                    >
                      {t("teacher.classes.students.table.email")}
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    {t("teacher.classes.students.table.actions")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortStudents(classData.students).map((student) => (
                  <TableRow key={student.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={studentsToRemove.has(student.id)}
                        onChange={() => handleToggleStudentRemove(student.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="text"
                        onClick={() => setViewingStudentId(student.id)}
                        sx={{ textTransform: "none", p: 0, minWidth: "auto" }}
                      >
                        {student.firstName}
                      </Button>
                    </TableCell>
                    <TableCell>{student.lastName}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell align="right">
                      <Tooltip title={t("teacher.classes.students.remove")}>
                        <IconButton
                          color="error"
                          size="small"
                          onClick={() => setStudentToRemove(student)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
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
          <Button
            variant="outlined"
            onClick={() => setIsInviteDialogOpen(true)}
          >
            {t("teacher.classes.invites.createButton")}
          </Button>
        </Box>
        {invitesLoading ? (
          <Skeleton variant="rectangular" height={120} />
        ) : invites && invites.length ? (
          <List>
            {invites.map((invite) => (
              <ListItem
                key={invite.id}
                divider
                secondaryAction={
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Tooltip title={t("teacher.classes.invites.copyCode")}>
                      <IconButton onClick={() => handleCopyInvite(invite.code)}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={t("teacher.classes.invites.delete")}>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteInvite(invite.id)}
                        disabled={deleteInviteMutation.isPending}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
              >
                <ListItemText
                  primary={invite.code}
                  secondary={`${t("teacher.classes.invites.uses", {
                    used: invite.uses,
                    max:
                      invite.maxUses ?? t("teacher.classes.invites.unlimited"),
                  })} · ${invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : t("teacher.classes.invites.noExpiry")}`}
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
          setSelectedStudentIds(new Set());
          setStudentSearchQuery("");
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t("teacher.classes.students.add")}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label={t("teacher.classes.students.searchLabel")}
            value={studentSearchQuery}
            onChange={(e) => setStudentSearchQuery(e.target.value)}
            sx={{ mb: 2 }}
            placeholder={t("teacher.classes.students.searchPlaceholder")}
          />
          {availableStudents.length > 0 && (
            <Box
              sx={{
                mb: 2,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {t("teacher.classes.students.selectMultiple")}
              </Typography>
              <Button size="small" onClick={handleSelectAll}>
                {selectedStudentIds.size === availableStudents.length
                  ? t("teacher.classes.students.deselectAll")
                  : t("teacher.classes.students.selectAll")}
              </Button>
            </Box>
          )}
          <Box
            sx={{
              maxHeight: 400,
              overflow: "auto",
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
            }}
          >
            {availableStudents.length > 0 ? (
              <List dense>
                {availableStudents.map((student) => (
                  <ListItem key={student.id} disablePadding>
                    <ListItemButton
                      onClick={() => handleToggleStudentSelect(student.id)}
                    >
                      <Checkbox
                        checked={selectedStudentIds.has(student.id)}
                        edge="start"
                      />
                      <ListItemText
                        primary={`${student.firstName} ${student.lastName}`}
                        secondary={student.email}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Box sx={{ p: 2, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  {studentDirectoryResponse
                    ? t("teacher.classes.students.noResults")
                    : t("common.loading")}
                </Typography>
              </Box>
            )}
          </Box>
          {studentDirectoryResponse && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {t("teacher.classes.students.searchResults", {
                count: studentDirectoryResponse.pagination.total,
              })}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsAssignDialogOpen(false);
              setSelectedStudentIds(new Set());
              setStudentSearchQuery("");
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            variant="contained"
            disabled={
              selectedStudentIds.size === 0 ||
              bulkAssignStudentsMutation.isPending
            }
            onClick={handleBulkAssign}
          >
            {bulkAssignStudentsMutation.isPending
              ? t("common.loading")
              : selectedStudentIds.size > 0
                ? t("teacher.classes.students.assignSelected", {
                    count: selectedStudentIds.size,
                  })
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
        <DialogContent
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            label={t("teacher.classes.invites.maxUses")}
            type="number"
            inputProps={{ min: 1 }}
            value={inviteForm.maxUses}
            onChange={(e) =>
              setInviteForm((prev) => ({ ...prev, maxUses: e.target.value }))
            }
            placeholder={t("teacher.classes.invites.optional")}
          />
          <TextField
            label={t("teacher.classes.invites.expiresInHours")}
            type="number"
            inputProps={{ min: 1 }}
            value={inviteForm.expiresInHours}
            onChange={(e) =>
              setInviteForm((prev) => ({
                ...prev,
                expiresInHours: e.target.value,
              }))
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

      <AlertDialog
        open={!!studentToRemove}
        title={t("teacher.classes.students.removeConfirmTitle")}
        message={t("teacher.classes.students.removeConfirmMessage", {
          name: studentToRemove
            ? `${studentToRemove.firstName} ${studentToRemove.lastName}`
            : "",
        })}
        confirmText={t("common.delete")}
        severity="warning"
        onConfirm={handleRemoveStudent}
        onClose={() => setStudentToRemove(null)}
      />

      <StudentDetailsModal
        classId={classId!}
        studentId={viewingStudentId}
        open={!!viewingStudentId}
        onClose={() => setViewingStudentId(null)}
      />
    </TeacherLayout>
  );
}
