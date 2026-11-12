import { useState } from "react";
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
}

export function CourseCurriculum({ chapters, currentLessonId, onLessonClick, welcomeVideoUrl, onSelectWelcome, isWelcomeSelected, isPaidCourse = false, hasAccess = true }: CourseCurriculumProps) {
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
    const iconClass = isCompleted ? "text-[#0A400C]" : "text-gray-400";
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
    <Card className="h-fit sticky top-6 border-0 shadow-xl rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0A400C] to-[#116315] p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Course Content</h3>
            <p className="text-white/70 text-sm">{chapters.length} chapters • {totalLessons} lessons</p>
          </div>
        </div>
        {/* Mini Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-white/80">Your Progress</span>
            <span className="text-white font-semibold">{completedLessons}/{totalLessons}</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0}%` }}
            />
          </div>
        </div>
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
                  ? "bg-gradient-to-r from-[#0A400C]/10 to-[#0A400C]/5 border-l-4 border-[#0A400C]"
                  : "hover:bg-gray-50"
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                isWelcomeSelected
                  ? "bg-[#0A400C] shadow-lg shadow-[#0A400C]/30"
                  : "bg-gradient-to-br from-purple-500 to-pink-500"
              )}>
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">Welcome Video</span>
                  <Badge className="bg-purple-100 text-purple-700 text-xs">Start Here</Badge>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">Introduction to the course</p>
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
                    isExpanded ? "bg-gray-50" : "hover:bg-gray-50"
                  )}
                >
                  {/* Chapter Number Circle */}
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg transition-all",
                    chapterLocked
                      ? "bg-gray-200 text-gray-400"
                      : isChapterComplete
                        ? "bg-[#0A400C] text-white shadow-lg shadow-[#0A400C]/20"
                        : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
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
                        chapterLocked ? "text-gray-400" : "text-gray-900"
                      )}>
                        {chapter.title}
                      </span>
                      {isPaidCourse && !hasAccess && chapter.is_preview && (
                        <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">
                          <Eye className="h-3 w-3 mr-0.5" />
                          Free Preview
                        </Badge>
                      )}
                      {chapterLocked && (
                        <Badge className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0">
                          <Lock className="h-3 w-3 mr-0.5" />
                          Locked
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
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
                          isChapterComplete ? "text-[#0A400C]" : "text-gray-500"
                        )}>
                          {completedCount}/{totalChapterLessons}
                        </span>
                      )}
                    </div>
                    {/* Chapter Progress Bar */}
                    {!chapterLocked && (
                      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            isChapterComplete
                              ? "bg-[#0A400C]"
                              : "bg-gradient-to-r from-[#0A400C] to-emerald-500"
                          )}
                          style={{ width: `${chapterProgress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    isExpanded ? "bg-[#0A400C] text-white" : "bg-gray-100 text-gray-500"
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
                  <div className="bg-gray-50/50 border-t border-gray-100">
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
                              ? "opacity-50 cursor-not-allowed bg-gray-50"
                              : isActive
                                ? "bg-[#0A400C]/10 border-l-4 border-[#0A400C]"
                                : "hover:bg-white border-l-4 border-transparent"
                          )}
                        >
                          {/* Completion Status / Lock */}
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                            locked
                              ? "bg-gray-200"
                              : lesson.is_completed
                                ? "bg-[#0A400C] shadow-sm"
                                : isActive
                                  ? "bg-[#0A400C]/20 ring-2 ring-[#0A400C]"
                                  : "bg-white border border-gray-200 group-hover:border-gray-300"
                          )}>
                            {locked ? (
                              <Lock className="h-4 w-4 text-gray-400" />
                            ) : lesson.is_completed ? (
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            ) : (
                              <span className="text-xs font-medium text-gray-500">
                                {lessonIndex + 1}
                              </span>
                            )}
                          </div>

                          {/* Content Type Icon */}
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                            locked ? "bg-gray-100" : lesson.is_completed ? "bg-[#0A400C]/10" : "bg-gray-100"
                          )}>
                            {getLessonIcon(lesson.content_type, lesson.is_completed)}
                          </div>

                          {/* Lesson Info */}
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "text-sm font-medium transition-colors",
                              locked ? "text-gray-400" : isActive ? "text-[#0A400C]" : lesson.is_completed ? "text-gray-700" : "text-gray-600"
                            )}>
                              {lesson.title}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                                {getContentTypeLabel(lesson.content_type)}
                              </Badge>
                              {lesson.duration && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {lesson.duration}m
                                </span>
                              )}
                              {!locked && isPaidCourse && !hasAccess && lesson.is_preview && (
                                <Badge className="bg-blue-50 text-blue-600 text-[10px] px-1 py-0 h-4">
                                  Free
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Active Indicator or Lock Icon */}
                          {locked ? (
                            <Lock className="h-4 w-4 text-gray-300" />
                          ) : isActive ? (
                            <div className="w-2 h-2 rounded-full bg-[#0A400C] animate-pulse" />
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
