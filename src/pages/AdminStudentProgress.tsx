import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, BookOpen, Eye, GraduationCap, CheckCircle, Clock } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface StudentProgress {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  total_courses: number;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
  last_activity: string | null;
}

interface CourseProgress {
  course_id: string;
  course_title: string;
  teacher_name: string;
  enrolled_at: string;
  total_lessons: number;
  completed_lessons: number;
  progress_percentage: number;
  last_lesson_completed: string | null;
}

interface Course { id: string; title: string; }

export default function AdminStudentProgress() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentProgress[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<{ student: StudentProgress; courses: CourseProgress[] } | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => { checkAdminAccess(); }, []);
  useEffect(() => { filterStudents(); }, [students, searchQuery, selectedCourse]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { toast.error("Access denied"); navigate("/"); return; }
      await fetchData();
    } catch (error) { console.error("Error:", error); navigate("/"); }
  };

  const fetchData = async () => {
    try {
      // Fetch all courses for filter
      const { data: coursesData } = await supabase.from("courses").select("id, title").order("title");
      setCourses(coursesData || []);

      // Use RPC function to get all student progress (bypasses RLS)
      const { data: progressData, error } = await supabase.rpc("get_all_student_progress");
      
      if (error) {
        console.error("RPC error:", error);
        throw error;
      }

      // Group by student
      const studentMap = new Map<string, StudentProgress>();
      
      (progressData || []).forEach((row: any) => {
        const existing = studentMap.get(row.student_id);
        if (existing) {
          existing.total_courses += 1;
          existing.total_lessons += Number(row.total_lessons) || 0;
          existing.completed_lessons += Number(row.completed_lessons) || 0;
          if (row.last_activity && (!existing.last_activity || new Date(row.last_activity) > new Date(existing.last_activity))) {
            existing.last_activity = row.last_activity;
          }
        } else {
          studentMap.set(row.student_id, {
            id: row.student_id,
            full_name: row.student_name || "Unknown",
            email: row.student_email || "",
            phone: row.student_phone || null,
            total_courses: 1,
            total_lessons: Number(row.total_lessons) || 0,
            completed_lessons: Number(row.completed_lessons) || 0,
            progress_percentage: 0,
            last_activity: row.last_activity
          });
        }
      });

      // Calculate progress percentage for each student
      const students = Array.from(studentMap.values()).map(s => ({
        ...s,
        progress_percentage: s.total_lessons > 0 ? Math.round((s.completed_lessons / s.total_lessons) * 100) : 0
      }));

      setStudents(students);
    } catch (error) { console.error("Error:", error); toast.error("Failed to load data"); }
    finally { setLoading(false); }
  };


  const filterStudents = async () => {
    let filtered = students;
    
    if (searchQuery) {
      filtered = filtered.filter(s => s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || s.email.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    if (selectedCourse !== "all") {
      // Filter students enrolled in selected course
      const { data: enrollments } = await supabase.from("course_enrollments").select("student_id").eq("course_id", selectedCourse);
      const enrolledIds = enrollments?.map(e => e.student_id) || [];
      filtered = filtered.filter(s => enrolledIds.includes(s.id));
    }

    setFilteredStudents(filtered);
  };

  const fetchStudentDetail = async (student: StudentProgress) => {
    setLoadingDetail(true);
    try {
      // Use RPC function to get progress data for this student
      const { data: progressData, error } = await supabase.rpc("get_all_student_progress");
      
      if (error) throw error;

      // Filter for this student
      const studentCourses = (progressData || []).filter((row: any) => row.student_id === student.id);

      const courseProgress: CourseProgress[] = studentCourses.map((row: any) => ({
        course_id: row.course_id,
        course_title: row.course_title || "Unknown",
        teacher_name: row.teacher_name || "Unknown",
        enrolled_at: row.enrolled_at,
        total_lessons: Number(row.total_lessons) || 0,
        completed_lessons: Number(row.completed_lessons) || 0,
        progress_percentage: row.progress_percentage || 0,
        last_lesson_completed: row.last_activity
      }));

      setSelectedStudent({ student, courses: courseProgress });
      setShowDetailDialog(true);
    } catch (error) { console.error("Error:", error); toast.error("Failed to load details"); }
    finally { setLoadingDetail(false); }
  };

  const getProgressColor = (p: number) => p >= 80 ? "text-green-600" : p >= 50 ? "text-yellow-600" : "text-red-600";
  const getProgressBg = (p: number) => p >= 80 ? "bg-green-100 text-green-800" : p >= 50 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";

  if (loading) return <LoadingSpinner />;

  const avgProgress = students.length > 0 ? Math.round(students.reduce((a, s) => a + s.progress_percentage, 0) / students.length) : 0;
  const completedStudents = students.filter(s => s.progress_percentage === 100).length;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 flex flex-col p-4">
          <header className="bg-white rounded-2xl shadow mb-6">
            <div className="bg-gradient-to-r from-[#006d2c] to-[#008000] p-6 rounded-t-2xl">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-white" />
                  <div className="text-white"><h1 className="text-2xl font-bold">Student Progress</h1><p className="text-sm opacity-90">Track every student's course progress</p></div>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">{filteredStudents.length} Students</Badge>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-6 flex justify-between items-center"><div><p className="text-sm text-gray-600">Total Students</p><p className="text-3xl font-bold text-blue-600">{students.length}</p></div><GraduationCap className="h-10 w-10 text-blue-500" /></CardContent></Card>
                <Card><CardContent className="p-6 flex justify-between items-center"><div><p className="text-sm text-gray-600">Avg Progress</p><p className="text-3xl font-bold text-purple-600">{avgProgress}%</p></div><BookOpen className="h-10 w-10 text-purple-500" /></CardContent></Card>
                <Card><CardContent className="p-6 flex justify-between items-center"><div><p className="text-sm text-gray-600">Completed</p><p className="text-3xl font-bold text-green-600">{completedStudents}</p></div><CheckCircle className="h-10 w-10 text-green-500" /></CardContent></Card>
                <Card><CardContent className="p-6 flex justify-between items-center"><div><p className="text-sm text-gray-600">In Progress</p><p className="text-3xl font-bold text-orange-600">{students.length - completedStudents}</p></div><Clock className="h-10 w-10 text-orange-500" /></CardContent></Card>
              </div>

              {/* Filters */}
              <Card><CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
                  <Select value={selectedCourse} onValueChange={setSelectedCourse}><SelectTrigger><SelectValue placeholder="Filter by course" /></SelectTrigger><SelectContent><SelectItem value="all">All Courses</SelectItem>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>
                </div>
              </CardContent></Card>


              {/* Students Table */}
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Courses</TableHead><TableHead>Lessons</TableHead><TableHead>Progress</TableHead><TableHead>Last Activity</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No students found</TableCell></TableRow> : filteredStudents.map(student => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <p className="font-medium">{student.full_name}</p>
                          <p className="text-sm text-gray-500">{student.email}</p>
                          {student.phone && <p className="text-sm text-blue-600">{student.phone}</p>}
                        </TableCell>
                        <TableCell><div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-blue-600" /><span>{student.total_courses}</span></div></TableCell>
                        <TableCell><span className="text-sm">{student.completed_lessons}/{student.total_lessons}</span></TableCell>
                        <TableCell>
                          <div className="space-y-1 w-32">
                            <div className="flex justify-between text-sm"><span className={getProgressColor(student.progress_percentage)}>{student.progress_percentage}%</span></div>
                            <Progress value={student.progress_percentage} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{student.last_activity ? new Date(student.last_activity).toLocaleDateString() : "Never"}</TableCell>
                        <TableCell><Button size="sm" variant="outline" onClick={() => fetchStudentDetail(student)} disabled={loadingDetail}><Eye className="h-4 w-4 mr-1" />Details</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </div>
          </main>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Progress Details</DialogTitle>
            <DialogDescription>
              <span className="block">{selectedStudent?.student.full_name} - {selectedStudent?.student.email}</span>
              {selectedStudent?.student.phone && <span className="block text-blue-600">{selectedStudent?.student.phone}</span>}
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              {/* Overall Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card><CardContent className="p-4 text-center"><p className="text-sm text-gray-600">Courses</p><p className="text-2xl font-bold">{selectedStudent.courses.length}</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><p className="text-sm text-gray-600">Lessons Done</p><p className="text-2xl font-bold">{selectedStudent.courses.reduce((a, c) => a + c.completed_lessons, 0)}/{selectedStudent.courses.reduce((a, c) => a + c.total_lessons, 0)}</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><p className="text-sm text-gray-600">Overall</p><p className="text-2xl font-bold">{selectedStudent.student.progress_percentage}%</p></CardContent></Card>
              </div>

              {/* Course Breakdown */}
              <h3 className="font-semibold text-lg mt-4">Course Progress</h3>
              {selectedStudent.courses.length === 0 ? <p className="text-gray-500">No courses enrolled</p> : (
                <div className="space-y-3">
                  {selectedStudent.courses.map(course => (
                    <Card key={course.course_id}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div><p className="font-medium">{course.course_title}</p><p className="text-sm text-gray-500">by {course.teacher_name}</p></div>
                          <Badge className={getProgressBg(course.progress_percentage)}>{course.progress_percentage}%</Badge>
                        </div>
                        <Progress value={course.progress_percentage} className="h-2 mb-2" />
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Lessons: {course.completed_lessons}/{course.total_lessons}</span>
                          <span>Enrolled: {new Date(course.enrolled_at).toLocaleDateString()}</span>
                          {course.last_lesson_completed && <span>Last: {new Date(course.last_lesson_completed).toLocaleDateString()}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
