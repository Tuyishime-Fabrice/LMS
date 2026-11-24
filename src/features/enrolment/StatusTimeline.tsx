import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDateLocale } from "@/features/learning/hooks";

/** A step ready to draw: state plus the words to show. */
export type TimelineStep = {
  key: string;
  state: "done" | "current" | "upcoming" | "blocked";
  /** Machine status; "waiting" style statuses get a spinner. */
  status?: string;
  title: string;
  detail?: string;
  at: string | null;
};

const WAITING = new Set(["awaiting_confirmation", "under_review", "pending", "judging"]);

function Marker({ step, index }: { step: TimelineStep; index: number }) {
  const base = "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.6875rem] font-semibold";
  if (step.state === "done") return <span className={cn(base, "bg-forest text-forest-foreground")}><Check className="h-3.5 w-3.5" strokeWidth={3} /></span>;
  if (step.state === "blocked") return <span className={cn(base, "bg-destructive text-destructive-foreground")}><X className="h-3.5 w-3.5" strokeWidth={3} /></span>;
  if (step.state === "current") {
    const waiting = WAITING.has(step.status || "");
    return (
      <span className={cn(base, "bg-card text-primary ring-2 ring-primary")}>
        {waiting ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : index + 1}
      </span>
    );
  }
  return <span className={cn(base, "bg-card text-muted-foreground ring-1 ring-border")}>{index + 1}</span>;
}

/**
 * Process timeline: what has happened, what is happening, what comes next.
 * Horizontal from the small breakpoint up, vertical on phones. State is
 * always spoken as text, never colour alone.
 */
export function StatusTimeline({ steps, className }: { steps: TimelineStep[]; className?: string }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const stateLabel: Record<TimelineStep["state"], string> = {
    done: t("journey.state.done", "Done"),
    current: t("journey.state.current", "Current step"),
    upcoming: t("journey.state.upcoming", "Not yet"),
    blocked: t("journey.state.blocked", "Needs attention"),
  };

  return (
    <ol className={cn("flex flex-col gap-0 sm:flex-row sm:items-start", className)} aria-label={t("journey.timeline", "Progress")}>
      {steps.map((step, index) => {
        const last = index === steps.length - 1;
        return (
          <Fragment key={step.key}>
            <li className="flex min-w-0 gap-3 sm:flex-1 sm:flex-col sm:gap-2" aria-current={step.state === "current" ? "step" : undefined}>
              <div className="flex flex-col items-center sm:flex-row">
                <Marker step={step} index={index} />
                {!last && (
                  <span aria-hidden className={cn(
                    "w-px flex-1 sm:h-px sm:w-auto sm:flex-1 sm:mx-2 min-h-5",
                    step.state === "done" ? "bg-forest/70" : "border-l border-dashed border-border sm:border-l-0 sm:border-t sm:bg-transparent",
                  )} />
                )}
              </div>
              <div className={cn("min-w-0 pb-4 sm:pb-0 sm:pr-3", step.state === "upcoming" && "opacity-70")}>
                <p className={cn("text-sm font-medium leading-5", step.state === "blocked" ? "text-destructive" : "text-forest")}>
                  {step.title}
                  <span className="sr-only">, {stateLabel[step.state]}</span>
                </p>
                <p className={cn("mt-0.5 text-xs leading-4", step.state === "current" ? "text-primary" : "text-muted-foreground")}>
                  {step.at ? format(new Date(step.at), "d MMM, HH:mm", { locale }) : step.detail}
                </p>
              </div>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
