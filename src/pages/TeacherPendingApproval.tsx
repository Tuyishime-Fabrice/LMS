import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, Mail, LogOut } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

const TeacherPendingApproval = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    checkApprovalStatus();
  }, []);

  const checkApprovalStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      // If approved, redirect to teacher dashboard
      if (profileData.teacher_approved) {
        toast.success(t("teacherPendingApproval.yourAccountHasBeenApproved", "Your account has been approved!"));
        navigate("/teacher/dashboard");
        return;
      }

      // If rejected, show rejection reason
      if (profileData.teacher_approval_status === "rejected") {
        toast.error(t("teacherPendingApproval.yourTeacherApplicationWasNotApproved", "Your teacher application was not approved"));
      }

      setProfile(profileData);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(t("teacherPendingApproval.failedToCheckApprovalStatus", "Failed to check approval status"));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              {profile?.teacher_approval_status === "rejected" ? (
                <div className="w-20 h-20 rounded-full bg-destructive-surface flex items-center justify-center">
                  <Mail className="h-10 w-10 text-destructive" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-warning-surface flex items-center justify-center">
                  <Clock className="h-10 w-10 text-warning animate-pulse" />
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold text-forest mb-2">
                {profile?.teacher_approval_status === "rejected"
                  ? t("teacherPendingApproval.applicationNotApproved", "Application Not Approved")
                  : t("teacherPendingApproval.accountPendingApproval", "Account Pending Approval")}
              </h1>
              <p className="text-muted-foreground">
                {profile?.teacher_approval_status === "rejected"
                  ? t("teacherPendingApproval.yourTeacherApplicationHasBeenReviewed", "Your teacher application has been reviewed")
                  : t("teacherPendingApproval.yourTeacherAccountIsUnderReview", "Your teacher account is under review")}
              </p>
            </div>

            {/* Message */}
            <div className="bg-muted/50 rounded-lg p-6 text-left">
              {profile?.teacher_approval_status === "rejected" ? (
                <>
                  <h3 className="font-semibold text-forest mb-2">{t("teacherPendingApproval.rejectionReason", "Rejection Reason:")}</h3>
                  <p className="text-foreground">
                    {profile?.teacher_rejection_reason || t("teacherPendingApproval.noReasonProvided", "No reason provided")}
                  </p>
                  <div className="mt-4 p-4 bg-info-surface rounded-lg">
                    <p className="text-sm text-info">
                      {t("teacherPendingApproval.ifYouBelieveThisWasA", "If you believe this was a mistake, please contact our support team at")}{" "}
                      <a href="mailto:info@dataplusrwanda.com" className="font-semibold underline">
                        info@dataplusrwanda.com
                      </a>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-forest mb-3">{t("teacherPendingApproval.whatHappensNext", "What happens next?")}</h3>
                  <ul className="space-y-3 text-foreground">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t("teacherPendingApproval.ourAdminTeamWillReviewYour", "Our admin team will review your teacher application")}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t("teacherPendingApproval.youLlReceiveAnEmailNotification", "You'll receive an email notification once your account is approved")}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t("teacherPendingApproval.thisUsuallyTakes2448Hours", "This usually takes 24-48 hours")}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span>{t("teacherPendingApproval.onceApprovedYouLlHaveFull", "Once approved, you'll have full access to the teacher dashboard")}</span>
                    </li>
                  </ul>
                </>
              )}
            </div>

            {/* Profile Info */}
            <div className="bg-leaf rounded-lg p-4">
              <div className="text-sm text-foreground">
                <p className="font-semibold mb-1">{t("teacherPendingApproval.yourAccountDetails", "Your Account Details:")}</p>
                <p>{t("teacherPendingApproval.name", "Name: {{fullName}}", { fullName: profile?.full_name })}</p>
                <p>{t("teacherPendingApproval.email", "Email: {{email}}", { email: profile?.email })}</p>
                <p>{t("teacherPendingApproval.status", "Status:")}{" "}<span className="font-semibold text-warning">
                  {profile?.teacher_approval_status === "rejected" ? t("teacherPendingApproval.rejected", "Rejected") : t("teacherPendingApproval.pendingApproval", "Pending Approval")}
                </span></p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => checkApprovalStatus()}
                variant="outline"
                className="flex-1 max-w-xs"
              >
                {t("teacherPendingApproval.checkStatus", "Check Status")}
              </Button>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="flex-1 max-w-xs"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t("teacherPendingApproval.signOut", "Sign Out")}
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-sm text-muted-foreground">
              {t("teacherPendingApproval.needHelpContactUsAt", "Need help? Contact us at")}{" "}
              <a href="mailto:info@dataplusrwanda.com" className="text-primary font-semibold hover:underline">
                info@dataplusrwanda.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherPendingApproval;
