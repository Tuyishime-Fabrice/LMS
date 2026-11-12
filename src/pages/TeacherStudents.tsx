import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Search, Layers, BookOpen, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { TeacherHeader } from "@/components/TeacherHeader";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { CohortJoinRequests } from "@/components/CohortJoinRequests";
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

interface Student {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  enrolled_at: string;
  course_id: string;
  course_title: string;
  cohort_name: string | null;
}

interface Course {
  id: string;
  title: string;
  enrolled_count: number;
}

interface CohortInfo {
  name: string;
  studentCount: number;
  courseTitle: string | null;
}

const TeacherStudents = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [cohortInfoList, setCohortInfoList] = useState<CohortInfo[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedCohort, setSelectedCohort] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("id, title")
        .eq("teacher_id", user.id);

      if (coursesError) throw coursesError;

      const courseIds = coursesData?.map(c => c.id) || [];
      setCourses((coursesData || []).map(course => ({ ...course, enrolled_count: 0 })));

      if (courseIds.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch students enrolled in these courses (include profile via FK)
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("course_enrollments")
        .select(`
          student_id,
          course_id,
          cohort_name,
          enrolled_at,
          courses (
            id,
            title
          ),
          profiles:student_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .in("course_id", courseIds);

      if (enrollmentsError) throw enrollmentsError;

      if (!enrollmentsData || enrollmentsData.length === 0) {
        setStudents([]);
        setLoading(false);
        return;
      }

      // Combine data
      const studentsWithDetails = enrollmentsData.map((enrollment: any) => ({
        id: enrollment.student_id,
        full_name: enrollment.profiles?.full_name || "Unknown",
        email: enrollment.profiles?.email || "",
        avatar_url: enrollment.profiles?.avatar_url || null,
        enrolled_at: enrollment.enrolled_at,
        course_id: enrollment.course_id,
        course_title: enrollment.courses?.title || "Unknown Course",
        cohort_name: enrollment.cohort_name,
      }));

      setStudents(studentsWithDetails);

      // Calculate cohort statistics
      const cohortMap = new Map<string, CohortInfo>();
      studentsWithDetails.forEach((student: Student) => {
        if (student.cohort_name) {
          const existing = cohortMap.get(student.cohort_name);
          if (existing) {
            existing.studentCount++;
          } else {
            cohortMap.set(student.cohort_name, {
              name: student.cohort_name,
              studentCount: 1,
              courseTitle: student.course_title,
            });
          }
        }
      });
      setCohortInfoList(Array.from(cohortMap.values()));
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast.error(t('teacher.students.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesCourse = selectedCourse === "all" || student.course_id === selectedCourse;
    const matchesCohort = selectedCohort === "all" || 
                          (selectedCohort === "none" && !student.cohort_name) ||
                          student.cohort_name === selectedCohort;
    const matchesSearch = student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         student.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCourse && matchesCohort && matchesSearch;
  });

  // Get unique cohort names for filter dropdown
  const uniqueCohortNames = [...new Set(students.map(s => s.cohort_name).filter(Boolean))] as string[];
  
  // Count students without cohort
  const studentsWithoutCohort = students.filter(s => !s.cohort_name).length;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <TeacherSidebar />
        
        <div className="flex-1 flex flex-col">
          <TeacherHeader 
            title={t('students.students')}
            subtitle={t('teacher.students.manageStudents')}
          >
            <Button 
              onClick={() => navigate("/teacher/cohorts")}
              className="bg-[#006d2c] hover:bg-[#005523]"
            >
              <Layers className="h-4 w-4 mr-2" />
              {t('teacher.students.manageCohorts')}
            </Button>
          </TeacherHeader>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-4">
            <div className="container mx-auto space-y-6">
              {/* Join Requests Section */}
              <CohortJoinRequests />

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{t('teacher.students.totalStudents')}</CardTitle>
                    <Users className="h-4 w-4 text-[#006d2c]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{students.length}</div>
                    <p className="text-xs text-muted-foreground">{t('teacher.students.acrossAllCourses')}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{t('courses.courses')}</CardTitle>
                    <BookOpen className="h-4 w-4 text-[#006d2c]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{courses.length}</div>
                    <p className="text-xs text-muted-foreground">{t('teacher.students.activeCourses')}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{t('teacher.students.cohorts')}</CardTitle>
                    <Layers className="h-4 w-4 text-[#006d2c]" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{cohortInfoList.length}</div>
                    <p className="text-xs text-muted-foreground">{t('teacher.students.studentGroups')}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{t('teacher.students.unassigned')}</CardTitle>
                    <UserPlus className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{studentsWithoutCohort}</div>
                    <p className="text-xs text-muted-foreground">{t('teacher.students.noCohortAssigned')}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Cohort Overview */}
              {cohortInfoList.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5 text-[#006d2c]" />
                      {t('teacher.students.cohortOverview')}
                    </CardTitle>
                    <CardDescription>{t('teacher.students.cohortOverviewDesc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cohortInfoList.map((cohort) => (
                        <div 
                          key={cohort.name}
                          className="p-4 border rounded-lg hover:border-[#006d2c] transition-colors cursor-pointer"
                          onClick={() => setSelectedCohort(cohort.name)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{cohort.name}</h4>
                            <Badge variant="secondary" className="bg-[#006d2c]/10 text-[#006d2c]">
                              {cohort.studentCount} {cohort.studentCount === 1 ? t('teacher.students.studentSingular') : t('teacher.students.studentPlural')}
                            </Badge>
                          </div>
                          {cohort.courseTitle && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {cohort.courseTitle}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Filters */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('teacher.students.filterStudents')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{t('teacher.students.course')}</Label>
                      <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('teacher.grades.selectCourse')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('teacher.students.allCourses')}</SelectItem>
                          {courses.map(course => (
                            <SelectItem key={course.id} value={course.id}>
                              {course.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('teacher.students.cohort')}</Label>
                      <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                        <SelectTrigger>
                          <SelectValue placeholder={t('teacher.students.selectCohort')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('teacher.students.allCohorts')}</SelectItem>
                          <SelectItem value="none">{t('teacher.students.noCohort')}</SelectItem>
                          {uniqueCohortNames.map(cohortName => (
                            <SelectItem key={cohortName} value={cohortName}>
                              {cohortName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('common.search')}</Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder={t('teacher.students.searchByName')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Students Table */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('teacher.students.studentsList')}</CardTitle>
                  <CardDescription>
                    {t('teacher.students.studentsFound', { count: filteredStudents.length })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredStudents.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">{t('teacher.students.noStudentsFound')}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('teacher.students.student')}</TableHead>
                          <TableHead>{t('teacher.students.email')}</TableHead>
                          <TableHead>{t('teacher.students.course')}</TableHead>
                          <TableHead>{t('teacher.students.cohort')}</TableHead>
                          <TableHead>{t('teacher.students.enrolled')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow key={`${student.id}-${student.course_id}`}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  {student.avatar_url ? (
                                    <img src={student.avatar_url} alt={student.full_name} />
                                  ) : (
                                    <AvatarFallback className="bg-[#006d2c] text-white text-xs">
                                      {student.full_name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                                <span className="font-medium">{student.full_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">{student.email}</TableCell>
                            <TableCell className="text-sm">{student.course_title}</TableCell>
                            <TableCell>
                              {student.cohort_name ? (
                                <Badge variant="secondary" className="bg-[#006d2c]/10 text-[#006d2c]">
                                  {student.cohort_name}
                                </Badge>
                              ) : (
                                <span className="text-sm text-gray-400">{t('teacher.students.noCohort')}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {new Date(student.enrolled_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default TeacherStudents;
