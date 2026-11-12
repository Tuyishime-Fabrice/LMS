import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { TeacherHeader } from "@/components/TeacherHeader";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Users,
  Plus,
  Trash2,
  Eye,
  Bell,
  Check,
  X,
  BookOpen,
  Calendar,
  Send,
  UserPlus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface Course {
  id: string;
  title: string;
}

interface Cohort {
  id: string;
  name: string;
  description: string | null;
  course_id: string | null;
  teacher_id: string;
  max_students: number;
  is_active: boolean;
  created_at: string;
  price?: number | null;
  currency?: string | null;
  requires_payment?: boolean;
  instalment_enabled?: boolean;
  courses?: { title: string } | null;
  student_count?: number;
}

interface CohortStudent {
  student_id: string;
  enrolled_at: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  quiz_average?: number;
  assignment_count?: number;
}

interface JoinRequest {
  id: string;
  cohort_id: string;
  student_id: string;
  status: string;
  message: string | null;
  payment_track?: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

const TeacherCohorts = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<Cohort | null>(null);
  const [cohortStudents, setCohortStudents] = useState<CohortStudent[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStudentsDialog, setShowStudentsDialog] = useState(false);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const [newCohort, setNewCohort] = useState({
    name: "",
    description: "",
    course_id: "",
    max_students: 30,
    price: "",
    currency: "RWF",
    requires_payment: false,
    instalment_enabled: false,
  });
  
