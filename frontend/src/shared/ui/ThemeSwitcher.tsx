import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from "@mui/material";
import { useState } from "react";

import { useTheme } from "@/contexts/ThemeContext";
import { useTranslation } from "@/hooks/useTranslation";
import { ThemeMode } from "@/theme";

export function ThemeSwitcher() {
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (newMode: ThemeMode) => {
    setMode(newMode);
    handleClose();
  };

  const getIcon = () => {
    switch (mode) {
      case "dark":
        return <DarkModeIcon />;
      case "light":
        return <LightModeIcon />;
      case "system":
        return <SettingsBrightnessIcon />;
    }
  };

  return (
    <>
      <Tooltip title={t("common.theme.switch")}>
        <IconButton color="inherit" onClick={handleClick}>
          {getIcon()}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem onClick={() => handleSelect("light")} selected={mode === "light"}>
          <ListItemIcon>
            <LightModeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("common.theme.light")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleSelect("dark")} selected={mode === "dark"}>
          <ListItemIcon>
            <DarkModeIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("common.theme.dark")}</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleSelect("system")} selected={mode === "system"}>
          <ListItemIcon>
            <SettingsBrightnessIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>{t("common.theme.system")}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

