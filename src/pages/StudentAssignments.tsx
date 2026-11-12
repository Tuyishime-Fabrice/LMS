import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/StudentSidebar";
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Upload,
  Calendar,
  Award,
  TrendingUp,
  Filter,
  Search,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from "@/components/LanguageSelector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeFileName, validateSubmissionFile } from "@/lib/submissionFiles";

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string | null;
  course_title: string;
  course_id: string;
  type: 'assignment' | 'capstone';
  submission: {
    id: string;
    submitted_at: string;
    grade: number | null;
    feedback: string | null;
  } | null;
}

const StudentAssignments = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [remarks, setRemarks] = useState("");
  const [uploading, setUploading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;

    const validation = selectedFile ? validateSubmissionFile(selectedFile) : { valid: true };
    if (!validation.valid) {
      toast.error(validation.error || "This file cannot be uploaded.");
      event.target.value = "";
      setUploadFile(null);
      return;
    }

    setUploadFile(selectedFile);
  };

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setStudentId(user.id);
      await fetchAssignments();
      await fetchEnrolledCourses();
    };
    init();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("course_enrollments")
        .select(`
          course_id,
          courses (
            id,
            title
          )
        `)
        .eq("student_id", user.id);

      if (error) throw error;
      setEnrolledCourses(data || []);
    } catch (error: any) {
      console.error("Error fetching enrolled courses:", error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: enrollments, error: enrollError } = await supabase
        .from("course_enrollments")
        .select("course_id")
        .eq("student_id", user.id);

      if (enrollError) throw enrollError;

      const courseIds = enrollments?.map(e => e.course_id) || [];

      if (courseIds.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      const [regularAssignmentsResult, capstonesResult] = await Promise.all([
        supabase
          .from("course_lessons")
          .select(`
            id,
            title,
            description,
            course_chapters!inner (
              course_id,
              courses (
                title
              )
            )
          `)
          .eq("content_type", "assignment")
          .in("course_chapters.course_id", courseIds),
        
        supabase
          .from("capstone_projects")
          .select(`
            id,
            title,
            description,
            due_date,
            course_id,
            courses (
              title
            )
          `)
          .in("course_id", courseIds)
      ]);

      if (regularAssignmentsResult.error) throw regularAssignmentsResult.error;
      if (capstonesResult.error) throw capstonesResult.error;

      const regularAssignments = (regularAssignmentsResult.data || []).map((lesson: any) => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        due_date: null,
        course_id: lesson.course_chapters.course_id,
        courses: lesson.course_chapters.courses
      }));
      const capstones = capstonesResult.data || [];

      const regularAssignmentIds = regularAssignments.map(a => a.id);
      let assignmentSubmissions: any[] = [];
      if (regularAssignmentIds.length > 0) {
        const { data: assignmentSubmissionsData } = await supabase
          .from("assignment_submissions")
          .select("*")
          .eq("student_id", user.id)
          .in("lesson_id", regularAssignmentIds);
        assignmentSubmissions = assignmentSubmissionsData || [];
      }

      const capstoneIds = capstones.map(c => c.id);
      let capstoneSubmissions: any[] = [];
      if (capstoneIds.length > 0) {
        const { data: capstoneSubmissionsData } = await supabase
          .from("capstone_submissions")
          .select("*")
          .eq("student_id", user.id)
          .in("capstone_project_id", capstoneIds);
        capstoneSubmissions = capstoneSubmissionsData || [];
      }

      const regularAssignmentsData = regularAssignments.map((assignment: any) => {
        const submission = assignmentSubmissions?.find(s => s.lesson_id === assignment.id);
        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          due_date: assignment.due_date,
          course_title: assignment.courses.title,
          course_id: assignment.course_id,
          type: 'assignment' as const,
          submission: submission ? {
            id: submission.id,
            submitted_at: submission.submitted_at,
            grade: submission.grade,
            feedback: submission.feedback
          } : null
        };
      });

      const capstoneData = capstones.map((capstone: any) => {
        const submission = capstoneSubmissions?.find(s => s.capstone_project_id === capstone.id);
        return {
          id: capstone.id,
          title: capstone.title,
          description: capstone.description,
          due_date: capstone.due_date,
          course_title: capstone.courses.title,
          course_id: capstone.course_id,
          type: 'capstone' as const,
          submission: submission ? {
            id: submission.id,
            submitted_at: submission.submitted_at,
            grade: submission.grade,
            feedback: submission.feedback
          } : null
        };
      });

      const allAssignments = [...regularAssignmentsData, ...capstoneData].sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });

      setAssignments(allAssignments);
    } catch (error: any) {
      toast.error("Failed to load assignments");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedCourse || !selectedAssignment || !uploadFile || !studentId) {
      toast.error("Please fill all required fields");
      return;
    }

    const validation = validateSubmissionFile(uploadFile);
    if (!validation.valid) {
      toast.error(validation.error || "This file cannot be uploaded.");
      return;
    }

    setUploading(true);
    try {
      const assignment = assignments.find(a => a.id === selectedAssignment);
      const filePath = `capstone-submissions/${selectedAssignment}/${studentId}/${Date.now()}-${sanitizeFileName(uploadFile.name)}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('lesson-files')
        .upload(filePath, uploadFile, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;
      
      if (assignment?.type === 'capstone') {
        const { error: insertError } = await supabase
          .from('capstone_submissions')
          .upsert({
            capstone_project_id: selectedAssignment,
            student_id: studentId,
            project_links: [data.path],
            description: remarks.trim() || null,
            submitted_at: new Date().toISOString(),
          }, { onConflict: "capstone_project_id,student_id" });

        if (insertError) throw insertError;
      } else {
        const { error: insertError } = await supabase
          .from('assignment_submissions')
          .upsert({
            lesson_id: selectedAssignment,
            student_id: studentId,
            project_links: [data.path],
            description: remarks.trim() || null,
            submitted_at: new Date().toISOString(),
          }, { onConflict: "lesson_id,student_id" });

        if (insertError) throw insertError;
      }

      toast.success("Assignment uploaded successfully!");
      setShowUploadDialog(false);
      setSelectedCourse("");
      setSelectedAssignment("");
      setUploadFile(null);
      setRemarks("");
      fetchAssignments();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload assignment");
    } finally {
      setUploading(false);
    }
  };

  const getStatusInfo = (assignment: Assignment) => {
    if (!assignment.submission) {
      if (assignment.due_date && new Date(assignment.due_date) < new Date()) {
        return { 
          label: t('assignments.overdue'), 
          color: 'bg-red-500', 
          icon: AlertCircle,
          textColor: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      }
      return { 
        label: t('assignments.pending'), 
        color: 'bg-orange-500', 
        icon: Clock,
        textColor: 'text-orange-600',
        bgColor: 'bg-orange-50',
        borderColor: 'border-orange-200'
      };
    }

    if (assignment.submission.grade !== null) {
      return { 
        label: t('assignments.graded'), 
        color: 'bg-green-500', 
        icon: CheckCircle2,
        textColor: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }

    return { 
      label: t('assignments.submitted'), 
      color: 'bg-blue-500', 
      icon: CheckCircle2,
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    };
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const courseAssignments = selectedCourse 
    ? assignments.filter(a => a.course_id === selectedCourse && !a.submission)
    : [];

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         assignment.course_title.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (filterStatus === "pending") return !assignment.submission && matchesSearch;
    if (filterStatus === "submitted") return assignment.submission && assignment.submission.grade === null && matchesSearch;
    if (filterStatus === "graded") return assignment.submission && assignment.submission.grade !== null && matchesSearch;
    return matchesSearch;
  });

  const stats = {
    total: assignments.length,
    pending: assignments.filter(a => !a.submission).length,
    submitted: assignments.filter(a => a.submission && a.submission.grade === null).length,
    graded: assignments.filter(a => a.submission && a.submission.grade !== null).length,
    avgGrade: assignments.filter(a => a.submission?.grade !== null)
      .reduce((acc, a) => acc + (a.submission?.grade || 0), 0) / 
      (assignments.filter(a => a.submission?.grade !== null).length || 1)
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <StudentSidebar />

        <div className="flex-1 flex flex-col overflow-hidden p-4">
          {/* Header */}
          <header className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100 mb-6 overflow-hidden">
            <div className="bg-gradient-to-r from-[#006d2c] to-[#00a844] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-white" />
                  <div className="text-white">
                    <h1 className="text-3xl font-bold mb-1">{t('assignments.myAssignments')}</h1>
                    <p className="text-white/90 text-sm">
                      {t('assignments.viewSubmitAssignments')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <LanguageSelector />
                  <Button
                    onClick={() => setShowUploadDialog(true)}
                    className="bg-white text-[#006d2c] hover:bg-gray-100 font-semibold shadow-lg"
                    size="lg"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    {t('studentAssignments.uploadAssignment')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-white">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-xs text-gray-600 mt-1">{t('studentAssignments.total')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
                <div className="text-xs text-gray-600 mt-1">{t('studentAssignments.pending')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.submitted}</div>
                <div className="text-xs text-gray-600 mt-1">{t('studentAssignments.submitted')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{stats.graded}</div>
                <div className="text-xs text-gray-600 mt-1">{t('studentAssignments.graded')}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{stats.avgGrade.toFixed(0)}%</div>
                <div className="text-xs text-gray-600 mt-1">{t('studentAssignments.avgGrade')}</div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-2">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder={t('studentAssignments.searchAssignments')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-gray-200 rounded-xl"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-48 bg-white border-gray-200 rounded-xl">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('studentAssignments.allStatus')}</SelectItem>
                    <SelectItem value="pending">{t('studentAssignments.pending')}</SelectItem>
                    <SelectItem value="submitted">{t('studentAssignments.submitted')}</SelectItem>
                    <SelectItem value="graded">{t('studentAssignments.graded')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Assignments Grid */}
              {filteredAssignments.length === 0 ? (
                <Card className="border-2 border-dashed border-gray-300 rounded-2xl">
                  <CardContent className="py-16 text-center">
                    <FileText className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">{t('studentAssignments.noAssignmentsFound')}</h3>
                    <p className="text-gray-600 mb-6">
                      {enrolledCourses.length === 0 
                        ? t('studentAssignments.enrollInCourses')
                        : t('studentAssignments.noAssignmentsMatch')}
                    </p>
                    {enrolledCourses.length === 0 && (
                      <Button
                        onClick={() => navigate("/courses")}
                        className="bg-[#006d2c] hover:bg-[#005523]"
                      >
                        {t('slider.browseCourses')}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredAssignments.map((assignment) => {
                    const status = getStatusInfo(assignment);
                    const StatusIcon = status.icon;
                    
                    return (
                      <Card 
                        key={assignment.id} 
                        className={`group hover:shadow-2xl transition-all duration-300 border-2 ${status.borderColor} rounded-2xl overflow-hidden`}
                      >
                        <div className={`h-2 ${status.color}`} />
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="text-xs">
                                  {assignment.type === 'capstone' ? t('studentAssignments.capstone') : t('studentAssignments.assignment')}
                                </Badge>
                                <Badge className={`${status.color} text-white`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {status.label}
                                </Badge>
                              </div>
                              <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-[#006d2c] transition-colors">
                                {assignment.title}
                              </h3>
                              <p className="text-sm text-gray-600 mb-3">{assignment.course_title}</p>
                            </div>
                          </div>

                          <p className="text-sm text-gray-700 mb-4 line-clamp-2">
                            {assignment.description}
                          </p>

                          {assignment.due_date && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                              <Calendar className="h-4 w-4" />
                              <span>{t('studentAssignments.due')}: {new Date(assignment.due_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}</span>
                            </div>
                          )}

                          {assignment.submission ? (
                            <div className={`${status.bgColor} rounded-xl p-4 space-y-3`}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">{t('studentAssignments.submitted')}</span>
                                <span className="text-xs text-gray-600">
                                  {new Date(assignment.submission.submitted_at).toLocaleDateString()}
                                </span>
                              </div>
                              
                              {assignment.submission.grade !== null && (
                                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <Award className="h-5 w-5 text-green-600" />
                                    <span className="font-semibold text-gray-900">{t('studentAssignments.grade')}</span>
                                  </div>
                                  <span className="text-3xl font-bold text-green-600">
                                    {assignment.submission.grade}
                                    <span className="text-lg text-gray-600">/100</span>
                                  </span>
                                </div>
                              )}
                              
                              {assignment.submission.feedback && (
                                <div className="pt-3 border-t border-gray-200">
                                  <div className="flex items-start gap-2.5">
                                    <div className="p-1.5 rounded-full bg-green-100 flex-shrink-0 mt-0.5">
                                      <MessageSquare className="h-3.5 w-3.5 text-green-700" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-green-800 mb-1">Teacher's Feedback</p>
                                      <div className="p-2.5 bg-white/80 rounded-lg border border-green-100">
                                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{assignment.submission.feedback}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <Button
                              onClick={() => navigate(`/course/${assignment.course_id}`)}
                              variant="outline"
                              className="w-full border-2 hover:border-[#006d2c] hover:text-[#006d2c]"
                            >
                              {t('studentAssignments.viewDetails')}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">{t('studentAssignments.uploadAssignment')}</DialogTitle>
            <DialogDescription>
              {t('studentAssignments.selectCourseAssignment')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label>{t('studentAssignments.course')}</Label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder={t('studentAssignments.selectCourse')} />
                </SelectTrigger>
                <SelectContent>
                  {enrolledCourses.map((enrollment: any) => (
                    <SelectItem key={enrollment.course_id} value={enrollment.course_id}>
                      {enrollment.courses.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCourse && (
              <div className="space-y-2">
                <Label>{t('studentAssignments.assignment')}</Label>
                <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('studentAssignments.selectAssignment')} />
                  </SelectTrigger>
                  <SelectContent>
                    {courseAssignments.map((assignment) => (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        {assignment.title} ({assignment.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedAssignment && (
              <>
                <div className="space-y-2">
                  <Label>{t('studentAssignments.uploadFile')}</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-[#006d2c] transition-colors">
                    <Input
                      type="file"
                      onChange={handleFileSelection}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm font-medium text-gray-700">
                        {uploadFile ? uploadFile.name : t('studentAssignments.clickToUpload')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{t('studentAssignments.fileTypes')}</p>
                    </label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('studentAssignments.remarksOptional')}</Label>
                  <Textarea
                    placeholder={t('studentAssignments.remarksPlaceholder')}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleUpload}
                  disabled={uploading || !uploadFile}
                  className="w-full bg-[#006d2c] hover:bg-[#005523] h-12 text-lg"
                >
                  {uploading ? t('studentAssignments.uploading') : t('studentAssignments.submitAssignment')}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default StudentAssignments;
