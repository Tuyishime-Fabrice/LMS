import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { TeacherHeader } from "@/components/TeacherHeader";
import { Megaphone, Plus, Trash2, BookOpen, Users, Clock } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';

interface Course {
  id: string;
  title: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  course_id: string | null;
  course_title?: string;
  is_active: boolean;
  created_at: string;
}

export default function TeacherAnnouncements() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [processing, setProcessing] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
        return;
      }
      if (profile?.role !== "teacher") {
        navigate("/student/dashboard");
        return;
      }
      fetchData();
    }
  }, [user, profile, authLoading]);

  const fetchData = async () => {
    await Promise.all([fetchCourses(), fetchAnnouncements()]);
    setLoading(false);
  };

  const fetchCourses = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("courses")
      .select("id, title")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) setCourses(data || []);
  };

  const fetchAnnouncements = async () => {
    if (!user) return;
    
    // Get teacher's course IDs
    const { data: teacherCourses } = await supabase
      .from("courses")
      .select("id, title")
      .eq("teacher_id", user.id);

    const courseIds = teacherCourses?.map(c => c.id) || [];
    const courseMap = new Map(teacherCourses?.map(c => [c.id, c.title]) || []);

    if (courseIds.length === 0) {
      setAnnouncements([]);
      return;
    }

    // Fetch announcements for teacher's courses
    const { data, error } = await supabase
      .from("teacher_announcements")
      .select("*")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const announcementsWithCourse = data.map(a => ({
        ...a,
        course_title: a.course_id ? courseMap.get(a.course_id) || "Unknown Course" : "All Courses"
      }));
      setAnnouncements(announcementsWithCourse);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    if (!user) return;

    setProcessing(true);
    try {
      const { error } = await supabase.from("teacher_announcements").insert({
        title: title.trim(),
        message: message.trim(),
        course_id: selectedCourseId === "all" ? null : selectedCourseId,
        teacher_id: user.id,
        is_active: true
      });

      if (error) throw error;

      toast.success("Announcement sent to students!");
      setShowCreateDialog(false);
      setTitle("");
      setMessage("");
      setSelectedCourseId("all");
      fetchAnnouncements();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to create announcement");
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedAnnouncement) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("teacher_announcements")
        .delete()
        .eq("id", selectedAnnouncement.id);

      if (error) throw error;

      toast.success("Announcement deleted");
      setShowDeleteDialog(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete");
    } finally {
      setProcessing(false);
    }
  };

  const toggleActive = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from("teacher_announcements")
        .update({ is_active: !announcement.is_active })
        .eq("id", announcement.id);

      if (error) throw error;
      toast.success(announcement.is_active ? "Announcement hidden" : "Announcement visible");
      fetchAnnouncements();
    } catch (error: any) {
      toast.error("Failed to update");
    }
  };

  if (authLoading || loading) return <LoadingSpinner />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <TeacherSidebar />

        <div className="flex-1 flex flex-col">
          <TeacherHeader
            title={t('teacher.announcements.title')}
            subtitle={t('teacher.announcements.subtitle')}
          >
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-[#006d2c] hover:bg-[#005523]"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('teacher.announcements.newAnnouncement')}
            </Button>
          </TeacherHeader>

          <main className="flex-1 overflow-y-auto p-4">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">{t('teacher.announcements.totalAnnouncements')}</p>
                      <p className="text-3xl font-bold text-[#006d2c]">{announcements.length}</p>
                    </div>
                    <Megaphone className="h-10 w-10 text-[#006d2c]/30" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">{t('teacher.announcements.active')}</p>
                      <p className="text-3xl font-bold text-green-600">
                        {announcements.filter(a => a.is_active).length}
                      </p>
                    </div>
                    <Megaphone className="h-10 w-10 text-green-500/30" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">{t('teacher.announcements.yourCourses')}</p>
                      <p className="text-3xl font-bold text-blue-600">{courses.length}</p>
                    </div>
                    <BookOpen className="h-10 w-10 text-blue-500/30" />
                  </CardContent>
                </Card>
              </div>

              {/* Announcements List */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('teacher.announcements.yourAnnouncements')}</CardTitle>
                  <CardDescription>
                    {t('teacher.announcements.visibleToStudents')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {announcements.length === 0 ? (
                    <div className="text-center py-12">
                      <Megaphone className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="font-medium text-gray-900 mb-1">{t('teacher.announcements.noAnnouncements')}</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        {t('teacher.announcements.createFirst')}
                      </p>
                      <Button
                        onClick={() => setShowCreateDialog(true)}
                        className="bg-[#006d2c] hover:bg-[#005523]"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('teacher.announcements.createAnnouncement')}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {announcements.map((announcement) => (
                        <Card key={announcement.id} className="border-l-4 border-l-[#006d2c]">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-gray-900">
                                    {announcement.title}
                                  </h3>
                                  <Badge
                                    variant={announcement.is_active ? "default" : "secondary"}
                                    className={announcement.is_active ? "bg-green-100 text-green-800" : ""}
                                  >
                                    {announcement.is_active ? t('teacher.announcements.active') : t('teacher.announcements.hidden')}
                                  </Badge>
                                </div>
                                <p className="text-gray-600 text-sm mb-3">
                                  {announcement.message}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {announcement.course_title}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(announcement.created_at).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => toggleActive(announcement)}
                                >
                                  {announcement.is_active ? t('teacher.announcements.hide') : t('teacher.announcements.show')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedAnnouncement(announcement);
                                    setShowDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('teacher.announcements.createAnnouncement')}</DialogTitle>
            <DialogDescription>
              {t('teacher.announcements.sendToStudents')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('teacher.announcements.announcementTitle')}</Label>
              <Input
                placeholder={t('teacher.announcements.titlePlaceholder')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('teacher.announcements.message')}</Label>
              <Textarea
                placeholder={t('teacher.announcements.messagePlaceholder')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('teacher.announcements.targetCourse')}</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('teacher.announcements.selectCourse')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {t('teacher.announcements.allMyCourses')}
                    </div>
                  </SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        {course.title}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={processing || !title.trim() || !message.trim()}
              className="bg-[#006d2c] hover:bg-[#005523]"
            >
              {processing ? t('teacher.announcements.sending') : t('teacher.announcements.sendAnnouncement')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('teacher.announcements.deleteAnnouncement')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('teacher.announcements.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {processing ? t('teacher.announcements.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
