import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download, Search, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

interface QuizGrade {
  id: string;
  student_name: string;
  student_email: string;
  course_title: string;
  lesson_title: string;
  chapter_title: string;
  score: number;
  total_points: number;
  percentage: number;
  passed: boolean;
  submitted_at: string;
}

interface GradesTableProps {
  teacherId?: string;
  studentId?: string;
  showFilters?: boolean;
}

export function GradesTable({ teacherId, studentId, showFilters = true }: GradesTableProps) {
  const { t } = useTranslation();
  const [grades, setGrades] = useState<QuizGrade[]>([]);
  const [filteredGrades, setFilteredGrades] = useState<QuizGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchGrades();
  }, [teacherId, studentId]);

  useEffect(() => {
    filterGrades();
  }, [grades, searchTerm, courseFilter]);

  const fetchGrades = async () => {
    try {
      setLoading(true);

      // If teacherId is provided, derive allowed lesson IDs first
      let lessonIdsForTeacher: string[] = [];
      if (teacherId) {
        const { data: courses } = await supabase
          .from("courses")
          .select("id, title")
          .eq("teacher_id", teacherId);

        const courseIds = (courses || []).map((c: any) => c.id);
        if (courseIds.length === 0) {
          setGrades([]);
          setCourses([]);
          return;
        }

        const { data: chapters } = await supabase
          .from("course_chapters")
          .select("id")
          .in("course_id", courseIds);

        const chapterIds = (chapters || []).map((ch: any) => ch.id);
        if (chapterIds.length === 0) {
          setGrades([]);
          setCourses([]);
          return;
        }

        const { data: lessons } = await supabase
          .from("course_lessons")
          .select("id")
          .in("chapter_id", chapterIds)
          .eq("content_type", "quiz");

        lessonIdsForTeacher = (lessons || []).map((l: any) => l.id);
        if (lessonIdsForTeacher.length === 0) {
          setGrades([]);
          setCourses([]);
          return;
        }
      }

      let query = supabase
        .from("student_quiz_attempts")
        .select(`
          id,
          score,
          total_points,
          passed,
          submitted_at,
          student:student_id (
            id,
            full_name,
            email
          ),
          lesson:lesson_id (
            id,
            title,
            chapter:chapter_id (
              id,
              title,
              course:course_id (
                id,
                title,
                teacher_id
              )
            )
          )
        `)
        .order("submitted_at", { ascending: false });

      if (teacherId) {
        query = query.in("lesson_id", lessonIdsForTeacher);
      } else if (studentId) {
        query = query.eq("student_id", studentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedGrades: QuizGrade[] = (data || []).map((attempt: any) => ({
        id: attempt.id,
        student_name: attempt.student?.full_name || t('gradesTable.unknown'),
        student_email: attempt.student?.email || "",
        course_title: attempt.lesson?.chapter?.course?.title || t('gradesTable.unknownCourse'),
        chapter_title: attempt.lesson?.chapter?.title || t('gradesTable.unknownChapter'),
        lesson_title: attempt.lesson?.title || t('gradesTable.unknownQuiz'),
        score: attempt.score,
        total_points: attempt.total_points,
        percentage: Math.round((attempt.score / attempt.total_points) * 100),
        passed: attempt.passed,
        submitted_at: attempt.submitted_at,
      }));

      setGrades(formattedGrades);

      // Extract unique courses for filter
      const uniqueCourses = Array.from(
        new Map(
          formattedGrades.map((g) => [g.course_title, { id: g.course_title, title: g.course_title }])
        ).values()
      );
      setCourses(uniqueCourses);
    } catch (error) {
      console.error("Error fetching grades:", error);
      toast({
        title: t('common.error'),
        description: t('gradesTable.failedToLoad'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterGrades = () => {
    let filtered = [...grades];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (grade) =>
          grade.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          grade.course_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          grade.lesson_title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Course filter
    if (courseFilter !== "all") {
      filtered = filtered.filter((grade) => grade.course_title === courseFilter);
    }

    setFilteredGrades(filtered);
  };

  const exportToCSV = () => {
    const headers = ["Student", "Email", "Course", "Chapter", "Quiz", "Marks", "Percentage", "Status", "Date"];
    const rows = filteredGrades.map((g) => [
      g.student_name,
      g.student_email,
      g.course_title,
      g.chapter_title,
      g.lesson_title,
      `${g.score}/${g.total_points}`,
      `${g.percentage}%`,
      g.passed ? "Passed" : "Failed",
      new Date(g.submitted_at).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quiz-grades-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const getAverageScore = () => {
    if (filteredGrades.length === 0) return 0;
    const avg = filteredGrades.reduce((sum, g) => sum + g.percentage, 0) / filteredGrades.length;
    return Math.round(avg);
  };

  const getPassRate = () => {
    if (filteredGrades.length === 0) return 0;
    const passed = filteredGrades.filter((g) => g.passed).length;
    return Math.round((passed / filteredGrades.length) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground mt-4">{t('gradesTable.loadingGrades')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-1 sm:gap-0">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">{t('gradesTable.totalAttempts')}</p>
                <p className="text-lg sm:text-2xl font-bold">{filteredGrades.length}</p>
              </div>
              <Trophy className="h-5 w-5 sm:h-8 sm:w-8 text-primary hidden sm:block" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-1 sm:gap-0">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">{t('gradesTable.averageScore')}</p>
                <p className="text-lg sm:text-2xl font-bold">{getAverageScore()}%</p>
              </div>
              <TrendingUp className="h-5 w-5 sm:h-8 sm:w-8 text-green-600 hidden sm:block" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:pt-6 sm:p-6">
            <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-1 sm:gap-0">
              <div className="text-center sm:text-left">
                <p className="text-xs sm:text-sm text-muted-foreground">{t('gradesTable.passRate')}</p>
                <p className="text-lg sm:text-2xl font-bold">{getPassRate()}%</p>
              </div>
              <TrendingDown className="h-5 w-5 sm:h-8 sm:w-8 text-blue-600 hidden sm:block" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
            <CardTitle className="text-base sm:text-lg">{t('gradesTable.quizGrades')}</CardTitle>
            <Button onClick={exportToCSV} variant="outline" size="sm" className="text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              {t('gradesTable.exportCSV')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-2.5 sm:top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('gradesTable.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="w-full sm:w-[200px] text-sm">
                  <SelectValue placeholder={t('gradesTable.allCourses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('gradesTable.allCourses')}</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.title}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-3">
            {filteredGrades.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t('gradesTable.noQuizGrades')}
              </div>
            ) : (
              filteredGrades.map((grade) => (
                <Card key={grade.id} className="border">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{grade.lesson_title}</p>
                        <p className="text-xs text-muted-foreground truncate">{grade.course_title}</p>
                      </div>
                      <Badge variant={grade.passed ? "default" : "destructive"} className="text-xs ml-2">
                        {grade.passed ? t('gradesTable.passed') : t('gradesTable.failed')}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold">{grade.score}/{grade.total_points}</span>
                        <span className="text-muted-foreground">({grade.percentage}%)</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(grade.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="rounded-md border hidden sm:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {!studentId && <TableHead className="text-xs sm:text-sm">{t('gradesTable.student')}</TableHead>}
                  <TableHead className="text-xs sm:text-sm">{t('gradesTable.course')}</TableHead>
                  <TableHead className="text-xs sm:text-sm">{t('gradesTable.quiz')}</TableHead>
                  <TableHead className="text-xs sm:text-sm">{t('gradesTable.marks')}</TableHead>
                  <TableHead className="text-xs sm:text-sm">{t('gradesTable.percentage')}</TableHead>
                  <TableHead className="text-xs sm:text-sm">{t('gradesTable.status')}</TableHead>
                  <TableHead className="text-xs sm:text-sm">{t('gradesTable.date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGrades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('gradesTable.noQuizGrades')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGrades.map((grade) => (
                    <TableRow key={grade.id}>
                      {!studentId && (
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{grade.student_name}</div>
                            <div className="text-xs text-muted-foreground">{grade.student_email}</div>
                          </div>
                        </TableCell>
                      )}
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{grade.course_title}</div>
                          <div className="text-xs text-muted-foreground">{grade.chapter_title}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{grade.lesson_title}</TableCell>
                      <TableCell className="font-mono font-semibold text-sm">
                        {grade.score}/{grade.total_points}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-sm">{grade.percentage}%</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={grade.passed ? "default" : "destructive"} className="text-xs">
                          {grade.passed ? t('gradesTable.passed') : t('gradesTable.failed')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-muted-foreground">
                        {new Date(grade.submitted_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
