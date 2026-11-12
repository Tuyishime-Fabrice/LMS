import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/StudentSidebar";
import { 
  TrendingUp, 
  Award,
  BookOpen,
  Target,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from "@/components/LanguageSelector";

interface Course {
  id: string;
  title: string;
}

interface QuizScore {
  id: string;
  lesson_title: string;
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  submitted_at: string;
}

interface AssignmentScore {
  title: string;
  grade: number | null;
  feedback: string | null;
  submitted_at: string;
  count?: number; // Number of assignments included in average
}

const StudentScores = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [quizScores, setQuizScores] = useState<QuizScore[]>([]);
  const [assignmentScore, setAssignmentScore] = useState<AssignmentScore | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      fetchCourseScores();
    }
  }, [selectedCourseId]);

  const fetchCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Get enrolled courses
      const { data: enrollments, error: enrollError } = await supabase
        .from("course_enrollments")
        .select(`
          course_id,
          courses (
            id,
            title
          )
        `)
        .eq("student_id", user.id);

      if (enrollError) throw enrollError;

      const coursesData = (enrollments || []).map((e: any) => ({
        id: e.courses.id,
        title: e.courses.title
      }));

      setCourses(coursesData);
      if (coursesData.length > 0) {
        setSelectedCourseId(coursesData[0].id);
      }
    } catch (error: any) {
      toast.error("Failed to load courses");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseScores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all lessons for this course
      const { data: chapters } = await supabase
        .from("course_chapters")
        .select("id")
        .eq("course_id", selectedCourseId);

      const chapterIds = chapters?.map(ch => ch.id) || [];

      const { data: lessons } = await supabase
        .from("course_lessons")
        .select("id, title, content_type")
        .in("chapter_id", chapterIds);

      const lessonIds = lessons?.map(l => l.id) || [];

      // Get quiz attempts with lesson details
      const { data: quizAttempts } = await supabase
        .from("student_quiz_attempts")
        .select("*")
        .eq("student_id", user.id)
        .in("lesson_id", lessonIds)
        .order("submitted_at", { ascending: false });

      // Map quiz scores with lesson titles
      const quizScoresData: QuizScore[] = (quizAttempts || []).map(attempt => {
        const lesson = lessons?.find(l => l.id === attempt.lesson_id);
        const percentage = (attempt.score / attempt.total_points) * 100;
        return {
          id: attempt.id,
          lesson_title: lesson?.title || "Unknown Quiz",
          score: attempt.score,
          total_points: attempt.total_points,
          percentage: percentage,
          passed: attempt.passed,
          submitted_at: attempt.submitted_at
        };
      });

      setQuizScores(quizScoresData);

      // Get assignment scores from BOTH regular assignments AND capstone
      const assignmentGrades: number[] = [];
      let latestFeedback: string | null = null;
      let latestSubmittedAt: string | null = null;

      // 1. Get regular assignment submissions
      const assignmentLessons = lessons?.filter(l => l.content_type === 'assignment') || [];
      const assignmentLessonIds = assignmentLessons.map(l => l.id);

      if (assignmentLessonIds.length > 0) {
        const { data: assignmentSubmissions } = await supabase
          .from("assignment_submissions")
          .select("grade, feedback, submitted_at")
          .eq("student_id", user.id)
          .in("lesson_id", assignmentLessonIds)
          .order("submitted_at", { ascending: false });

        if (assignmentSubmissions && assignmentSubmissions.length > 0) {
          assignmentSubmissions.forEach(sub => {
            if (sub.grade !== null) {
              assignmentGrades.push(sub.grade);
            }
          });
          // Use most recent submission for feedback
          const latest = assignmentSubmissions[0];
          if (latest.feedback) latestFeedback = latest.feedback;
          if (latest.submitted_at) latestSubmittedAt = latest.submitted_at;
        }
      }

      // 2. Get capstone submission
      const { data: capstone } = await supabase
        .from("capstone_projects")
        .select("id, title")
        .eq("course_id", selectedCourseId)
        .single();

      if (capstone) {
        const { data: capstoneSubmission } = await supabase
          .from("capstone_submissions")
          .select("grade, feedback, submitted_at")
          .eq("capstone_project_id", capstone.id)
          .eq("student_id", user.id)
          .single();

        if (capstoneSubmission) {
          if (capstoneSubmission.grade !== null) {
            assignmentGrades.push(capstoneSubmission.grade);
          }
          if (capstoneSubmission.feedback) latestFeedback = capstoneSubmission.feedback;
          if (capstoneSubmission.submitted_at) latestSubmittedAt = capstoneSubmission.submitted_at;
        }
      }

      // 3. Calculate average assignment grade
      if (assignmentGrades.length > 0) {
        const avgGrade = assignmentGrades.reduce((a, b) => a + b, 0) / assignmentGrades.length;
        setAssignmentScore({
          title: assignmentGrades.length > 1 
            ? `${assignmentGrades.length} Assignments` 
            : capstone?.title || "Assignment",
          grade: Math.round(avgGrade),
          feedback: latestFeedback,
          submitted_at: latestSubmittedAt || new Date().toISOString(),
          count: assignmentGrades.length
        });
      } else {
        setAssignmentScore(null);
      }
    } catch (error: any) {
      console.error("Error fetching course scores:", error);
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

  const getProgressColor = (grade: number | null) => {
    if (grade === null) return "bg-gray-400";
    if (grade >= 90) return "bg-green-500";
    if (grade >= 80) return "bg-blue-500";
    if (grade >= 70) return "bg-yellow-500";
    if (grade >= 60) return "bg-orange-500";
    return "bg-red-500";
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  // Calculate averages for selected course
  const quizAverage = quizScores.length > 0
    ? quizScores.reduce((sum, q) => sum + q.percentage, 0) / quizScores.length
    : null;

  const overallGrade = quizAverage !== null && assignmentScore?.grade !== null && assignmentScore?.grade !== undefined
    ? (quizAverage * 0.5) + (assignmentScore.grade * 0.5)
    : quizAverage !== null
    ? quizAverage
    : (assignmentScore?.grade !== null && assignmentScore?.grade !== undefined) ? assignmentScore.grade : null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <StudentSidebar />

        <div className="flex-1 flex flex-col overflow-hidden p-4">
          {/* Header */}
          <header className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 mb-4">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-2xl font-bold">{t('grades.myScores')}</h1>
                  <p className="text-sm text-muted-foreground">
                    {t('grades.trackPerformance')}
                  </p>
                </div>
              </div>
              <LanguageSelector />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-2">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Course Filter */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('grades.selectCourse')}</CardTitle>
                  <CardDescription>
                    {t('grades.trackPerformance')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {courses.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">{t('courses.noCourses')}</p>
                      <Button
                        onClick={() => navigate("/courses")}
                        className="mt-4 bg-[#006d2c] hover:bg-[#005523]"
                      >
                        {t('dashboard.browseCourses')}
                      </Button>
                    </div>
                  ) : (
                    <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('grades.selectCourse')} />
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t('grades.overallPerformance')}</CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-500" />
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${getGradeColor(overallGrade)}`}>
                          {overallGrade !== null ? `${overallGrade.toFixed(1)}%` : "N/A"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t('assignments.grade')}: {getGradeLetter(overallGrade)}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t('grades.quizAverage')}</CardTitle>
                        <Target className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${getGradeColor(quizAverage)}`}>
                          {quizAverage !== null ? `${quizAverage.toFixed(1)}%` : "N/A"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {quizScores.length} {t('grades.totalQuizzes')}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{t('grades.assignmentAverage')}</CardTitle>
                        <Award className="h-4 w-4 text-orange-500" />
                      </CardHeader>
                      <CardContent>
                        <div className={`text-2xl font-bold ${getGradeColor(assignmentScore?.grade ?? null)}`}>
                          {assignmentScore && assignmentScore.grade !== null && assignmentScore.grade !== undefined ? `${assignmentScore.grade}%` : "N/A"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {assignmentScore && assignmentScore.grade !== null && assignmentScore.grade !== undefined ? "Graded" : "Not graded"}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quiz Scores Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('studentScores.quizScores')}</CardTitle>
                      <CardDescription>
                        {t('studentScores.quizScoresDesc')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {quizScores.length === 0 ? (
                        <div className="text-center py-8">
                          <Target className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600">{t('grades.noScoresYet')}</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t('grades.lesson')}</TableHead>
                                <TableHead className="text-center">{t('grades.score')}</TableHead>
                                <TableHead className="text-center">{t('grades.percentage')}</TableHead>
                                <TableHead className="text-center">{t('grades.status')}</TableHead>
                                <TableHead>{t('grades.date')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {quizScores.map((quiz) => (
                                <TableRow key={quiz.id}>
                                  <TableCell className="font-medium">{quiz.lesson_title}</TableCell>
                                  <TableCell className="text-center">
                                    <span className="font-semibold">
                                      {quiz.score}/{quiz.total_points}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <span className={`text-lg font-bold ${getGradeColor(quiz.percentage)}`}>
                                      {quiz.percentage.toFixed(1)}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-center">
                                    {quiz.passed ? (
                                      <Badge className="bg-green-500 flex items-center gap-1 w-fit mx-auto">
                                        <CheckCircle2 className="h-3 w-3" />
                                        {t('grades.passed')}
                                      </Badge>
                                    ) : (
                                      <Badge variant="destructive" className="flex items-center gap-1 w-fit mx-auto">
                                        <XCircle className="h-3 w-3" />
                                        {t('grades.failed')}
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {new Date(quiz.submitted_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Assignment Score */}
                  <Card>
                    <CardHeader>
                      <CardTitle>{t('grades.assignmentScores')}</CardTitle>
                      <CardDescription>
                        {assignmentScore?.count && assignmentScore.count > 1 
                          ? `${t('grades.average')} ${assignmentScore.count} ${t('assignments.assignments')}` 
                          : t('grades.assignmentScores')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {assignmentScore ? (
                        <div className="space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold mb-1">{assignmentScore.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {t('assignments.submitted')}: {new Date(assignmentScore.submitted_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            {assignmentScore.grade !== null ? (
                              <div className="text-right">
                                <div className={`text-4xl font-bold ${getGradeColor(assignmentScore.grade)}`}>
                                  {assignmentScore.grade}/100
                                </div>
                                <Badge variant="outline" className={`mt-2 ${getGradeColor(assignmentScore.grade)}`}>
                                  {getGradeLetter(assignmentScore.grade)}
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-orange-500 border-orange-500">
                                {t('studentScores.notGradedYet')}
                              </Badge>
                            )}
                          </div>

                          {assignmentScore.grade !== null && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{t('studentScores.score')}</span>
                                <span>{assignmentScore.grade}%</span>
                              </div>
                              <Progress value={assignmentScore.grade} className="h-3" />
                            </div>
                          )}

                          {assignmentScore.feedback && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                              <h4 className="font-semibold text-blue-900 mb-2">{t('studentScores.teacherFeedback')}</h4>
                              <p className="text-sm text-blue-800">{assignmentScore.feedback}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Award className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-gray-600">{t('studentScores.noAssignmentSubmitted')}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default StudentScores;
