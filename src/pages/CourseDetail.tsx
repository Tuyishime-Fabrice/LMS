import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Clock, BookOpen, Globe, Award, FileText, ClipboardList, Play, Users, Star, CheckCircle2, GraduationCap, Target, Zap, Lock, ShoppingCart } from "lucide-react";
import { CourseCurriculum } from "@/components/CourseCurriculum";
import { CourseContentPlayer } from "@/components/CourseContentPlayer";
import { QuizPanel } from "@/features/learning/QuizPanel";
import { CapstoneSubmission } from "@/components/CapstoneSubmission";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { PurchaseDialog } from "@/components/PurchaseDialog";
import { ScholarshipApplyDialog } from "@/components/ScholarshipApplyDialog";
import { EarlyBirdCountdown } from "@/components/EarlyBirdCountdown";
import { beginPaymentSignUp, clearPaymentReturn } from "@/lib/coursePaymentReturn";
import { useAppAuth } from "@/contexts/AuthContext";
import { resolveEarlyBirdPricing, type EarlyBirdState } from "@/lib/earlyBirdPricing";

interface Teacher {
  full_name: string;
  avatar_url?: string;
  email: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  teacher_id: string;
  welcome_video_url?: string;
  level?: string;
  language?: string;
  requirements?: string;
  price?: number;
  is_free?: boolean;
  currency?: string;
  scholarship_open?: boolean;
  scholarship_slots_max?: number | null;
  scholarship_slots_used?: number;
  early_bird_price?: number | null;
  early_bird_start?: string | null;
  early_bird_end?: string | null;
  early_bird_max_seats?: number | null;
  early_bird_seats_used?: number;
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  content_type: string;
  content_url: string;
  file_url?: string;
  duration?: number;
  order_index: number;
  is_completed?: boolean;
  is_preview?: boolean;
}

interface Chapter {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
  total_duration?: number;
  is_preview?: boolean;
}

