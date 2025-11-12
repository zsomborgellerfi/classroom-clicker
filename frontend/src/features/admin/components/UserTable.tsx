import { Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { User } from "@shared/types";
import { UserRole } from "@/enums/userRole";
import { useTranslation } from "@/hooks/useTranslation";
import api from "@/lib/api";
import { ENDPOINTS } from "@/lib/api";

type Order = "asc" | "desc";
type OrderBy = keyof Pick<User, "name" | "email" | "role" | "createdAt">;

interface UsersResponse {
  users: User[];
  total: number;
}

interface UserTableProps {
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
}

export function UserTable({ onEdit, onDelete }: UserTableProps) {
  const { t } = useTranslation();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<OrderBy>("name");

  const { data: users, isLoading } = useQuery<UsersResponse>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await api.get<UsersResponse>(
        ENDPOINTS.ADMIN.USERS.LIST(),
      );
      return response.data;
    },
  });

  const handleRequestSort = (property: OrderBy) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const headCells = [
    { id: "name" as const, label: t("admin.users.table.name") },
    { id: "email" as const, label: t("admin.users.table.email") },
    { id: "role" as const, label: t("admin.users.table.role") },
    { id: "createdAt" as const, label: t("admin.users.table.createdAt") },
  ];

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              {headCells.map((headCell) => (
                <TableCell key={headCell.id}>
                  <TableSortLabel
                    active={orderBy === headCell.id}
                    direction={orderBy === headCell.id ? order : "asc"}
                    onClick={() => handleRequestSort(headCell.id)}
                  >
                    {headCell.label}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell align="right">
                {t("admin.users.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users?.users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {t(`admin.users.role.${user.role.toLowerCase()}`)}
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  {user.role !== UserRole.ADMIN && (
                    <>
                      <Tooltip title={t("admin.users.actions.edit")}>
                        <IconButton onClick={() => onEdit?.(user)} size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("admin.users.actions.delete")}>
                        <IconButton
                          onClick={() => onDelete?.(user)}
                          size="small"
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={users?.total || 0}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}
