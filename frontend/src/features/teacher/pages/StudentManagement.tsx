import ArrowBackIcon from "@mui/icons-material/ArrowBack";
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
  useMediaQuery,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

import { ClassInvite } from "@shared/types";

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

export default function StudentManagement() {
  const { t } = useTranslation();
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
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

  const { data: classData, isLoading: isLoadingClass } =
    useQuery<ClassResponse>({
      queryKey: ["class", classId],
      queryFn: async () => {
        const response = await api.get<ClassResponse>(
          ENDPOINTS.CLASS.GET(classId!),
        );
        return response.data;
      },
      enabled: !!classId,
    });

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

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setStudentSearchDebounced(studentSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [studentSearchQuery]);

  const { data: studentDirectoryResponse } = useQuery<StudentsResponse>({
    queryKey: [
      "student-directory",
      studentSearchDebounced,
      studentOrderBy,
      studentOrder,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: studentSearchDebounced,
        limit: "100",
        offset: "0",
        orderBy: studentOrderBy,
        order: studentOrder,
      });
      const response = await api.get<StudentsResponse>(
        `${ENDPOINTS.TEACHER.STUDENTS()}?${params.toString()}`,
      );
      return response.data;
    },
    enabled: isAssignDialogOpen,
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

  const sortStudents = (students: StudentSummary[]) => {
    return [...students].sort((a, b) => {
      const multiplier = studentOrder === "asc" ? 1 : -1;
      switch (studentOrderBy) {
        case "firstName":
          return multiplier * a.firstName.localeCompare(b.firstName);
        case "lastName":
          return multiplier * a.lastName.localeCompare(b.lastName);
        case "email":
          return multiplier * a.email.localeCompare(b.email);
        default:
          return 0;
      }
    });
  };

  const handleToggleStudentSelect = (studentId: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setSelectedStudentIds(newSet);
  };

  const handleToggleStudentRemove = (studentId: string) => {
    const newSet = new Set(studentsToRemove);
    if (newSet.has(studentId)) {
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setStudentsToRemove(newSet);
  };

  const handleSelectAll = () => {
    const availableStudents = studentDirectoryResponse?.data || [];
    if (selectedStudentIds.size === availableStudents.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(availableStudents.map((s) => s.id)));
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

  const availableStudents =
    studentDirectoryResponse?.data.filter(
      (student) => !classData?.students.some((s) => s.id === student.id),
    ) || [];

  const breadcrumbItems = [
    { label: t("teacher.dashboard.title"), path: "/teacher" },
    { label: t("teacher.classes.title"), path: "/teacher/classes" },
    {
      label: classData?.name || t("teacher.classes.title"),
      path: classId ? `/teacher/classes/${classId}` : undefined,
    },
    { label: t("teacher.classes.students.title") },
  ];

  if (isLoadingClass) {
    return (
      <TeacherLayout>
        <Skeleton variant="rectangular" height={400} />
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <Breadcrumbs items={breadcrumbItems} />
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/teacher/classes/${classId}`)}
        sx={{ mt: 0.5 }}
      >
        {t("common.back")}
      </Button>
      <Box sx={{ mb: 3, display: "flex", alignItems: "flex-start", gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" gutterBottom>
            {t("teacher.classes.students.title")}
            {classData?.students && classData.students.length > 0 ? (
              <Typography
                component="span"
                variant="h6"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                ({classData.students.length})
              </Typography>
            ) : null}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            {t("teacher.classes.students.description")}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gap: 3 }}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
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
              variant="contained"
              onClick={() => setIsAssignDialogOpen(true)}
            >
              {t("teacher.classes.students.add")}
            </Button>
          </Box>
        </Box>

        {classData?.students?.length ? (
          isMobile ? (
            <Box sx={{ display: "grid", gap: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  size="small"
                  onClick={() => {
                    if (studentsToRemove.size === classData.students.length) {
                      setStudentsToRemove(new Set());
                    } else {
                      setStudentsToRemove(
                        new Set(classData.students.map((s) => s.id)),
                      );
                    }
                  }}
                >
                  {studentsToRemove.size === classData.students.length
                    ? t("teacher.classes.students.deselectAll")
                    : t("teacher.classes.students.selectAll")}
                </Button>
              </Box>
              {sortStudents(classData.students).map((student) => (
                <Paper key={student.id} sx={{ p: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 2,
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Button
                        variant="text"
                        onClick={() => setViewingStudentId(student.id)}
                        sx={{
                          textTransform: "none",
                          p: 0,
                          minWidth: "auto",
                          fontSize: "1rem",
                        }}
                      >
                        {`${student.firstName} ${student.lastName}`}
                      </Button>
                      <Typography variant="body2" color="text.secondary">
                        {student.email}
                      </Typography>
                    </Box>
                    <Checkbox
                      checked={studentsToRemove.has(student.id)}
                      onChange={() => handleToggleStudentRemove(student.id)}
                    />
                  </Box>
                  <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                    <Button
                      size="small"
                      color="error"
                      variant="outlined"
                      startIcon={<DeleteIcon fontSize="small" />}
                      onClick={() => setStudentToRemove(student)}
                    >
                      {t("teacher.classes.students.remove")}
                    </Button>
                  </Box>
                </Paper>
              ))}
            </Box>
          ) : (
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
                          sx={{
                            textTransform: "none",
                            p: 0,
                            minWidth: "auto",
                          }}
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
          )
        ) : (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary" variant="h6" gutterBottom>
              {t("teacher.classes.students.empty")}
            </Typography>
            <Button
              variant="contained"
              onClick={() => setIsAssignDialogOpen(true)}
              sx={{ mt: 2 }}
            >
              {t("teacher.classes.students.add")}
            </Button>
          </Box>
        )}
      </Box>

      {/* Invitation Codes Section */}
      <Box sx={{ mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            mb: 2,
            alignItems: { xs: "stretch", md: "center" },
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
          }}
        >
          <Typography variant="h5">
            {t("teacher.classes.invites.title")}
          </Typography>
          <Button
            variant="outlined"
            onClick={() => setIsInviteDialogOpen(true)}
            sx={{ alignSelf: { xs: "flex-start", md: "flex-end" } }}
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
            <Typography color="text.secondary" variant="body2">
              {t("teacher.classes.invites.empty")}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Invite Dialog */}
      <Dialog
        open={isInviteDialogOpen}
        onClose={() => {
          setIsInviteDialogOpen(false);
          setInviteForm({ maxUses: "", expiresInHours: "48" });
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t("teacher.classes.invites.createTitle")}</DialogTitle>
        <DialogContent>
          <TextField
            label={t("teacher.classes.invites.maxUses")}
            fullWidth
            margin="normal"
            type="number"
            value={inviteForm.maxUses}
            onChange={(event) =>
              setInviteForm((prev) => ({
                ...prev,
                maxUses: event.target.value,
              }))
            }
            helperText={t("teacher.classes.invites.optional")}
          />
          <TextField
            label={t("teacher.classes.invites.expiresInHours")}
            fullWidth
            margin="normal"
            type="number"
            value={inviteForm.expiresInHours}
            onChange={(event) =>
              setInviteForm((prev) => ({
                ...prev,
                expiresInHours: event.target.value,
              }))
            }
            helperText={t("teacher.classes.invites.expiresHelp")}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setIsInviteDialogOpen(false);
              setInviteForm({ maxUses: "", expiresInHours: "48" });
            }}
          >
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

      {/* Assign Student Dialog */}
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

      {/* Remove Student Confirmation */}
      <AlertDialog
        open={!!studentToRemove}
        title={t("teacher.classes.students.removeConfirmTitle")}
        message={t("teacher.classes.students.removeConfirmMessage", {
          name: studentToRemove
            ? `${studentToRemove.firstName} ${studentToRemove.lastName}`
            : "",
        })}
        onConfirm={handleRemoveStudent}
        onClose={() => setStudentToRemove(null)}
        confirmText={t("common.confirm")}
        cancelText={t("common.cancel")}
        severity="error"
      />

      {/* Student Details Modal */}
      {classId && (
        <StudentDetailsModal
          classId={classId}
          studentId={viewingStudentId}
          open={!!viewingStudentId}
          onClose={() => setViewingStudentId(null)}
        />
      )}
    </TeacherLayout>
  );
}
