import ClassIcon from "@mui/icons-material/Class";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import {
  AppBar,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useTranslation } from "@/hooks/useTranslation";
import { LanguageSelector } from "@/shared/ui/LanguageSelector";
import { ThemeSwitcher } from "@/shared/ui/ThemeSwitcher";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/auth/slice";

const DRAWER_WIDTH = 240;

const menuItems = [
  { path: "/teacher", icon: <DashboardIcon />, labelKey: "dashboard.title" },
  { path: "/teacher/classes", icon: <ClassIcon />, labelKey: "classes.title" },
];

interface TeacherLayoutProps {
  children: ReactNode;
}

export function TeacherLayout({ children }: TeacherLayoutProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [appBarHeight, setAppBarHeight] = useState(0);

  useLayoutEffect(() => {
    if (!toolbarRef.current || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setAppBarHeight(entries[0].contentRect.height);
      }
    });
    observer.observe(toolbarRef.current);
    return () => observer.disconnect();
  }, []);

  const toolbarPlaceholderHeight = appBarHeight || (isMobile ? 120 : 64);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const isSelected = (path: string) => {
    if (path === "/teacher") {
      return location.pathname === "/teacher";
    }
    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const drawerContent = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {!isMobile && <Toolbar />}
      <Box sx={{ overflow: "auto", flex: 1 }}>
        <List>
          {menuItems.map((item) => (
            <ListItem key={item.path} disablePadding>
              <ListItemButton
                selected={isSelected(item.path)}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) {
                    setIsMobileNavOpen(false);
                  }
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={t(`teacher.${item.labelKey}`)} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      <Box
        sx={{
          borderTop: "1px solid",
          borderColor: "divider",
          p: 2,
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          boxShadow: isMobile ? "0 -4px 16px rgba(0,0,0,0.05)" : "none",
        }}
      >
        {user?.firstName && user?.lastName && (
          <>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {`${user.firstName} ${user.lastName}`}
            </Typography>
            {user.externalId && (
              <Typography variant="caption" color="text.secondary">
                {user.externalId}
              </Typography>
            )}
          </>
        )}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
          }}
        >
          <ThemeSwitcher />
          <LanguageSelector />
        </Box>
        <Button
          variant="contained"
          color="inherit"
          startIcon={<LogoutIcon />}
          onClick={handleLogout}
          sx={{
            justifyContent: "flex-start",
            bgcolor: "grey.100",
            color: "text.primary",
            "&:hover": { bgcolor: "grey.200" },
          }}
          fullWidth
        >
          {t("auth.logout")}
        </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <AppBar
        position="fixed"
        sx={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          zIndex: (theme) =>
            isMobile ? theme.zIndex.appBar : theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          ref={toolbarRef}
          sx={{
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {isMobile && (
              <IconButton
                color="inherit"
                edge="start"
                onClick={() => setIsMobileNavOpen(true)}
                aria-label={t("teacher.dashboard.menuToggle", {
                  defaultValue: "Open menu",
                })}
              >
                <MenuIcon />
              </IconButton>
            )}
            <MenuBookIcon />
            <Typography variant="h6">{t("common.appName")}</Typography>
          </Box>
        </Toolbar>
      </AppBar>
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={isMobileNavOpen}
          onClose={() => setIsMobileNavOpen(false)}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: "block", md: "none" },
            [`& .MuiDrawer-paper`]: {
              width: DRAWER_WIDTH,
              boxSizing: "border-box",
            },
          }}
        >
          {drawerContent}
        </Drawer>
      ) : (
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
          open
        >
          {drawerContent}
        </Drawer>
      )}
      <Box
        component="main"
        sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, width: "100%" }}
      >
        <Box sx={{ minHeight: toolbarPlaceholderHeight }} />
        <Container maxWidth="lg" sx={{ px: { xs: 0, md: 2 } }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}
