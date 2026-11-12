import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { CourseCard } from "@/components/CourseCard";
import { StudentInstalments } from "@/components/StudentInstalments";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/StudentSidebar";
import LoadingSpinner from "@/components/LoadingSpinner";

type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
};

const MyCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEnrolledCourses();
  }, []);

  const fetchEnrolledCourses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      // Fetch enrolled courses
      const { data, error } = await supabase
        .from("course_enrollments")
        .select(`
          courses (
            id,
            title,
            description,
            thumbnail_url
          )
        `)
        .eq("student_id", user.id);

      if (error) throw error;

      const enrolledCourses = data?.map(e => e.courses).filter(Boolean) as Course[];
      setCourses(enrolledCourses || []);
    } catch (error: any) {
      console.error("Error fetching enrolled courses:", error);
      toast.error("Failed to load your courses");
    } finally {
      setLoading(false);
    }
  };

  const gradients = [
    "from-blue-500 to-purple-600",
    "from-green-500 to-teal-600",
    "from-orange-500 to-red-600",
    "from-pink-500 to-rose-600",
    "from-indigo-500 to-blue-600",
    "from-yellow-500 to-orange-600",
  ];

  const levels = ["Beginner", "Intermediate", "Advanced"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-600">Loading your courses...</p>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <StudentSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white border border-gray-200 rounded-2xl shadow-sm mx-4 mt-4 sticky top-4 z-10">
            <div className="container mx-auto px-4 sm:px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Courses</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {courses.length} {courses.length === 1 ? 'course' : 'courses'} enrolled
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 sm:px-6 py-8">
              <StudentInstalments />
              {courses.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <BookOpen className="h-12 w-12 text-gray-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">No Courses Yet</h2>
                  <p className="text-gray-600 mb-6">
                    You haven't enrolled in any courses yet. Start learning today!
                  </p>
                  <Button
                    onClick={() => navigate("/courses")}
                    className="bg-[#006d2c] hover:bg-[#005523] text-white"
                  >
                    Browse Courses
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {courses.map((course, index) => {
                    const gradient = gradients[index % gradients.length];
                    const level = levels[index % levels.length];

                    return (
                      <CourseCard
                        key={course.id}
                        course={{
                          ...course,
                          level: level.toLowerCase()
                        }}
                        onClick={() => navigate(`/course/${course.id}`)}
                        gradient={gradient}
                        showTeacher={false}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default MyCourses;