  const [announcement, setAnnouncement] = useState({
    title: "",
    message: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch teacher's courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, title")
        .eq("teacher_id", user.id);
      setCourses(coursesData || []);

      // Fetch cohorts created by this teacher
      const { data: cohortsData, error: cohortsError } = await supabase
        .from("cohorts")
        .select(`
          *,
          courses (title)
        `)
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      if (cohortsError) {
        console.log("Cohorts table may not exist:", cohortsError);
        setCohorts([]);
      } else {
        // Get student counts for each cohort
        const cohortsWithCounts = await Promise.all(
          (cohortsData || []).map(async (cohort) => {
            const { count } = await supabase
              .from("course_enrollments")
              .select("*", { count: "exact", head: true })
              .eq("cohort_name", cohort.name);
            return { ...cohort, student_count: count || 0 };
          })
        );
        setCohorts(cohortsWithCounts);
      }

      // Fetch pending join requests for teacher's cohorts
      const teacherCohortIds = (cohortsData || []).map(c => c.id);
      
      if (teacherCohortIds.length > 0) {
        const { data: requestsData, error: requestsError } = await supabase
          .from("cohort_join_requests")
          .select(`
            *,
            profiles:student_id (full_name, email, avatar_url)
          `)
          .eq("status", "pending")
          .in("cohort_id", teacherCohortIds);

        if (requestsError) {
          console.log("Join requests table may not exist:", requestsError);
          setJoinRequests([]);
        } else {
          setJoinRequests(requestsData || []);
        }
      } else {
        setJoinRequests([]);
      }

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error(t("common.error"));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCohort = async () => {
    if (!newCohort.name.trim()) {
      toast.error(t("teacher.cohorts.enterName"));
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("cohorts").insert({
        name: newCohort.name,
        description: newCohort.description || null,
        course_id: newCohort.course_id || null,
        teacher_id: user.id,
        max_students: newCohort.max_students,
        is_active: true,
        price: newCohort.requires_payment && newCohort.price ? Number(newCohort.price) : null,
        currency: newCohort.currency || "RWF",
        requires_payment: newCohort.requires_payment,
        instalment_enabled: newCohort.instalment_enabled,
      });

      if (error) throw error;

      toast.success(t("teacher.cohorts.created"));
      setShowCreateDialog(false);
      setNewCohort({
        name: "",
        description: "",
        course_id: "",
        max_students: 30,
        price: "",
        currency: "RWF",
        requires_payment: false,
        instalment_enabled: false,
      });
      fetchData();
    } catch (error: any) {
      console.error("Error creating cohort:", error);
      toast.error(t("teacher.cohorts.failedToCreate"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteCohort = async (cohortId: string) => {
    if (!confirm(t("teacher.cohorts.deleteConfirm"))) return;

    try {
      const { error } = await supabase
        .from("cohorts")
        .delete()
        .eq("id", cohortId);

      if (error) throw error;

      toast.success(t("teacher.cohorts.deleted"));
      fetchData();
    } catch (error: any) {
      console.error("Error deleting cohort:", error);
      toast.error(t("teacher.cohorts.failedToDelete"));
    }
  };

  const handleViewStudents = async (cohort: Cohort) => {
    setSelectedCohort(cohort);
    setShowStudentsDialog(true);
    setCohortStudents([]); // Reset while loading

    try {
      // Primary method: Get students by cohort_name matching this cohort's name
      const { data: cohortStudentsData, error: cohortError } = await supabase
        .from("course_enrollments")
        .select(`
          student_id,
          enrolled_at,
          cohort_name,
          profiles:student_id (full_name, email, avatar_url)
        `)
        .eq("cohort_name", cohort.name);

      if (cohortError) {
        console.error("Error fetching cohort students:", cohortError);
      }

      // If we found students with this cohort_name, use them
      if (cohortStudentsData && cohortStudentsData.length > 0) {
        setCohortStudents(cohortStudentsData);
        return;
      }

      // Fallback: If cohort has a linked course and no students with cohort_name,
      // show all students enrolled in that course
      if (cohort.course_id) {
        const { data: courseStudents, error: courseError } = await supabase
          .from("course_enrollments")
          .select(`
            student_id,
            enrolled_at,
            cohort_name,
            profiles:student_id (full_name, email, avatar_url)
          `)
          .eq("course_id", cohort.course_id);

        if (courseError) {
          console.error("Error fetching course students:", courseError);
        }

        setCohortStudents(courseStudents || []);
      } else {
        // No linked course and no students with cohort_name
        setCohortStudents([]);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      setCohortStudents([]);
    }
  };

  const handleApproveRequest = async (request: JoinRequest) => {
    setProcessing(true);
    try {
      const cohort = cohorts.find(c => c.id === request.cohort_id);
      if (!cohort) {
        toast.error(t("common.error"));
        return;
      }

      // Cohort must have a linked course to enroll students
      if (!cohort.course_id) {
        toast.error(t("teacher.cohorts.noCourseLinked"));
        // Still approve the request but warn the teacher
        await supabase
          .from("cohort_join_requests")
          .update({ status: "approved" })
          .eq("id", request.id);
        fetchData();
        return;
      }

      // Paid cohort: require successful course payment linked to this cohort
      if (cohort.requires_payment && request.payment_track === "full" && cohort.course_id) {
        const { data: paid } = await supabase
          .from("payments")
          .select("id, amount")
          .eq("student_id", request.student_id)
          .eq("course_id", cohort.course_id)
          .eq("cohort_id", cohort.id)
          .eq("status", "success")
          .maybeSingle();

        if (!paid) {
          toast.error("Student has not completed cohort payment yet.");
          return;
        }

        if (cohort.price != null && Number(paid.amount) < Number(cohort.price)) {
          toast.error("Payment amount does not match cohort fee.");
          return;
        }
      } else if (cohort.requires_payment && request.payment_track === "instalment" && cohort.course_id) {
        const { data: enrol } = await supabase
          .from("student_instalment_enrollments")
          .select("id")
          .eq("student_id", request.student_id)
          .eq("course_id", cohort.course_id)
          .eq("cohort_id", cohort.id)
          .eq("status", "active")
          .maybeSingle();

        if (!enrol) {
          toast.error("Student has not started the cohort instalment plan.");
          return;
        }
      }

      // Check if student is already enrolled in this course
      const { data: existing } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("student_id", request.student_id)
        .eq("course_id", cohort.course_id)
        .maybeSingle();

      if (existing) {
        // Update existing enrollment with cohort_name
        const { error: updateError } = await supabase
          .from("course_enrollments")
          .update({ cohort_name: cohort.name })
          .eq("id", existing.id);
        
        if (updateError) {
          console.error("Error updating enrollment:", updateError);
          throw updateError;
        }
      } else {
        // Create new enrollment with cohort_name
        const { error: insertError } = await supabase
          .from("course_enrollments")
          .insert({
            student_id: request.student_id,
            course_id: cohort.course_id,
            cohort_name: cohort.name,
          });
        
        if (insertError) {
          console.error("Error creating enrollment:", insertError);
          throw insertError;
        }
      }

      // Update request status to approved
      const { error: statusError } = await supabase
        .from("cohort_join_requests")
        .update({ status: "approved" })
        .eq("id", request.id);

      if (statusError) {
        console.error("Error updating request status:", statusError);
        throw statusError;
      }

      toast.success(t("teacher.cohorts.requestApproved"));
      fetchData();
    } catch (error: any) {
      console.error("Error approving request:", error);
      toast.error(t("common.error"));
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessing(true);
    try {
      await supabase
        .from("cohort_join_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);

      toast.success(t("teacher.cohorts.requestRejected"));
      fetchData();
    } catch (error: any) {
      console.error("Error rejecting request:", error);
      toast.error(t("common.error"));
    } finally {
      setProcessing(false);
    }
  };

  const handleSendAnnouncement = async () => {
    if (!selectedCohort || !announcement.title.trim() || !announcement.message.trim()) {
      toast.error(t("teacher.announcements.fillAllFields"));
      return;
    }

    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create announcement using teacher_announcements table
      // Include cohort name in title for identification
      const { error } = await supabase.from("teacher_announcements").insert({
        teacher_id: user.id,
        course_id: selectedCohort.course_id || null,
        title: `[${selectedCohort.name}] ${announcement.title}`,
        message: announcement.message,
        is_active: true,
      });

      if (error) throw error;

      toast.success(t("teacher.cohorts.announcementSent"));
      setShowAnnouncementDialog(false);
      setAnnouncement({ title: "", message: "" });
    } catch (error: any) {
      console.error("Error sending announcement:", error);
      toast.error(t("teacher.announcements.failedToCreate"));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <TeacherSidebar />

        <div className="flex-1 flex flex-col">
          <TeacherHeader
            title={t("teacher.cohorts.title")}
            subtitle={t("teacher.cohorts.subtitle")}
          >
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-[#006d2c] hover:bg-[#005523]"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("teacher.cohorts.createCohort")}
            </Button>
          </TeacherHeader>

          <main className="flex-1 overflow-auto p-4">
            <div className="container mx-auto space-y-6">
              <Tabs defaultValue="cohorts" className="space-y-6">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="cohorts">
                    {t("teacher.cohorts.myCohorts")} ({cohorts.length})
                  </TabsTrigger>
                  <TabsTrigger value="requests">
                    {t("teacher.cohorts.joinRequests")} ({joinRequests.length})
                  </TabsTrigger>
                </TabsList>

                {/* Cohorts Tab */}
                <TabsContent value="cohorts" className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t("teacher.cohorts.totalCohorts")}</CardTitle>
                        <Users className="h-4 w-4 text-[#006d2c]" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{cohorts.length}</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t("teacher.cohorts.totalStudents")}</CardTitle>
                        <UserPlus className="h-4 w-4 text-[#006d2c]" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {cohorts.reduce((sum, c) => sum + (c.student_count || 0), 0)}
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t("teacher.cohorts.pendingRequests")}</CardTitle>
                        <Bell className="h-4 w-4 text-orange-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{joinRequests.length}</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Cohorts List */}
                  {cohorts.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">{t("teacher.cohorts.noCohorts")}</h3>
                        <p className="text-gray-600 mb-4">{t("teacher.cohorts.createFirst")}</p>
                        <Button onClick={() => setShowCreateDialog(true)} className="bg-[#006d2c] hover:bg-[#005523]">
                          <Plus className="h-4 w-4 mr-2" />
                          {t("teacher.cohorts.createCohort")}
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cohorts.map((cohort) => (
                        <Card key={cohort.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-lg">{cohort.name}</CardTitle>
                                {cohort.courses && (
                                  <CardDescription className="flex items-center gap-1 mt-1">
                                    <BookOpen className="h-3 w-3" />
                                    {cohort.courses.title}
                                  </CardDescription>
                                )}
                              </div>
                              <Badge variant={cohort.is_active ? "default" : "secondary"}>
                                {cohort.is_active ? t("teacher.cohorts.active") : t("teacher.cohorts.inactive")}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {cohort.description && (
                              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{cohort.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{cohort.student_count || 0} / {cohort.max_students}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(cohort.created_at).toLocaleDateString()}</span>
                              </div>
                              {cohort.requires_payment && cohort.price != null && (
                                <Badge variant="outline">
                                  {Number(cohort.price).toLocaleString()} {cohort.currency || "RWF"}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewStudents(cohort)}
                                className="flex-1"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {t("teacher.cohorts.viewStudents")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedCohort(cohort);
                                  setShowAnnouncementDialog(true);
                                }}
                              >
                                <Bell className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteCohort(cohort.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Join Requests Tab */}
                <TabsContent value="requests" className="space-y-4">
                  {joinRequests.length === 0 ? (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Check className="h-16 w-16 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">{t("teacher.cohorts.noRequests")}</h3>
                        <p className="text-gray-600">{t("teacher.cohorts.allCaughtUp")}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    joinRequests.map((request) => {
                      const cohort = cohorts.find(c => c.id === request.cohort_id);
                      return (
                        <Card key={request.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                  {request.profiles.avatar_url ? (
                                    <img src={request.profiles.avatar_url} alt={request.profiles.full_name} />
                                  ) : (
                                    <AvatarFallback className="bg-[#006d2c] text-white">
                                      {request.profiles.full_name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <div>
                                  <p className="font-semibold">{request.profiles.full_name}</p>
                                  <p className="text-sm text-gray-600">{request.profiles.email}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline">{cohort?.name}</Badge>
                                    {request.payment_track && (
                                      <Badge variant="secondary" className="capitalize">
                                        {request.payment_track}
                                      </Badge>
                                    )}
                                    <span className="text-xs text-gray-500">
                                      {new Date(request.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  {request.message && (
                                    <p className="text-sm text-gray-600 mt-2 italic">"{request.message}"</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRejectRequest(request.id)}
                                  disabled={processing}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  {t("teacher.cohorts.reject")}
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveRequest(request)}
                                  disabled={processing}
                                  className="bg-[#006d2c] hover:bg-[#005523]"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  {t("teacher.cohorts.approve")}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>

        {/* Create Cohort Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("teacher.cohorts.createCohort")}</DialogTitle>
              <DialogDescription>{t("teacher.cohorts.createDescription")}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("teacher.cohorts.cohortName")} *</Label>
                <Input
                  placeholder={t("teacher.cohorts.namePlaceholder")}
                  value={newCohort.name}
                  onChange={(e) => setNewCohort({ ...newCohort, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("teacher.cohorts.description")}</Label>
                <Textarea
                  placeholder={t("teacher.cohorts.descriptionPlaceholder")}
                  value={newCohort.description}
                  onChange={(e) => setNewCohort({ ...newCohort, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("teacher.cohorts.linkedCourse")}</Label>
                <Select
                  value={newCohort.course_id || "none"}
                  onValueChange={(value) => setNewCohort({ ...newCohort, course_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("teacher.cohorts.selectCourse")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("teacher.cohorts.noCourse")}</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("teacher.cohorts.maxStudents")}</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={newCohort.max_students}
                  onChange={(e) => setNewCohort({ ...newCohort, max_students: parseInt(e.target.value) || 30 })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_payment"
                  checked={newCohort.requires_payment}
                  onChange={(e) =>
                    setNewCohort({ ...newCohort, requires_payment: e.target.checked })
                  }
                />
                <Label htmlFor="requires_payment">Requires payment</Label>
              </div>
              {newCohort.requires_payment && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Price"
                      value={newCohort.price}
                      onChange={(e) => setNewCohort({ ...newCohort, price: e.target.value })}
                    />
                    <Select
                      value={newCohort.currency}
                      onValueChange={(val) => setNewCohort({ ...newCohort, currency: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RWF">RWF</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="instalment_enabled"
                      checked={newCohort.instalment_enabled}
                      onChange={(e) =>
                        setNewCohort({ ...newCohort, instalment_enabled: e.target.checked })
                      }
                    />
                    <Label htmlFor="instalment_enabled">Allow instalment track</Label>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleCreateCohort}
                disabled={processing}
                className="bg-[#006d2c] hover:bg-[#005523]"
              >
                {processing ? t("common.loading") : t("common.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Students Dialog */}
        <Dialog open={showStudentsDialog} onOpenChange={setShowStudentsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedCohort?.name} - {t("teacher.cohorts.students")}</DialogTitle>
              <DialogDescription>
                {cohortStudents.length} {t("teacher.cohorts.studentsEnrolled")}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {cohortStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-600">{t("teacher.cohorts.noStudentsYet")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("teacher.cohorts.student")}</TableHead>
                      <TableHead>{t("teacher.cohorts.email")}</TableHead>
                      <TableHead>{t("teacher.cohorts.enrolledDate")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohortStudents.map((student) => (
                      <TableRow key={student.student_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              {student.profiles.avatar_url ? (
                                <img src={student.profiles.avatar_url} alt={student.profiles.full_name} />
                              ) : (
                                <AvatarFallback className="bg-[#006d2c] text-white text-xs">
                                  {student.profiles.full_name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            <span className="font-medium">{student.profiles.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{student.profiles.email}</TableCell>
                        <TableCell className="text-gray-600">
                          {new Date(student.enrolled_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Send Announcement Dialog */}
        <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("teacher.cohorts.sendAnnouncement")}</DialogTitle>
              <DialogDescription>
                {t("teacher.cohorts.announcementTo")} {selectedCohort?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("teacher.announcements.announcementTitle")} *</Label>
                <Input
                  placeholder={t("teacher.announcements.titlePlaceholder")}
                  value={announcement.title}
                  onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("teacher.announcements.message")} *</Label>
                <Textarea
                  placeholder={t("teacher.announcements.messagePlaceholder")}
                  value={announcement.message}
                  onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAnnouncementDialog(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleSendAnnouncement}
                disabled={processing}
                className="bg-[#006d2c] hover:bg-[#005523]"
              >
                <Send className="h-4 w-4 mr-2" />
                {processing ? t("common.sending") : t("teacher.cohorts.send")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
};

export default TeacherCohorts;
