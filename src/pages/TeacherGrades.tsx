import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { TeacherHeader } from "@/components/TeacherHeader";
import { GradesTable } from "@/components/GradesTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  GraduationCap, 
  FileText, 
  TrendingUp,
  Edit,
  Save,
  X,
  Download
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import LoadingSpinner from "@/components/LoadingSpinner";

interface Course {
  id: string;
  title: string;
}

interface StudentGrade {
  student_id: string;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  avatar_url: string | null;
  quiz_average: number | null;
  quiz_count: number;
  assignment_grade: number | null;
  assignment_feedback: string | null;
  capstone_grade: number | null;
  submission_id: string | null;
  overall_grade: number | null;
}

interface QuizAttempt {
  id: string;
  lesson_id: string;
  score: number;
  total_points: number;
  passed: boolean;
  submitted_at: string;
  lesson_title: string;
}

const TeacherGrades = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [studentGrades, setStudentGrades] = useState<StudentGrade[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentGrade | null>(null);
  const [quizAttempts, setQuizAttempts] = useState<QuizAttempt[]>([]);
  const [showGradeDialog, setShowGradeDialog] = useState(false);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showQuizDialog, setShowQuizDialog] = useState(false);
  const [gradeForm, setGradeForm] = useState({
    grade: "",
    feedback: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const getTeacherId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setTeacherId(user.id);
    };
    getTeacherId();
    fetchTeacherCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchStudentGrades();
    }
  }, [selectedCourseId]);

  const fetchTeacherCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Check role — admins see all courses, teachers see only their own
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const isAdmin = profile?.role === "admin";
      setUserRole(profile?.role || null);

      let query = supabase
        .from("courses")
        .select("id, title")
        .order("created_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("teacher_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      setCourses(data || []);
      if (data && data.length > 0) {
        setSelectedCourseId(data[0].id);
      }
    } catch (error: any) {
      toast.error(t('teacher.grades.failedToLoad'));
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentGrades = async () => {
    try {
      // Get enrolled students
      const { data: enrollments, error: enrollError } = await supabase
        .from("course_enrollments")
        .select(`
          student_id,
          profiles (
            full_name,
            email,
            phone,
            avatar_url
          )
        `)
        .eq("course_id", selectedCourseId);

      if (enrollError) throw enrollError;

      // Get ALL capstone projects for this course
      const { data: capstones } = await supabase
        .from("capstone_projects")
        .select("id, title")
        .eq("course_id", selectedCourseId);

      const capstoneProjects = capstones || [];

      // Get all lessons for this course
      const { data: chapters } = await supabase
        .from("course_chapters")
        .select("id")
        .eq("course_id", selectedCourseId);

      const chapterIds = chapters?.map(ch => ch.id) || [];

      const { data: lessons } = await supabase
        .from("course_lessons")
        .select("id")
        .in("chapter_id", chapterIds);

      const lessonIds = lessons?.map(l => l.id) || [];

      // Process each student
      const gradesPromises = (enrollments || []).map(async (enrollment: any) => {
        const studentId = enrollment.student_id;

        // Get quiz attempts
        const { data: quizAttempts } = await supabase
          .from("student_quiz_attempts")
          .select("score, total_points")
          .eq("student_id", studentId)
          .in("lesson_id", lessonIds);

        // Calculate quiz average
        let quizAverage = null;
        let quizCount = 0;
        if (quizAttempts && quizAttempts.length > 0) {
          const percentages = quizAttempts.map(
            attempt => (attempt.score / attempt.total_points) * 100
          );
          quizAverage = percentages.reduce((a, b) => a + b, 0) / percentages.length;
          quizCount = quizAttempts.length;
        }

        // Get assignment grades from BOTH regular assignments AND capstone
        let assignmentGrades: number[] = [];
        let assignmentFeedback = null;
        let submissionId = null;

        // 1. Get regular assignment submissions
        const { data: assignmentSubmissions } = await supabase
          .from("assignment_submissions")
          .select("id, grade, feedback, lesson_id")
          .eq("student_id", studentId)
          .in("lesson_id", lessonIds);

        if (assignmentSubmissions && assignmentSubmissions.length > 0) {
          assignmentSubmissions.forEach(sub => {
            if (sub.grade !== null) {
              assignmentGrades.push(sub.grade);
            }
          });
          const latestAssignment = assignmentSubmissions[assignmentSubmissions.length - 1];
          if (latestAssignment.feedback) {
            assignmentFeedback = latestAssignment.feedback;
          }
          submissionId = latestAssignment.id;
        }

        // 2. Get ALL capstone submissions
        let capstoneGrade = null;
        let capstoneGrades: number[] = [];
        for (const cp of capstoneProjects) {
          const { data: capstoneSubmission } = await supabase
            .from("capstone_submissions")
            .select("id, grade, feedback")
            .eq("capstone_project_id", cp.id)
            .eq("student_id", studentId)
            .maybeSingle();

          if (capstoneSubmission) {
            if (capstoneSubmission.grade !== null) {
              capstoneGrades.push(capstoneSubmission.grade);
              assignmentGrades.push(capstoneSubmission.grade);
            }
            if (capstoneSubmission.feedback) {
              assignmentFeedback = capstoneSubmission.feedback;
            }
            submissionId = capstoneSubmission.id;
          }
        }
        if (capstoneGrades.length > 0) {
          capstoneGrade = capstoneGrades.reduce((a, b) => a + b, 0) / capstoneGrades.length;
        }

        // Calculate average assignment grade
        let assignmentGrade = null;
        if (assignmentGrades.length > 0) {
          assignmentGrade = assignmentGrades.reduce((a, b) => a + b, 0) / assignmentGrades.length;
        }

        // Calculate overall grade (50% quiz, 50% assignment)
        let overallGrade = null;
        if (quizAverage !== null && assignmentGrade !== null) {
          overallGrade = (quizAverage * 0.5) + (assignmentGrade * 0.5);
        } else if (quizAverage !== null) {
          overallGrade = quizAverage;
        } else if (assignmentGrade !== null) {
          overallGrade = assignmentGrade;
        }

        return {
          student_id: studentId,
          student_name: enrollment.profiles.full_name,
          student_email: enrollment.profiles.email,
          student_phone: enrollment.profiles.phone || null,
          avatar_url: enrollment.profiles.avatar_url,
          quiz_average: quizAverage,
          quiz_count: quizCount,
          assignment_grade: assignmentGrade,
          assignment_feedback: assignmentFeedback,
          capstone_grade: capstoneGrade,
          submission_id: submissionId,
          overall_grade: overallGrade
        };
      });

      const grades = await Promise.all(gradesPromises);
      setStudentGrades(grades);
    } catch (error: any) {
      toast.error(t('teacher.grades.failedToLoad'));
      console.error(error);
    }
  };

  const fetchQuizAttempts = async (studentId: string) => {
    try {
      // Get all lessons for this course
      const { data: chapters } = await supabase
        .from("course_chapters")
        .select("id")
        .eq("course_id", selectedCourseId);

      const chapterIds = chapters?.map(ch => ch.id) || [];

      const { data: lessons } = await supabase
        .from("course_lessons")
        .select("id, title")
        .in("chapter_id", chapterIds)
        .eq("content_type", "quiz");

      const lessonIds = lessons?.map(l => l.id) || [];

      const { data: attempts, error } = await supabase
        .from("student_quiz_attempts")
        .select("*")
        .eq("student_id", studentId)
        .in("lesson_id", lessonIds)
        .order("submitted_at", { ascending: false });

      if (error) throw error;

      // Map lesson titles
      const attemptsWithTitles = (attempts || []).map(attempt => {
        const lesson = lessons?.find(l => l.id === attempt.lesson_id);
        return {
          ...attempt,
          lesson_title: lesson?.title || "Unknown Quiz"
        };
      });

      setQuizAttempts(attemptsWithTitles);
    } catch (error: any) {
      toast.error(t('teacher.grades.failedToLoad'));
      console.error(error);
    }
  };

  const handleGradeAssignment = (student: StudentGrade) => {
    if (!student.submission_id) {
      toast.error("No submission found for this student");
      return;
    }

    setSelectedStudent(student);
    setGradeForm({
      grade: student.assignment_grade?.toString() || "",
      feedback: student.assignment_feedback || ""
    });
    setShowGradeDialog(true);
  };

  const handleViewQuizzes = (student: StudentGrade) => {
    setSelectedStudent(student);
    fetchQuizAttempts(student.student_id);
    setShowQuizDialog(true);
  };

  const handleSaveGrade = async () => {
    if (!selectedStudent?.submission_id) return;

    const grade = parseInt(gradeForm.grade);
    if (isNaN(grade) || grade < 0 || grade > 100) {
      toast.error(t('teacher.grades.enterValidGrade'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("capstone_submissions")
        .update({
          grade: grade,
          feedback: gradeForm.feedback,
          graded_at: new Date().toISOString(),
          graded_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq("id", selectedStudent.submission_id);

      if (error) throw error;

      toast.success(t('teacher.grades.gradeSaved'));
      setShowGradeDialog(false);
      fetchStudentGrades();
    } catch (error: any) {
      toast.error(t('teacher.grades.failedToSave'));
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return "text-gray-400";
    if (grade >= 90) return "text-green-600";
    if (grade >= 80) return "text-blue-600";
    if (grade >= 70) return "text-yellow-600";
    if (grade >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getGradeLetter = (grade: number | null) => {
    if (grade === null) return "N/A";
    if (grade >= 90) return "A";
    if (grade >= 80) return "B";
    if (grade >= 70) return "C";
    if (grade >= 60) return "D";
    return "F";
  };

  const exportToExcel = async () => {
    if (studentGrades.length === 0) {
      toast.error("No data to export");
      return;
    }

    toast.info("Preparing export with quiz details...");

    const courseName = courses.find(c => c.id === selectedCourseId)?.title || "Course";
    
    // Get all lessons for this course to fetch quiz attempts
    const { data: chapters } = await supabase
      .from("course_chapters")
      .select("id")
      .eq("course_id", selectedCourseId);

    const chapterIds = chapters?.map(ch => ch.id) || [];

    const { data: lessons } = await supabase
      .from("course_lessons")
      .select("id, title")
      .in("chapter_id", chapterIds)
      .eq("content_type", "quiz");

    const lessonIds = lessons?.map(l => l.id) || [];

    // Fetch all quiz attempts for all students
    const allQuizAttempts: any[] = [];
    for (const student of studentGrades) {
      const { data: attempts } = await supabase
        .from("student_quiz_attempts")
        .select("*")
        .eq("student_id", student.student_id)
        .in("lesson_id", lessonIds)
        .order("submitted_at", { ascending: true });

      if (attempts) {
        // Group attempts by lesson to identify retakes
        const attemptsByLesson: Record<string, any[]> = {};
        attempts.forEach(attempt => {
          if (!attemptsByLesson[attempt.lesson_id]) {
            attemptsByLesson[attempt.lesson_id] = [];
          }
          attemptsByLesson[attempt.lesson_id].push(attempt);
        });

        // Add attempt number for each quiz
        Object.entries(attemptsByLesson).forEach(([lessonId, lessonAttempts]) => {
          lessonAttempts.forEach((attempt, index) => {
            const lesson = lessons?.find(l => l.id === lessonId);
            allQuizAttempts.push({
              student_name: student.student_name,
              student_email: student.student_email,
              quiz_title: lesson?.title || "Unknown Quiz",
              attempt_number: index + 1,
              total_attempts: lessonAttempts.length,
              score: attempt.score,
              total_points: attempt.total_points,
              percentage: ((attempt.score / attempt.total_points) * 100).toFixed(1),
              passed: attempt.passed ? "Yes" : "No",
              is_retake: index > 0 ? "Yes" : "No",
              submitted_at: new Date(attempt.submitted_at).toLocaleString(),
            });
          });
        });
      }
    }

    // Prepare summary data for Excel (Sheet 1)
    const summaryData = studentGrades.map((student, index) => ({
      "No.": index + 1,
      "Student Name": student.student_name,
      "Email": student.student_email,
      "Phone": student.student_phone || "N/A",
      "Quiz Average (%)": student.quiz_average !== null ? student.quiz_average.toFixed(1) : "N/A",
      "Total Quiz Attempts": student.quiz_count,
      "Assignment Grade (%)": student.assignment_grade !== null ? student.assignment_grade.toFixed(1) : "N/A",
      "Capstone Grade (%)": student.capstone_grade !== null ? student.capstone_grade.toFixed(1) : "N/A",
      "Overall Grade (%)": student.overall_grade !== null ? student.overall_grade.toFixed(1) : "N/A",
      "Letter Grade": getGradeLetter(student.overall_grade),
    }));

    // Prepare detailed quiz attempts data (Sheet 2)
    const quizDetailsData = allQuizAttempts.map((attempt, index) => ({
      "No.": index + 1,
      "Student Name": attempt.student_name,
      "Email": attempt.student_email,
      "Quiz Title": attempt.quiz_title,
      "Attempt #": attempt.attempt_number,
      "Total Attempts": attempt.total_attempts,
      "Is Retake": attempt.is_retake,
      "Score": attempt.score,
      "Total Points": attempt.total_points,
      "Percentage (%)": attempt.percentage,
      "Passed": attempt.passed,
      "Submitted At": attempt.submitted_at,
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Summary
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary["!cols"] = [
      { wch: 5 },   // No.
      { wch: 25 },  // Name
      { wch: 30 },  // Email
      { wch: 15 },  // Phone
      { wch: 15 },  // Quiz Average
      { wch: 18 },  // Total Attempts
      { wch: 18 },  // Assignment
      { wch: 18 },  // Capstone
      { wch: 15 },  // Overall
      { wch: 12 },  // Letter
    ];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // Sheet 2: Quiz Details (all attempts including retakes)
    if (quizDetailsData.length > 0) {
      const wsQuizDetails = XLSX.utils.json_to_sheet(quizDetailsData);
      wsQuizDetails["!cols"] = [
        { wch: 5 },   // No.
        { wch: 25 },  // Student Name
        { wch: 30 },  // Email
        { wch: 30 },  // Quiz Title
        { wch: 10 },  // Attempt #
        { wch: 12 },  // Total Attempts
        { wch: 10 },  // Is Retake
        { wch: 8 },   // Score
        { wch: 12 },  // Total Points
        { wch: 12 },  // Percentage
        { wch: 8 },   // Passed
        { wch: 20 },  // Submitted At
      ];
      XLSX.utils.book_append_sheet(wb, wsQuizDetails, "Quiz Attempts");
    }

    // Sheet 3: Capstone Details — individual marks per capstone project
    const { data: capstoneProjectsList } = await supabase
      .from("capstone_projects")
      .select("id, title")
      .eq("course_id", selectedCourseId);

    if (capstoneProjectsList && capstoneProjectsList.length > 0) {
      const allCapstoneDetails: any[] = [];
      let rowNum = 0;

      for (const student of studentGrades) {
        for (const cp of capstoneProjectsList) {
          const { data: submission } = await supabase
            .from("capstone_submissions")
            .select("grade, feedback, submitted_at")
            .eq("capstone_project_id", cp.id)
            .eq("student_id", student.student_id)
            .maybeSingle();

          rowNum++;
          allCapstoneDetails.push({
            "No.": rowNum,
            "Student Name": student.student_name,
            "Email": student.student_email,
            "Capstone Project": cp.title,
            "Grade (%)": submission?.grade !== null && submission?.grade !== undefined ? submission.grade : "Not Graded",
            "Feedback": submission?.feedback || "",
            "Submitted": submission?.submitted_at ? new Date(submission.submitted_at).toLocaleString() : "Not Submitted",
          });
        }
      }

      if (allCapstoneDetails.length > 0) {
        const wsCapstone = XLSX.utils.json_to_sheet(allCapstoneDetails);
        wsCapstone["!cols"] = [
          { wch: 5 },   // No.
          { wch: 25 },  // Student Name
          { wch: 30 },  // Email
          { wch: 35 },  // Capstone Project
          { wch: 12 },  // Grade
          { wch: 40 },  // Feedback
          { wch: 20 },  // Submitted
        ];
        XLSX.utils.book_append_sheet(wb, wsCapstone, "Capstone Details");
      }
    }

    // Generate filename with date
    const date = new Date().toISOString().split("T")[0];
    const filename = `${courseName.replace(/[^a-zA-Z0-9]/g, "_")}_Grades_${date}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
    toast.success("Grades exported with quiz & capstone details!");
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const averageOverallGrade = studentGrades.length > 0
    ? studentGrades.reduce((sum, s) => sum + (s.overall_grade || 0), 0) / studentGrades.filter(s => s.overall_grade !== null).length
    : 0;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {userRole === "admin" ? <AdminSidebar /> : <TeacherSidebar />}

        <div className="flex-1 flex flex-col overflow-hidden">
          <TeacherHeader 
            title={t('grades.grades')}
            subtitle={t('teacher.grades.viewQuizScores')}
          >
            {selectedCourseId && studentGrades.length > 0 && (
              <Button 
                onClick={exportToExcel}
                variant="outline"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                {t('common.download')} Excel
              </Button>
            )}
          </TeacherHeader>

          <main className="flex-1 overflow-y-auto p-4">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Course Selector */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('teacher.grades.selectCourse')}</CardTitle>
                  <CardDescription>
                    {t('teacher.grades.chooseToView')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {courses.length === 0 ? (
                    <div className="text-center py-8">
                      <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">{t('teacher.grades.noCoursesFound')}</p>
                      <Button
                        onClick={() => navigate("/create-course")}
                        className="mt-4 bg-[#006d2c] hover:bg-[#005523]"
                      >
                        {t('teacher.grades.createFirstCourse')}
                      </Button>
                    </div>
                  ) : (
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('teacher.grades.selectCourse')} />
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

              {selectedCourseId && teacherId && (
                <>
                  {/* Tabs for Quiz Marks and Assignments */}
                  <Tabs defaultValue="quizzes" className="space-y-6">
                    <TabsList className="grid w-full max-w-md grid-cols-2">
                      <TabsTrigger value="quizzes">{t('teacher.grades.quizMarks')}</TabsTrigger>
                      <TabsTrigger value="assignments">{t('assignments.assignments')}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="quizzes" className="space-y-6">
                      <GradesTable teacherId={teacherId} showFilters={true} />
                    </TabsContent>

                    <TabsContent value="assignments" className="space-y-6">
                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t('teacher.students.totalStudents')}</CardTitle>
                        <GraduationCap className="h-4 w-4 text-blue-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{studentGrades.length}</div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t('teacher.grades.classAverage')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {averageOverallGrade > 0 ? averageOverallGrade.toFixed(1) : "N/A"}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('teacher.grades.letter')}: {getGradeLetter(averageOverallGrade)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t('teacher.grades.gradedAssignments')}</CardTitle>
                        <FileText className="h-4 w-4 text-purple-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {studentGrades.filter(s => s.assignment_grade !== null).length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {studentGrades.filter(s => s.submission_id !== null).length} {t('teacher.grades.submissions')}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Grades Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('teacher.grades.studentGrades')}</CardTitle>
                      <CardDescription>
                        {t('teacher.grades.autoCalculated')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {studentGrades.length === 0 ? (
                        <div className="text-center py-12">
                          <GraduationCap className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-600">{t('teacher.grades.noStudentsEnrolled')}</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead className="text-center">Quiz Average</TableHead>
                                <TableHead className="text-center">Assignment</TableHead>
                                <TableHead className="text-center">Overall Grade</TableHead>
                                <TableHead className="text-center">Letter</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {studentGrades.map((student) => (
                                <TableRow key={student.student_id}>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-10 w-10">
                                        {student.avatar_url ? (
                                          <img src={student.avatar_url} alt={student.student_name} />
                                        ) : (
                                          <AvatarFallback className="bg-[#006d2c] text-white">
                                            {student.student_name.charAt(0)}
                                          </AvatarFallback>
                                        )}
                                      </Avatar>
                                      <div>
                                        <p className="font-medium">{student.student_name}</p>
                                        <p className="text-xs text-muted-foreground">{student.student_email}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex flex-col items-center">
                                      <span className={`font-semibold ${getGradeColor(student.quiz_average)}`}>
                                        {student.quiz_average !== null ? `${student.quiz_average.toFixed(1)}%` : "N/A"}
                                      </span>
                                      {student.quiz_count > 0 && (
                                        <Button
                                          variant="link"
                                          size="sm"
                                          className="h-auto p-0 text-xs"
                                          onClick={() => handleViewQuizzes(student)}
                                        >
                                          ({student.quiz_count} quizzes)
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className={`font-semibold ${getGradeColor(student.assignment_grade)}`}>
                                      {student.assignment_grade !== null ? `${student.assignment_grade}%` : "N/A"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className={`font-bold text-lg ${getGradeColor(student.overall_grade)}`}>
                                      {student.overall_grade !== null ? `${student.overall_grade.toFixed(1)}%` : "N/A"}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <Badge variant="outline" className={getGradeColor(student.overall_grade)}>
                                      {getGradeLetter(student.overall_grade)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    {student.submission_id && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleGradeAssignment(student)}
                                      >
                                        <Edit className="h-4 w-4 mr-1" />
                                        {student.assignment_grade !== null ? "Edit Grade" : "Grade"}
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                    </TabsContent>
                  </Tabs>
                </>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Grade Assignment Dialog */}
      <Dialog open={showGradeDialog} onOpenChange={setShowGradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade Assignment</DialogTitle>
            <DialogDescription>
              Grade {selectedStudent?.student_name}'s capstone submission
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="grade">Grade (0-100)</Label>
              <Input
                id="grade"
                type="number"
                min="0"
                max="100"
                value={gradeForm.grade}
                onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                placeholder="Enter grade"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                value={gradeForm.feedback}
                onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                placeholder="Provide feedback to the student..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGradeDialog(false)}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button onClick={handleSaveGrade} disabled={saving} className="bg-[#006d2c] hover:bg-[#005523]">
              <Save className="h-4 w-4 mr-1" />
              {saving ? "Saving..." : "Save Grade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quiz Attempts Dialog */}
      <Dialog open={showQuizDialog} onOpenChange={setShowQuizDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quiz Attempts</DialogTitle>
            <DialogDescription>
              {selectedStudent?.student_name}'s quiz history
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {quizAttempts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No quiz attempts found</p>
            ) : (
              <div className="space-y-3">
                {quizAttempts.map((attempt) => (
                  <Card key={attempt.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{attempt.lesson_title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(attempt.submitted_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-bold">
                              {attempt.score}/{attempt.total_points}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {((attempt.score / attempt.total_points) * 100).toFixed(1)}%
                            </p>
                          </div>
                          <Badge variant={attempt.passed ? "default" : "destructive"}>
                            {attempt.passed ? "Passed" : "Failed"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default TeacherGrades;
