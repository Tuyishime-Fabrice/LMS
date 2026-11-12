import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell/page";
import { AppShell } from "@/components/shell/AppShell";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Check, X, Mail, Calendar } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface PendingTeacher {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  teacher_approval_status: string;
}

const AdminTeacherApprovals = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<PendingTeacher[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<PendingTeacher | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        toast.error(t("adminTeacherApprovals.accessDenied", "Access denied"));
        navigate("/");
        return;
      }

      await fetchPendingTeachers();
    } catch (error: any) {
      console.error("Error:", error);
      navigate("/");
    }
  };

  const fetchPendingTeachers = async () => {
    try {
      // Use RPC function to get all profiles
      const { data: allProfiles, error } = await supabase.rpc("get_all_profiles");

      if (error) throw error;

      // Filter for pending teachers
      const pendingTeachers = (allProfiles || []).filter(
        (p: any) => p.role === "teacher" && p.teacher_approval_status === "pending"
      );

      setTeachers(pendingTeachers);
    } catch (error: any) {
      console.error("Error fetching teachers:", error);
      toast.error(t("adminTeacherApprovals.failedToLoadPendingTeachers", "Failed to load pending teachers"));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (teacher: PendingTeacher) => {
    setProcessing(true);
    try {
      const { error } = await supabase.rpc("approve_teacher", {
        p_teacher_id: teacher.id
      });

      if (error) throw error;

      toast.success(`${teacher.full_name} has been approved as a teacher!`);
      fetchPendingTeachers();
    } catch (error: any) {
      console.error("Error approving teacher:", error);
      toast.error(t("adminTeacherApprovals.failedToApproveTeacher", "Failed to approve teacher"));
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedTeacher || !rejectionReason.trim()) {
      toast.error(t("adminTeacherApprovals.pleaseProvideAReasonForRejection", "Please provide a reason for rejection"));
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.rpc("reject_teacher", {
        p_teacher_id: selectedTeacher.id,
        p_rejection_reason: rejectionReason
      });

      if (error) throw error;

      toast.success(`${selectedTeacher.full_name}'s application has been rejected`);
      setShowRejectDialog(false);
      setSelectedTeacher(null);
      setRejectionReason("");
      fetchPendingTeachers();
    } catch (error: any) {
      console.error("Error rejecting teacher:", error);
      toast.error(t("adminTeacherApprovals.failedToRejectTeacher", "Failed to reject teacher"));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <AppShell role="admin" width="wide" badges={{ pendingTeachers: teachers.length }}>
      <PageHeader
        title={t("adminTeacherApprovals.teacherApprovals", "Teacher Approvals")}
        description={t("adminTeacherApprovals.reviewAndApproveTeacherApplications", "Review and approve teacher applications")}
        actions={<>
          <Badge variant="secondary" className="text-lg px-4 py-2">
                  {t("adminTeacherApprovals.pending", "{{count}} Pending", { count: teachers.length })}
                </Badge>
        </>}
      />

            <div>
              {teachers.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Check className="h-16 w-16 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{t("adminTeacherApprovals.allCaughtUp", "All Caught Up!")}</h3>
                    <p className="text-muted-foreground">{t("adminTeacherApprovals.noPendingTeacherApprovalsAtThe", "No pending teacher approvals at the moment")}</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {teachers.map((teacher) => (
                    <Card key={teacher.id} className="transition-shadow">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          <Avatar className="h-16 w-16">
                            {teacher.avatar_url ? (
                              <img src={teacher.avatar_url} alt={teacher.full_name} />
                            ) : (
                              <AvatarFallback className="bg-forest text-white text-xl">
                                {teacher.full_name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-1">{teacher.full_name}</CardTitle>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                {teacher.email}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                {t("adminTeacherApprovals.applied", "Applied")}{" "}{new Date(teacher.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleApprove(teacher)}
                            disabled={processing}
                            className="flex-1 bg-primary hover:bg-primary-hover"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {t("adminTeacherApprovals.approve", "Approve")}
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedTeacher(teacher);
                              setShowRejectDialog(true);
                            }}
                            disabled={processing}
                            variant="destructive"
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-2" />
                            {t("adminTeacherApprovals.reject", "Reject")}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adminTeacherApprovals.rejectTeacherApplication", "Reject Teacher Application")}</DialogTitle>
            <DialogDescription>
              {t("adminTeacherApprovals.pleaseProvideAReasonForRejecting", "Please provide a reason for rejecting {{fullName}}'s application", { fullName: selectedTeacher?.full_name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("adminTeacherApprovals.rejectionReason", "Rejection Reason")}</Label>
              <Textarea
                placeholder={t("adminTeacherApprovals.explainWhyThisApplicationIsBeing", "Explain why this application is being rejected...")}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              {t("adminTeacherApprovals.cancel", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {t("adminTeacherApprovals.rejectApplication", "Reject Application")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default AdminTeacherApprovals;
