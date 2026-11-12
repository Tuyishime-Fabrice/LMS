import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCountdown } from "@/lib/earlyBirdPricing";

interface EarlyBirdCountdownProps {
  endsAt: string;
  seatsLeft?: number | null;
  className?: string;
}

export function EarlyBirdCountdown({ endsAt, seatsLeft, className }: EarlyBirdCountdownProps) {
  const [remaining, setRemaining] = useState(() => new Date(endsAt).getTime() - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining(new Date(endsAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  return (
    <div className={className}>
      <Badge className="bg-orange-500 hover:bg-orange-500 text-white mb-2">
        Early bird · ends in {formatCountdown(remaining)}
      </Badge>
      {seatsLeft != null && seatsLeft <= 20 && (
        <p className="text-xs text-orange-700">{seatsLeft} early-bird seats left</p>
      )}
    </div>
  );
}
