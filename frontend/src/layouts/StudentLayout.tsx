import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from "@mui/material";
import { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { QuizActivationListener } from "@/features/student/components/QuizActivationListener";
import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSelector } from "@/shared/ui/LanguageSelector";
import { ThemeSwitcher } from "@/shared/ui/ThemeSwitcher";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/auth/slice";

const DRAWER_WIDTH = 240;

type MenuItem = {
  path: string;
  icon: ReactNode;
  labelKey: string;
  match?: (pathname: string) => boolean;
};

const menuItems: MenuItem[] = [
  {
    path: "/student",
    icon: <DashboardIcon />,
    labelKey: "student.dashboard.menu",
    match: (pathname) => pathname === "/student",
  },
  {
    path: "/student/classes",
    icon: <MenuBookIcon />,
    labelKey: "student.classes.menu",
    match: (pathname) => pathname.startsWith("/student/classes"),
  },
  {
    path: "/student/progress",
    icon: <ShowChartIcon />,
    labelKey: "student.progress.title",
    match: (pathname) => pathname === "/student/progress",
  },
];

interface StudentLayoutProps {
  children: ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ justifyContent: "space-between", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <MenuBookIcon />
            <Typography variant="h6">{t("student.dashboard.title")}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {user?.firstName && user?.lastName && (
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {`${user.firstName} ${user.lastName}`}
              </Typography>
            )}
            <ThemeSwitcher />
            <LanguageSelector />
            <Button
              color="inherit"
              onClick={handleLogout}
              startIcon={<LogoutIcon />}
            >
              {t("auth.logout")}
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={
                    item.match
                      ? item.match(location.pathname)
                      : location.pathname === item.path
                  }
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={t(item.labelKey)} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Container maxWidth="lg">{children}</Container>
      </Box>
      <QuizActivationListener />
    </Box>
  );
}
