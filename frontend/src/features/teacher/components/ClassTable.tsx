import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";

import { useTranslation } from "@/hooks/useTranslation";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/api";

export interface ClassListItem {
  id: string;
  name: string;
  description: string;
  _count: {
    students: number;
    lessons: number;
  };
}

type ClassesResponse = ClassListItem[];

interface ClassTableProps {
  onEdit: (classData: ClassListItem) => void;
  onDelete: (classData: ClassListItem) => void;
}

export function ClassTable({ onEdit, onDelete }: ClassTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const { data: classes, isLoading } = useQuery<ClassesResponse>({
    queryKey: ["classes"],
    queryFn: async () => {
      const response = await api.get<ClassListItem[]>(ENDPOINTS.CLASS.LIST());
      return response.data;
    },
  });

  if (isLoading) return <Typography>{t("common.loading")}</Typography>;
  if (!classes?.length)
    return <Typography>{t("teacher.classes.empty")}</Typography>;

  if (isMobile) {
    return (
      <Stack spacing={2}>
        {classes.map((classData) => (
          <Paper key={classData.id} sx={{ p: 2 }}>
            <Typography variant="h6">{classData.name}</Typography>
            {classData.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {classData.description}
              </Typography>
            )}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
              <Chip
                label={`${classData._count.students} ${t("teacher.classes.table.students")}`}
                size="small"
              />
              <Chip
                label={`${classData._count.lessons} ${t("teacher.classes.table.lessons")}`}
                size="small"
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
                justifyContent: "flex-start",
              }}
            >
              <Button
                startIcon={<VisibilityIcon />}
                size="small"
                variant="outlined"
                onClick={() => navigate(`/teacher/classes/${classData.id}`)}
              >
                {t("teacher.classes.actions.view")}
              </Button>
              <Button
                startIcon={<EditIcon />}
                size="small"
                variant="outlined"
                onClick={() => onEdit(classData)}
              >
                {t("teacher.classes.actions.edit")}
              </Button>
              <Button
                startIcon={<DeleteIcon />}
                size="small"
                color="error"
                variant="outlined"
                onClick={() => onDelete(classData)}
              >
                {t("teacher.classes.actions.delete")}
              </Button>
            </Box>
          </Paper>
        ))}
      </Stack>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{t("teacher.classes.table.name")}</TableCell>
            <TableCell>{t("teacher.classes.table.description")}</TableCell>
            <TableCell align="center">
              {t("teacher.classes.table.students")}
            </TableCell>
            <TableCell align="center">
              {t("teacher.classes.table.lessons")}
            </TableCell>
            <TableCell align="right">
              {t("teacher.classes.table.actions")}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {classes.map((classData) => (
            <TableRow key={classData.id}>
              <TableCell>{classData.name}</TableCell>
              <TableCell>{classData.description}</TableCell>
              <TableCell align="center">{classData._count.students}</TableCell>
              <TableCell align="center">{classData._count.lessons}</TableCell>
              <TableCell align="right">
                <Tooltip title={t("teacher.classes.actions.view")}>
                  <IconButton
                    onClick={() => navigate(`/teacher/classes/${classData.id}`)}
                    size="small"
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t("teacher.classes.actions.edit")}>
                  <IconButton onClick={() => onEdit(classData)} size="small">
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t("teacher.classes.actions.delete")}>
                  <IconButton
                    onClick={() => onDelete(classData)}
                    size="small"
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
