import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import {
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { useTranslation } from "../../hooks/useTranslation";
import api from "../../lib/api";
import { ENDPOINTS } from "../../lib/api";

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
