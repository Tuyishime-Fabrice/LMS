import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { beginPaymentSignUp } from "@/lib/coursePaymentReturn";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CourseCard } from "@/components/CourseCard";
import { PurchaseDialog } from "@/components/PurchaseDialog";
import { useTranslation } from "react-i18next";

type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  teacher_id: string;
  price: number | null;
  is_free: boolean | null;
  currency: string | null;
  requirements: string | null;
  created_at: string;
};

type EnrollmentCount = {
  course_id: string;
  count: number;
};

const BrowseCourses = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentCounts, setEnrollmentCounts] = useState<Map<string, number>>(new Map());
  const [userId, setUserId] = useState<string | null>(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [enrollingCourseId, setEnrollingCourseId] = useState<string | null>(null);
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchaseCourse, setPurchaseCourse] = useState<Course | null>(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    const fetchUserAndEnrollments = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: enrollments } = await supabase
          .from("course_enrollments")
          .select("course_id")
          .eq("student_id", user.id);
        const ids = new Set<string>((enrollments || []).map((e: any) => e.course_id));
        setEnrolledCourseIds(ids);
      } else {
        setUserId(null);
        setEnrolledCourseIds(new Set());
      }
    };
    fetchUserAndEnrollments();
  }, []);

  const fetchCourses = async () => {
    try {
      // Fetch all courses
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (coursesError) throw coursesError;

      // Fetch enrollment counts for each course
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from("course_enrollments")
        .select("course_id");

      if (!enrollmentsError && enrollmentsData) {
        const counts = new Map<string, number>();
        enrollmentsData.forEach((enrollment) => {
          const currentCount = counts.get(enrollment.course_id) || 0;
          counts.set(enrollment.course_id, currentCount + 1);
        });
        setEnrollmentCounts(counts);
      }

      setCourses(coursesData || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast.error(t('browseCourses.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate(beginPaymentSignUp(`/course/${courseId}`));
        return;
      }

      setEnrollingCourseId(courseId);
      const { error } = await supabase
        .from("course_enrollments")
        .insert({ course_id: courseId, student_id: user.id });

      if (error) throw error;

      setEnrolledCourseIds(prev => new Set(prev).add(courseId));
      toast.success(t('browseCourses.enrolledSuccess'));
      navigate(`/course/${courseId}`);
    } catch (error: any) {
      console.error("Error enrolling in course:", error);
      toast.error(error.message || t('browseCourses.failedToEnroll'));
    } finally {
      setEnrollingCourseId(null);
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

  // Skeleton loader component for courses - compact cards for 4 per row
  const CourseSkeletonLoader = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="rounded-xl border overflow-hidden animate-pulse bg-white">
          <div className="h-32 bg-gradient-to-br from-gray-200 to-gray-300" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-full" />
            <div className="h-8 bg-gray-200 rounded-lg w-full mt-2" />
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b sticky top-0 z-10">
          <div className="container mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="hover:bg-gray-100"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('browseCourses.title')}</h1>
                  <p className="text-sm text-gray-600">{t('browseCourses.subtitle')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#006D2C]" />
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 sm:px-6 py-8">
          <CourseSkeletonLoader />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate(-1)}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('browseCourses.title')}</h1>
                <p className="text-sm text-gray-600">{t('browseCourses.subtitle')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#006D2C]" />
              <span className="text-sm font-medium text-gray-700">{courses.length} {t('browseCourses.coursesCount')}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Courses Grid */}
      <main className="container mx-auto px-4 sm:px-6 py-8">
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {courses.map((course, index) => {
              const gradient = gradients[index % gradients.length];
              const level = levels[index % levels.length];
              const columnIndex = index % 4; // Calculate which column (0-3) for 4-column grid
              const isEnrolled = enrolledCourseIds.has(course.id);

              return (
                <CourseCard
                  key={course.id}
                  course={{
                    ...course,
                    level: level.toLowerCase()
                  }}
                  onClick={() => {
                    if (userId && isEnrolled) {
                      navigate(`/course/${course.id}`);
                    } else if (!userId) {
                      navigate(`/course/${course.id}`);
                    } else {
                      // Just view the course details, don't auto-enroll
                      navigate(`/course/${course.id}`);
                    }
                  }}
                  gradient={gradient}
                  showTeacher={false}
                  columnIndex={columnIndex}
                  isEnrolled={isEnrolled}
                  showEnrollButton={!!(userId && !isEnrolled && (course.is_free !== false))}
                  onEnroll={() => handleEnroll(course.id)}
                  onBuy={() => {
                    if (!userId) {
                      navigate(beginPaymentSignUp(`/course/${course.id}`));
                      return;
                    }
                    setPurchaseCourse(course);
                    setShowPurchaseDialog(true);
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('browseCourses.noCoursesAvailable')}</h3>
            <p className="text-gray-600">{t('browseCourses.checkBackLater')}</p>
          </div>
        )}
      </main>
      {/* Already Enrolled Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('browseCourses.alreadyEnrolled')}</DialogTitle>
            <DialogDescription>
              {t('browseCourses.alreadyEnrolledDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('common.close')}</Button>
            <Button onClick={() => navigate("/student/my-courses")}>{t('browseCourses.goToMyCourses')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase Dialog for Paid Courses */}
      {purchaseCourse && (
        <PurchaseDialog
          open={showPurchaseDialog}
          onOpenChange={setShowPurchaseDialog}
          type="course"
          item={{
            id: purchaseCourse.id,
            title: purchaseCourse.title,
            price: purchaseCourse.price || 0,
            currency: purchaseCourse.currency || 'RWF',
          }}
        />
      )}
    </div>
  );
};

export default BrowseCourses;
