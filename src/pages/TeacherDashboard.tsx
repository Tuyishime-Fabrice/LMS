import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, BookOpen, Calendar as CalendarIcon, Layers, PlayCircle } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { TeacherHeader } from "@/components/TeacherHeader";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CourseCard } from "@/components/CourseCard";
import { toast } from "sonner";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { useTranslation } from 'react-i18next';

// Skeleton Components
const StatCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-4 rounded" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-20" />
    </CardContent>
  </Card>
);

const CourseCardSkeleton = () => (
  <Card className="overflow-hidden">
    <Skeleton className="h-32 w-full" />
    <CardContent className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </CardContent>
  </Card>
);

const UpcomingClassSkeleton = () => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
    <Skeleton className="w-12 h-12 rounded-lg" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
  </div>
);

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, profile, loading: authLoading } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [courses, setCourses] = useState<any[]>([]);
  const [scheduledClasses, setScheduledClasses] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useActivityTracker();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/auth");
        return;
      }

      if (profile) {
        if (!profile.onboarding_completed) {
          toast.info("Please complete your profile setup");
          navigate("/teacher/onboarding", { replace: true });
          return;
        }

        if (profile.role === "teacher" && !profile.teacher_approved) {
          navigate("/teacher/pending-approval", { replace: true });
          return;
        }

        if (profile.role !== "teacher") {
          navigate("/student/dashboard", { replace: true });
          return;
        }

        fetchCourses();
        fetchScheduledClasses();
      }
    }
  }, [user, profile, authLoading, navigate]);

  const fetchScheduledClasses = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("scheduled_classes").select("*")
      .eq("teacher_id", user.id)
      .gte("scheduled_time", new Date().toISOString())
      .order("scheduled_time", { ascending: true });
    if (error) { console.error("Error fetching scheduled classes:", error); return; }
    const courseIds = [...new Set((data || []).map(sc => sc.course_id))];
    if (!courseIds.length) { setScheduledClasses([]); return; }
    const { data: courses, error: coursesError } = await supabase.from("courses")
      .select("id, title, teacher_id").in("id", courseIds);
    if (coursesError) { console.error("Error fetching class courses:", coursesError); return; }
    const byId = new Map((courses || []).map(course => [course.id, course]));
    setScheduledClasses((data || []).map(sc => ({ ...sc, courses: byId.get(sc.course_id) })));
  };

  const fetchCourses = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("courses")
      .select(`
        *,
        course_enrollments(count),
        course_chapters(
          id,
          course_lessons(id)
        )
      `)
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      const coursesWithDetails = (data || []).map((course: any) => {
        const chapterCount = course.course_chapters?.length || 0;
        const lessonCount = (course.course_chapters || []).reduce(
          (total: number, chapter: any) => total + (chapter.course_lessons?.length || 0),
          0
        );

        return {
          ...course,
          enrolled_count: course.course_enrollments?.[0]?.count || 0,
          chapter_count: chapterCount,
          lesson_count: lessonCount,
        };
      });
      setCourses(coursesWithDetails);
    }
    setDataLoading(false);
  };

  const formatClassDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      day: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      date: d.getDate(),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Stats calculations
  const totalStudents = courses.reduce((sum, c) => sum + (c.enrolled_count || 0), 0);
  const totalLessons = courses.reduce((sum, c) => sum + (c.lesson_count || 0), 0);
  const totalChapters = courses.reduce((sum, c) => sum + (c.chapter_count || 0), 0);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 border-t-[#006d2c] mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <TeacherSidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <TeacherHeader
            title={`${t('teacher.dashboard.welcomeBack')}, ${profile?.full_name?.split(' ')[0] || t('onboarding.teacher')}`}
            subtitle={t('teacher.dashboard.happeningToday')}
            loading={dataLoading}
          />

          <main className="flex-1 overflow-y-auto p-4">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {dataLoading ? (
                  <>
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                    <StatCardSkeleton />
                  </>
                ) : (
                  <>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">{t('nav.courses')}</CardTitle>
                        <BookOpen className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{courses.length}</div>
                        <p className="text-xs text-gray-500">{t('teacher.dashboard.activeCourses')}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">{t('nav.students')}</CardTitle>
                        <Users className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalStudents}</div>
                        <p className="text-xs text-gray-500">{t('courses.enrolled')}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">{t('teacher.dashboard.lessons')}</CardTitle>
                        <PlayCircle className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalLessons}</div>
                        <p className="text-xs text-gray-500">{t('teacher.dashboard.totalLessons')}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-gray-600">{t('teacher.dashboard.chapters')}</CardTitle>
                        <Layers className="h-4 w-4 text-gray-400" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalChapters}</div>
                        <p className="text-xs text-gray-500">{t('teacher.dashboard.totalChapters')}</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Quick Action */}
                  <Card className="bg-[#006d2c] text-white">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold mb-1">{t('teacher.dashboard.readyToCreate')}</h3>
                          <p className="text-sm text-white/80">{t('teacher.dashboard.shareKnowledge')}</p>
                        </div>
                        <Button
                          onClick={() => navigate("/create-course")}
                          className="bg-white text-[#006d2c] hover:bg-gray-100"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('courses.createCourse')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Courses */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{t('teacher.dashboard.myCourses')}</CardTitle>
                          <CardDescription>{t('teacher.dashboard.manageEdit')}</CardDescription>
                        </div>
                        {!dataLoading && courses.length > 0 && (
                          <Badge variant="secondary">{courses.length}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {dataLoading ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <CourseCardSkeleton />
                          <CourseCardSkeleton />
                          <CourseCardSkeleton />
                        </div>
                      ) : courses.length === 0 ? (
                        <div className="text-center py-10">
                          <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <h3 className="font-medium text-gray-900 mb-1">{t('teacher.dashboard.noCourses')}</h3>
                          <p className="text-sm text-gray-500 mb-4">{t('teacher.dashboard.createFirst')}</p>
                          <Button onClick={() => navigate("/create-course")} className="bg-[#006d2c] hover:bg-[#005523]">
                            <Plus className="h-4 w-4 mr-2" />
                            {t('courses.createCourse')}
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {courses.map((course, index) => {
                            const gradients = [
                              'from-blue-500 to-purple-600',
                              'from-green-500 to-teal-600',
                              'from-orange-500 to-red-600',
                              'from-pink-500 to-rose-600',
                              'from-indigo-500 to-blue-600',
                              'from-yellow-500 to-orange-600',
                            ];
                            return (
                              <CourseCard
                                key={course.id}
                                course={course}
                                onClick={() => navigate(`/course/${course.id}`)}
                                onEdit={() => navigate(`/create-course?edit=${course.id}`)}
                                gradient={gradients[index % gradients.length]}
                                showTeacher={false}
                              />
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Calendar */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{t('teacher.dashboard.calendar')}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="rounded-md w-full"
                        modifiers={{
                          scheduled: scheduledClasses.map(sc => new Date(sc.scheduled_time))
                        }}
                        modifiersStyles={{
                          scheduled: {
                            backgroundColor: '#006d2c',
                            color: 'white',
                            borderRadius: '50%'
                          }
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Upcoming Classes */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{t('teacher.dashboard.upcomingClasses')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {dataLoading ? (
                        <>
                          <UpcomingClassSkeleton />
                          <UpcomingClassSkeleton />
                        </>
                      ) : scheduledClasses.length === 0 ? (
                        <div className="text-center py-6">
                          <CalendarIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">{t('schedule.noUpcomingClasses')}</p>
                        </div>
                      ) : (
                        scheduledClasses.slice(0, 3).map((classItem) => {
                          const { day, date: classDate, time } = formatClassDate(classItem.scheduled_time);
                          return (
                            <div key={classItem.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                              <div className="w-12 h-12 rounded-lg bg-white border flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] font-medium text-gray-500">{day}</span>
                                <span className="text-lg font-bold text-gray-900">{classDate}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-sm text-gray-900 truncate">{classItem.title}</h5>
                                <p className="text-xs text-gray-500 truncate">{classItem.courses?.title}</p>
                                <p className="text-xs text-gray-400 mt-1">{time}</p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default TeacherDashboard;
