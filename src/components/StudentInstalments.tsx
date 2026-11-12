import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
            <Card className="mb-6 border-amber-200 bg-amber-50/50">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-amber-600" />
                        Pending instalments
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {items.map((item) => (
                        <div
                            key={item.schedule_id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border"
                        >
                            <div>
                                <p className="font-medium">{item.course_title}</p>
                                <p className="text-sm text-gray-600">
                                    Instalment {item.instalment_number} ·{" "}
                                    {formatPrice(Number(item.amount), item.currency)}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    Due {new Date(item.due_date).toLocaleDateString()}
                                    {item.status === "overdue" && (
                                        <Badge variant="destructive" className="text-[10px]">
                                            Overdue
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <Button
                                className="bg-[#006d2c] hover:bg-[#005523] shrink-0"
                                onClick={() => setPayTarget(item)}
                            >
                                Pay now
                            </Button>
                        </div>
                    ))}
                </CardContent>
            </Card>

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
