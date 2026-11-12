import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Check, X, Clock, User, Calendar } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PendingCourseUpdate {
  course_id: string;
  course_title: string;
  teacher_id: string;
  teacher_name: string;
  update_submitted_at: string;
  update_notes: string | null;
  thumbnail_url: string | null;
}

const AdminCourseUpdates = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState<PendingCourseUpdate[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<PendingCourseUpdate | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
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
        toast.error("Access denied");
        navigate("/");
        return;
      }

      await fetchPendingUpdates();
    } catch (error: any) {
      console.error("Error:", error);
      navigate("/");
    }
  };

  const fetchPendingUpdates = async () => {
    try {
      const { data, error } = await supabase.rpc("get_pending_course_updates");

      if (error) throw error;
      setPendingUpdates(data || []);
    } catch (error: any) {
      console.error("Error fetching pending updates:", error);
      toast.error("Failed to load pending course updates");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (course: PendingCourseUpdate) => {
    setProcessing(true);
    try {
      const { error } = await supabase.rpc("approve_course_update", {
        p_course_id: course.course_id,
        p_review_notes: "Approved"
      });

      if (error) throw error;

      toast.success(`Course "${course.course_title}" update approved!`);
      fetchPendingUpdates();
    } catch (error: any) {
      console.error("Error approving course update:", error);
      toast.error(error.message || "Failed to approve course update");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedCourse || !reviewNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.rpc("reject_course_update", {
        p_course_id: selectedCourse.course_id,
        p_review_notes: reviewNotes
      });

      if (error) throw error;

      toast.success(`Course "${selectedCourse.course_title}" update rejected`);
      setShowRejectDialog(false);
      setSelectedCourse(null);
      setReviewNotes("");
      fetchPendingUpdates();
    } catch (error: any) {
      console.error("Error rejecting course update:", error);
      toast.error(error.message || "Failed to reject course update");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <AdminSidebar pendingCourseUpdates={pendingUpdates.length} />

        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <header className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100 mb-6">
            <div className="bg-gradient-to-r from-[#006d2c] to-[#008000] p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-white" />
                  <div className="text-white">
                    <h1 className="text-3xl font-bold mb-1">Course Update Approvals</h1>
                    <p className="text-white/90 text-sm">Review and approve course updates</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {pendingUpdates.length} Pending
                </Badge>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-2">
            <div className="max-w-7xl mx-auto">
              {pendingUpdates.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
                    <p className="text-gray-600">No pending course updates at the moment</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pendingUpdates.map((course) => (
                    <Card key={course.course_id} className="hover:shadow-xl transition-shadow">
                      <CardHeader>
                        <div className="flex items-start gap-4">
                          {course.thumbnail_url && (
                            <img
                              src={course.thumbnail_url}
                              alt={course.course_title}
                              className="w-24 h-24 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <CardTitle className="text-xl mb-2">{course.course_title}</CardTitle>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <User className="h-4 w-4" />
                                {course.teacher_name}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="h-4 w-4" />
                                Updated {new Date(course.update_submitted_at).toLocaleDateString()}
                              </div>
                              {course.update_notes && (
                                <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                                  <p className="font-semibold text-blue-900">Update Notes:</p>
                                  <p className="text-blue-800">{course.update_notes}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleApprove(course)}
                            disabled={processing}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve Update
                          </Button>
                          <Button
                            onClick={() => {
                              setSelectedCourse(course);
                              setShowRejectDialog(true);
                            }}
                            disabled={processing}
                            variant="destructive"
                            className="flex-1"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                        <Button
                          onClick={() => navigate(`/course/${course.course_id}`)}
                          variant="outline"
                          className="w-full mt-2"
                        >
                          View Course Details
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Course Update</DialogTitle>
            <DialogDescription>
              Provide feedback for why this update to "{selectedCourse?.course_title}" is being rejected
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                placeholder="Explain why this course update is being rejected..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !reviewNotes.trim()}
            >
              Reject Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default AdminCourseUpdates;
