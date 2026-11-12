import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Search, BookOpen, Star, Check, X, Trash2, Eye, DollarSign, Lock, Unlock, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { formatPrice } from "@/services/paymentService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
        toast.error("Access denied");
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
      toast.error("Failed to load courses");
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
      toast.error("Failed to update course");
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

      toast.success("Course approved");
      fetchCourses();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Failed to approve course");
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
      toast.error(error.message || "Failed to delete course");
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
        toast.error("Update blocked — check admin permissions (RLS policy may be missing)");
        return;
      }
      toast.success("Pricing updated");
      fetchCourses();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error("Failed to update pricing");
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
      toast.error(error.message || "Failed to update instalment plan");
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
      toast.error('Failed to load chapters');
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
      toast.error('Failed to update chapter');
      return;
    }

    if (!data || data.length === 0) {
      toast.error('Update blocked — run the admin RLS fix migration in Supabase SQL Editor');
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <AdminSidebar pendingCourses={pendingCount} />

        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <header className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100 mb-6">
            <div className="bg-gradient-to-r from-[#006d2c] to-[#008000] p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-white" />
                  <div className="text-white">
                    <h1 className="text-3xl font-bold mb-1">Course Management</h1>
                    <p className="text-white/90 text-sm">Manage and approve courses</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {filteredCourses.length} Courses
                </Badge>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-2">
            <div className="max-w-7xl mx-auto space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
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
                        <TableHead>Course</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Featured</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCourses.map((course) => (
                        <TableRow key={course.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{course.title}</p>
                              <p className="text-sm text-gray-600 line-clamp-1">
                                {course.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{course.profiles?.full_name}</p>
                              <p className="text-sm text-gray-600">{course.profiles?.email}</p>
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
                                <span className="text-xs text-gray-500">
                                  {course.is_free ? "Free" : "Paid"}
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
                                    <span className="text-xs text-gray-500">Scholarships open</span>
                                  </div>
                                  {course.scholarship_open && (
                                    <Input
                                      type="number"
                                      className="h-7 w-20 text-xs"
                                      placeholder="Max slots"
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
                                  <span className="text-[10px] font-semibold text-gray-500 uppercase">Early bird</span>
                                  <Input
                                    type="number"
                                    className="h-7 w-20 text-xs"
                                    placeholder="Price"
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
                                    placeholder="Max seats"
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
                                    <span className="text-xs text-gray-500">Instalments</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                course.approval_status === "approved"
                                  ? "bg-green-100 text-green-800"
                                  : course.approval_status === "pending"
                                    ? "bg-orange-100 text-orange-800"
                                    : "bg-red-100 text-red-800"
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
                          <TableCell className="text-sm text-gray-600">
                            {new Date(course.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {course.approval_status === "pending" && (
                                <Button
                                  size="sm"
                                  onClick={() => approveCourse(course.id)}
                                  disabled={processing}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              )}
                              {!course.is_free && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openChapterPreviewDialog(course)}
                                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                                >
                                  <Lock className="h-4 w-4 mr-1" />
                                  Access
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/course/${course.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/create-course?edit=${course.id}`)}
                                className="border-blue-300 text-blue-700 hover:bg-blue-50"
                              >
                                <Pencil className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteClick(course)}
                                disabled={processing}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
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
          </main>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{courseToDelete?.title}"? This action cannot be undone.
              All course content, enrollments, and related data will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={processing}
              className="bg-red-600 hover:bg-red-700"
            >
              {processing ? "Deleting..." : "Delete Course"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Chapter Preview Dialog */}
      <Dialog open={showChapterDialog} onOpenChange={setShowChapterDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage Chapter Access</DialogTitle>
            <DialogDescription>
              {selectedCourseForChapters?.title} — Toggle which chapters are free to preview
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {chaptersLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
                <p className="text-sm text-gray-500 mt-2">Loading chapters...</p>
              </div>
            ) : chaptersList.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No chapters found for this course</p>
            ) : (
              chaptersList.map((chapter, index) => (
                <div key={chapter.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{chapter.title}</p>
                    <p className="text-xs text-gray-500">{chapter.lesson_count} lesson{chapter.lesson_count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {chapter.is_preview ? (
                      <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5"><Unlock className="h-3 w-3 mr-0.5" />Free</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-500 text-[10px] px-1.5"><Lock className="h-3 w-3 mr-0.5" />Locked</Badge>
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
          <p className="text-xs text-gray-400 mt-2">
            Free preview chapters can be accessed by anyone. Locked chapters require purchase.
          </p>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default AdminCourses;
