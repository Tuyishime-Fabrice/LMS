import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, CircleHelp, ClipboardList, Clock, Download, ExternalLink,
  FileText, GraduationCap, Link2, ListChecks, MessageSquare, PanelLeft, PlayCircle, Send, X, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import { TutorPanel } from "@/features/tutor/TutorPanel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Brand } from "@/components/shell/Brand";
import { ErrorState, ProgressBar, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { CapstoneSubmission } from "@/components/CapstoneSubmission";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  flattenLessons, recordLessonVisit, resolveLessonFileUrl, setLessonCompleted,
  type CourseOutline, type LessonType,
} from "@/features/learning/api";
import { useCourseOutline, useDateLocale } from "@/features/learning/hooks";
import { PdfReader } from "@/features/learning/PdfReader";
import { VideoLesson } from "@/features/learning/VideoLesson";
import { QuizPanel } from "@/features/learning/QuizPanel";
import { cn } from "@/lib/utils";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

const typeMeta: Record<LessonType, { icon: LucideIcon; key: string; label: string }> = {
  video: { icon: PlayCircle, key: "room.type.video", label: "Video" },
  pdf: { icon: FileText, key: "room.type.pdf", label: "Reading" },
  document: { icon: FileText, key: "room.type.document", label: "Document" },
  url: { icon: Link2, key: "room.type.url", label: "Resource" },
  quiz: { icon: ListChecks, key: "room.type.quiz", label: "Quiz" },
  assignment: { icon: ClipboardList, key: "room.type.assignment", label: "Assignment" },
};

type FlatLesson = ReturnType<typeof flattenLessons>[number];

/* ----------------------------------------------------------------------- */
/* Curriculum                                                              */
/* ----------------------------------------------------------------------- */

function LessonState({ completed, current }: { completed: boolean; current: boolean }) {
  if (completed) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
    );
  }
  return (
    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
      current ? "border-primary" : "border-forest/20")}>
      {current && <span className="h-2 w-2 rounded-full bg-primary" />}
    </span>
  );
}

