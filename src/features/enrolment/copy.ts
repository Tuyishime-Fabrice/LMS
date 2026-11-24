import { useTranslation } from "react-i18next";
import type { JourneyStep } from "./journey";

/** Words for each step. One place, so the timeline reads the same everywhere. */
export function useStepCopy() {
  const { t } = useTranslation();
  const titles: Record<JourneyStep["key"], string> = {
    applied: t("journey.step.applied", "Application sent"),
    review: t("journey.step.review", "Review"),
    payment: t("journey.step.payment", "Payment"),
    access: t("journey.step.access", "Access"),
    learning: t("journey.step.learning", "Learning"),
    certificate: t("journey.step.certificate", "Certificate"),
  };
  const details: Record<string, string> = {
    "review:accepted": t("journey.detail.accepted", "Accepted"),
    "review:not_accepted": t("journey.detail.notAccepted", "Not accepted"),
    "review:under_review": t("journey.detail.underReview", "Under review"),
    "payment:confirmed": t("journey.detail.paid", "Confirmed"),
    "payment:not_needed": t("journey.detail.notNeeded", "Not required"),
    "payment:after_review": t("journey.detail.afterReview", "After acceptance"),
    "payment:awaiting_confirmation": t("journey.detail.awaiting", "Awaiting confirmation"),
    "payment:failed": t("journey.detail.failed", "Did not go through"),
    "payment:required": t("journey.detail.required", "Required"),
    "access:granted": t("journey.detail.granted", "Granted"),
    "access:pending": t("journey.detail.accessPending", "After payment"),
    "learning:completed": t("journey.detail.completed", "Completed"),
    "learning:in_progress": t("journey.detail.inProgress", "In progress"),
    "learning:not_started": t("journey.detail.notStarted", "Not started"),
    "certificate:issued": t("journey.detail.issued", "Issued"),
    "certificate:revoked": t("journey.detail.revoked", "Revoked"),
    "certificate:pending": t("journey.detail.certPending", "Being prepared"),
    "certificate:not_yet": t("journey.detail.notYet", "When you pass"),
  };
  return (step: JourneyStep) => ({
    title: step.key === "payment" && step.status === "confirmed" ? t("journey.step.paid", "Payment confirmed") : titles[step.key],
    detail: details[`${step.key}:${step.status}`] || "",
  });
}
