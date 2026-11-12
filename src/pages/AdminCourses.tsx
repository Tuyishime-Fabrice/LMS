import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell/page";
import { AppShell } from "@/components/shell/AppShell";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Star, Check, Trash2, Eye, Lock, Unlock, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Course {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  thumbnail_url: string | null;
  approval_status: string;
  is_featured: boolean;
  category: string | null;
  created_at: string;
  price: number;
  is_free: boolean;
  currency: string;
  scholarship_open?: boolean;
  scholarship_slots_max?: number | null;
  scholarship_slots_used?: number;
  early_bird_price?: number | null;
  early_bird_start?: string | null;
  early_bird_end?: string | null;
  early_bird_max_seats?: number | null;
  early_bird_seats_used?: number;
  profiles: {
    full_name: string;
    email: string;
  };
}

const AdminCourses = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [processing, setProcessing] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showChapterDialog, setShowChapterDialog] = useState(false);
  const [selectedCourseForChapters, setSelectedCourseForChapters] = useState<Course | null>(null);
  const [chaptersList, setChaptersList] = useState<Array<{ id: string; title: string; order_index: number; is_preview: boolean; lesson_count: number }>>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [instalmentCourses, setInstalmentCourses] = useState<Set<string>>(new Set());

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [courses, searchQuery, statusFilter]);

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
        toast.error(t("adminCourses.accessDenied", "Access denied"));
        navigate("/");
        return;
      }

      await fetchCourses();
    } catch (error: any) {
      console.error("Error:", error);
      navigate("/");
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          profiles:teacher_id (
            full_name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCourses(data || []);

      const { data: plans } = await supabase
        .from("course_instalment_plans")
        .select("course_id")
        .eq("is_active", true);
      setInstalmentCourses(new Set((plans || []).map((p) => p.course_id)));
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast.error(t("adminCourses.failedToLoadCourses", "Failed to load courses"));
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    let filtered = courses;

    if (searchQuery) {
      filtered = filtered.filter(
        (course) =>
          course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          course.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((course) => course.approval_status === statusFilter);
    }

    setFilteredCourses(filtered);
  };

  const toggleFeatured = async (courseId: string, currentStatus: boolean) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("courses")
        .update({ is_featured: !currentStatus })
        .eq("id", courseId);

      if (error) throw error;

      toast.success(currentStatus ? "Removed from featured" : "Added to featured");
      fetchCourses();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(t("adminCourses.failedToUpdateCourse", "Failed to update course"));
    } finally {
      setProcessing(false);
    }
  };

  const approveCourse = async (courseId: string) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("courses")
        .update({ approval_status: "approved" })
        .eq("id", courseId);

      if (error) throw error;

      toast.success(t("adminCourses.courseApproved", "Course approved"));
      fetchCourses();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(t("adminCourses.failedToApproveCourse", "Failed to approve course"));
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteClick = (course: Course) => {
    setCourseToDelete(course);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;

    setProcessing(true);
    try {
      const { error } = await supabase.rpc("admin_delete_course", {
        p_course_id: courseToDelete.id
      });

      if (error) throw error;

      toast.success(`Course "${courseToDelete.title}" has been deleted`);
      setShowDeleteDialog(false);
      setCourseToDelete(null);
      fetchCourses();
    } catch (error: any) {
      console.error("Error deleting course:", error);
      toast.error(error.message || t("adminCourses.failedToDeleteCourse", "Failed to delete course"));
    } finally {
      setProcessing(false);
    }
  };

  const updatePricing = async (
    courseId: string,
    updates: {
      price?: number;
      is_free?: boolean;
      currency?: string;
      scholarship_open?: boolean;
      scholarship_slots_max?: number | null;
      early_bird_price?: number | null;
      early_bird_start?: string | null;
      early_bird_end?: string | null;
      early_bird_max_seats?: number | null;
    },
  ) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase
        .from("courses")
        .update(updates)
        .eq("id", courseId)
        .select("id");

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error(t("adminCourses.updateBlockedCheckAdminPermissionsRls", "Update blocked — check admin permissions (RLS policy may be missing)"));
        return;
      }
      toast.success(t("adminCourses.pricingUpdated", "Pricing updated"));
      fetchCourses();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(t("adminCourses.failedToUpdatePricing", "Failed to update pricing"));
    } finally {
      setProcessing(false);
    }
  };

  const toggleInstalmentPlan = async (courseId: string, enabled: boolean) => {
    setProcessing(true);
    try {
      if (enabled) {
        const { error } = await supabase.from("course_instalment_plans").upsert(
          {
            course_id: courseId,
            instalment_count: 2,
            deposit_percent: 50,
            is_active: true,
          },
          { onConflict: "course_id" },
        );
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("course_instalment_plans")
          .update({ is_active: false })
          .eq("course_id", courseId);
        if (error) throw error;
      }
      toast.success(enabled ? "Instalment plan enabled" : "Instalment plan disabled");
      fetchCourses();
    } catch (error: any) {
      toast.error(error.message || t("adminCourses.failedToUpdateInstalmentPlan", "Failed to update instalment plan"));
    } finally {
      setProcessing(false);
    }
  };

  const openChapterPreviewDialog = async (course: Course) => {
    setSelectedCourseForChapters(course);
    setShowChapterDialog(true);
    setChaptersLoading(true);

    const { data, error } = await supabase
      .from('course_chapters')
      .select('id, title, order_index, is_preview, course_lessons(id)')
      .eq('course_id', course.id)
      .order('order_index');

    if (error) {
      toast.error(t("adminCourses.failedToLoadChapters", "Failed to load chapters"));
      setChaptersLoading(false);
      return;
    }

    setChaptersList((data || []).map(ch => ({
      id: ch.id,
      title: ch.title,
      order_index: ch.order_index,
      is_preview: ch.is_preview || false,
      lesson_count: (ch.course_lessons || []).length,
    })));
    setChaptersLoading(false);
  };

  const toggleChapterPreview = async (chapterId: string, currentValue: boolean) => {
    const { data, error } = await supabase
      .from('course_chapters')
      .update({ is_preview: !currentValue })
      .eq('id', chapterId)
      .select('id');

    if (error) {
      toast.error(t("adminCourses.failedToUpdateChapter", "Failed to update chapter"));
      return;
    }

    if (!data || data.length === 0) {
      toast.error(t("adminCourses.updateBlockedRunTheAdminRls", "Update blocked — run the admin RLS fix migration in Supabase SQL Editor"));
      return;
    }

    setChaptersList(prev => prev.map(ch =>
      ch.id === chapterId ? { ...ch, is_preview: !currentValue } : ch
    ));
    toast.success(!currentValue ? 'Chapter set as free preview' : 'Chapter locked behind paywall');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const pendingCount = courses.filter((c) => c.approval_status === "pending").length;

  return (
    <AppShell role="admin" width="wide" badges={{ pendingCourses: pendingCount }}>
      <PageHeader
        title={t("adminCourses.courseManagement", "Course Management")}
        description={t("adminCourses.manageAndApproveCourses", "Manage and approve courses")}
        actions={<>
          <Badge variant="secondary" className="text-lg px-4 py-2">
                  {t("adminCourses.courses", "{{count}} Courses", { count: filteredCourses.length })}
                </Badge>
        </>}
      />

            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        placeholder={t("adminCourses.searchCourses", "Search courses...")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("adminCourses.filterByStatus", "Filter by status")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("adminCourses.allStatus", "All Status")}</SelectItem>
                        <SelectItem value="approved">{t("adminCourses.approved", "Approved")}</SelectItem>
                        <SelectItem value="pending">{t("adminCourses.pending", "Pending")}</SelectItem>
                        <SelectItem value="rejected">{t("adminCourses.rejected", "Rejected")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("adminCourses.course", "Course")}</TableHead>
                        <TableHead>{t("adminCourses.teacher", "Teacher")}</TableHead>
                        <TableHead>{t("adminCourses.price", "Price")}</TableHead>
                        <TableHead>{t("adminCourses.status", "Status")}</TableHead>
                        <TableHead>{t("adminCourses.featured", "Featured")}</TableHead>
                        <TableHead>{t("adminCourses.created", "Created")}</TableHead>
                        <TableHead>{t("adminCourses.actions", "Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCourses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{course.title}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {course.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{course.profiles?.full_name}</p>
                              <p className="text-sm text-muted-foreground">{course.profiles?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1.5 min-w-[140px]">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={!course.is_free}
                                  onCheckedChange={(checked) => updatePricing(course.id, { is_free: !checked })}
                                  disabled={processing}
                                />
                                <span className="text-xs text-muted-foreground">
                                  {course.is_free ? t("adminCourses.free", "Free") : t("adminCourses.paid", "Paid")}
                                </span>
                              </div>
                              {!course.is_free && (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    className="h-7 w-20 text-xs"
                                    defaultValue={course.price || 0}
                                    onBlur={(e) => updatePricing(course.id, { price: Number(e.target.value) })}
                                  />
                                  <Select
                                    defaultValue={course.currency || "RWF"}
                                    onValueChange={(val) => updatePricing(course.id, { currency: val })}
                                  >
                                    <SelectTrigger className="h-7 w-16 text-xs">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="RWF">RWF</SelectItem>
                                      <SelectItem value="USD">USD</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {!course.is_free && (
                                <div className="flex flex-col gap-1 mt-2">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={!!course.scholarship_open}
                                      onCheckedChange={(checked) =>
                                        updatePricing(course.id, { scholarship_open: checked })
                                      }
                                      disabled={processing}
                                    />
                                    <span className="text-xs text-muted-foreground">{t("adminCourses.scholarshipsOpen", "Scholarships open")}</span>
                                  </div>
                                  {course.scholarship_open && (
                                    <Input
                                      type="number"
                                      className="h-7 w-20 text-xs"
                                      placeholder={t("adminCourses.maxSlots", "Max slots")}
                                      defaultValue={course.scholarship_slots_max ?? ""}
                                      onBlur={(e) =>
                                        updatePricing(course.id, {
                                          scholarship_slots_max: e.target.value
                                            ? Number(e.target.value)
                                            : null,
                                        })
                                      }
                                    />
                                  )}
                                </div>
                              )}
                              {!course.is_free && (
                                <div className="flex flex-col gap-1 mt-2 border-t pt-2">
                                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">{t("adminCourses.earlyBird", "Early bird")}</span>
                                  <Input
                                    type="number"
                                    className="h-7 w-20 text-xs"
                                    placeholder={t("adminCourses.price", "Price")}
                                    defaultValue={course.early_bird_price ?? ""}
                                    onBlur={(e) =>
                                      updatePricing(course.id, {
                                        early_bird_price: e.target.value ? Number(e.target.value) : null,
                                      })
                                    }
                                  />
                                  <Input
                                    type="datetime-local"
                                    className="h-7 text-xs"
                                    defaultValue={
                                      course.early_bird_start
                                        ? course.early_bird_start.slice(0, 16)
                                        : ""
                                    }
                                    onBlur={(e) =>
                                      updatePricing(course.id, {
                                        early_bird_start: e.target.value
                                          ? new Date(e.target.value).toISOString()
                                          : null,
                                      })
                                    }
                                  />
                                  <Input
                                    type="datetime-local"
                                    className="h-7 text-xs"
                                    defaultValue={
                                      course.early_bird_end ? course.early_bird_end.slice(0, 16) : ""
                                    }
                                    onBlur={(e) =>
                                      updatePricing(course.id, {
                                        early_bird_end: e.target.value
                                          ? new Date(e.target.value).toISOString()
                                          : null,
                                      })
                                    }
                                  />
                                  <Input
                                    type="number"
                                    className="h-7 w-20 text-xs"
                                    placeholder={t("adminCourses.maxSeats", "Max seats")}
                                    defaultValue={course.early_bird_max_seats ?? ""}
                                    onBlur={(e) =>
                                      updatePricing(course.id, {
                                        early_bird_max_seats: e.target.value
                                          ? Number(e.target.value)
                                          : null,
                                      })
                                    }
                                  />
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={instalmentCourses.has(course.id)}
                                      onCheckedChange={(checked) =>
                                        toggleInstalmentPlan(course.id, checked)
                                      }
                                      disabled={processing}
                                    />
                                    <span className="text-xs text-muted-foreground">{t("adminCourses.instalments", "Instalments")}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                course.approval_status === "approved"
                                  ? "bg-leaf text-leaf-foreground"
                                  : course.approval_status === "pending"
                                    ? "bg-warning-surface text-warning"
                                    : "bg-destructive-surface text-destructive"
                              }
                            >
                              {course.approval_status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={course.is_featured ? "default" : "outline"}
                              onClick={() => toggleFeatured(course.id, course.is_featured)}
                              disabled={processing}
                            >
                              <Star
                                className={`h-4 w-4 ${course.is_featured ? "fill-current" : ""
                                  }`}
                              />
                            </Button>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(course.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {course.approval_status === "pending" && (
                                <Button
                                  size="sm"
                                  onClick={() => approveCourse(course.id)}
                                  disabled={processing}
                                  className="bg-primary hover:bg-primary-hover"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  {t("adminCourses.approve", "Approve")}
                                </Button>
                              )}
                              {!course.is_free && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openChapterPreviewDialog(course)}
                                  className="border-warning/30 text-warning hover:bg-warning-surface"
                                >
                                  <Lock className="h-4 w-4 mr-1" />
                                  {t("adminCourses.access", "Access")}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/course/${course.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {t("adminCourses.view", "View")}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/create-course?edit=${course.id}`)}
                                className="border-info/30 text-info hover:bg-info-surface"
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                {t("adminCourses.edit", "Edit")}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteClick(course)}
                                disabled={processing}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {t("adminCourses.delete", "Delete")}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminCourses.deleteCourse", "Delete Course")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminCourses.areYouSureYouWantTo", "Are you sure you want to delete \"{{title}}\"? This action cannot be undone. All course content, enrollments, and related data will be permanently deleted.", { title: courseToDelete?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>{t("adminCourses.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={processing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processing ? t("adminCourses.deleting", "Deleting...") : t("adminCourses.deleteCourse", "Delete Course")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Chapter Preview Dialog */}
      <Dialog open={showChapterDialog} onOpenChange={setShowChapterDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("adminCourses.manageChapterAccess", "Manage Chapter Access")}</DialogTitle>
            <DialogDescription>
              {t("adminCourses.toggleWhichChaptersAreFreeTo", "{{title}} — Toggle which chapters are free to preview", { title: selectedCourseForChapters?.title })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {chaptersLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary/30 mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">{t("adminCourses.loadingChapters", "Loading chapters...")}</p>
              </div>
            ) : chaptersList.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">{t("adminCourses.noChaptersFoundForThisCourse", "No chapters found for this course")}</p>
            ) : (
              chaptersList.map((chapter, index) => (
                <div key={chapter.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{chapter.title}</p>
                    <p className="text-xs text-muted-foreground">{chapter.lesson_count} lesson{chapter.lesson_count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {chapter.is_preview ? (
                      <Badge className="bg-info-surface text-info text-[10px] px-1.5"><Unlock className="h-3 w-3 mr-0.5" />{t("adminCourses.free", "Free")}</Badge>
                    ) : (
                      <Badge className="bg-muted text-muted-foreground text-[10px] px-1.5"><Lock className="h-3 w-3 mr-0.5" />{t("adminCourses.locked", "Locked")}</Badge>
                    )}
                    <Switch
                      checked={chapter.is_preview}
                      onCheckedChange={() => toggleChapterPreview(chapter.id, chapter.is_preview)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground/60 mt-2">
            {t("adminCourses.freePreviewChaptersCanBeAccessed", "Free preview chapters can be accessed by anyone. Locked chapters require purchase.")}
          </p>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default AdminCourses;
