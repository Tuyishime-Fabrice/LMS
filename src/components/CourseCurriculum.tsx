import { PlusMotif } from "@/components/brand/PlusMotif";
import { progressLayers } from "@/components/brand/courseLevel";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Play, FileText, Link, ClipboardList, CheckCircle2, Circle, Clock, BookOpen, Sparkles, Lock, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  title: string;
  content_type: string;
  duration?: number;
  order_index: number;
  is_completed?: boolean;
  is_preview?: boolean;
  is_locked?: boolean;
}

interface Chapter {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
  total_duration?: number;
  is_preview?: boolean;
  is_locked?: boolean;
}

interface CourseCurriculumProps {
  chapters: Chapter[];
  currentLessonId?: string;
  onLessonClick: (lessonId: string) => void;
  welcomeVideoUrl?: string;
  onSelectWelcome?: () => void;
  isWelcomeSelected?: boolean;
  isPaidCourse?: boolean;
  hasAccess?: boolean;
  /** Progress is shown only to signed-in people; visitors see the list of modules. */
  showProgress?: boolean;
}

export function CourseCurriculum({ chapters, currentLessonId, onLessonClick, welcomeVideoUrl, onSelectWelcome, isWelcomeSelected, isPaidCourse = false, hasAccess = true, showProgress = true }: CourseCurriculumProps) {
  const { t } = useTranslation();
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set(chapters.map((c) => c.id))
  );

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const getLessonIcon = (contentType: string, isCompleted?: boolean) => {
    const iconClass = isCompleted ? "text-primary" : "text-muted-foreground";
    switch (contentType) {
      case "video":
        return <Play className={cn("h-4 w-4", iconClass)} />;
      case "pdf":
      case "document":
        return <FileText className={cn("h-4 w-4", iconClass)} />;
      case "url":
        return <Link className={cn("h-4 w-4", iconClass)} />;
      case "quiz":
      case "assignment":
        return <ClipboardList className={cn("h-4 w-4", iconClass)} />;
      default:
        return <Play className={cn("h-4 w-4", iconClass)} />;
    }
  };

  const getContentTypeLabel = (contentType: string) => {
    switch (contentType) {
      case "video": return "Video";
      case "pdf": return "PDF";
      case "document": return "Document";
      case "url": return "Link";
      case "quiz": return "Quiz";
      case "assignment": return "Assignment";
      default: return "Lesson";
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return "";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const isLessonLocked = (chapter: Chapter, lesson: Lesson) => {
    if (!isPaidCourse || hasAccess) return false;
    // If the chapter is marked as preview, all its lessons are accessible
    if (chapter.is_preview) return false;
    // If the lesson itself is marked as preview, it's accessible
    if (lesson.is_preview) return false;
    return true;
  };

  // Calculate total progress
  const totalLessons = chapters.reduce((sum, ch) => sum + ch.lessons.length, 0);
  const completedLessons = chapters.reduce((sum, ch) => sum + ch.lessons.filter(l => l.is_completed).length, 0);

  return (
    <Card className="h-fit sticky top-6 border-0 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-forest">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">{t("courseCurriculum.courseContent", "Course Content")}</h3>
            <p className="text-white/70 text-sm">{t("courseCurriculum.chaptersLessons", "{{count}} chapters • {{totalLessons}} lessons", { count: chapters.length, totalLessons: totalLessons })}</p>
          </div>
        </div>
        {/* Mini progress, with the centred plus lighting a layer at 33%, 66% and 100% */}
        {showProgress && (
          <div className="flex items-center gap-3">
            <PlusMotif variant="centred" tone="dark" size={30} layersLit={progressLayers(totalLessons ? completedLessons / totalLessons : 0)} />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/80">{t("courseCurriculum.yourProgress2", "Your progress")}</span>
                <span className="tabular font-semibold text-white">{completedLessons}/{totalLessons}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-action transition-all duration-500"
                  style={{ width: `${totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <CardContent className="p-0 max-h-[600px] overflow-y-auto">
        <div className="divide-y divide-gray-100">
          {/* Welcome Video */}
          {welcomeVideoUrl && (
            <button
              onClick={onSelectWelcome}
              className={cn(
                "w-full p-4 flex items-center gap-4 transition-all text-left group",
                isWelcomeSelected
                  ? "   border-l-4 border-primary"
                  : "hover:bg-muted"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                isWelcomeSelected
                  ? "bg-primary shadow-primary/30"
                  : "  "
              )}>
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-forest">{t("courseCurriculum.welcomeVideo", "Welcome Video")}</span>
                  <Badge className="bg-leaf text-forest text-xs">{t("courseCurriculum.startHere", "Start Here")}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{t("courseCurriculum.introductionToTheCourse", "Introduction to the course")}</p>
              </div>
            </button>
          )}

          {/* Chapters */}
          {chapters.map((chapter, chapterIndex) => {
            const isExpanded = expandedChapters.has(chapter.id);
            const completedCount = chapter.lessons.filter((l) => l.is_completed).length;
            const totalChapterLessons = chapter.lessons.length;
            const chapterProgress = totalChapterLessons > 0 ? (completedCount / totalChapterLessons) * 100 : 0;
            const isChapterComplete = completedCount === totalChapterLessons && totalChapterLessons > 0;
            const chapterLocked = isPaidCourse && !hasAccess && !chapter.is_preview;

            return (
              <div key={chapter.id}>
                {/* Chapter Header */}
                <button
                  onClick={() => toggleChapter(chapter.id)}
                  className={cn(
                    "w-full p-4 flex items-center gap-4 transition-all text-left group",
                    isExpanded ? "bg-muted/50" : "hover:bg-muted"
                  )}
                >
                  {/* Chapter Number Circle */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-all",
                    chapterLocked
                      ? "bg-border text-muted-foreground"
                      : isChapterComplete
                        ? "bg-primary text-white shadow-primary/20"
                        : "bg-muted text-muted-foreground group-hover:bg-gray-200"
                  )}>
                    {chapterLocked ? (
                      <Lock className="h-5 w-5" />
                    ) : isChapterComplete ? (
                      <CheckCircle2 className="h-6 w-6" />
                    ) : (
                      String(chapterIndex + 1).padStart(2, "0")
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn(
                        "font-semibold",
                        chapterLocked ? "text-muted-foreground" : "text-forest"
                      )}>
                        {chapter.title}
                      </span>
                      {isPaidCourse && !hasAccess && chapter.is_preview && (
                        <Badge className="bg-info-surface text-info text-[10px] px-1.5 py-0">
                          <Eye className="h-3 w-3 mr-0.5" />
                          {t("courseCurriculum.freePreview", "Free Preview")}
                        </Badge>
                      )}
                      {chapterLocked && (
                        <Badge className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0">
                          <Lock className="h-3 w-3 mr-0.5" />
                          {t("courseCurriculum.locked", "Locked")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        {totalChapterLessons} lessons
                      </span>
                      {chapter.total_duration && chapter.total_duration > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(chapter.total_duration)}
                        </span>
                      )}
                      {!chapterLocked && (
                        <span className={cn(
                          "font-medium",
                          isChapterComplete ? "text-primary" : "text-muted-foreground"
                        )}>
                          {completedCount}/{totalChapterLessons}
                        </span>
                      )}
                    </div>
                    {/* Chapter Progress Bar */}
                    {!chapterLocked && (
                      <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isChapterComplete
                              ? "bg-primary"
                              : "   bg-forest"
                          )}
                          style={{ width: `${chapterProgress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    isExpanded ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {/* Lessons */}
                {isExpanded && (
                  <div className="bg-muted/50 border-t border-border">
                    {chapter.lessons.map((lesson, lessonIndex) => {
                      const isActive = currentLessonId === lesson.id;
                      const locked = isLessonLocked(chapter, lesson);

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            if (!locked) {
                              onLessonClick(lesson.id);
                            }
                          }}
                          disabled={locked}
                          className={cn(
                            "w-full pl-8 pr-4 py-3 flex items-center gap-3 transition-all text-left group",
                            locked
                              ? "opacity-50 cursor-not-allowed bg-muted/50"
                              : isActive
                                ? "bg-leaf border-l-4 border-primary"
                                : "hover:bg-white border-l-4 border-transparent"
                          )}
                        >
                          {/* Completion Status / Lock */}
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                            locked
                              ? "bg-border"
                              : lesson.is_completed
                                ? "bg-primary "
                                : isActive
                                  ? "bg-leaf ring-2 ring-primary"
                                  : "bg-card border border-border group-hover:border-gray-300"
                          )}>
                            {locked ? (
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            ) : lesson.is_completed ? (
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            ) : (
                              <span className="text-xs font-medium text-muted-foreground">
                                {lessonIndex + 1}
                              </span>
                            )}
                          </div>

                          {/* Content Type Icon */}
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            locked ? "bg-muted" : lesson.is_completed ? "bg-leaf" : "bg-muted"
                          )}>
                            {getLessonIcon(lesson.content_type, lesson.is_completed)}
                          </div>

                          {/* Lesson Info */}
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "text-sm font-medium transition-colors",
                              locked ? "text-muted-foreground" : isActive ? "text-primary" : lesson.is_completed ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {lesson.title}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                {getContentTypeLabel(lesson.content_type)}
                              </Badge>
                              {lesson.duration && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {lesson.duration}m
                                </span>
                              )}
                              {!locked && isPaidCourse && !hasAccess && lesson.is_preview && (
                                <Badge className="bg-info-surface text-info text-[10px] px-1 py-0 h-4">
                                  {t("courseCurriculum.free", "Free")}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Active Indicator or Lock Icon */}
                          {locked ? (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          ) : isActive ? (
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
