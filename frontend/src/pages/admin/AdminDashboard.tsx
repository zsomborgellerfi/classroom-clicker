import { Typography } from "@mui/material";

import { AdminLayout } from "../../layouts/AdminLayout";

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <Typography variant="h4" gutterBottom>
        Welcome to Admin Dashboard
      </Typography>
    </AdminLayout>
  );
}
