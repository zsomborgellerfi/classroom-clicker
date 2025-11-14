import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import api, { ENDPOINTS } from "@/lib/api";

interface StudentSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface StudentDetailsResponse {
  student: StudentSummary;
  stats: {
    totalQuizzes: number;
    completedQuizzes: number;
    averageScore: number;
    lastActivity: string | null;
  };
  recentResponses: Array<{
    id: string;
    score: number;
    submittedAt: string;
    quiz: {
      id: string;
      title: string;
    };
  }>;
}

interface StudentDetailsModalProps {
  classId: string;
  studentId: string | null;
  open: boolean;
  onClose: () => void;
}

export function StudentDetailsModal({
  classId,
  studentId,
  open,
  onClose,
}: StudentDetailsModalProps) {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery<StudentDetailsResponse>({
    queryKey: ["student-details", classId, studentId],
    queryFn: async () => {
      const response = await api.get<StudentDetailsResponse>(
        ENDPOINTS.CLASS.GET_STUDENT_DETAILS(classId, studentId!),
      );
      return response.data;
    },
    enabled: open && !!studentId && !!classId,
  });

  const completionRate = useMemo(() => {
    if (!data?.stats) return 0;
    const { totalQuizzes, completedQuizzes } = data.stats;
    return totalQuizzes > 0 ? (completedQuizzes / totalQuizzes) * 100 : 0;
  }, [data]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {data?.student
          ? `${data.student.firstName} ${data.student.lastName}`
          : t("teacher.classes.students.details.title")}
      </DialogTitle>
      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
            <CircularProgress />
          </Box>
        ) : data ? (
          <>
            {/* Student Info */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {t("teacher.classes.students.details.email")}
              </Typography>
              <Typography variant="body1">{data.student.email}</Typography>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Statistics Cards */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 2,
                mb: 3,
              }}
            >
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t("teacher.classes.students.details.completionRate")}
                  </Typography>
                  <Typography variant="h4">
                    {Math.round(completionRate)}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {data.stats.completedQuizzes} / {data.stats.totalQuizzes}{" "}
                    {t("teacher.classes.students.details.quizzes")}
                  </Typography>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary">
                    {t("teacher.classes.students.details.averageScore")}
                  </Typography>
                  <Typography variant="h4">
                    {Math.min(
                      100,
                      Math.round(Math.min(data.stats.averageScore, 1.0) * 100),
                    )}
                    %
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("teacher.classes.students.details.acrossAllQuizzes")}
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            {data.stats.lastActivity && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {t("teacher.classes.students.details.lastActivity")}
                </Typography>
                <Typography variant="body1">
                  {new Date(data.stats.lastActivity).toLocaleString()}
                </Typography>
              </Box>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Recent Responses */}
            <Typography variant="h6" gutterBottom>
              {t("teacher.classes.students.details.recentResponses")}
            </Typography>
            {data.recentResponses.length > 0 ? (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        {t("teacher.classes.students.details.quiz")}
                      </TableCell>
                      <TableCell align="right">
                        {t("teacher.classes.students.details.score")}
                      </TableCell>
                      <TableCell align="right">
                        {t("teacher.classes.students.details.submittedAt")}
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recentResponses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell>{response.quiz.title}</TableCell>
                        <TableCell align="right">
                          {Math.min(
                            100,
                            Math.round(Math.min(response.score, 1) * 100),
                          )}
                          %
                        </TableCell>
                        <TableCell align="right">
                          {new Date(response.submittedAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t("teacher.classes.students.details.noResponses")}
              </Typography>
            )}
          </>
        ) : (
          <Typography color="text.secondary">
            {t("teacher.classes.students.details.error")}
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
