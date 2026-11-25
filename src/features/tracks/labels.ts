import { useTranslation } from "react-i18next";

export function useLevelLabel() {
  const { t } = useTranslation();
  return (level: string | null | undefined) => level ? t(`landing.level.${level}`, level.charAt(0).toUpperCase() + level.slice(1)) : null;
}
