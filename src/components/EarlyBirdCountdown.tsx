import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { formatCountdown } from "@/lib/earlyBirdPricing";

interface EarlyBirdCountdownProps {
  endsAt: string;
  seatsLeft?: number | null;
  className?: string;
}

export function EarlyBirdCountdown({ endsAt, seatsLeft, className }: EarlyBirdCountdownProps) {
  const { t } = useTranslation();
  const [remaining, setRemaining] = useState(() => new Date(endsAt).getTime() - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(new Date(endsAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  return (
    <div className={className}>
      <Badge className="bg-warning hover:bg-orange-500 text-white mb-2">
        {t("earlyBirdCountdown.earlyBirdEndsIn", "Early bird · ends in {{formatCountdown}}", { formatCountdown: formatCountdown(remaining) })}
      </Badge>
      {seatsLeft != null && seatsLeft <= 20 && (
        <p className="text-xs text-warning">{t("earlyBirdCountdown.earlyBirdSeatsLeft", "{{seatsLeft}} early-bird seats left", { seatsLeft: seatsLeft })}</p>
      )}
    </div>
  );
}
