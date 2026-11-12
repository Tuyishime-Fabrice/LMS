import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle, Mail, LogOut } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

const TeacherPendingApproval = () => {
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
        toast.success("Your account has been approved!");
        navigate("/teacher/dashboard");
        return;
      }

      // If rejected, show rejection reason
      if (profileData.teacher_approval_status === "rejected") {
        toast.error("Your teacher application was not approved");
      }

      setProfile(profileData);
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Failed to check approval status");
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              {profile?.teacher_approval_status === "rejected" ? (
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
                  <Mail className="h-10 w-10 text-red-600" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Clock className="h-10 w-10 text-yellow-600 animate-pulse" />
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {profile?.teacher_approval_status === "rejected"
                  ? "Application Not Approved"
                  : "Account Pending Approval"}
              </h1>
              <p className="text-gray-600">
                {profile?.teacher_approval_status === "rejected"
                  ? "Your teacher application has been reviewed"
                  : "Your teacher account is under review"}
              </p>
            </div>

            {/* Message */}
            <div className="bg-gray-50 rounded-lg p-6 text-left">
              {profile?.teacher_approval_status === "rejected" ? (
                <>
                  <h3 className="font-semibold text-gray-900 mb-2">Rejection Reason:</h3>
                  <p className="text-gray-700">
                    {profile?.teacher_rejection_reason || "No reason provided"}
                  </p>
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      If you believe this was a mistake, please contact our support team at{" "}
                      <a href="mailto:support@datapluslearning.com" className="font-semibold underline">
                        support@datapluslearning.com
                      </a>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
                  <ul className="space-y-3 text-gray-700">
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Our admin team will review your teacher application</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>You'll receive an email notification once your account is approved</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>This usually takes 24-48 hours</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Once approved, you'll have full access to the teacher dashboard</span>
                    </li>
                  </ul>
                </>
              )}
            </div>

            {/* Profile Info */}
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">Your Account Details:</p>
                <p>Name: {profile?.full_name}</p>
                <p>Email: {profile?.email}</p>
                <p>Status: <span className="font-semibold text-yellow-600">
                  {profile?.teacher_approval_status === "rejected" ? "Rejected" : "Pending Approval"}
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
                Check Status
              </Button>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="flex-1 max-w-xs"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-sm text-gray-500">
              Need help? Contact us at{" "}
              <a href="mailto:support@datapluslearning.com" className="text-[#006d2c] font-semibold hover:underline">
                support@datapluslearning.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeacherPendingApproval;
