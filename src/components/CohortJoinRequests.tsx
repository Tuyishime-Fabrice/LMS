import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Check, X, Clock, MessageSquare } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface JoinRequest {
  id: string;
  cohort_id: string;
  student_id: string;
  status: string;
  message: string | null;
  created_at: string;
  cohorts: {
    name: string;
    course_id: string;
    courses: {
      title: string;
    };
  };
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export function CohortJoinRequests() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<JoinRequest | null>(null);
  const [processing, setProcessing] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if cohorts table exists first
      const { data, error } = await supabase
        .from("cohort_join_requests")
        .select(`
          *,
          cohorts (
            name,
            course_id,
            courses (
              title
            )
          ),
          profiles:student_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        // If table doesn't exist or other error, just set empty array and hide component
        console.log("Cohort join requests not available:", error.message);
        setRequests([]);
        setHasError(true);
        return;
      }

      // Filter by teacher_id in the frontend since the join filter might not work
      const filteredData = (data || []).filter((request: any) => 
        request.cohorts?.teacher_id === user.id
      );
      
      setRequests(filteredData);
    } catch (error: any) {
      console.error("Error fetching requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (request: JoinRequest) => {
    setProcessing(true);
    try {
      // Check if student is already enrolled
      const { data: existingEnrollment } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("student_id", request.student_id)
        .eq("course_id", request.cohorts.course_id)
        .single();

      if (existingEnrollment) {
        // Update existing enrollment with cohort name
        const { error: updateError } = await supabase
          .from("course_enrollments")
          .update({ cohort_name: request.cohorts.name })
          .eq("id", existingEnrollment.id);

        if (updateError) throw updateError;
      } else {
        // Create new enrollment with cohort name
        const { error: enrollError } = await supabase
          .from("course_enrollments")
          .insert({
            student_id: request.student_id,
            course_id: request.cohorts.course_id,
            cohort_name: request.cohorts.name,
          });

        if (enrollError) throw enrollError;
      }

      // Update request status
      const { error: statusError } = await supabase
        .from("cohort_join_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      if (statusError) throw statusError;

      toast.success(t("cohort.requestApproved"));
      fetchRequests();
      setSelectedRequest(null);
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast.error(t("common.error"), {
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("cohort_join_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      if (error) throw error;

      toast.success(t("cohort.requestRejected"));
      fetchRequests();
      setSelectedRequest(null);
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast.error(t("common.error"), {
        description: error.message,
      });
    } finally {
      setProcessing(false);
    }
  };

  // Don't render anything if there's an error (table doesn't exist)
  if (hasError) {
    return null;
  }

  if (loading) {
    return null; // Don't show loading state, just hide component
  }

  // Don't render if no requests
  if (requests.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("cohort.joinRequests")}</CardTitle>
              <CardDescription>{t("cohort.manageStudentRequests")}</CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {requests.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Avatar className="h-10 w-10">
                    {request.profiles.avatar_url ? (
                      <img src={request.profiles.avatar_url} alt={request.profiles.full_name} />
                    ) : (
                      <AvatarFallback className="bg-[#006d2c] text-white">
                        {request.profiles.full_name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{request.profiles.full_name}</p>
                    <p className="text-sm text-gray-600 truncate">{request.profiles.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {request.cohorts.name}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {request.cohorts.courses.title}
                      </span>
                    </div>
                  </div>
                  {request.message && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedRequest(request)}
                      className="text-gray-600"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(request.id)}
                    disabled={processing}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t("cohort.reject")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(request)}
                    disabled={processing}
                    className="bg-[#006d2c] hover:bg-[#005523]"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {t("cohort.approve")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Message Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cohort.studentMessage")}</DialogTitle>
            <DialogDescription>
              {t("cohort.messageFrom")} {selectedRequest?.profiles.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-700 whitespace-pre-wrap">
              {selectedRequest?.message || t("cohort.noMessage")}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => selectedRequest && handleReject(selectedRequest.id)}
              disabled={processing}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              {t("cohort.reject")}
            </Button>
            <Button
              onClick={() => selectedRequest && handleApprove(selectedRequest)}
              disabled={processing}
              className="bg-[#006d2c] hover:bg-[#005523]"
            >
              <Check className="h-4 w-4 mr-1" />
              {t("cohort.approve")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
