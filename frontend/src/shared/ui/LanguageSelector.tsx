import TranslateIcon from "@mui/icons-material/Translate";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";

import { useTranslation } from "@/hooks/useTranslation";

const LANGUAGES = [
  { code: "en", labelKey: "common.languages.en" },
  { code: "hu", labelKey: "common.languages.hu" },
] as const;

export function LanguageSelector() {
  const { t, i18n } = useTranslation();
  const currentLanguage =
    (i18n.resolvedLanguage || i18n.language || "en").split("-")[0];

  const handleChange = (event: SelectChangeEvent<string>) => {
    const nextLanguage = event.target.value;
    if (!nextLanguage) {
      return;
    }
    i18n.changeLanguage(nextLanguage);
    localStorage.setItem("i18nextLng", nextLanguage);
  };

  // Check if we're inside an AppBar (typically has primary color)
  const isInAppBar = true; // LanguageSelector is always used in AppBar context

  return (
    <FormControl 
      size="small" 
      variant="outlined" 
      sx={{ 
        minWidth: 150,
        "& .MuiOutlinedInput-root": {
          color: isInAppBar ? "inherit" : undefined,
          "& fieldset": {
            borderColor: isInAppBar ? "rgba(255, 255, 255, 0.23)" : undefined,
          },
          "&:hover fieldset": {
            borderColor: isInAppBar ? "rgba(255, 255, 255, 0.5)" : undefined,
          },
          "&.Mui-focused fieldset": {
            borderColor: isInAppBar ? "rgba(255, 255, 255, 0.5)" : undefined,
          },
        },
        "& .MuiInputLabel-root": {
          color: isInAppBar ? "rgba(255, 255, 255, 0.7)" : undefined,
          "&.Mui-focused": {
            color: isInAppBar ? "rgba(255, 255, 255, 0.7)" : undefined,
          },
        },
      }}
    >
      <InputLabel id="language-selector-label">
        {t("common.language")}
      </InputLabel>
      <Select
        labelId="language-selector-label"
        id="language-selector"
        value={currentLanguage}
        label={t("common.language")}
        onChange={handleChange}
        sx={{
          color: isInAppBar ? "inherit" : undefined,
          "& .MuiSvgIcon-root": {
            color: isInAppBar ? "inherit" : undefined,
          },
        }}
        renderValue={(value) => (
          <Stack direction="row" spacing={1} alignItems="center">
            <TranslateIcon fontSize="small" sx={{ color: isInAppBar ? "inherit" : undefined }} />
            <Typography 
              variant="body2"
              sx={{ color: isInAppBar ? "inherit" : undefined }}
            >
              {t(
                LANGUAGES.find((lang) => lang.code === value)?.labelKey ??
                  "common.languages.en",
              )}
            </Typography>
          </Stack>
        )}
      >
        {LANGUAGES.map((language) => (
          <MenuItem key={language.code} value={language.code}>
            {t(language.labelKey)}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
