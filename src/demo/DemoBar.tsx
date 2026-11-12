import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FlaskConical, RotateCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { homePath, type AppRole } from "@/components/shell/navigation";
import { useAppAuth } from "@/contexts/AuthContext";
import { DemoAccounts } from "./DemoAccounts";
import { resetDemo } from "./backend";
import { HASH_ROUTER } from "./config";

/** Small "Demo" button, always visible in demo mode: switch account or reset the sample data. */
export function DemoBar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAppAuth();

  const reset = () => {
    resetDemo();
    window.location.replace(HASH_ROUTER ? window.location.pathname : "/");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="fixed bottom-[4.75rem] left-3 z-40 flex items-center gap-1.5 rounded-full bg-forest px-3 py-1.5 text-xs font-semibold text-forest-foreground shadow-lg md:bottom-4 md:left-4"
          aria-label={t("demo.open", "Demo options")}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          {t("demo.badge", "Demo")}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 p-3">
        <p className="mb-3 text-xs leading-5 text-muted-foreground">
          {user
            ? t("demo.barSignedIn", "You are exploring sample data. Changes stay in this browser only.")
            : t("demo.barSignedOut", "You are exploring sample data. Pick someone to sign in as.")}
        </p>
        <DemoAccounts onSignedIn={(role) => navigate(homePath[role as AppRole] || "/")} className="border-0 bg-transparent p-0" />
        <Button variant="outline" size="sm" className="mt-3 w-full" onClick={reset}>
          <RotateCcw />
          {t("demo.reset", "Reset sample data")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
