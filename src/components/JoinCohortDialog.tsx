import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, Calendar, BookOpen, Loader2, DollarSign } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatPrice } from "@/services/paymentService";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface Cohort {
  id: string;
  name: string;
  description?: string;
  course_id: string;
  teacher_id: string;
  start_date?: string;
  end_date?: string;
  max_students: number;
  is_active?: boolean;
  price?: number | null;
  currency?: string | null;
  requires_payment?: boolean;
  instalment_enabled?: boolean;
  isAlreadyIn?: boolean;
  hasPendingRequest?: boolean;
  courses?: {
    id: string;
    title: string;
  };
  profiles?: {
    full_name: string;
  };
  _count?: {
    enrollments: number;
  };
}

interface JoinCohortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinCohortDialog({ open, onOpenChange }: JoinCohortDialogProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [paymentTrack, setPaymentTrack] = useState<"full" | "instalment" | "scholarship">("full");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCohorts();
    }
  }, [open]);

  const fetchCohorts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch active cohorts from the cohorts table (created by teachers)
      const { data: cohortsData, error: cohortsError } = await supabase
        .from("cohorts")
        .select(`
          id,
          name,
          description,
          course_id,
          teacher_id,
          max_students,
          is_active,
          price,
          currency,
          requires_payment,
          instalment_enabled,
          courses (
            id,
            title
          ),
          profiles:teacher_id (
            full_name
          )
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (cohortsError) {
        console.error("Error fetching cohorts:", cohortsError);
        // If cohorts table doesn't exist, show empty state
        setCohorts([]);
        return;
      }

      // Check which cohorts the student is already in (via course_enrollments)
      const { data: myEnrollments } = await supabase
        .from("course_enrollments")
        .select("cohort_name")
        .eq("student_id", user.id)
        .not("cohort_name", "is", null);

      const myCohortNames = new Set(
        (myEnrollments || []).map(e => e.cohort_name)
      );

      // Check for pending join requests
      const { data: myRequests } = await supabase
        .from("cohort_join_requests")
        .select("cohort_id, status")
        .eq("student_id", user.id);

      const pendingRequests = new Set(
        (myRequests || [])
          .filter(r => r.status === "pending")
          .map(r => r.cohort_id)
      );

      // Get student counts for each cohort
      const cohortsWithCounts = await Promise.all(
        (cohortsData || []).map(async (cohort) => {
          const { count } = await supabase
            .from("course_enrollments")
            .select("*", { count: "exact", head: true })
            .eq("cohort_name", cohort.name);

          return {
            ...cohort,
            isAlreadyIn: myCohortNames.has(cohort.name),
            hasPendingRequest: pendingRequests.has(cohort.id),
            _count: { enrollments: count || 0 }
          };
        })
      );

      setCohorts(cohortsWithCounts);
    } catch (error: any) {
      console.error("Error fetching cohorts:", error);
      toast.error(t("common.error"), {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequest = async () => {
    if (!selectedCohort) {
      toast.error(t("cohort.selectCohort"));
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("cohort_join_requests")
        .insert({
          cohort_id: selectedCohort,
          student_id: user.id,
          message: message.trim() || null,
          status: "pending",
          payment_track: paymentTrack,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error(t("cohort.alreadyRequested"));
        } else {
          throw error;
        }
        return;
      }

      const cohort = cohorts.find((c) => c.id === selectedCohort);

      toast.success(t("cohort.requestSent"), {
        description:
          cohort?.requires_payment && paymentTrack === "full" && cohort.course_id
            ? "Complete payment on the course page while your request is reviewed."
            : undefined,
      });

      if (cohort?.requires_payment && paymentTrack === "full" && cohort.course_id) {
        navigate(`/courses/${cohort.course_id}?cohort=${cohort.id}`);
      }

      setMessage("");
      setPaymentTrack("full");
      setSelectedCohort(null);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting join request:", error);
      toast.error(t("common.error"), {
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("cohort.joinCohort")}</DialogTitle>
          <DialogDescription>
            {t("cohort.browseAndRequest")}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#006D2C]" />
          </div>
        ) : cohorts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">{t("cohort.noCohortsAvailable")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {cohorts.map((cohort) => {
              const isSelected = selectedCohort === cohort.id;
              const maxStudents = cohort.max_students || 30;
              const currentEnrollments = cohort._count?.enrollments || 0;
              const isFull = currentEnrollments >= maxStudents;
              const spotsLeft = maxStudents - currentEnrollments;

              return (
                <Card
                  key={cohort.id}
                  className={`transition-all ${
                    cohort.isAlreadyIn
                      ? "border-green-300 border-2 bg-green-50"
                      : cohort.hasPendingRequest
                      ? "border-yellow-300 border-2 bg-yellow-50"
                      : isSelected
                      ? "border-[#006D2C] border-2 shadow-md cursor-pointer"
                      : "border-2 hover:border-gray-300 cursor-pointer"
                  } ${isFull && !cohort.isAlreadyIn ? "opacity-60" : ""}`}
                  onClick={() => !isFull && !cohort.isAlreadyIn && !cohort.hasPendingRequest && setSelectedCohort(cohort.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{cohort.name}</h3>
                        {cohort.description && (
                          <p className="text-sm text-gray-600 mb-2">{cohort.description}</p>
                        )}
                      </div>
                      {cohort.isAlreadyIn ? (
                        <Badge className="bg-green-500">{t("cohort.alreadyInCohort")}</Badge>
                      ) : cohort.hasPendingRequest ? (
                        <Badge className="bg-yellow-500">Pending Request</Badge>
                      ) : isFull ? (
                        <Badge variant="destructive">{t("cohort.full")}</Badge>
                      ) : (
                        <Badge variant="secondary">
                          {spotsLeft} {t("cohort.spotsLeft")}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      {cohort.courses && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <BookOpen className="h-4 w-4" />
                          <span>{cohort.courses.title}</span>
                        </div>
                      )}
                      {cohort.profiles && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>By {cohort.profiles.full_name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Users className="h-4 w-4" />
                        <span>{cohort._count?.enrollments || 0}/{cohort.max_students} {t("cohort.members")}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {selectedCohort && !cohorts.find(c => c.id === selectedCohort)?.isAlreadyIn && !cohorts.find(c => c.id === selectedCohort)?.hasPendingRequest && (
              <div className="space-y-3 pt-4 border-t">
                {(() => {
                  const cohort = cohorts.find((c) => c.id === selectedCohort);
                  if (!cohort?.requires_payment || !cohort.price) return null;
                  return (
                    <div className="rounded-lg border bg-gray-50 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                        <DollarSign className="h-4 w-4 text-[#006D2C]" />
                        Cohort fee: {formatPrice(Number(cohort.price), cohort.currency || "RWF")}
                      </div>
                      <Label className="text-sm">Payment track</Label>
                      <RadioGroup
                        value={paymentTrack}
                        onValueChange={(v) => setPaymentTrack(v as typeof paymentTrack)}
                        className="space-y-2"
                      >
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="full" />
                          Pay in full
                        </label>
                        {cohort.instalment_enabled && (
                          <label className="flex items-center gap-2 text-sm">
                            <RadioGroupItem value="instalment" />
                            Instalment plan
                          </label>
                        )}
                        <label className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value="scholarship" />
                          Scholarship (apply separately on course page)
                        </label>
                      </RadioGroup>
                    </div>
                  );
                })()}

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t("cohort.messageOptional")}
                  </label>
                  <Textarea
                    placeholder={t("cohort.messagePlaceholder")}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCohort(null);
                      setMessage("");
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    onClick={handleJoinRequest}
                    disabled={submitting}
                    className="bg-[#006D2C] hover:bg-[#005523]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {t("common.sending")}
                      </>
                    ) : (
                      t("cohort.sendRequest")
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
