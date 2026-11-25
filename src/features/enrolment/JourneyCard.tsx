import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, CreditCard, Info, XCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shell/page";
import { cn } from "@/lib/utils";
import type { CourseJourney } from "./api";
import { StatusTimeline } from "./StatusTimeline";
import { useStepCopy } from "./copy";

const tones: Record<CourseJourney["journey"]["status"], { pill: "amber" | "blue" | "red" | "green" | "brand"; box: string; icon: LucideIcon }> = {
  action_required: { pill: "amber", box: "border-warning/25 bg-warning-surface", icon: AlertTriangle },
  waiting: { pill: "blue", box: "border-info/20 bg-info-surface", icon: Clock },
  blocked: { pill: "red", box: "border-destructive/25 bg-destructive-surface", icon: XCircle },
  active: { pill: "brand", box: "border-primary/20 bg-leaf", icon: Info },
  completed: { pill: "green", box: "border-success/25 bg-success-surface", icon: CheckCircle2 },
};

/** One course's journey: status, timeline, what it means, and the next valid action. */
export function JourneyCard({ item, className }: { item: CourseJourney; className?: string }) {
  const { t } = useTranslation();
  const { journey, course } = item;
  const tone = tones[journey.status];
  const payment = journey.steps.find((step) => step.key === "payment");
  const copy = useStepCopy();

  const statusLabel: Record<typeof journey.status, string> = {
    action_required: t("journey.status.action", "Action needed"),
    waiting: t("journey.status.waiting", "Waiting"),
    blocked: t("journey.status.blocked", "Not accepted"),
    active: t("journey.status.active", "In progress"),
    completed: t("journey.status.completed", "Completed"),
  };

  const message = (() => {
    if (journey.status === "blocked") return t("journey.msg.rejected", "Your application for this cohort was not accepted. You can choose another cohort or a self-paced course.");
    if (payment?.status === "failed") return t("journey.msg.failed", "Your last payment did not go through, so nothing was charged for access. You can try again with Mobile Money.");
    if (payment?.status === "required") return t("journey.msg.required", "Your place is not confirmed until payment is received. Access opens as soon as the payment provider confirms it.");
    if (payment?.status === "awaiting_confirmation") return t("journey.msg.awaiting", "We are waiting for the payment provider to confirm. If you approved the payment on your phone, this usually takes a few minutes. This page updates on its own.");
    if (journey.focus === "review") return t("journey.msg.review", "Your application is with the instructor. You will be notified when it has been reviewed; payment, if any, comes after acceptance.");
    if (journey.status === "completed" && journey.next === "view_certificate") return t("journey.msg.certificate", "You completed this course and your certificate has been issued.");
    if (journey.status === "completed") return t("journey.msg.completed", "You completed this course. Your certificate is being prepared and will appear under Certificates.");
    return t("journey.msg.active", "You have access. Pick up where you left off.");
  })();

  const action = (() => {
    switch (journey.next) {
      case "pay": return <Button asChild><Link to={`/course/${course.id}?view=overview&paymentStep=payment`}><CreditCard />{t("journey.action.pay", "Complete payment")}</Link></Button>;
      case "retry_payment": return <Button asChild><Link to={`/course/${course.id}?view=overview&paymentStep=payment`}><CreditCard />{t("journey.action.retry", "Try payment again")}</Link></Button>;
      case "continue": return <Button asChild variant="outline"><Link to={`/learn/${course.id}`}>{t("journey.action.continue", "Continue learning")}<ArrowRight /></Link></Button>;
      case "view_certificate": return <Button asChild variant="outline"><Link to="/student/certificates">{t("journey.action.certificate", "View certificate")}</Link></Button>;
      case "browse": return <Button asChild variant="outline"><Link to="/courses">{t("journey.action.browse", "Browse courses")}</Link></Button>;
      default: return null;
    }
  })();

  return (
    <article className={cn("surface p-5", className)} aria-labelledby={`journey-${course.id}`}>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`journey-${course.id}`} className="text-card-title">
            <Link to={`/course/${course.id}?view=overview`} className="hover:text-primary">{course.title}</Link>
          </h3>
          {item.cohortName && <p className="mt-0.5 text-meta">{item.cohortName}</p>}
        </div>
        <StatusPill tone={tone.pill} icon={tone.icon}>{statusLabel[journey.status]}</StatusPill>
      </header>
      <StatusTimeline steps={journey.steps.map((step) => ({ ...step, ...copy(step) }))} />
      <div className={cn("mt-5 flex flex-col gap-3 rounded-lg border p-3.5 sm:flex-row sm:items-center", tone.box)} role="status">
        <tone.icon className="hidden h-4 w-4 shrink-0 text-forest sm:block" aria-hidden />
        <p className="flex-1 text-sm leading-6 text-forest">{message}</p>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </article>
  );
}
