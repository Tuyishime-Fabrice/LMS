import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shell/page";
import { AppShell } from "@/components/shell/AppShell";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, CheckCircle2, Clock, Users, Eye, AlertCircle, Download, ExternalLink, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Send } from "lucide-react";
import { isViewableSubmissionFile } from "@/lib/submissionFiles";

interface Course {
  id: string;
  title: string;
}

interface CapstoneProject {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_date: string | null;
  courses: {
    title: string;
  };
}

interface Submission {
  id: string;
  student_id: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  project_links: string[];
  description: string;
  file_url?: string | null;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

interface EnrolledStudent {
  student_id: string;
  profiles: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
}

const TeacherAssignments = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [capstoneProject, setCapstoneProject] = useState<CapstoneProject | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [editGrades, setEditGrades] = useState<Record<string, string>>({});
  const [editFeedback, setEditFeedback] = useState<Record<string, string>>({});
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    fetchTeacherCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchCapstoneProject();
      fetchEnrolledStudents();
    }
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedCourseId) {
      fetchSubmissions();
    }
  }, [selectedCourseId, capstoneProject]);

  const fetchTeacherCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCourses(data || []);
      if (data && data.length > 0) {
        setSelectedCourseId(data[0].id);
      }
    } catch (error: any) {
      toast.error(t('teacher.assignments.failedToLoad'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCapstoneProject = async () => {
    try {
      const { data, error } = await supabase
        .from("capstone_projects")
        .select(`
          *,
          courses (
            title
          )
        `)
        .eq("course_id", selectedCourseId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      setCapstoneProject(data || null);
    } catch (error: any) {
      console.error("Error fetching capstone project:", error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      // Fetch submissions for BOTH regular assignments AND capstone projects
      
      // 1. Get regular assignment lesson IDs from course_lessons
      const { data: courseLessons } = await supabase
        .from("course_lessons")
        .select(`
          id,
          course_chapters!inner (
            course_id
          )
        `)
        .eq("content_type", "assignment")
        .eq("course_chapters.course_id", selectedCourseId);

      const lessonIds = courseLessons?.map(l => l.id) || [];

      // 2. Get capstone project IDs
      const { data: capstoneProjects } = await supabase
        .from("capstone_projects")
        .select("id")
        .eq("course_id", selectedCourseId);

      const capstoneIds = capstoneProjects?.map(c => c.id) || [];

      // 3. Fetch assignment submissions (from assignment_submissions table)
      let assignmentSubmissions: any[] = [];
      if (lessonIds.length > 0) {
        const { data: assignmentData, error: assignmentError } = await supabase
          .from("assignment_submissions")
          .select(`
            *,
            profiles:student_id (
              full_name,
              email,
              avatar_url
            )
          `)
          .in("lesson_id", lessonIds)
          .order("submitted_at", { ascending: false });
        
        if (assignmentError) {
          console.error("Error fetching assignment submissions:", assignmentError);
        }
        assignmentSubmissions = assignmentData || [];
      }

      // 4. Fetch capstone submissions (from capstone_submissions table)
      let capstoneSubmissions: any[] = [];
      if (capstoneIds.length > 0) {
        const { data: capstoneData, error: capstoneError } = await supabase
          .from("capstone_submissions")
          .select(`
            *,
            profiles:student_id (
              full_name,
              email,
              avatar_url
            )
          `)
          .in("capstone_project_id", capstoneIds)
          .order("submitted_at", { ascending: false });
        
        if (capstoneError) {
          console.error("Error fetching capstone submissions:", capstoneError);
        }
        capstoneSubmissions = capstoneData || [];
      }

      // 5. Combine both types of submissions
      const allSubmissions = [...assignmentSubmissions, ...capstoneSubmissions].sort((a, b) => {
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      });

      console.log("Assignment submissions found:", assignmentSubmissions.length);
      console.log("Capstone submissions found:", capstoneSubmissions.length);
      console.log("Total submissions:", allSubmissions.length);
      
      setSubmissions(allSubmissions);
    } catch (error: any) {
      toast.error(t('teacher.assignments.failedToLoadSubmissions'));
      console.error(error);
    }
  };

  const fetchEnrolledStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("course_enrollments")
        .select(`
          student_id,
          profiles (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq("course_id", selectedCourseId);

      if (error) throw error;

      setEnrolledStudents(data || []);
    } catch (error: any) {
      toast.error(t('teacher.assignments.failedToLoadStudents'));
      console.error(error);
    }
  };

  const getStudentsWhoHaventSubmitted = () => {
    const submittedStudentIds = submissions.map(s => s.student_id);
    return enrolledStudents.filter(
      student => !submittedStudentIds.includes(student.student_id)
    );
  };

  const handleViewSubmission = (submissionId: string) => {
    const s = submissions.find((x) => x.id === submissionId);
    if (!s) return;
    setViewingSubmission(s);
    setShowViewDialog(true);
  };

  const handleOpenLink = (link: string) => {
    if (link.startsWith('http')) {
      window.open(link, "_blank");
    } else if (isViewableSubmissionFile(link)) {
      openInGoogleViewer(link);
    } else {
      handleDownloadFile(link);
    }
  };

  const resolveSubmissionFileUrl = async (fileUrl: string, download = false) => {
    if (/^https?:\/\//i.test(fileUrl)) {
      return fileUrl;
    }

    const cleaned = fileUrl.replace(/^\/+/, "").replace(/^lesson-files\//, "");
    const { data, error } = await supabase.storage
      .from("lesson-files")
      .createSignedUrl(cleaned, 3600, download ? { download: true } : undefined);

    if (error) throw error;
    return data?.signedUrl || fileUrl;
  };

  const handleDownloadFile = async (fileUrl: string) => {
    try {
      const url = await resolveSubmissionFileUrl(fileUrl, true);
      window.open(url, "_blank");
    } catch (e) {
      console.error("Failed to download file", e);
      toast.error(t("teacherAssignments.failedToDownloadFile", "Failed to download file"));
    }
  };

  const openInGoogleViewer = async (link: string) => {
    try {
      const url = await resolveSubmissionFileUrl(link);
      const viewer = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
      window.open(viewer, "_blank");
    } catch (e) {
      console.error("Failed to open viewer", e);
      toast.error(t("teacherAssignments.failedToOpenDocument", "Failed to open document"));
    }
  };

  const handleInlineGradeChange = (submissionId: string, value: string) => {
    setEditGrades((prev) => ({ ...prev, [submissionId]: value }));
  };

  const handleFeedbackChange = (submissionId: string, value: string) => {
    setEditFeedback((prev) => ({ ...prev, [submissionId]: value }));
  };

  const handleSaveInlineGrade = async (submissionId: string) => {
    const raw = editGrades[submissionId];
    const feedbackText = editFeedback[submissionId];
    const grade = raw ? parseInt(raw, 10) : undefined;
    
    if (grade !== undefined && (isNaN(grade) || grade < 0 || grade > 100)) {
      toast.error(t('teacher.assignments.enterValidGrade'));
      return;
    }

    if (grade === undefined && !feedbackText?.trim()) {
      toast.error(t("teacherAssignments.pleaseEnterAGradeOrFeedback", "Please enter a grade or feedback"));
      return;
    }

    try {
      // Find the submission to determine which table to update
      const submission = submissions.find(s => s.id === submissionId);
      if (!submission) {
        toast.error(t("teacherAssignments.submissionNotFound", "Submission not found"));
        return;
      }

      // Determine table based on which ID field exists
      const isAssignment = 'lesson_id' in submission;
      const tableName = isAssignment ? "assignment_submissions" : "capstone_submissions";

      console.log(`Updating grade/feedback in ${tableName} for submission ${submissionId}`);

      const updatePayload: any = { graded_at: new Date().toISOString() };
      if (grade !== undefined) updatePayload.grade = grade;
      if (feedbackText?.trim()) updatePayload.feedback = feedbackText.trim();

      const { error } = await supabase
        .from(tableName)
        .update(updatePayload)
        .eq("id", submissionId);
      
      if (error) throw error;
      
      setSubmissions((prev) => prev.map((s) => {
        if (s.id !== submissionId) return s;
        return {
          ...s,
          ...(grade !== undefined ? { grade } : {}),
          ...(feedbackText?.trim() ? { feedback: feedbackText.trim() } : {}),
        };
      }));
      toast.success(t("teacherAssignments.gradeFeedbackSaved", "Grade & feedback saved!"));
    } catch (e) {
      console.error(e);
      toast.error(t('teacher.grades.failedToSave'));
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const studentsWhoHaventSubmitted = getStudentsWhoHaventSubmitted();
  const submittedCount = submissions.length;
  const notSubmittedCount = studentsWhoHaventSubmitted.length;
  const totalStudents = enrolledStudents.length;

  return (
    <AppShell role="teacher" width="wide">
      <PageHeader
        title={t('assignments.assignments')}
        description={t('teacher.assignments.trackSubmissions')}
      />

            <div className="space-y-6">
              {/* Course Selector */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('teacher.assignments.selectCourse')}</CardTitle>
                  <CardDescription>
                    {t('teacher.assignments.chooseToView')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {courses.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground/60 mx-auto mb-3" />
                      <p className="text-muted-foreground">{t('teacher.assignments.noCoursesFound')}</p>
                      <Button
                        onClick={() => navigate("/create-course")}
                        className="mt-4 bg-primary hover:bg-primary-hover"
                      >
                        {t('teacher.assignments.createFirstCourse')}
                      </Button>
                    </div>
                  ) : (
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('teacher.assignments.selectCourse')} />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>

              {selectedCourseId && (
                <>
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-info/30">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t('teacher.assignments.totalStudents')}</CardTitle>
                        <Users className="h-4 w-4 text-info" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalStudents}</div>
                      </CardContent>
                    </Card>

                    <Card className="border-primary/30">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t('teacher.assignments.submitted')}</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{submittedCount}</div>
                        <p className="text-xs text-muted-foreground">
                          {totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0}% {t('teacher.assignments.completion')}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-warning/30">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t('teacher.assignments.notSubmitted')}</CardTitle>
                        <Clock className="h-4 w-4 text-warning" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{notSubmittedCount}</div>
                      </CardContent>
                    </Card>

                    <Card className="border-border">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t('teacher.assignments.graded')}</CardTitle>
                        <FileText className="h-4 w-4 text-forest" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {submissions.filter(s => s.grade !== null).length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Assignment Details */}
                  {capstoneProject ? (
                    <Card>
                      <CardHeader>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <CardTitle className="text-xl">{capstoneProject.title}</CardTitle>
                            <CardDescription className="mt-2">
                              {capstoneProject.description}
                            </CardDescription>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {capstoneProject.due_date && (
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {t("teacherAssignments.due", "Due:")}{" "}{new Date(capstoneProject.due_date).toLocaleDateString()}
                              </Badge>
                            )}
                            <Button
                              onClick={() => navigate(`/create-course?edit=${selectedCourseId}`)}
                              className="bg-primary hover:bg-primary-hover"
                            >
                              {t('teacher.assignments.editAssignment')}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Tabs defaultValue="submitted" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="submitted">
                              {t('teacher.assignments.submitted')} ({submittedCount})
                            </TabsTrigger>
                            <TabsTrigger value="not-submitted">
                              {t('teacher.assignments.notSubmitted')} ({notSubmittedCount})
                            </TabsTrigger>
                          </TabsList>

                          {/* Submitted Tab */}
                          <TabsContent value="submitted" className="space-y-4 mt-4">
                            {submissions.length === 0 ? (
                              <div className="text-center py-12">
                                <FileText className="h-16 w-16 text-muted-foreground/60 mx-auto mb-4" />
                                <p className="text-muted-foreground">{t('teacher.assignments.noSubmissions')}</p>
                              </div>
                            ) : (
                              submissions.map((submission) => (
                                <Card key={submission.id} className="transition-shadow">
                                  <CardContent className="p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="flex items-start gap-4 flex-1">
                                        <Avatar className="h-12 w-12">
                                          {submission.profiles.avatar_url ? (
                                            <img src={submission.profiles.avatar_url} alt={submission.profiles.full_name} />
                                          ) : (
                                            <AvatarFallback className="bg-primary text-white">
                                              {submission.profiles.full_name.charAt(0)}
                                            </AvatarFallback>
                                          )}
                                        </Avatar>
                                        <div className="flex-1">
                                          <h4 className="font-semibold">{submission.profiles.full_name}</h4>
                                          <p className="text-sm text-muted-foreground">{submission.profiles.email}</p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <p className="text-xs text-muted-foreground">
                                              {t("teacherAssignments.submitted", "Submitted: {{toLocaleString}}", { toLocaleString: new Date(submission.submitted_at).toLocaleString() })}
                                            </p>
                                            {'capstone_project_id' in submission && (
                                              <Badge variant="secondary" className="text-xs bg-leaf text-forest">
                                                {t("teacherAssignments.capstone", "Capstone")}
                                              </Badge>
                                            )}
                                            {'lesson_id' in submission && (
                                              <Badge variant="secondary" className="text-xs bg-info-surface text-info">
                                                {t("teacherAssignments.assignment", "Assignment")}
                                              </Badge>
                                            )}
                                          </div>
                                          {submission.description && (
                                            <p className="text-sm mt-2 line-clamp-2">{submission.description}</p>
                                          )}
                                          {/* Show project links for capstone submissions */}
                                          {submission.project_links && submission.project_links.length > 0 && (
                                            <div className="mt-3 space-y-1">
                                              <p className="text-xs font-semibold text-muted-foreground">{t("teacherAssignments.projectLinks", "Project Links:")}</p>
                                              {submission.project_links.map((link: string, idx: number) => (
                                                <a
                                                  key={idx}
                                                  href={link.startsWith('http') ? link : '#'}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  onClick={(e) => {
                                                    if (!link.startsWith('http')) {
                                                      e.preventDefault();
                                                      openInGoogleViewer(link);
                                                    }
                                                  }}
                                                  className="text-xs text-info hover:underline block max-w-full truncate sm:max-w-md"
                                                >
                                                  {link}
                                                </a>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-col gap-3 sm:items-end">
                                        <div className="flex items-center gap-2">
                                          {(submission.project_links?.length > 0 || submission.file_url) && (
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => handleViewSubmission(submission.id)}
                                              className="hover:bg-info-surface"
                                            >
                                              <Eye className="h-4 w-4 mr-1" />
                                              {t("teacherAssignments.view", "View")}
                                            </Button>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="text-right">
                                            <label className="text-xs text-muted-foreground block mb-1">{t("teacherAssignments.marks0100", "Marks (0-100)")}</label>
                                            <Input
                                              type="number"
                                              min={0}
                                              max={100}
                                              className="w-24 text-center"
                                              value={editGrades[submission.id] ?? (submission.grade?.toString() || "")}
                                              onChange={(e) => handleInlineGradeChange(submission.id, e.target.value)}
                                              placeholder="0"
                                            />
                                          </div>
                                          <Button 
                                            size="sm" 
                                            onClick={() => handleSaveInlineGrade(submission.id)}
                                            className="bg-primary hover:bg-primary-hover mt-5"
                                          >
                                            <Send className="h-3.5 w-3.5 mr-1" />
                                            {t("teacherAssignments.save", "Save")}
                                          </Button>
                                        </div>
                                        {submission.grade !== null ? (
                                          <Badge className="bg-primary">{t("teacherAssignments.graded100", "Graded: {{grade}}/100", { grade: submission.grade })}</Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-warning border-warning/30">{t("teacherAssignments.notGraded", "Not Graded")}</Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Teacher Feedback / Comment Section */}
                                    <div className="mt-4 pt-4 border-t border-border">
                                      <div className="flex items-start gap-3">
                                        <MessageSquare className="h-4 w-4 text-muted-foreground/60 mt-2 flex-shrink-0" />
                                        <div className="flex-1">
                                          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">{t("teacherAssignments.feedbackCommentForStudent", "Feedback / Comment for Student")}</label>
                                          <Textarea
                                            placeholder={t("teacherAssignments.writeYourFeedbackHereEG", "Write your feedback here... (e.g. Great work on the UI! Consider improving error handling.)")}
                                            value={editFeedback[submission.id] ?? (submission.feedback || "")}
                                            onChange={(e) => handleFeedbackChange(submission.id, e.target.value)}
                                            rows={2}
                                            className="text-sm resize-none"
                                          />
                                        </div>
                                      </div>
                                      {submission.feedback && !editFeedback[submission.id] && (
                                        <div className="mt-2 ml-7 p-2.5 bg-leaf rounded-lg border border-primary/30">
                                          <p className="text-xs font-semibold text-leaf-foreground mb-0.5">{t("teacherAssignments.yourPreviousFeedback", "Your previous feedback:")}</p>
                                          <p className="text-sm text-primary">{submission.feedback}</p>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </TabsContent>

                          {/* Not Submitted Tab */}
                          <TabsContent value="not-submitted" className="space-y-4 mt-4">
                            {studentsWhoHaventSubmitted.length === 0 ? (
                              <div className="text-center py-12">
                                <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
                                <p className="text-muted-foreground font-semibold">{t("teacherAssignments.allStudentsHaveSubmitted", "All students have submitted!")}</p>
                              </div>
                            ) : (
                              studentsWhoHaventSubmitted.map((student) => (
                                <Card key={student.student_id} className="border-warning/30">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12">
                                          {student.profiles.avatar_url ? (
                                            <img src={student.profiles.avatar_url} alt={student.profiles.full_name} />
                                          ) : (
                                            <AvatarFallback className="bg-muted-foreground text-white">
                                              {student.profiles.full_name.charAt(0)}
                                            </AvatarFallback>
                                          )}
                                        </Avatar>
                                        <div>
                                          <h4 className="font-semibold">{student.profiles.full_name}</h4>
                                          <p className="text-sm text-muted-foreground">{student.profiles.email}</p>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="text-warning border-warning/30 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {t("teacherAssignments.pending", "Pending")}
                                      </Badge>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-xl">{t("teacherAssignments.courseAssignments", "Course Assignments")}</CardTitle>
                            <CardDescription className="mt-2">
                              {t("teacherAssignments.viewAndGradeStudentAssignmentSubmissions", "View and grade student assignment submissions")}
                            </CardDescription>
                          </div>
                          <Button
                            onClick={() => navigate(`/create-course?edit=${selectedCourseId}`)}
                            className="bg-primary hover:bg-primary-hover"
                          >
                            {t("teacherAssignments.manageCourse", "Manage Course")}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Tabs defaultValue="submitted" className="w-full">
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="submitted">
                              {t("teacherAssignments.submitted2", "Submitted ({{count}})", { count: submittedCount })}
                            </TabsTrigger>
                            <TabsTrigger value="not-submitted">
                              {t("teacherAssignments.notSubmitted", "Not Submitted ({{count}})", { count: notSubmittedCount })}
                            </TabsTrigger>
                          </TabsList>

                          {/* Submitted Tab */}
                          <TabsContent value="submitted" className="space-y-4 mt-4">
                            {submissions.length === 0 ? (
                              <div className="text-center py-12">
                                <FileText className="h-16 w-16 text-muted-foreground/60 mx-auto mb-4" />
                                <p className="text-muted-foreground">{t("teacherAssignments.noSubmissionsYet", "No submissions yet")}</p>
                                <p className="text-sm text-muted-foreground mt-2">
                                  {t("teacherAssignments.studentsWillSeeAssignmentsOnceYou", "Students will see assignments once you add them to the course structure")}
                                </p>
                              </div>
                            ) : (
                              submissions.map((submission) => (
                                <Card key={submission.id} className="transition-shadow">
                                  <CardContent className="p-4">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="flex items-start gap-4 flex-1">
                                        <Avatar className="h-12 w-12">
                                          {submission.profiles.avatar_url ? (
                                            <img src={submission.profiles.avatar_url} alt={submission.profiles.full_name} />
                                          ) : (
                                            <AvatarFallback className="bg-primary text-white">
                                              {submission.profiles.full_name.charAt(0)}
                                            </AvatarFallback>
                                          )}
                                        </Avatar>
                                        <div className="flex-1">
                                          <h4 className="font-semibold">{submission.profiles.full_name}</h4>
                                          <p className="text-sm text-muted-foreground">{submission.profiles.email}</p>
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {t("teacherAssignments.submitted", "Submitted: {{toLocaleString}}", { toLocaleString: new Date(submission.submitted_at).toLocaleString() })}
                                          </p>
                                          {submission.description && (
                                            <div className="mt-2 p-2 bg-muted/50 rounded border">
                                              <p className="text-xs font-semibold text-foreground mb-1">{t("teacherAssignments.studentRemarks", "Student Remarks:")}</p>
                                              <p className="text-sm text-muted-foreground">{submission.description}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex flex-col gap-3 sm:items-end">
                                        <div className="flex items-center gap-2">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleViewSubmission(submission.id)}
                                            className="hover:bg-info-surface"
                                          >
                                            <Eye className="h-4 w-4 mr-1" />
                                            {t("teacherAssignments.view", "View")}
                                          </Button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <div className="text-right">
                                            <label className="text-xs text-muted-foreground block mb-1">{t("teacherAssignments.marks0100", "Marks (0-100)")}</label>
                                            <Input
                                              type="number"
                                              min={0}
                                              max={100}
                                              className="w-24 text-center"
                                              value={editGrades[submission.id] ?? (submission.grade?.toString() || "")}
                                              onChange={(e) => handleInlineGradeChange(submission.id, e.target.value)}
                                              placeholder="0"
                                            />
                                          </div>
                                          <Button 
                                            size="sm" 
                                            onClick={() => handleSaveInlineGrade(submission.id)}
                                            className="bg-primary hover:bg-primary-hover mt-5"
                                          >
                                            <Send className="h-3.5 w-3.5 mr-1" />
                                            {t("teacherAssignments.save", "Save")}
                                          </Button>
                                        </div>
                                        {submission.grade !== null ? (
                                          <Badge className="bg-primary">{t("teacherAssignments.graded100", "Graded: {{grade}}/100", { grade: submission.grade })}</Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-warning border-warning/30">{t("teacherAssignments.notGraded", "Not Graded")}</Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Teacher Feedback / Comment Section */}
                                    <div className="mt-4 pt-4 border-t border-border">
                                      <div className="flex items-start gap-3">
                                        <MessageSquare className="h-4 w-4 text-muted-foreground/60 mt-2 flex-shrink-0" />
                                        <div className="flex-1">
                                          <label className="text-xs font-semibold text-muted-foreground block mb-1.5">{t("teacherAssignments.feedbackCommentForStudent", "Feedback / Comment for Student")}</label>
                                          <Textarea
                                            placeholder={t("teacherAssignments.writeYourFeedbackHereEG", "Write your feedback here... (e.g. Great work on the UI! Consider improving error handling.)")}
                                            value={editFeedback[submission.id] ?? (submission.feedback || "")}
                                            onChange={(e) => handleFeedbackChange(submission.id, e.target.value)}
                                            rows={2}
                                            className="text-sm resize-none"
                                          />
                                        </div>
                                      </div>
                                      {submission.feedback && !editFeedback[submission.id] && (
                                        <div className="mt-2 ml-7 p-2.5 bg-leaf rounded-lg border border-primary/30">
                                          <p className="text-xs font-semibold text-leaf-foreground mb-0.5">{t("teacherAssignments.yourPreviousFeedback", "Your previous feedback:")}</p>
                                          <p className="text-sm text-primary">{submission.feedback}</p>
                                        </div>
                                      )}
                                    </div>
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </TabsContent>

                          {/* Not Submitted Tab */}
                          <TabsContent value="not-submitted" className="space-y-4 mt-4">
                            {studentsWhoHaventSubmitted.length === 0 ? (
                              <div className="text-center py-12">
                                <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
                                <p className="text-muted-foreground font-semibold">{t("teacherAssignments.allStudentsHaveSubmitted", "All students have submitted!")}</p>
                              </div>
                            ) : (
                              studentsWhoHaventSubmitted.map((student) => (
                                <Card key={student.student_id} className="border-warning/30">
                                  <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12">
                                          {student.profiles.avatar_url ? (
                                            <img src={student.profiles.avatar_url} alt={student.profiles.full_name} />
                                          ) : (
                                            <AvatarFallback className="bg-muted-foreground text-white">
                                              {student.profiles.full_name.charAt(0)}
                                            </AvatarFallback>
                                          )}
                                        </Avatar>
                                        <div>
                                          <h4 className="font-semibold">{student.profiles.full_name}</h4>
                                          <p className="text-sm text-muted-foreground">{student.profiles.email}</p>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="text-warning border-warning/30 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        {t("teacherAssignments.pending", "Pending")}
                                      </Badge>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
      {/* View Submission Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("teacherAssignments.submissionDetails", "Submission Details")}</DialogTitle>
            <DialogDescription>
              {t("teacherAssignments.submissionOf", "{{name}}'s submission", { name: viewingSubmission?.profiles.full_name })}
              {' • '}
              {'capstone_project_id' in (viewingSubmission || {}) ? t("teacherAssignments.capstoneProject", "Capstone Project") : t("teacherAssignments.assignment", "Assignment")}
            </DialogDescription>
          </DialogHeader>
          {viewingSubmission && (
            <div className="space-y-6 py-4">
              {/* Student Info */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  {viewingSubmission.profiles.avatar_url ? (
                    <img src={viewingSubmission.profiles.avatar_url} alt={viewingSubmission.profiles.full_name} />
                  ) : (
                    <AvatarFallback className="bg-primary text-white">
                      {viewingSubmission.profiles.full_name.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-semibold">{viewingSubmission.profiles.full_name}</p>
                  <p className="text-sm text-muted-foreground">{viewingSubmission.profiles.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("teacherAssignments.submitted", "Submitted: {{toLocaleString}}", { toLocaleString: new Date(viewingSubmission.submitted_at).toLocaleString() })}
                  </p>
                </div>
                {viewingSubmission.grade !== null ? (
                  <Badge className="ml-auto bg-primary">{t("teacherAssignments.grade100", "Grade: {{grade}}/100", { grade: viewingSubmission.grade })}</Badge>
                ) : (
                  <Badge variant="outline" className="ml-auto text-warning border-warning/30">{t("teacherAssignments.notGraded", "Not Graded")}</Badge>
                )}
              </div>

              {/* Project Links and Uploaded Files */}
              {viewingSubmission.project_links && viewingSubmission.project_links.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    {t("teacherAssignments.projectLinksFiles", "Project Links & Files")}
                  </h4>
                  <div className="space-y-2">
                    {viewingSubmission.project_links.map((link: string, idx: number) => {
                      const isUploadedFile = !/^https?:\/\//i.test(link);
                      const canPreview = isViewableSubmissionFile(link);
                      const displayName = isUploadedFile ? link.split("/").pop() || link : link;

                      return (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-info-surface rounded border border-info/30">
                          <span className="text-xs font-medium text-muted-foreground w-14">
                            {isUploadedFile ? `File ${idx + 1}:` : `Link ${idx + 1}:`}
                          </span>
                          {isUploadedFile ? (
                            <span className="text-sm text-foreground truncate flex-1">
                              {displayName}
                            </span>
                          ) : (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-info hover:underline truncate flex-1"
                            >
                              {link}
                            </a>
                          )}
                          {isUploadedFile && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => handleDownloadFile(link)}
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {(!isUploadedFile || canPreview) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => handleOpenLink(link)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Uploaded Document */}
              {viewingSubmission.file_url && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    {t("teacherAssignments.uploadedDocument", "Uploaded Document")}
                  </h4>
                  <div className="flex items-center gap-3 p-3 bg-leaf rounded-lg border border-border">
                    <FileText className="h-8 w-8 text-forest shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-forest truncate">
                        {viewingSubmission.file_url.split('/').pop() || t("teacherAssignments.attachedDocument", "Attached document")}
                      </p>
                      <p className="text-xs text-muted-foreground">{t("teacherAssignments.studentUploadedFile", "Student uploaded file")}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadFile(viewingSubmission.file_url!)}
                        className="hover:bg-leaf"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        {t("teacherAssignments.download", "Download")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openInGoogleViewer(viewingSubmission.file_url!)}
                        className="hover:bg-info-surface"
                        disabled={!isViewableSubmissionFile(viewingSubmission.file_url)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {t("teacherAssignments.preview", "Preview")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Student Description */}
              {viewingSubmission.description && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">{t("teacherAssignments.studentDescription", "Student Description")}</h4>
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{viewingSubmission.description}</p>
                  </div>
                </div>
              )}

              {/* Feedback */}
              {viewingSubmission.feedback && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">{t("teacherAssignments.yourFeedback", "Your Feedback")}</h4>
                  <div className="p-3 bg-leaf rounded-lg border border-primary/30">
                    <p className="text-sm text-foreground whitespace-pre-wrap">{viewingSubmission.feedback}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default TeacherAssignments;
