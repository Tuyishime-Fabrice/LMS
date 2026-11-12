import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { BookOpen, Check, X, Clock, Eye } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

interface PendingCourse {
  course_id: string;
  course_title: string;
  teacher_id: string;
  teacher_name: string;
  update_submitted_at: string;
  update_notes: string | null;
  thumbnail_url: string | null;
}

const AdminModeration = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingCourses, setPendingCourses] = useState<PendingCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<PendingCourse | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
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

      await fetchPendingCourses();
    } catch (error: any) {
      console.error("Error:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingCourses = async () => {
    try {
      const { data, error } = await supabase.rpc("get_pending_course_updates");

      if (error) throw error;
      setPendingCourses(data || []);
    } catch (error: any) {
      console.error("Error fetching pending courses:", error);
      toast.error("Failed to load pending course updates");
    }
  };

  const handleReview = (course: PendingCourse, action: "approve" | "reject") => {
    setSelectedCourse(course);
    setReviewAction(action);
    setReviewNotes("");
    setShowReviewDialog(true);
  };

  const submitReview = async () => {
    if (!selectedCourse) return;

    if (reviewAction === "reject" && !reviewNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setProcessing(true);
    try {
      const functionName = reviewAction === "approve" 
        ? "approve_course_update" 
        : "reject_course_update";

      const { error } = await supabase.rpc(functionName, {
        p_course_id: selectedCourse.course_id,
        p_review_notes: reviewNotes || null,
      });

      if (error) throw error;

      toast.success(
        reviewAction === "approve"
          ? "Course update approved successfully"
          : "Course update rejected"
      );

      setShowReviewDialog(false);
      await fetchPendingCourses();
    } catch (error: any) {
      console.error("Error reviewing course:", error);
      toast.error("Failed to process review");
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
        <AdminSidebar flaggedContent={pendingCourses.length} />

        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <header className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100 mb-6">
            <div className="bg-gradient-to-r from-[#006d2c] to-[#008000] p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-white" />
                  <div className="text-white">
                    <h1 className="text-3xl font-bold mb-1">Course Update Review</h1>
                    <p className="text-white/90 text-sm">Review and approve course updates</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {pendingCourses.length} Pending
                </Badge>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-2">
            <div className="max-w-7xl mx-auto space-y-4">
              {pendingCourses.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">All Caught Up!</h3>
                    <p className="text-gray-600">No pending course updates to review</p>
                  </CardContent>
                </Card>
              ) : (
                pendingCourses.map((course) => (
                  <Card key={course.course_id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex gap-4">
                          {course.thumbnail_url && (
                            <img
                              src={course.thumbnail_url}
                              alt={course.course_title}
                              className="w-24 h-24 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <CardTitle className="text-lg mb-2">{course.course_title}</CardTitle>
                            <div className="space-y-1 text-sm text-gray-600">
                              <p>
                                <span className="font-medium">Teacher:</span> {course.teacher_name}
                              </p>
                              <p>
                                <span className="font-medium">Submitted:</span>{" "}
                                {new Date(course.update_submitted_at).toLocaleString()}
                              </p>
                              {course.update_notes && (
                                <p>
                                  <span className="font-medium">Notes:</span> {course.update_notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending Review
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => navigate(`/course/${course.course_id}`)}
                          variant="outline"
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Course
                        </Button>
                        <Button
                          onClick={() => handleReview(course, "approve")}
                          className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReview(course, "reject")}
                          variant="destructive"
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Approve" : "Reject"} Course Update
            </DialogTitle>
            <DialogDescription>
              {selectedCourse?.course_title} by {selectedCourse?.teacher_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>
                {reviewAction === "approve" ? "Approval Notes (Optional)" : "Rejection Reason *"}
              </Label>
              <Textarea
                placeholder={
                  reviewAction === "approve"
                    ? "Add any notes for the teacher..."
                    : "Explain why this update is being rejected..."
                }
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={processing || (reviewAction === "reject" && !reviewNotes.trim())}
              className={
                reviewAction === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {processing ? "Processing..." : reviewAction === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default AdminModeration;
