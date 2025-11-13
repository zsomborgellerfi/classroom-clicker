import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemText,
  Skeleton,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";

import { AdminLayout } from "@/layouts/AdminLayout";
import api, { ENDPOINTS } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

interface AdminInsightsResponse {
  totals: {
    users: number;
    teachers: number;
    students: number;
    admins: number;
    classes: number;
    lessons: number;
    quizzes: number;
  };
  recentUsers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
  topClasses: Array<{
    id: string;
    name: string;
    createdAt: string;
    _count: {
      students: number;
      lessons: number;
    };
  }>;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery<AdminInsightsResponse>({
    queryKey: ["admin-insights"],
    queryFn: async () => {
      const response = await api.get<AdminInsightsResponse>(
        ENDPOINTS.ADMIN.INSIGHTS(),
      );
      return response.data;
    },
  });

  const stats = [
    {
      label: t("admin.dashboard.insights.users"),
      value: data?.totals.users ?? 0,
    },
    {
      label: t("admin.dashboard.insights.teachers"),
      value: data?.totals.teachers ?? 0,
    },
    {
      label: t("admin.dashboard.insights.students"),
      value: data?.totals.students ?? 0,
    },
    {
      label: t("admin.dashboard.insights.admins"),
      value: data?.totals.admins ?? 0,
    },
    {
      label: t("admin.dashboard.insights.classes"),
      value: data?.totals.classes ?? 0,
    },
    {
      label: t("admin.dashboard.insights.lessons"),
      value: data?.totals.lessons ?? 0,
    },
    {
      label: t("admin.dashboard.insights.quizzes"),
      value: data?.totals.quizzes ?? 0,
    },
  ];

  return (
    <AdminLayout>
      <Box sx={{ p: 3, display: "flex", flexDirection: "column", gap: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            {t("admin.dashboard.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("admin.dashboard.subtitle")}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {stats.map((stat) => (
            <Grid item xs={12} sm={6} md={4} key={stat.label}>
              <Card>
                <CardContent>
                  {isLoading ? (
                    <Skeleton variant="rectangular" height={80} />
                  ) : (
                    <>
                      <Typography variant="h4">{stat.value}</Typography>
                      <Typography color="text.secondary">
                        {stat.label}
                      </Typography>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t("admin.dashboard.recentUsers.title")}
                </Typography>
                {isLoading ? (
                  <Skeleton variant="rectangular" height={160} />
                ) : data?.recentUsers?.length ? (
                  <List>
                    {data.recentUsers.map((user) => (
                      <ListItem key={user.id} divider>
                        <ListItemText
                          primary={`${user.firstName} ${user.lastName}`}
                          secondary={`${user.email}`}
                        />
                        <Chip
                          size="small"
                          label={user.role}
                          sx={{ textTransform: "capitalize" }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">
                    {t("admin.dashboard.recentUsers.empty")}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ height: "100%" }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {t("admin.dashboard.topClasses.title")}
                </Typography>
                {isLoading ? (
                  <Skeleton variant="rectangular" height={160} />
                ) : data?.topClasses?.length ? (
                  <List>
                    {data.topClasses.map((classItem) => (
                      <ListItem key={classItem.id} divider>
                        <ListItemText
                          primary={classItem.name}
                          secondary={t("admin.dashboard.topClasses.created", {
                            date: new Date(classItem.createdAt).toLocaleDateString(),
                          })}
                        />
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Chip
                            size="small"
                            label={t("admin.dashboard.topClasses.students", {
                              count: classItem._count.students,
                            })}
                          />
                          <Chip
                            size="small"
                            label={t("admin.dashboard.topClasses.lessons", {
                              count: classItem._count.lessons,
                            })}
                          />
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Alert severity="info">
                    {t("admin.dashboard.topClasses.empty")}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </AdminLayout>
  );
}
