import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/shell/page";
import { useDateLocale } from "@/features/learning/hooks";
import { Calendar, CreditCard } from "lucide-react";
import { formatPrice } from "@/services/paymentService";
import { PurchaseDialog } from "@/components/PurchaseDialog";

interface PendingInstalment {
    schedule_id: string;
    enrollment_id: string;
    course_id: string;
    course_title: string;
    instalment_number: number;
    amount: number;
    currency: string;
    due_date: string;
    status: string;
}

export function StudentInstalments() {
    const { t } = useTranslation();
    const locale = useDateLocale();
    const [items, setItems] = useState<PendingInstalment[]>([]);
    const [loading, setLoading] = useState(true);
    const [payTarget, setPayTarget] = useState<PendingInstalment | null>(null);

    const fetchPending = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc("get_student_pending_instalments");
            if (error) throw error;
            setItems((data as PendingInstalment[]) || []);
        } catch (error) {
            console.error("Error loading instalments:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    if (loading) return null;
    if (items.length === 0) return null;

    return (
        <>
            <section className="mb-8 rounded-xl border border-warning/30 bg-warning-surface p-5">
                <h2 className="flex items-center gap-2 text-section-title">
                    <CreditCard className="h-5 w-5 text-warning" />
                    {t("payments.pendingTitle", "Instalments due")}
                </h2>
                <ul className="mt-4 space-y-2">
                    {items.map((item) => (
                        <li
                            key={item.schedule_id}
                            className="flex flex-col justify-between gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center"
                        >
                            <div className="min-w-0">
                                <p className="truncate font-medium text-forest">{item.course_title}</p>
                                <p className="text-sm text-foreground/80">
                                    {t("payments.instalmentNumber", "Instalment {{number}}", { number: item.instalment_number })} ·{" "}
                                    <span className="tabular font-medium">{formatPrice(Number(item.amount), item.currency)}</span>
                                </p>
                                <p className="mt-1 flex flex-wrap items-center gap-2 text-meta">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {t("work.due", "Due {{date}}", { date: format(new Date(item.due_date), "d MMM yyyy", { locale }) })}
                                    {item.status === "overdue" && <StatusPill tone="red">{t("work.status.overdue", "Overdue")}</StatusPill>}
                                </p>
                            </div>
                            <Button className="shrink-0" onClick={() => setPayTarget(item)}>
                                {t("payments.payNow", "Pay now")}
                            </Button>
                        </li>
                    ))}
                </ul>
            </section>

            {payTarget && (
                <PurchaseDialog
                    open={!!payTarget}
                    onOpenChange={(open) => {
                        if (!open) setPayTarget(null);
                    }}
                    type="course"
                    mode="instalment-pay"
                    instalmentScheduleId={payTarget.schedule_id}
                    instalmentNumber={payTarget.instalment_number}
                    dueDate={payTarget.due_date}
                    item={{
                        id: payTarget.course_id,
                        title: payTarget.course_title,
                        price: Number(payTarget.amount),
                        currency: payTarget.currency,
                    }}
                    onSuccess={() => {
                        setPayTarget(null);
                        fetchPending();
                    }}
                />
            )}
        </>
    );
}
