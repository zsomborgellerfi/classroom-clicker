import { useTranslation as useI18nTranslation } from "react-i18next";

export function useTranslation() {
  const { t, i18n } = useI18nTranslation();
  return { t, i18n };
}
