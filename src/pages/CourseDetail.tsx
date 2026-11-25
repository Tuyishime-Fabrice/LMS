import { courseJsonLd, usePageMeta } from "@/lib/pageMeta";
import { CourseAtAGlance } from "@/features/enrolment/CourseAtAGlance";
import { SiteHeader } from "@/features/site/SiteHeader";
import { useTranslation } from "react-i18next";
import { SiteFooter } from "@/features/site/SiteFooter";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Clock, BookOpen, Globe, Award, FileText, ClipboardList, Play, CheckCircle2, GraduationCap, Lock, ShoppingCart, Check } from "lucide-react";
import { PlusLevel, PlusMark, PlusMotif } from "@/components/brand/PlusMotif";
import { isCourseLevel } from "@/components/brand/courseLevel";
import { CourseThumb } from "@/features/learning/CourseThumb";
import { formatAmount } from "@/features/site/landing-data";
import { CourseCurriculum } from "@/components/CourseCurriculum";
import { CourseContentPlayer } from "@/components/CourseContentPlayer";
import { QuizPanel } from "@/features/learning/QuizPanel";
import { CapstoneSubmission } from "@/components/CapstoneSubmission";
import { useToast } from "@/hooks/use-toast";
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
  category?: string | null;
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
  const { t, i18n } = useTranslation();
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
  usePageMeta({
    title: course?.title,
    description: course?.description ? course.description.slice(0, 160) : undefined,
    path: id ? `/course/${id}` : undefined,
    jsonLd: course ? courseJsonLd({ id: course.id, title: course.title, description: course.description, language: course.language, price: course.price, currency: course.currency, isFree: course.is_free === true }) : null,
  });

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
      toast({ title: t("courseDetail.error", "Error"), description: t("courseDetail.failedToLoadCourse", "Failed to load course"), variant: "destructive" });
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

  // Same format as the catalogue and home page: "RWF 50,000".
  const formattedPriceForAmount = (amount: number, currency = displayCurrency || course?.currency || "RWF") =>
    formatAmount(amount, currency, i18n.language);

  const renderPaidCourseActions = (options?: {
    buyClassName?: string;
    iconClassName?: string;
    stacked?: boolean;
  }) => {
    const buyClass =
      options?.buyClassName ||
      "w-full h-11 bg-action hover:bg-action-hover text-white font-semibold text-sm rounded-xl";
    const iconClass = options?.iconClassName || "h-4 w-4";
    const wrapperClass = options?.stacked === false ? "flex flex-wrap gap-2" : "space-y-2";

    return (
      <div className={wrapperClass}>
        <Button className={buyClass} onClick={handlePurchaseClick}>
          <ShoppingCart className={`${iconClass} mr-2`} />
          {t("courseDetail.buyThisCourse2", "Buy this course")}
        </Button>
        {scholarshipAvailable && (
          <Button
            variant="outline"
            className={
              options?.stacked === false
                ? "border-primary text-primary"
                : "w-full h-11 border-primary text-primary font-semibold text-sm rounded-xl"
            }
            onClick={() => setShowScholarshipDialog(true)}
          >
            {t("courseDetail.applyForScholarship2", "Apply for a scholarship")}
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

    toast({ title: t("courseDetail.pleaseCreateAnAccountOrSign", "Please create an account or sign in to continue") });
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
        toast({ title: t("courseDetail.contentLocked", "Content Locked"), description: t("courseDetail.purchaseThisCourseToAccessThis", "Purchase this course to access this content"), variant: "destructive" });
        setShowPurchaseDialog(true);
        return;
      }
    }

    if (lesson.content_type === "quiz") {
      // Teachers can view quiz but not take it
      if (!isStudent) {
        toast({ title: t("courseDetail.previewMode", "Preview Mode"), description: t("courseDetail.teachersCanViewQuizQuestionsBut", "Teachers can view quiz questions but cannot submit answers") });
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
            toast({ title: t("courseDetail.openedInNewTab", "Opened in new tab"), description: t("courseDetail.markedAsCompleted", "Marked as completed") });
          } catch (e) {
            console.error("Error marking URL lesson complete", e);
          }
        } else if (!isStudent) {
          toast({ title: t("courseDetail.openedInNewTab", "Opened in new tab"), description: t("courseDetail.previewModeProgressNotTracked", "Preview mode - progress not tracked") });
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
        title: t("courseDetail.noLessonsYet", "No lessons yet"),
        description: t("courseDetail.thisCourseCurriculumIsStillBeing", "This course curriculum is still being set up."),
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
    toast({ title: t("courseDetail.quizCompleted", "Quiz completed!"), description: t("courseDetail.greatJobMovingToNextLesson", "Great job! Moving to next lesson...") });
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
        return "bg-leaf text-leaf-foreground";
      case "intermediate":
        return "bg-warning-surface text-warning";
      case "advanced":
        return "bg-destructive-surface text-destructive";
      default:
        return "bg-muted text-forest";
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
  const level = course.level ? String(course.level).toLowerCase() : null;
  const languageName = (code: string) => (code === "fr" ? "Français" : code === "en" ? "English" : code);
  const previewLessonId = (() => {
    for (const chapter of chapters) {
      const lesson = chapter.lessons.find((item) => chapter.is_preview || item.is_preview);
      if (lesson) return lesson.id;
    }
    return null;
  })();
  const signedIn = Boolean(userId);
  // Visitors see the curriculum; the player and the locked panel appear after sign-in or for an open preview.
  const showPlayer = signedIn || isWelcomeSelected || Boolean(currentLesson && !currentLessonLocked);
  const counts = getCounts();
  const progressPercent = getProgressPercent();
  const totalDuration = getTotalDuration();
  const totalLessons = getTotalLessons();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      {/* Hero: cream, on the shared content width; the cover is generated from the course data. */}
      <section className="border-b bg-background" aria-labelledby="course-title">
        <div className="mx-auto max-w-site px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pb-14">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2 mb-6 text-forest hover:bg-mint">
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            {t("courseDetail.back", "Back")}
          </Button>

          <div className="grid items-start gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
            <div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-forest">
                {level && isCourseLevel(level) && (
                  <span className="inline-flex items-center gap-1.5"><PlusLevel level={level} label="" size={20} />{t(`level.${level}`, level.charAt(0).toUpperCase() + level.slice(1))}</span>
                )}
                {course.language && <span className="inline-flex items-center gap-1.5"><Globe className="h-4 w-4 text-primary" aria-hidden />{t("courseDetail.taughtIn", "Taught in {{language}}", { language: languageName(course.language) })}</span>}
                {capstoneProjects.length > 0 && <span className="inline-flex items-center gap-1.5"><Award className="h-4 w-4 text-primary" aria-hidden />{t("courseDetail.capstoneIncluded2", "Capstone project")}</span>}
              </div>
              <h1 id="course-title" className="mt-4 text-[2.25rem] font-bold leading-[1.1] text-forest sm:text-5xl">{course.title}</h1>
              {course.description && <p className="mt-5 max-w-2xl text-lg leading-8 text-olive-ink/85">{course.description}</p>}
              <ul className="tabular mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[0.9375rem] text-olive-ink/85">
                <li className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" aria-hidden />{t("courseDetail.lessonsCount", { count: totalLessons, defaultValue_one: "{{count}} lesson", defaultValue_other: "{{count}} lessons" })}</li>
                <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" aria-hidden />{t("courseDetail.hoursShort", "{{count}} h", { count: Math.max(1, Math.round(totalDuration / 60)) })}</li>
                <li className="flex items-center gap-2"><FileText className="h-4 w-4 text-primary" aria-hidden />{t("courseDetail.modulesCount", { count: chapters.length, defaultValue_one: "{{count}} module", defaultValue_other: "{{count}} modules" })}</li>
                <li className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" aria-hidden />{t("courseDetail.certificate", "Certificate")}</li>
              </ul>
              {teacher && (
                <div className="mt-8 flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    {teacher.avatar_url ? <AvatarImage src={teacher.avatar_url} alt="" /> : <AvatarFallback className="bg-mint text-forest">{teacher.full_name?.charAt(0) || "?"}</AvatarFallback>}
                  </Avatar>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("courseDetail.instructor", "Instructor")}</p>
                    <p className="font-semibold text-forest">{teacher.full_name}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border bg-card lg:sticky lg:top-24">
              {course.welcome_video_url ? (
                <button
                  type="button"
                  className="group relative block w-full text-left"
                  onClick={() => {
                    setShowQuiz(false);
                    setCurrentLesson(null);
                    setCurrentLessonId(null);
                    setIsWelcomeSelected(true);
                    scrollToLearningContent();
                  }}
                  aria-label={t("courseDetail.playWelcome", "Play the welcome video")}
                >
                  <CourseThumb title={course.title} category={course.category} className="aspect-[16/9] rounded-none" />
                  <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-sm font-semibold text-forest shadow-[var(--shadow-float)]">
                    <Play className="h-4 w-4 text-action" fill="currentColor" aria-hidden />{t("courseDetail.welcomeVideo", "Welcome video")}
                  </span>
                </button>
              ) : (
                <CourseThumb title={course.title} category={course.category} className="aspect-[16/9] rounded-none" />
              )}
              <div className="space-y-4 p-5">
                {isPaidCourse ? (
                  <div>
                    {earlyBird?.active && (
                      <EarlyBirdCountdown endsAt={earlyBird.endsAt} seatsLeft={earlyBird.seatsLeft} className="mb-2 flex flex-col" />
                    )}
                    <p className="tabular flex flex-wrap items-baseline gap-x-3">
                      <span className="font-display text-3xl font-bold text-forest">{formattedPrice()}</span>
                      {earlyBird?.active && <span className="text-sm text-muted-foreground line-through">{formattedPriceForAmount(earlyBird.regularPrice)}</span>}
                    </p>
                  </div>
                ) : (
                  <p className="font-display text-3xl font-bold text-success">{t("courseDetail.free", "Free")}</p>
                )}

                {isPaidCourse && !hasAccess ? (
                  renderPaidCourseActions()
                ) : (
                  <Button className="h-11 w-full text-sm font-semibold" onClick={handleStartLearning}>
                    {progressPercent > 0
                      ? t("courseDetail.continueLearning2", "Continue learning")
                      : currentLesson
                        ? t("courseDetail.goToLesson2", "Go to lesson")
                        : t("courseDetail.startLearning2", "Start learning")}
                  </Button>
                )}

                {previewLessonId && isPaidCourse && !hasAccess && (
                  <Button variant="outline" className="h-11 w-full text-sm font-semibold text-forest" onClick={() => { void handleLessonClick(previewLessonId); scrollToLearningContent(); }}>
                    {t("courseDetail.tryFreeLesson", "Try a free lesson")}
                  </Button>
                )}

                {isPaidCourse && !hasAccess && (
                  <ul className="space-y-1.5 border-t pt-4 text-sm text-olive-ink/85">
                    <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{t("landing.pricing.momo", "MTN Mobile Money or Airtel Money")}</li>
                    {instalmentAvailable && <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{t("courseDetail.instalments", "Two instalments on cohort places")}</li>}
                    {scholarshipAvailable && <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{t("courseDetail.scholarshipOpen", "Scholarship applications are open")}</li>}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <CourseAtAGlance courseId={course.id} counts={counts} hasCapstone={capstoneProjects.length > 0} />

      {/* For visitors and learners alike: what the course leads to, and the capstone brief. */}
      <section className="border-b bg-card" aria-labelledby="course-outcomes">
        <div className="mx-auto grid max-w-site gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.35fr_1fr] lg:gap-14 lg:px-8">
          <div>
            {learningOutcomes.length > 0 && (
              <>
                <h2 id="course-outcomes" className="text-2xl font-bold text-forest">{t("courseDetail.outcomesTitle", "You will be able to")}</h2>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {learningOutcomes.map((item, index) => (
                    <li key={index} className="flex gap-3 text-[0.9375rem] leading-6 text-olive-ink"><PlusMark className="mt-1.5" />{item}</li>
                  ))}
                </ul>
              </>
            )}
            {capstoneProjects.length > 0 && (
              <div className={learningOutcomes.length > 0 ? "mt-10" : ""}>
                <h2 className="text-2xl font-bold text-forest">{t("courseDetail.capstoneBriefTitle", "The capstone")}</h2>
                <p className="mt-3 max-w-2xl text-[0.9375rem] leading-7 text-olive-ink/85">
                  {t("courseDetail.capstoneBriefBody", "The course ends with a real problem, worked through the five-step framework and marked by your instructor. A mark of 65% or more earns the certificate.")}
                </p>
                <ul className="mt-4 space-y-2">
                  {capstoneProjects.map((cp, index) => (
                    <li key={cp.id || index} className="flex items-center gap-3 text-[0.9375rem] font-medium text-forest">
                      <PlusMotif variant="stepped" size={22} layersLit={3} />{cp.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-forest">{t("courseDetail.requirements2", "Before you start")}</h2>
            <ul className="mt-3 space-y-2 text-[0.9375rem] text-olive-ink/85">
              {(course.requirements ? course.requirements.split("\n").filter((r) => r.trim()) : [
                t("courseDetail.basicComputerSkills", "Basic computer skills"),
                t("courseDetail.internetConnection", "Internet connection"),
              ]).map((req, index) => (
                <li key={index} className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />{req}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div id="course-learning-content" className="mx-auto max-w-site scroll-mt-20 px-4 py-10 sm:px-6 lg:px-8">
        <div className={showPlayer ? "grid grid-cols-1 gap-6 lg:grid-cols-3" : "mx-auto max-w-3xl"}>
          {/* Left Side - Content Player (after sign-in, or while a visitor opens a free preview) */}
          {showPlayer && (
          <div className="lg:col-span-2">
            {/* PAYWALL OVERLAY: shown when current lesson is locked */}
            {currentLessonLocked ? (
              <Card className="border-2 border-warning/30">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-warning-surface flex items-center justify-center mx-auto">
                    <Lock className="h-8 w-8 text-warning" />
                  </div>
                  <h3 className="text-xl font-bold text-forest">{t("courseDetail.contentLocked2", "This lesson is locked")}</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    {t("courseDetail.paidLessonNote", "This lesson is part of the paid content. Buy this course to open every module and lesson.")}
                  </p>
                  {course && (
                    <div className="text-2xl font-bold text-forest">{formattedPrice()}</div>
                  )}
                  {renderPaidCourseActions({
                    buyClassName: "bg-action hover:bg-action-hover text-white px-8 py-3 text-lg",
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
          )}

          {/* Right Side - Curriculum */}
          <div className="space-y-6">
            {/* Assignments Card - Only for students */}
            {userId && isStudent && getCounts().assignments > 0 && (
              <Card className="border-2 border-warning/30 bg-orange-50/50">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-warning-surface rounded-full p-3">
                      <ClipboardList className="h-6 w-6 text-warning" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-warning">{t("courseDetail.assignments", "Assignments")}</h3>
                      <p className="text-xs text-warning">
                        {getCounts().assignments} assignment{getCounts().assignments !== 1 ? 's' : ''} available
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate('/student/assignments')}
                    className="w-full bg-action hover:bg-action-hover text-white"
                  >
                    {t("courseDetail.submitYourAssignment", "Submit Your Assignment")}
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
              showProgress={signedIn}
            />

            {/* Capstone Project Card - Only for students */}
            {canManageCapstone && (
              <Card className="border-2 border-primary/30">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-leaf rounded-full p-3">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-950">{t("courseDetail.capstoneProject", "Capstone Project")}</h3>
                      <p className="text-xs text-primary">
                        {t("courseDetail.finalProjectWithSubmissionWorkspace", "Final project with submission workspace")}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <p className="text-sm font-medium text-leaf-foreground">
                      {capstoneProjects.length}{" "}{t("courseDetail.capstoneProject", "Capstone Project")}{capstoneProjects.length !== 1 ? "s" : ""}
                    </p>
                    {capstoneProjects.map((cp, idx) => (
                      <p key={idx} className="text-xs text-primary line-clamp-1">
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
                    {capstoneLocked ? t("courseDetail.getCapstoneAccess", "Get capstone access") : t("courseDetail.openCapstoneWorkspace", "Open Capstone Workspace")}
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
                <div className="rounded-[2rem] p-6 text-white sm:p-8 bg-forest">
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-3xl space-y-4">
                      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium">
                        <Award className="h-4 w-4" />
                        {capstoneProjects.length > 1 ? `Capstone ${cpIdx + 1} of ${capstoneProjects.length}` : t("courseDetail.finalCapstone", "Final Capstone")}
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">{cp.title}</h2>
                        <p className="max-w-2xl text-sm leading-6 text-white/80 sm:text-base">
                          {t("courseDetail.reviewTheProjectBriefPrepareEverything", "Review the project brief, prepare everything your teacher requested, and submit your work directly from this page.")}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <div className="rounded-full bg-white/10 px-4 py-2 text-white/90">
                          {cp.requirements.length} requirement{cp.requirements.length !== 1 ? "s" : ""}
                        </div>
                        {cp.due_date && (
                          <div className="rounded-full bg-white/10 px-4 py-2 text-white/90">
                            {t("courseDetail.due", "Due {{toLocaleDateString}}", { toLocaleDateString: new Date(cp.due_date).toLocaleDateString() })}
                          </div>
                        )}
                        <div className="rounded-full bg-white/10 px-4 py-2 text-white/90">
                          {t("courseDetail.submitLinksAndProjectNotes", "Submit links and project notes")}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/15 bg-white/10 p-5 lg:max-w-sm">
                      <h3 className="font-semibold text-white">{t("courseDetail.beforeYouSubmit", "Before you submit")}</h3>
                      <div className="mt-4 space-y-3 text-sm text-white/80">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-300" />
                          <p>{t("courseDetail.doubleCheckThatEachRepositoryDemo", "Double-check that each repository, demo, or document link opens publicly.")}</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-300" />
                          <p>{t("courseDetail.addAShortSummaryDescribingWhat", "Add a short summary describing what you built and the main outcomes.")}</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-300" />
                          <p>{t("courseDetail.youCanComeBackLaterAnd", "You can come back later and update your submission before final review.")}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  {capstoneLocked ? (
                    <Card className="border-2 border-primary/30">
                      <CardContent className="p-8 text-center space-y-4">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-leaf">
                          <Lock className="h-8 w-8 text-primary" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold text-forest">{t("courseDetail.capstoneWorkspaceLocked", "The capstone workspace opens after purchase")}</h3>
                          <p className="mx-auto max-w-2xl text-muted-foreground">
                            {t("courseDetail.purchaseThisCourseToViewThe", "Purchase this course to view the complete capstone instructions and submit the links and notes required by your teacher.")}
                          </p>
                        </div>
                        {renderPaidCourseActions({
                          buyClassName: "bg-action hover:bg-action-hover text-white px-8",
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
            toast({ title: t("courseDetail.purchaseSuccessful", "Purchase Successful!"), description: t("courseDetail.youNowHaveFullAccessTo", "You now have full access to this course") });
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
      <SiteFooter />
    </div>
  );
}