interface CapstoneProject {
  id: string;
  title: string;
  description: string;
  instructions: string;
  requirements: string[];
  due_date: string | null;
  file_url?: string | null;
}

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const capstoneSectionId = "course-capstone";

  const [course, setCourse] = useState<Course | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const { user: authUser, profile: authProfile } = useAppAuth();
  const [showQuiz, setShowQuiz] = useState(false);
  const [capstoneProjects, setCapstoneProjects] = useState<CapstoneProject[]>([]);
  const [isWelcomeSelected, setIsWelcomeSelected] = useState(false);
  const [accessResult, setAccessResult] = useState<{ courseId: string; userId: string | null; allowed: boolean } | null>(null);
  const hasAccess = accessResult?.courseId === id && accessResult?.userId === (authUser?.id || null)
    ? accessResult.allowed : null;
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [showScholarshipDialog, setShowScholarshipDialog] = useState(false);
  const [displayPrice, setDisplayPrice] = useState<number | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState("RWF");
  const [earlyBird, setEarlyBird] = useState<EarlyBirdState | null>(null);
  const [instalmentAvailable, setInstalmentAvailable] = useState(false);
  const [instalmentDepositPercent, setInstalmentDepositPercent] = useState(50);
  const [cohortCheckoutId, setCohortCheckoutId] = useState<string | null>(null);
  const [hasAutoOpenedPaymentStep, setHasAutoOpenedPaymentStep] = useState(false);
  const [searchParams] = useSearchParams();

  // Check if user is a student (not teacher/admin)
  const isStudent = userRole === 'student';

  // An enrolled learner belongs in the learning room, not on the sales page.
  useEffect(() => {
    if (!id || !authUser?.id || authProfile?.role !== "student") return;
    if (searchParams.get("view") === "overview" || searchParams.get("paymentStep")) return;
    let active = true;
    void supabase.from("course_enrollments").select("id").eq("student_id", authUser.id).eq("course_id", id).maybeSingle()
      .then(({ data }) => { if (active && data) navigate(`/learn/${id}`, { replace: true }); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authUser?.id, authProfile?.role]);

  useEffect(() => {
    setUserId(authUser?.id || null);
    setUserRole(authProfile?.role || null);
  }, [authUser?.id, authProfile?.role]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // Fetch user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile) setUserRole(profile.role);
      }

      await Promise.all([
        fetchCourse(),
        fetchChapters(),
        fetchCapstone(),
      ]);

      setLoading(false);
    };

    init();
  }, [id]);

  // Separate effect: check access whenever course data changes
  useEffect(() => {
    let active = true;
    const setHasAccess = (allowed: boolean) => {
      if (active && course) setAccessResult({ courseId: course.id, userId: authUser?.id || null, allowed });
    };
    const checkAccess = async () => {
      if (!course || course.id !== id) return;

      // Free courses = everyone has access
      if (course.is_free !== false) {
        setHasAccess(true);
        return;
      }

      // Paid course — check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setHasAccess(false);
        return;
      }

      // Check enrollment
      const { data: enrollment } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('student_id', user.id)
        .eq('course_id', course.id)
        .maybeSingle();

      if (enrollment) {
        setHasAccess(true);
        return;
      }

      // Check if admin or course teacher
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        setHasAccess(true);
        return;
      }

      if (course.teacher_id === user.id) {
        setHasAccess(true);
        return;
      }

      // No access
      setHasAccess(false);
    };

    checkAccess();
    return () => { active = false; };
  }, [id, course?.id, course?.is_free, authUser?.id, authProfile?.role]);

  const fetchCourse = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching course:", error);
      toast({ title: "Error", description: "Failed to load course", variant: "destructive" });
      return;
    }

    setCourse(data);
    setDisplayPrice(data.price ?? 0);
    setDisplayCurrency(data.currency || "RWF");

    const earlyBirdState = resolveEarlyBirdPricing(data);
    setEarlyBird(earlyBirdState);
    if (earlyBirdState) {
      setDisplayPrice(earlyBirdState.price);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user && data.price != null && !data.is_free) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("pricing_tier")
        .eq("id", user.id)
        .maybeSingle();

      const tier = profile?.pricing_tier || "standard";
      if (tier !== "standard" && !earlyBirdState) {
        const { data: tierPrice } = await supabase
          .from("course_price_tiers")
          .select("price, currency")
          .eq("course_id", id)
          .eq("tier_code", tier)
          .eq("is_active", true)
          .maybeSingle();

        if (tierPrice) {
          setDisplayPrice(Number(tierPrice.price));
          setDisplayCurrency(tierPrice.currency || data.currency || "RWF");
        }
      }

      const { data: instalmentPlan } = await supabase
        .from("course_instalment_plans")
        .select("id, deposit_percent")
        .eq("course_id", id)
        .eq("is_active", true)
        .maybeSingle();
      setInstalmentAvailable(!!instalmentPlan);
      if (instalmentPlan?.deposit_percent != null) {
        setInstalmentDepositPercent(Number(instalmentPlan.deposit_percent));
      }
    } else {
      setInstalmentAvailable(false);
    }

    const cohortParam = searchParams.get("cohort");
    if (cohortParam) {
      const { data: cohort } = await supabase
        .from("cohorts")
        .select("id, price, currency, requires_payment, course_id, instalment_enabled, instalment_deposit_percent")
        .eq("id", cohortParam)
        .maybeSingle();

      if (cohort?.requires_payment && cohort.course_id === id && cohort.price != null) {
        setCohortCheckoutId(cohort.id);
        setDisplayPrice(Number(cohort.price));
        setDisplayCurrency(cohort.currency || data.currency || "RWF");
        setEarlyBird(null);
        if (cohort.instalment_enabled) {
          setInstalmentAvailable(true);
          if (cohort.instalment_deposit_percent != null) {
            setInstalmentDepositPercent(Number(cohort.instalment_deposit_percent));
          }
        }
      } else {
        setCohortCheckoutId(null);
      }
    } else {
      setCohortCheckoutId(null);
    }

    // Fetch teacher info
    const { data: teacherData } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, email")
      .eq("id", data.teacher_id)
      .single();

    if (teacherData) setTeacher(teacherData);
  };

  const fetchChapters = async () => {
    if (!id) return;

    // OPTIMIZED: Single query to get chapters with lessons using join
    const { data: chaptersData, error: chaptersError } = await supabase
      .from("course_chapters")
      .select(`
        id,
        title,
        order_index,
        is_preview,
        course_lessons (
          id,
          title,
          description,
          content_type,
          content_url,
          file_url,
          duration,
          order_index,
          is_preview
        )
      `)
      .eq("course_id", id)
      .order("order_index");

    if (chaptersError) {
      console.error("Error fetching chapters:", chaptersError);
      return;
    }

    // Get all lesson IDs for progress query
    const allLessonIds = (chaptersData || []).flatMap(ch =>
      (ch.course_lessons || []).map(l => l.id)
    );

    // OPTIMIZED: Single query for ALL lesson progress instead of N queries
    let progressMap = new Map<string, boolean>();
    const progressUserId = userId || authUser?.id || (await supabase.auth.getUser()).data.user?.id;
    if (progressUserId && allLessonIds.length > 0) {
      const { data: progressData } = await supabase
        .from("student_lesson_progress")
        .select("lesson_id, is_completed")
        .eq("student_id", progressUserId)
        .in("lesson_id", allLessonIds);

      if (progressData) {
        progressData.forEach(p => progressMap.set(p.lesson_id, p.is_completed));
      }
    }

    // Map chapters with lessons and progress
    const chaptersWithLessons = (chaptersData || []).map(chapter => {
      const lessons = (chapter.course_lessons || [])
        .sort((a, b) => a.order_index - b.order_index)
        .map(lesson => ({
          ...lesson,
          is_completed: progressMap.get(lesson.id) || false,
        }));

      const totalDuration = lessons.reduce((sum, l) => sum + (l.duration || 0), 0);

      return {
        id: chapter.id,
        title: chapter.title,
        order_index: chapter.order_index,
        is_preview: chapter.is_preview || false,
        lessons,
        total_duration: totalDuration,
      };
    });

    setChapters(chaptersWithLessons);

    // Auto-select first lesson
    if (chaptersWithLessons.length > 0 && chaptersWithLessons[0].lessons.length > 0) {
      const firstLesson = chaptersWithLessons[0].lessons[0];
      setCurrentLessonId(firstLesson.id);
      setCurrentLesson(firstLesson);
    }
  };

  const getCounts = () => {
    let videos = 0, reading = 0, quizzes = 0, assignments = 0;
    chapters.forEach((ch) => {
      ch.lessons.forEach((l) => {
        switch (l.content_type) {
          case "video":
            videos++;
            break;
          case "pdf":
          case "document":
          case "url":
            reading++;
            break;
          case "quiz":
            quizzes++;
            break;
          case "assignment":
            assignments++;
            break;
        }
      });
    });
    return { videos, reading, quizzes, assignments };
  };

  const getProgressPercent = () => {
    const totalLessons = getTotalLessons();
    if (totalLessons === 0) return 0;
    const completed = chapters.reduce((sum, ch) => sum + ch.lessons.filter((l) => l.is_completed).length, 0);
    return (completed / totalLessons) * 100;
  };

  const fetchCapstone = async () => {
    if (!id) return;

    const { data } = await supabase
      .from("capstone_projects")
      .select("*")
      .eq("course_id", id);

    if (data && data.length > 0) setCapstoneProjects(data);
  };

  const isPaidCourse = course ? !(course.is_free ?? true) : false;
  const scholarshipAvailable =
    course?.scholarship_open &&
    (course.scholarship_slots_max == null ||
      (course.scholarship_slots_used ?? 0) < course.scholarship_slots_max);

  const formattedPrice = () => {
    const amount = displayPrice ?? course?.price;
    const currency = displayCurrency || course?.currency || "RWF";
    if (amount == null) return "";
    return formattedPriceForAmount(amount, currency);
  };

  const formattedPriceForAmount = (amount: number, currency = displayCurrency || course?.currency || "RWF") => {
    return currency === "USD"
      ? `$${amount.toLocaleString()}`
      : `${amount.toLocaleString()} ${currency}`;
  };

  const renderPaidCourseActions = (options?: {
    buyClassName?: string;
    iconClassName?: string;
    stacked?: boolean;
  }) => {
    const buyClass =
      options?.buyClassName ||
      "w-full h-11 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm shadow-md rounded-xl";
    const iconClass = options?.iconClassName || "h-4 w-4";
    const wrapperClass = options?.stacked === false ? "flex flex-wrap gap-2" : "space-y-2";

    return (
      <div className={wrapperClass}>
        <Button className={buyClass} onClick={handlePurchaseClick}>
          <ShoppingCart className={`${iconClass} mr-2`} />
          Buy This Course
        </Button>
        {scholarshipAvailable && (
          <Button
            variant="outline"
            className={
              options?.stacked === false
                ? "border-[#006d2c] text-[#006d2c]"
                : "w-full h-11 border-[#006d2c] text-[#006d2c] font-semibold text-sm rounded-xl"
            }
            onClick={() => setShowScholarshipDialog(true)}
          >
            Apply for Scholarship
          </Button>
        )}
      </div>
    );
  };

  const handlePurchaseClick = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      setShowPurchaseDialog(true);
      return;
    }

    toast({ title: "Please create an account or sign in to continue" });
    navigate(beginPaymentSignUp(window.location.pathname + window.location.search + window.location.hash));
  };

  useEffect(() => {
    if (!userId || !course || course.id !== id || hasAccess === null || hasAutoOpenedPaymentStep) return;
    if (searchParams.get("paymentStep") !== "payment") return;
    if (hasAccess === false) setShowPurchaseDialog(true);
    setHasAutoOpenedPaymentStep(true);
    clearPaymentReturn();
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("paymentStep");
    navigate({ pathname: window.location.pathname, search: nextParams.toString(), hash: window.location.hash }, { replace: true });
  }, [id, userId, course, hasAccess, hasAutoOpenedPaymentStep, searchParams, navigate]);

  useEffect(() => {
    setHasAutoOpenedPaymentStep(false);
  }, [id]);

  const canManageCapstone = Boolean(capstoneProjects.length > 0 && userId && isStudent);
  const capstoneLocked = Boolean(capstoneProjects.length > 0 && isPaidCourse && hasAccess === false);

  // Helper: check if a specific lesson is locked
  const isLessonLocked = (lessonId: string): boolean => {
    if (!isPaidCourse || hasAccess) return false;
    for (const ch of chapters) {
      const lesson = ch.lessons.find(l => l.id === lessonId);
      if (lesson) {
        return !(ch.is_preview || lesson.is_preview);
      }
    }
    return true; // not found = locked by default
  };

  // Check if the currently selected lesson is locked
  const currentLessonLocked = currentLessonId ? isLessonLocked(currentLessonId) : false;

  const scrollToCapstone = () => {
    const section = document.getElementById(capstoneSectionId);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToLearningContent = () => {
    const section = document.getElementById("course-learning-content");
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getFirstLesson = () => {
    for (const chapter of chapters) {
      if (chapter.lessons.length > 0) {
        return chapter.lessons[0];
      }
    }
    return null;
  };

  const handleLessonClick = async (lessonId: string) => {
    setIsWelcomeSelected(false);

    // Find lesson and its parent chapter
    let parentChapter: Chapter | undefined;
    let lesson: Lesson | undefined;
    for (const ch of chapters) {
      const found = ch.lessons.find((l) => l.id === lessonId);
      if (found) {
        lesson = found;
        parentChapter = ch;
        break;
      }
    }

    if (!lesson) return;

    // Check if lesson is locked
    if (isPaidCourse && !hasAccess) {
      const isPreviewContent = parentChapter?.is_preview || lesson.is_preview;
      if (!isPreviewContent) {
        toast({ title: "Content Locked", description: "Purchase this course to access this content", variant: "destructive" });
        setShowPurchaseDialog(true);
        return;
      }
    }

    if (lesson.content_type === "quiz") {
      // Teachers can view quiz but not take it
      if (!isStudent) {
        toast({ title: "Preview Mode", description: "Teachers can view quiz questions but cannot submit answers" });
      }
      setCurrentLesson(lesson);
      setShowQuiz(true);
    } else {
      const isUrlDoc =
        (lesson.content_type === "pdf" || lesson.content_type === "document" || lesson.content_type === "assignment") &&
        !!lesson.content_url && !lesson.file_url;
      if (lesson.content_type === "url" || isUrlDoc) {
        if (lesson.content_url) {
          window.open(lesson.content_url, "_blank");
        }
        // Only track progress for students
        if (userId && isStudent) {
          try {
            await supabase.from("student_lesson_progress").upsert(
              {
                student_id: userId,
                lesson_id: lesson.id,
                is_completed: true,
                completed_at: new Date().toISOString(),
              },
              { onConflict: "student_id,lesson_id" }
            );
            await fetchChapters();
            toast({ title: "Opened in new tab", description: "Marked as completed" });
          } catch (e) {
            console.error("Error marking URL lesson complete", e);
          }
        } else if (!isStudent) {
          toast({ title: "Opened in new tab", description: "Preview mode - progress not tracked" });
        }
        return;
      }
      setCurrentLessonId(lessonId);
      setCurrentLesson(lesson);
      setShowQuiz(false);
    }
  };

  const handleStartLearning = () => {
    if (isStudent && id) {
      navigate(`/learn/${id}`);
      return;
    }
    const firstLesson = getFirstLesson();
    if (!firstLesson) {
      toast({
        title: "No lessons yet",
        description: "This course curriculum is still being set up.",
        variant: "destructive",
      });
      return;
    }

    scrollToLearningContent();
    if (currentLessonId !== firstLesson.id || isWelcomeSelected || !currentLesson) {
      handleLessonClick(firstLesson.id);
    }
  };

  const handleQuizComplete = async () => {
    setShowQuiz(false);
    await fetchChapters(); // Refresh to update progress
    toast({ title: "Quiz completed!", description: "Great job! Moving to next lesson..." });
  };

  const handleLessonComplete = async () => {
    await fetchChapters(); // Refresh progress
  };

  const getTotalLessons = () => {
    return chapters.reduce((total, ch) => total + ch.lessons.length, 0);
  };

  const getTotalDuration = () => {
    return chapters.reduce((total, ch) => total + (ch.total_duration || 0), 0);
  };

  const getLevelBadgeColor = (level?: string) => {
    switch (level) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  const learningOutcomes: string[] = Array.isArray((course as { learning_outcomes?: unknown }).learning_outcomes)
    ? ((course as { learning_outcomes?: string[] }).learning_outcomes || []).filter(Boolean)
    : [];
  const counts = getCounts();
  const progressPercent = getProgressPercent();
  const totalDuration = getTotalDuration();
  const totalLessons = getTotalLessons();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Premium Hero Header */}
      <div className="relative bg-gradient-to-br from-[#0A400C] via-[#0d5210] to-[#116315] overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-white rounded-full translate-x-1/3 translate-y-1/3" />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2 opacity-50" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white/80 hover:text-white hover:bg-white/10 mb-4"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>

          <div className="grid lg:grid-cols-5 gap-8 items-start">
            {/* Left Content - 3 columns */}
            <div className="lg:col-span-3 space-y-4">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-3">
                {course.level && (
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 py-1">
                    <Target className="h-3 w-3 mr-1.5" />
                    {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                  </Badge>
                )}
                {course.language && (
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm px-3 py-1">
                    <Globe className="h-3 w-3 mr-1.5" />
                    {course.language}
                  </Badge>
                )}
                {capstoneProjects.length > 0 && (
                  <Badge className="bg-emerald-500/90 text-white border-0 px-3 py-1">
                    <Award className="h-3 w-3 mr-1.5" />
                    Capstone Included
                  </Badge>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
                {course.title}
              </h1>

              {/* Description */}
              {course.description && (
                <p className="text-lg text-white/80 leading-relaxed max-w-2xl line-clamp-3">
                  {course.description}
                </p>
              )}

              {/* Instructor */}
              {teacher && (
                <div className="flex items-center gap-4 pt-2">
                  <Avatar className="h-12 w-12 border-2 border-white/30">
                    {teacher.avatar_url ? (
                      <AvatarImage src={teacher.avatar_url} alt={teacher.full_name} />
                    ) : (
                      <AvatarFallback className="bg-white/20 text-white">
                        {teacher.full_name?.charAt(0) || 'T'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <p className="text-white/60 text-sm">Instructor</p>
                    <p className="text-white font-semibold">{teacher.full_name}</p>
                  </div>
                </div>
              )}

              {/* Stats Row */}
              <div className="flex flex-wrap items-center gap-6 pt-2 text-white/80">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  <span className="font-medium">{totalLessons} Lessons</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  <span className="font-medium">{Math.round(totalDuration / 60)} Hours</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <span className="font-medium">{chapters.length} Chapters</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  <span className="font-medium">Certificate</span>
                </div>
              </div>

              {/* Content Type Stats - Below Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <div className="w-11 h-11 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <Play className="h-5 w-5 text-blue-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{counts.videos}</p>
                    <p className="text-xs text-white/60">Videos</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <div className="w-11 h-11 rounded-xl bg-purple-500/20 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-purple-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{counts.reading}</p>
                    <p className="text-xs text-white/60">Reading</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <div className="w-11 h-11 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <ClipboardList className="h-5 w-5 text-orange-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{counts.quizzes}</p>
                    <p className="text-xs text-white/60">Quizzes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20">
                  <div className="w-11 h-11 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <Award className="h-5 w-5 text-green-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{counts.assignments}</p>
                    <p className="text-xs text-white/60">Assignments</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Course Card - 2 columns */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden shadow-2xl border-0 bg-white">
                {/* Thumbnail with Play Button */}
                <div className="relative aspect-video bg-gray-900 group cursor-pointer" onClick={() => {
                  if (course.welcome_video_url) {
                    setShowQuiz(false);
                    setCurrentLesson(null);
                    setCurrentLessonId(null);
                    setIsWelcomeSelected(true);
                  }
                }}>
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#0A400C] to-[#116315] flex items-center justify-center">
                      <BookOpen className="h-16 w-16 text-white/30" />
                    </div>
                  )}
                  {/* Play Button Overlay */}
                  {course.welcome_video_url && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play className="h-8 w-8 text-[#0A400C] ml-1" fill="currentColor" />
                      </div>
                    </div>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Price Display */}
                  {isPaidCourse && (
                    <div className="text-center space-y-1">
                      {earlyBird?.active && (
                        <>
                          <EarlyBirdCountdown
                            endsAt={earlyBird.endsAt}
                            seatsLeft={earlyBird.seatsLeft}
                            className="flex flex-col items-center"
                          />
                          <p className="text-sm text-gray-400 line-through">
                            {formattedPriceForAmount(earlyBird.regularPrice)}
                          </p>
                        </>
                      )}
                      <span className="text-3xl font-bold text-gray-900">{formattedPrice()}</span>
                      {earlyBird?.active && earlyBird.savings > 0 && (
                        <p className="text-xs text-orange-600 font-medium">
                          Save {formattedPriceForAmount(earlyBird.savings)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* CTA Button */}
                  {isPaidCourse && !hasAccess ? (
                    renderPaidCourseActions()
                  ) : (
                    <Button
                      className="w-full h-11 bg-[#0A400C] hover:bg-[#0d5210] text-white font-semibold text-sm shadow-md rounded-xl transition-all hover:shadow-lg"
                      onClick={handleStartLearning}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      {progressPercent > 0
                        ? "Continue Learning"
                        : currentLesson
                          ? "Go to Lesson"
                          : "Start Learning"}
                    </Button>
                  )}

                  {/* Quick Info */}
                  <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{Math.round(totalDuration / 60)}h total</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5" />
                      <span>{totalLessons} lessons</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Course Overview Section — Compact */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid lg:grid-cols-3 gap-5">
            {/* What you'll learn: shown only when the teacher has written outcomes */}
            <div className="lg:col-span-2">
              {learningOutcomes.length > 0 && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-lg bg-[#0A400C]/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-[#0A400C]" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">What you'll learn</h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {learningOutcomes.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100">
                        <CheckCircle2 className="h-4 w-4 text-[#0A400C] flex-shrink-0" />
                        <span className="text-gray-700 text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Requirements */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Target className="h-4 w-4 text-orange-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Requirements</h2>
              </div>
              <div className="space-y-1.5">
                {course.requirements ? (
                  course.requirements.split('\n').filter(r => r.trim()).map((req, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-orange-50 border border-orange-100">
                      <div className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-[10px] font-semibold text-orange-700">{index + 1}</span>
                      </div>
                      <span className="text-gray-700 text-xs">{req}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-50 border border-orange-100">
                      <div className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-orange-700">1</span>
                      </div>
                      <span className="text-gray-700 text-xs">Basic computer skills</span>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-50 border border-orange-100">
                      <div className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-orange-700">2</span>
                      </div>
                      <span className="text-gray-700 text-xs">Willingness to learn</span>
                    </div>
                    <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-50 border border-orange-100">
                      <div className="w-5 h-5 rounded-full bg-orange-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-semibold text-orange-700">3</span>
                      </div>
                      <span className="text-gray-700 text-xs">Internet connection</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div id="course-learning-content" className="max-w-7xl mx-auto px-6 py-8 scroll-mt-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Side - Content Player */}
          <div className="lg:col-span-2">
            {/* PAYWALL OVERLAY: shown when current lesson is locked */}
            {currentLessonLocked ? (
              <Card className="border-2 border-orange-200">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto">
                    <Lock className="h-8 w-8 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Content Locked</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    This lesson is part of the paid content. Purchase this course to unlock all chapters and lessons.
                  </p>
                  {course && (
                    <div className="text-2xl font-bold text-gray-900">{formattedPrice()}</div>
                  )}
                  {renderPaidCourseActions({
                    buyClassName: "bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-lg",
                    iconClassName: "h-5 w-5",
                    stacked: false,
                  })}
                </CardContent>
              </Card>
            ) : isWelcomeSelected && course.welcome_video_url ? (
              <Card>
                <CardContent className="p-4">
                  <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                    <iframe
                      className="absolute top-0 left-0 w-full h-full rounded-lg"
                      src={course.welcome_video_url.includes("youtube.com") || course.welcome_video_url.includes("youtu.be")
                        ? course.welcome_video_url.replace("watch?v=", "embed/").split("&")[0]
                        : course.welcome_video_url
                      }
                      title="Welcome Video"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </CardContent>
              </Card>
            ) : showQuiz && currentLesson && userId ? (
              <Card>
                <CardContent className="p-6">
                  <QuizPanel
                    lessonId={currentLesson.id}
                    preview={!isStudent}
                    onPassed={handleQuizComplete}
                  />
                </CardContent>
              </Card>
            ) : (
              <CourseContentPlayer
                lesson={currentLesson}
                studentId={userId || undefined}
                onComplete={handleLessonComplete}
                progressPercent={getProgressPercent()}
                isPreviewMode={!isStudent}
              />
            )}
          </div>

          {/* Right Side - Curriculum */}
          <div className="space-y-6">
            {/* Assignments Card - Only for students */}
            {userId && isStudent && getCounts().assignments > 0 && (
              <Card className="border-2 border-orange-200 bg-orange-50/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-orange-100 rounded-full p-3">
                      <ClipboardList className="h-6 w-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-orange-900">Assignments</h3>
                      <p className="text-xs text-orange-700">
                        {getCounts().assignments} assignment{getCounts().assignments !== 1 ? 's' : ''} available
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/student/assignments')}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Submit Your Assignment
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Course Curriculum */}
            <CourseCurriculum
              chapters={chapters}
              currentLessonId={currentLessonId || undefined}
              onLessonClick={handleLessonClick}
              welcomeVideoUrl={course.welcome_video_url}
              onSelectWelcome={() => {
                setShowQuiz(false);
                setCurrentLesson(null);
                setCurrentLessonId(null);
                setIsWelcomeSelected(true);
              }}
              isWelcomeSelected={isWelcomeSelected}
              isPaidCourse={isPaidCourse}
              hasAccess={hasAccess ?? false}
            />

            {/* Capstone Project Card - Only for students */}
            {canManageCapstone && (
              <Card className="border-2 border-green-200 bg-gradient-to-br from-white via-green-50/70 to-emerald-50/70">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-green-100 rounded-full p-3">
                      <Award className="h-6 w-6 text-green-700" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-950">Capstone Project</h3>
                      <p className="text-xs text-green-700">
                        Final project with submission workspace
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-medium text-green-900">
                      {capstoneProjects.length} Capstone Project{capstoneProjects.length !== 1 ? "s" : ""}
                    </p>
                    {capstoneProjects.map((cp, idx) => (
                      <p key={idx} className="text-xs text-green-700 line-clamp-1">
                        • {cp.title}
                      </p>
                    ))}
                  </div>
                  <Button
                    onClick={() => {
                      if (capstoneLocked) {
                        setShowPurchaseDialog(true);
                        return;
                      }
                      scrollToCapstone();
                    }}
                    className="w-full"
                    variant={capstoneLocked ? "default" : "outline"}
                  >
                    {capstoneLocked ? "Unlock Capstone" : "Open Capstone Workspace"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {canManageCapstone && capstoneProjects.length > 0 && (
          <section id={capstoneSectionId} className="mt-8 scroll-mt-24 space-y-8">
            {capstoneProjects.map((cp, cpIdx) => (
              <div key={cp.id || cpIdx}>
                <div className="rounded-[2rem] bg-gradient-to-br from-[#0A400C] via-[#0d5210] to-[#116315] p-6 text-white shadow-2xl sm:p-8">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl space-y-4">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                        <Award className="h-4 w-4" />
                        {capstoneProjects.length > 1 ? `Capstone ${cpIdx + 1} of ${capstoneProjects.length}` : "Final Capstone"}
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">{cp.title}</h2>
                        <p className="max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
                          Review the project brief, prepare everything your teacher requested, and submit your work directly from this page.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className="rounded-full bg-white/10 px-4 py-2 text-white/90 backdrop-blur-sm">
                          {cp.requirements.length} requirement{cp.requirements.length !== 1 ? "s" : ""}
                        </div>
                        {cp.due_date && (
                          <div className="rounded-full bg-white/10 px-4 py-2 text-white/90 backdrop-blur-sm">
                            Due {new Date(cp.due_date).toLocaleDateString()}
                          </div>
                        )}
                        <div className="rounded-full bg-white/10 px-4 py-2 text-white/90 backdrop-blur-sm">
                          Submit links and project notes
                        </div>
                      </div>
                    </div>
                    <div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm lg:max-w-sm">
                      <h3 className="font-semibold text-white">Before you submit</h3>
                      <div className="mt-4 space-y-3 text-sm text-white/80">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-300" />
                          <p>Double-check that each repository, demo, or document link opens publicly.</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-300" />
                          <p>Add a short summary describing what you built and the main outcomes.</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-300" />
                          <p>You can come back later and update your submission before final review.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  {capstoneLocked ? (
                    <Card className="border-2 border-green-200">
                      <CardContent className="p-8 text-center space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                          <Lock className="h-8 w-8 text-green-700" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold text-gray-900">Unlock the Capstone Workspace</h3>
                          <p className="mx-auto max-w-2xl text-gray-600">
                            Purchase this course to view the complete capstone instructions and submit the links and notes required by your teacher.
                          </p>
                        </div>
                        {renderPaidCourseActions({
                          buyClassName: "bg-[#0A400C] hover:bg-[#0d5210] text-white px-8",
                          stacked: false,
                        })}
                      </CardContent>
                    </Card>
                  ) : (
                    <CapstoneSubmission
                      capstoneProject={cp}
                      studentId={userId}
                    />
                  )}
                </div>
              </div>
            ))}
          </section>
        )}
      </div>

      {/* Purchase Dialog */}
      {course && showPurchaseDialog && (
        <PurchaseDialog
          open={showPurchaseDialog}
          onOpenChange={(val) => { if (!val) setShowPurchaseDialog(false); }}
          type="course"
          item={{
            id: course.id,
            title: course.title,
            price: (displayPrice ?? course.price) || 0,
            currency: displayCurrency || course.currency || 'RWF',
          }}
          onSuccess={() => {
            if (course) setAccessResult({ courseId: course.id, userId: authUser?.id || null, allowed: true });
            setShowPurchaseDialog(false);
            toast({ title: "Purchase Successful!", description: "You now have full access to this course" });
          }}
          earlyBird={earlyBird}
          instalmentAvailable={instalmentAvailable}
          cohortId={cohortCheckoutId || undefined}
          fullPrice={displayPrice ?? course.price ?? 0}
          depositPercent={instalmentDepositPercent}
        />
      )}

      {course && (
        <ScholarshipApplyDialog
          open={showScholarshipDialog}
          onOpenChange={setShowScholarshipDialog}
          courseId={course.id}
          courseTitle={course.title}
        />
      )}
    </div>
  );
}