function Curriculum({ outline, currentLessonId, capstoneActive, onNavigate }: {
  outline: CourseOutline; currentLessonId: string | null; capstoneActive: boolean; onNavigate: () => void;
}) {
  const { t } = useTranslation();
  const courseId = outline.course.id;
  const currentChapterId = outline.chapters.find((chapter) => chapter.lessons.some((lesson) => lesson.id === currentLessonId))?.id;
  const [open, setOpen] = useState<Set<string>>(() => new Set(currentChapterId ? [currentChapterId] : outline.chapters.slice(0, 1).map((c) => c.id)));

  useEffect(() => {
    if (currentChapterId) setOpen((previous) => (previous.has(currentChapterId) ? previous : new Set(previous).add(currentChapterId)));
  }, [currentChapterId]);

  const toggle = (id: string) => setOpen((previous) => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  return (
    <nav aria-label={t("room.curriculum", "Course content")} className="pb-6">
      <ol>
        {outline.chapters.map((chapter) => {
          const done = chapter.lessons.filter((lesson) => lesson.completed).length;
          const isOpen = open.has(chapter.id);
          const complete = chapter.lessons.length > 0 && done === chapter.lessons.length;
          return (
            <li key={chapter.id} className="border-b">
              <button
                type="button"
                onClick={() => toggle(chapter.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-forest/[0.04]"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-5 text-forest">{chapter.title}</span>
                  <span className="tabular mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {complete && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    {t("room.moduleProgress", "{{done}} of {{total}} complete", { done, total: chapter.lessons.length })}
                  </span>
                </span>
                <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <ol className="pb-2">
                  {chapter.lessons.map((lesson) => {
                    const meta = typeMeta[lesson.type] || typeMeta.document;
                    const current = lesson.id === currentLessonId && !capstoneActive;
                    return (
                      <li key={lesson.id}>
                        <Link
                          to={`/learn/${courseId}/${lesson.id}`}
                          onClick={onNavigate}
                          aria-current={current ? "page" : undefined}
                          className={cn(
                            "relative flex items-start gap-3 py-2.5 pl-4 pr-3 text-sm transition-colors hover:bg-forest/[0.04]",
                            current && "bg-leaf/70 hover:bg-leaf/70",
                          )}
                        >
                          {current && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}
                          <span className="mt-0.5"><LessonState completed={lesson.completed} current={current} /></span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block leading-5", current ? "font-semibold text-forest" : "text-foreground/90")}>{lesson.title}</span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <meta.icon className="h-3.5 w-3.5" />
                              <span className="tabular">{t(meta.key, meta.label)}{lesson.duration ? `, ${lesson.duration} min` : ""}</span>
                              <span className="sr-only">
                                {lesson.completed ? `, ${t("room.state.completed", "completed")}` : current ? `, ${t("room.state.current", "current lesson")}` : ""}
                              </span>
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </li>
          );
        })}
        {outline.capstone && (
          <li className="border-b">
            <Link
              to={`/learn/${courseId}?capstone=1`}
              onClick={onNavigate}
              aria-current={capstoneActive ? "page" : undefined}
              className={cn("relative flex items-center gap-3 px-4 py-3.5 text-sm transition-colors hover:bg-forest/[0.04]", capstoneActive && "bg-leaf/70")}
            >
              {capstoneActive && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}
              <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-forest">{t("room.capstone", "Capstone project")}</span>
                <span className="block truncate text-xs text-muted-foreground">{outline.capstone.title}</span>
              </span>
            </Link>
          </li>
        )}
      </ol>
    </nav>
  );
}

/* ----------------------------------------------------------------------- */
/* Help panel                                                              */
/* ----------------------------------------------------------------------- */

function HelpPanel({ outline, lesson, fileUrl, canAsk }: {
  outline: CourseOutline; lesson: FlatLesson | null; fileUrl: string | null; canAsk: boolean;
}) {
  const { t } = useTranslation();
  const { user } = useAppAuth();
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const teacher = outline.teacher;

  const ask = async () => {
    if (!user || !teacher || !question.trim()) return;
    setSending(true);
    try {
      const existing = await supabase.from("conversations").select("id")
        .eq("student_id", user.id).eq("teacher_id", teacher.id).maybeSingle();
      let conversationId = existing.data?.id;
      if (!conversationId) {
        const created = await supabase.from("conversations")
          .insert({ student_id: user.id, teacher_id: teacher.id }).select("id").single();
        if (created.error) throw created.error;
        conversationId = created.data.id;
      }
      const context = lesson ? `${outline.course.title} › ${lesson.title}` : outline.course.title;
      const { error } = await supabase.from("direct_messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        message_text: `[${context}]\n${question.trim()}`,
      });
      if (error) throw error;
      setQuestion("");
      toast.success(t("room.help.sent", "Question sent. The reply will arrive in Messages."));
    } catch (error) {
      console.error("Could not send question", error);
      toast.error(t("room.help.sendError", "Your question could not be sent. Try again."));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 p-5">
      {lesson && user && (
        <TutorPanel lessonId={lesson.id} graded={lesson.type === "quiz" || lesson.type === "assignment"} />
      )}

      {teacher && (
        <section>
          <h3 className="text-xs font-medium text-muted-foreground">{t("room.help.instructor", "Your instructor")}</h3>
          <div className="mt-2 flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {teacher.avatarUrl && <AvatarImage src={teacher.avatarUrl} alt="" />}
              <AvatarFallback className="bg-leaf text-sm font-semibold text-leaf-foreground">
                {(teacher.name || "T").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-forest">{teacher.name || t("room.help.instructorFallback", "Course instructor")}</p>
              <Link to="/student/chat" className="text-sm font-medium text-primary hover:underline">
                {t("room.help.openMessages", "Open messages")}
              </Link>
            </div>
          </div>
        </section>
      )}

      {canAsk && teacher && (
        <section>
          <label htmlFor="lesson-question" className="text-card-title">{t("room.help.askTitle", "Ask about this lesson")}</label>
          <p className="mt-1 text-meta">
            {t("room.help.askBody", "Your instructor sees which lesson you are asking about.")}
          </p>
          <Textarea
            id="lesson-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={t("room.help.placeholder", "What is unclear?")}
            rows={4}
            className="mt-3 resize-none bg-card"
          />
          <Button onClick={() => void ask()} disabled={sending || !question.trim()} className="mt-3 w-full">
            <Send />
            {sending ? t("room.help.sending", "Sending…") : t("room.help.send", "Send question")}
          </Button>
        </section>
      )}

      <section>
        <h3 className="text-card-title">{t("room.help.resources", "Resources")}</h3>
        <ul className="mt-2 space-y-1.5 text-sm">
          {fileUrl && (
            <li>
              <a href={fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-2 font-medium text-forest hover:bg-forest/[0.05]">
                <Download className="h-4 w-4 text-primary" />
                {t("room.help.lessonFile", "Lesson file")}
              </a>
            </li>
          )}
          {outline.course.whatsappLink && (
            <li>
              <a href={outline.course.whatsappLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-2 font-medium text-forest hover:bg-forest/[0.05]">
                <MessageSquare className="h-4 w-4 text-primary" />
                {t("room.help.group", "Course WhatsApp group")}
                <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
              </a>
            </li>
          )}
          {!fileUrl && !outline.course.whatsappLink && (
            <li className="text-meta">{t("room.help.noResources", "This lesson has no extra resources.")}</li>
          )}
        </ul>
      </section>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Lesson body                                                             */
/* ----------------------------------------------------------------------- */

function LessonBody({ lesson, fileUrl, fileLoading, preview, onQuizPassed, onPosition }: {
  lesson: FlatLesson; fileUrl: string | null; fileLoading: boolean; preview: boolean;
  onQuizPassed: () => void; onPosition: (seconds: number) => void;
}) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const [readerFailed, setReaderFailed] = useState(false);
  useEffect(() => setReaderFailed(false), [lesson.id]);

  const docUrl = fileUrl || (lesson.type !== "video" ? lesson.contentUrl : null);
  const looksLikePdf = Boolean(docUrl) && (lesson.type === "pdf" || /\.pdf(\?|$)/i.test(docUrl || ""));

  if (lesson.type === "quiz") {
    return <QuizPanel lessonId={lesson.id} preview={preview} onPassed={onQuizPassed} />;
  }

  return (
    <div className="space-y-6">
      {lesson.type === "video" && lesson.contentUrl && (
        <VideoLesson url={lesson.contentUrl} title={lesson.title} startAt={lesson.lastPosition} onPosition={preview ? undefined : onPosition} />
      )}

      {lesson.type === "assignment" && (
        <div className="surface flex flex-wrap items-center gap-4 p-5">
          <ClipboardList className="h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-card-title">{t("room.assignment.title", "Submit your work")}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {lesson.dueDate
                ? t("room.assignment.due", "Due {{date}}", { date: format(new Date(lesson.dueDate), "EEEE d MMMM, HH:mm", { locale }) })
                : t("room.assignment.noDue", "Upload your file or share a link when you are ready.")}
            </p>
          </div>
          {!preview && (
            <Button asChild><Link to="/student/assignments">{t("room.assignment.cta", "Go to submission")}<ArrowRight /></Link></Button>
          )}
        </div>
      )}

      {lesson.description && (
        <div className="max-w-[68ch]">
          <h2 className="text-section-title">{t("room.about", "About this lesson")}</h2>
          <p className="mt-2 whitespace-pre-line text-[0.9375rem] leading-7 text-foreground/85">{lesson.description}</p>
        </div>
      )}

      {lesson.type === "url" && lesson.contentUrl && (
        <div className="surface flex flex-wrap items-center gap-4 p-5">
          <Link2 className="h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-card-title">{t("room.url.title", "External resource")}</p>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{lesson.contentUrl}</p>
          </div>
          <Button asChild variant="outline">
            <a href={lesson.contentUrl} target="_blank" rel="noreferrer">{t("room.url.open", "Open in a new tab")}<ExternalLink /></a>
          </Button>
        </div>
      )}

      {lesson.type !== "url" && (fileLoading ? (
        <SkeletonBlock className="h-[50vh]" />
      ) : docUrl ? (
        looksLikePdf && !readerFailed ? (
          <section aria-label={t("room.reading", "Reading material")}>
            {lesson.type === "video" && <h2 className="mb-3 text-section-title">{t("room.attached", "Lesson notes")}</h2>}
            <PdfReader src={docUrl} title={lesson.title} onError={() => setReaderFailed(true)} />
          </section>
        ) : lesson.type !== "video" || fileUrl ? (
          <div className="surface flex flex-wrap items-center gap-4 p-5">
            <FileText className="h-6 w-6 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-card-title">{t("room.file.title", "Lesson document")}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t("room.file.body", "This file type opens outside the reader.")}
              </p>
            </div>
            <Button asChild variant="outline">
              <a href={docUrl} target="_blank" rel="noreferrer"><Download />{t("reader.open", "Open document")}</a>
            </Button>
          </div>
        ) : null
      ) : lesson.type !== "video" && lesson.type !== "assignment" ? (
        <p className="surface px-5 py-8 text-center text-sm text-muted-foreground">
          {t("room.noContent", "The content for this lesson has not been added yet.")}
        </p>
      ) : null)}
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Page                                                                    */
/* ----------------------------------------------------------------------- */

export default function LearningRoom() {
  const { courseId, lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const capstoneActive = searchParams.get("capstone") === "1";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user, profile } = useAppAuth();
  const outlineQuery = useCourseOutline(courseId);
  const outline = outlineQuery.data;

  const [curriculumOpen, setCurriculumOpen] = useState(true);
  const [mobileCurriculum, setMobileCurriculum] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const wide = useMediaQuery("(min-width: 1280px)");

  const role = profile?.role;
  const isStudent = role === "student";
  const isStaff = Boolean(outline && (role === "admin" || outline.course.teacherId === user?.id));
  const preview = !isStudent;

  const lessons = useMemo(() => (outline ? flattenLessons(outline.chapters) : []), [outline]);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  const lesson = index >= 0 ? lessons[index] : null;
  const previous = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const completedCount = lessons.filter((item) => item.completed).length;
  const progress = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

  // Access: enrolled learners, the course teacher and admins. A learner who
  // opens a free course is enrolled on the spot so progress can be saved.
  useEffect(() => {
    if (!outline || !user || !profile) return;
    if (isStaff) return;
    if (!isStudent) { navigate(`/course/${outline.course.id}`, { replace: true }); return; }
    if (outline.enrolled) return;
    if (!outline.course.isFree) { navigate(`/course/${outline.course.id}`, { replace: true }); return; }
    void supabase.from("course_enrollments")
      .insert({ student_id: user.id, course_id: outline.course.id })
      .then(({ error }) => {
        if (error && error.code !== "23505") { navigate(`/course/${outline.course.id}`, { replace: true }); return; }
        void queryClient.invalidateQueries({ queryKey: ["course-outline", outline.course.id] });
        void queryClient.invalidateQueries({ queryKey: ["enrolled-courses"] });
      });
  }, [outline, user, profile, isStaff, isStudent, navigate, queryClient]);

  // No lesson in the URL: resume where the learner stopped.
  useEffect(() => {
    if (!outline || lessonId || capstoneActive || lessons.length === 0) return;
    const last = lessons.find((item) => item.id === outline.lastLessonId);
    const target = (last && !last.completed ? last : undefined) || lessons.find((item) => !item.completed) || last || lessons[0];
    navigate(`/learn/${outline.course.id}/${target.id}`, { replace: true });
  }, [outline, lessonId, capstoneActive, lessons, navigate]);

  useEffect(() => {
    setJustCompleted(false);
    if (lesson && isStudent && outline?.enrolled) void recordLessonVisit(lesson.id);
    document.getElementById("lesson-scroll")?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson?.id, isStudent, outline?.enrolled]);

  const fileQuery = useQuery({
    queryKey: ["lesson-file", lesson?.id, lesson?.fileUrl],
    queryFn: () => resolveLessonFileUrl(lesson!.fileUrl),
    enabled: Boolean(lesson?.fileUrl),
    staleTime: 30 * 60_000,
  });
  const fileUrl = lesson?.fileUrl ? fileQuery.data ?? null : null;

  const capstoneQuery = useQuery({
    queryKey: ["capstone-project", outline?.capstone?.id],
    enabled: Boolean(capstoneActive && outline?.capstone?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("capstone_projects").select("*").eq("id", outline!.capstone!.id).single();
      if (error) throw error;
      return data;
    },
  });

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["course-outline", courseId] });
    void queryClient.invalidateQueries({ queryKey: ["enrolled-courses"] });
  }, [queryClient, courseId]);

  const savePosition = useCallback((seconds: number) => {
    if (lessonId) void recordLessonVisit(lessonId, seconds);
  }, [lessonId]);

  const markComplete = async () => {
    if (!user || !lesson) return;
    setMarking(true);
    try {
      await setLessonCompleted(user.id, lesson.id, true);
      setJustCompleted(true);
      refresh();
    } catch (error) {
      console.error("Could not save progress", error);
      toast.error(t("room.completeError", "Your progress could not be saved. Check your connection and try again."));
    } finally {
      setMarking(false);
    }
  };

  if (outlineQuery.isLoading || !profile) return <LoadingSpinner />;
  if (outlineQuery.isError || !outline) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24">
        <ErrorState
          title={t("room.loadError", "This course could not be opened")}
          description={t("home.error.body", "Check your connection and try again.")}
          onRetry={() => void outlineQuery.refetch()}
          retryLabel={t("common.tryAgain", "Try again")}
        />
        <Button asChild variant="outline" className="mt-4"><Link to="/student/my-courses"><ArrowLeft />{t("room.back", "My courses")}</Link></Button>
      </div>
    );
  }

  const backTo = isStudent ? "/student/my-courses" : `/course/${outline.course.id}`;
  const meta = lesson ? typeMeta[lesson.type] || typeMeta.document : null;
  const allDone = lessons.length > 0 && completedCount === lessons.length;
  const curriculum = (
    <Curriculum outline={outline} currentLessonId={lesson?.id || null} capstoneActive={capstoneActive} onNavigate={() => setMobileCurriculum(false)} />
  );
  const help = <HelpPanel outline={outline} lesson={lesson} fileUrl={fileUrl} canAsk={isStudent} />;

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-card px-2 sm:px-4">
        <Button asChild variant="ghost" size="sm" className="h-9 gap-1.5 px-2 text-muted-foreground hover:text-forest">
          <Link to={backTo} aria-label={t("room.backLabel", "Back to my courses")}>
            <ArrowLeft />
            <span className="hidden sm:inline">{isStudent ? t("room.back", "My courses") : t("room.backCourse", "Course page")}</span>
          </Link>
        </Button>
        <span className="hidden h-6 w-px bg-border sm:block" />
        <Brand compact className="hidden sm:flex" />
        <p className="min-w-0 flex-1 truncate font-display text-[0.9375rem] font-semibold text-forest">{outline.course.title}</p>
        {isStudent && (
          <div className="hidden w-40 items-center gap-2.5 md:flex" title={t("home.continue.lessons", "{{done}} of {{total}} lessons", { done: completedCount, total: lessons.length })}>
            <ProgressBar value={progress} size="sm" label={t("home.continue.progressLabel", "Course progress")} />
            <span className="tabular text-xs font-semibold text-forest">{progress}%</span>
          </div>
        )}
        {preview && <StatusPill tone="blue">{t("room.preview", "Preview")}</StatusPill>}
        <Button
          variant="ghost" size="sm" className="h-9 gap-1.5 px-2 text-muted-foreground hover:text-forest lg:hidden"
          onClick={() => setMobileCurriculum(true)}
        >
          <PanelLeft />
          <span className="hidden sm:inline">{t("room.curriculumShort", "Content")}</span>
        </Button>
        <Button
          variant="ghost" size="icon" className="hidden h-9 w-9 text-muted-foreground hover:text-forest lg:inline-flex"
          onClick={() => setCurriculumOpen((value) => !value)}
          aria-pressed={curriculumOpen}
          aria-label={curriculumOpen ? t("room.hideCurriculum", "Hide course content") : t("room.showCurriculum", "Show course content")}
        >
          <PanelLeft />
        </Button>
        <Button
          variant={helpOpen ? "secondary" : "ghost"} size="sm" className="h-9 gap-1.5 px-2.5"
          onClick={() => setHelpOpen((value) => !value)}
          aria-pressed={helpOpen}
          aria-label={t("room.help.toggle", "Help")}
        >
          <CircleHelp />
          <span className="hidden sm:inline">{t("room.help.toggle", "Help")}</span>
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className={cn(
            "hidden shrink-0 overflow-y-auto border-r bg-card transition-[width] duration-200 ease-out lg:block",
            curriculumOpen ? "w-80" : "w-0 border-r-0",
          )}
          aria-hidden={!curriculumOpen}
        >
          <div className="w-80">{curriculum}</div>
        </aside>

        <main id="lesson-scroll" className="min-w-0 flex-1 overflow-y-auto">
          <div key={capstoneActive ? "capstone" : lesson?.id} className="animate-page-in mx-auto w-full max-w-4xl px-4 pb-28 pt-6 sm:px-8 sm:pt-8">
            {capstoneActive ? (
              <>
                <p className="text-meta">{t("room.capstone", "Capstone project")}</p>
                <h1 className="mt-1 text-page-title">{outline.capstone?.title}</h1>
                <p className="mb-6 mt-2 max-w-[68ch] text-[0.9375rem] leading-7 text-muted-foreground">
                  {t("room.capstoneRule", "Your certificate is issued automatically when your capstone is graded 65% or higher.")}
                </p>
                {capstoneQuery.isLoading ? (
                  <SkeletonBlock className="h-80" />
                ) : capstoneQuery.data && user ? (
                  isStudent ? (
                    <CapstoneSubmission
                      capstoneProject={{ ...capstoneQuery.data, requirements: capstoneQuery.data.requirements || [] }}
                      studentId={user.id}
                    />
                  ) : (
                    <div className="surface space-y-4 p-6">
                      <p className="whitespace-pre-line text-[0.9375rem] leading-7">{capstoneQuery.data.description}</p>
                      <p className="whitespace-pre-line text-[0.9375rem] leading-7 text-foreground/85">{capstoneQuery.data.instructions}</p>
                    </div>
                  )
                ) : (
                  <p className="surface px-5 py-8 text-center text-sm text-muted-foreground">{t("room.noCapstone", "This course has no capstone project.")}</p>
                )}
              </>
            ) : lesson && meta ? (
              <>
                <p className="text-meta">{lesson.chapterTitle}</p>
                <h1 className="mt-1 text-page-title">{lesson.title}</h1>
                <div className="mb-6 mt-3 flex flex-wrap items-center gap-2">
                  <StatusPill icon={meta.icon}>{t(meta.key, meta.label)}</StatusPill>
                  {lesson.duration ? <StatusPill icon={Clock}>{lesson.duration} min</StatusPill> : null}
                  {lesson.completed && <StatusPill tone="green" icon={CheckCircle2}>{t("room.completed", "Completed")}</StatusPill>}
                </div>

                <LessonBody
                  lesson={lesson}
                  fileUrl={fileUrl}
                  fileLoading={Boolean(lesson.fileUrl) && fileQuery.isLoading}
                  preview={preview}
                  onQuizPassed={refresh}
                  onPosition={savePosition}
                />

                {allDone && isStudent && (
                  <div className="mt-8 flex flex-wrap items-center gap-4 rounded-xl border border-primary/30 bg-leaf px-5 py-4">
                    <CheckCircle2 className="h-7 w-7 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-card-title">{t("room.allDone.title", "You have finished every lesson")}</p>
                      <p className="mt-0.5 text-sm text-foreground/75">
                        {outline.capstone
                          ? t("room.allDone.capstone", "Submit your capstone to earn your certificate.")
                          : t("room.allDone.body", "Well done. You can revisit any lesson at any time.")}
                      </p>
                    </div>
                    {outline.capstone && (
                      <Button asChild><Link to={`/learn/${outline.course.id}?capstone=1`}>{t("room.allDone.cta", "Open capstone")}<ArrowRight /></Link></Button>
                    )}
                  </div>
                )}
              </>
            ) : lessons.length === 0 ? (
              <p className="surface px-5 py-12 text-center text-sm text-muted-foreground">
                {t("room.noLessons", "This course has no lessons yet. Check back soon.")}
              </p>
            ) : (
              <SkeletonBlock className="h-80" />
            )}
          </div>
        </main>

        <aside
          className={cn(
            "hidden shrink-0 overflow-y-auto border-l bg-card transition-[width] duration-200 ease-out xl:block",
            helpOpen ? "w-80" : "w-0 border-l-0",
          )}
          aria-hidden={!helpOpen}
        >
          <div className="w-80">
            <div className="flex items-center justify-between border-b px-5 py-3">
              <h2 className="text-card-title">{t("room.help.title", "Help with this lesson")}</h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHelpOpen(false)} aria-label={t("room.help.close", "Close help")}>
                <X />
              </Button>
            </div>
            {helpOpen && help}
          </div>
        </aside>
      </div>

      {lesson && !capstoneActive && (
        <footer className="pb-safe z-10 shrink-0 border-t bg-card">
          <div className="mx-auto flex h-16 max-w-4xl items-center gap-2 px-3 sm:px-8">
            <Button asChild={Boolean(previous)} variant="outline" disabled={!previous} className="px-3 sm:px-4">
              {previous ? (
                <Link to={`/learn/${outline.course.id}/${previous.id}`} aria-label={t("room.previousLabel", "Previous lesson: {{title}}", { title: previous.title })}>
                  <ArrowLeft /><span className="hidden sm:inline">{t("room.previous", "Previous")}</span>
                </Link>
              ) : (
                <span><ArrowLeft /><span className="hidden sm:inline">{t("room.previous", "Previous")}</span></span>
              )}
            </Button>

            <div className="flex flex-1 justify-center">
              {isStudent && lesson.type !== "quiz" && (
                lesson.completed ? (
                  <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <CheckCircle2 className={cn("h-5 w-5", justCompleted && "animate-confirm")} />
                    {t("room.completed", "Completed")}
                  </span>
                ) : (
                  <Button variant="secondary" onClick={() => void markComplete()} disabled={marking}>
                    <Check />
                    {marking ? t("room.saving", "Saving…") : t("room.markComplete", "Mark as complete")}
                  </Button>
                )
              )}
            </div>

            {next ? (
              <Button asChild className="px-3 sm:px-4">
                <Link to={`/learn/${outline.course.id}/${next.id}`} aria-label={t("room.nextLabel", "Next lesson: {{title}}", { title: next.title })}>
                  <span className="hidden sm:inline">{t("room.next", "Next lesson")}</span><ArrowRight />
                </Link>
              </Button>
            ) : outline.capstone ? (
              <Button asChild className="px-3 sm:px-4">
                <Link to={`/learn/${outline.course.id}?capstone=1`}>
                  <span className="hidden sm:inline">{t("room.capstone", "Capstone project")}</span><ArrowRight />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="px-3 sm:px-4">
                <Link to={backTo}><span className="hidden sm:inline">{t("room.finish", "Finish")}</span><Check /></Link>
              </Button>
            )}
          </div>
        </footer>
      )}

      <Sheet open={mobileCurriculum} onOpenChange={setMobileCurriculum}>
        <SheetContent side="left" className="w-[min(22rem,88vw)] overflow-y-auto p-0">
          <SheetTitle className="border-b px-4 py-3.5 text-left text-card-title">{t("room.curriculum", "Course content")}</SheetTitle>
          {curriculum}
        </SheetContent>
      </Sheet>
      <Sheet open={helpOpen && !wide} onOpenChange={setHelpOpen}>
        <SheetContent side="right" className="w-[min(22rem,92vw)] overflow-y-auto p-0">
          <SheetTitle className="border-b px-5 py-3.5 text-left text-card-title">{t("room.help.title", "Help with this lesson")}</SheetTitle>
          {help}
        </SheetContent>
      </Sheet>
    </div>
  );
}
