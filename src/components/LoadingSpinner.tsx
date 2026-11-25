import { useTranslation } from "react-i18next";
import { PlusLoader } from "@/components/brand/PlusMotif";

/** Route and page loading: the centred plus drawing in sequence. */
const LoadingSpinner = () => {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center">
      <PlusLoader label={t("common.loading", "Loading")} size={44} />
    </div>
  );
};

export default LoadingSpinner;
