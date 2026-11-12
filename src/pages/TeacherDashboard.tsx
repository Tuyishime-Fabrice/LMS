import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shell/page";
import { AppShell } from "@/components/shell/AppShell";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Plus, Users, BookOpen, Calendar as CalendarIcon, Layers, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { CourseThumb } from "@/features/learning/CourseThumb";
import { StatusPill } from "@/components/shell/page";
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
  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
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
          toast.info(t("teacherDashboard.pleaseCompleteYourProfileSetup", "Please complete your profile setup"));
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
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-border border-t-[#006d2c] mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppShell role="teacher" width="wide">
      <PageHeader
        title={`${t('teacher.dashboard.welcomeBack')}, ${profile?.full_name?.split(' ')[0] || t('onboarding.teacher')}`}
        description={t('teacher.dashboard.happeningToday')}
        actions={<Button onClick={() => navigate("/create-course")}><Plus />{t('courses.createCourse')}</Button>}
      />

            <div className="space-y-6">
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
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('nav.courses')}</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground/60" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{courses.length}</div>
                        <p className="text-xs text-muted-foreground">{t('teacher.dashboard.activeCourses')}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('nav.students')}</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground/60" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalStudents}</div>
                        <p className="text-xs text-muted-foreground">{t('courses.enrolled')}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('teacher.dashboard.lessons')}</CardTitle>
                        <PlayCircle className="h-4 w-4 text-muted-foreground/60" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalLessons}</div>
                        <p className="text-xs text-muted-foreground">{t('teacher.dashboard.totalLessons')}</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">{t('teacher.dashboard.chapters')}</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground/60" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{totalChapters}</div>
                        <p className="text-xs text-muted-foreground">{t('teacher.dashboard.totalChapters')}</p>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
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
                          <BookOpen className="h-12 w-12 text-muted-foreground/60 mx-auto mb-3" />
                          <h3 className="font-medium text-forest mb-1">{t('teacher.dashboard.noCourses')}</h3>
                          <p className="text-sm text-muted-foreground mb-4">{t('teacher.dashboard.createFirst')}</p>
                          <Button onClick={() => navigate("/create-course")} className="bg-primary hover:bg-primary-hover">
                            <Plus className="h-4 w-4 mr-2" />
                            {t('courses.createCourse')}
                          </Button>
                        </div>
                      ) : (
                        <ul className="divide-y">
                          {courses.map((course) => (
                            <li key={course.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                              <CourseThumb src={course.thumbnail_url} title={course.title} className="h-14 w-20 shrink-0" />
                              <div className="min-w-0 flex-1">
                                <Link to={`/course/${course.id}`} className="block truncate text-[0.9375rem] font-medium text-forest hover:text-primary">
                                  {course.title}
                                </Link>
                                {course.approval_status && course.approval_status !== "approved" && (
                                  <StatusPill tone={course.approval_status === "rejected" ? "red" : "amber"} className="mt-1">
                                    {course.approval_status === "rejected"
                                      ? t("teacherDashboard.rejected", "Not approved")
                                      : t("teacherDashboard.pendingReview", "Awaiting review")}
                                  </StatusPill>
                                )}
                              </div>
                              <Button asChild variant="outline" size="sm">
                                <Link to={`/create-course?edit=${course.id}`}><Pencil />{t("common.edit", "Edit")}</Link>
                              </Button>
                            </li>
                          ))}
                        </ul>
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
                          <CalendarIcon className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">{t('schedule.noUpcomingClasses')}</p>
                        </div>
                      ) : (
                        scheduledClasses.slice(0, 3).map((classItem) => {
                          const { day, date: classDate, time } = formatClassDate(classItem.scheduled_time);
                          return (
                            <div key={classItem.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                              <div className="w-12 h-12 rounded-lg bg-card border flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] font-medium text-muted-foreground">{day}</span>
                                <span className="text-lg font-bold text-forest">{classDate}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="font-medium text-sm text-forest truncate">{classItem.title}</h5>
                                <p className="text-xs text-muted-foreground truncate">{classItem.courses?.title}</p>
                                <p className="text-xs text-muted-foreground/60 mt-1">{time}</p>
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
    </AppShell>
  );
};

export default TeacherDashboard;
