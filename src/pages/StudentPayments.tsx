import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Receipt, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyState, ErrorState, PageHeader, SectionHeader, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { StudentInstalments } from "@/components/StudentInstalments";
import { useDateLocale } from "@/features/learning/hooks";
import { formatPrice } from "@/services/paymentService";

async function fetchPayments(userId: string) {
  const { data, error } = await supabase.from("payments")
    .select("id, amount, currency, status, payment_method, payment_track, reference_id, created_at, courses ( title ), course_bundles ( title )")
    .eq("student_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) throw error;
  return data || [];
}

/** What the learner has paid, and what is still due. */
const StudentPayments = () => {
  const { t } = useTranslation();
  const { user } = useAppAuth();
  const locale = useDateLocale();
  const { data: payments, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-payments", user?.id],
    queryFn: () => fetchPayments(user!.id),
    enabled: Boolean(user?.id),
  });

  const methodLabel = (method: string | null) => {
    if (!method) return "";
    if (method.includes("MOMO")) return t("payments.method.momo", "Mobile Money");
    if (method.startsWith("card")) return t("payments.method.card", "Card");
    return method;
  };

  return (
    <AppShell role="student">
      <PageHeader
        title={t("payments.title", "Payments")}
        description={t("payments.description", "Instalments that are due and a record of everything you have paid.")}
      />

      <StudentInstalments />

      <section>
        <SectionHeader title={t("payments.history", "Payment history")} />
        {isLoading ? (
          <div className="space-y-2">{[0, 1, 2].map((key) => <SkeletonBlock key={key} className="h-16" />)}</div>
        ) : isError ? (
          <ErrorState
            title={t("payments.loadError", "Your payments could not be loaded")}
            description={t("work.loadErrorBody", "Check your connection and try again.")}
            onRetry={() => void refetch()}
            retryLabel={t("common.tryAgain", "Try again")}
          />
        ) : !payments?.length ? (
          <EmptyState
            icon={Receipt}
            title={t("payments.emptyTitle", "No payments yet")}
            description={t("payments.emptyBody", "When you pay for a course, the receipt details are kept here.")}
            action={<Button asChild><Link to="/courses">{t("gradesPage.explore", "Explore courses")}</Link></Button>}
          />
        ) : (
          <ul className="surface divide-y">
            {payments.map((payment) => {
              const title = (payment.courses as { title: string } | null)?.title
                || (payment.course_bundles as { title: string } | null)?.title
                || t("payments.untitled", "Course payment");
              return (
                <li key={payment.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.9375rem] font-medium text-forest">{title}</p>
                    <p className="text-meta">
                      {payment.created_at ? format(new Date(payment.created_at), "d MMM yyyy, HH:mm", { locale }) : ""}
                      {payment.payment_method ? ` · ${methodLabel(payment.payment_method)}` : ""}
                      {payment.payment_track === "instalment" ? ` · ${t("payments.instalment", "Instalment")}` : ""}
                    </p>
                    <p className="tabular text-xs text-muted-foreground">{t("payments.reference", "Ref. {{ref}}", { ref: payment.reference_id })}</p>
                  </div>
                  <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                    <span className="tabular font-display text-base font-semibold text-forest">
                      {formatPrice(Number(payment.amount), payment.currency || "RWF")}
                    </span>
                    {payment.status === "success" && <StatusPill tone="green" icon={CheckCircle2}>{t("payments.status.success", "Paid")}</StatusPill>}
                    {payment.status === "pending" && <StatusPill tone="amber" icon={Clock}>{t("payments.status.pending", "Pending")}</StatusPill>}
                    {payment.status === "failed" && <StatusPill tone="red" icon={XCircle}>{t("payments.status.failed", "Failed")}</StatusPill>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
};

export default StudentPayments;
