import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Play, CheckCircle2, Clock, BookOpen, Target, ChevronRight, Sparkles, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PdfJsInlineViewer from "@/components/PdfJsInlineViewer";
import { cn } from "@/lib/utils";
import { recordLessonVisit } from "@/features/learning/api";

interface CourseContentPlayerProps {
  lesson: {
    id: string;
    title: string;
    description?: string;
    content_type: string;
    content_url: string;
    file_url?: string;
    duration?: number;
    is_completed?: boolean;
  } | null;
  studentId?: string;
  onComplete?: () => void;
  progressPercent?: number;
  isPreviewMode?: boolean; // For teachers to view content without tracking progress
}

// Sub-component: Displays an attached PDF for video lessons
function LessonPdfCard({ fileUrl }: { fileUrl: string }) {
  const { t } = useTranslation();
  const [pdfResolvedUrl, setPdfResolvedUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolve = async () => {
      setLoading(true);
      setPdfError(false);
      if (/^https?:\/\//i.test(fileUrl)) {
        setPdfResolvedUrl(fileUrl);
        setLoading(false);
        return;
      }
      try {
        const cleaned = fileUrl.replace(/^\/+/, "");
        const path = cleaned.replace(/^lesson-files\//, "");
        const { data: signed, error } = await supabase.storage.from("lesson-files").createSignedUrl(path, 3600);
        if (!error && signed?.signedUrl) {
          setPdfResolvedUrl(signed.signedUrl);
        } else {
          const { data: pub } = supabase.storage.from("lesson-files").getPublicUrl(path);
          setPdfResolvedUrl(pub?.publicUrl || fileUrl);
        }
      } catch {
        setPdfResolvedUrl(fileUrl);
      } finally {
        setLoading(false);
      }
    };
    resolve();
  }, [fileUrl]);

  if (loading) {
    return (
      <Card className="border-0 rounded-xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info-surface flex items-center justify-center">
              <FileText className="h-5 w-5 text-info" />
            </div>
            <div>
              <h3 className="font-bold text-forest">{t("courseContentPlayer.lessonPdf", "Lesson PDF")}</h3>
              <p className="text-sm text-muted-foreground">{t("courseContentPlayer.loadingDocument", "Loading document...")}</p>
            </div>
          </div>
          <div className="mt-4 h-[50vh] flex items-center justify-center bg-muted/50 rounded-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-info/30 border-t-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pdfResolvedUrl) return null;

  return (
    <Card className="border-0 rounded-xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info-surface flex items-center justify-center">
              <FileText className="h-5 w-5 text-info" />
            </div>
            <h3 className="font-bold text-forest">{t("courseContentPlayer.lessonPdf", "Lesson PDF")}</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-info border-info/30 hover:bg-info-surface"
            onClick={() => window.open(pdfResolvedUrl, "_blank")}
          >
            <Download className="h-4 w-4 mr-1.5" />
            {t("courseContentPlayer.download", "Download")}
          </Button>
        </div>
        <div className="rounded-xl overflow-hidden border border-border" style={{ minHeight: "50vh" }}>
          {!pdfError ? (
            <PdfJsInlineViewer src={pdfResolvedUrl} onError={() => setPdfError(true)} />
          ) : (
            <iframe
              src={`${pdfResolvedUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              title="Lesson PDF"
              className="w-full h-[50vh]"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CourseContentPlayer({ lesson, studentId, onComplete, progressPercent = 0, isPreviewMode = false }: CourseContentPlayerProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [markingComplete, setMarkingComplete] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    // Only track progress for students, not teachers in preview mode
    // Remember the visit without touching completion (opening a finished
    // lesson used to write it back as unfinished).
    if (lesson && studentId && !isPreviewMode) {
      void recordLessonVisit(lesson.id);
    }
    const resolve = async () => {
      if (!lesson) return setResolvedUrl(null);
      const raw = (lesson.file_url || lesson.content_url) || "";
      if (!raw) return setResolvedUrl(null);
      if (/^https?:\/\//i.test(raw)) {
        setResolvedUrl(raw);
        return;
      }
      try {
        const cleaned = raw.replace(/^\/+/, "");
        const path = cleaned.replace(/^lesson-files\//, "");
        const { data: signed, error } = await supabase.storage.from("lesson-files").createSignedUrl(path, 3600);
        if (!error && signed?.signedUrl) {
          setResolvedUrl(signed.signedUrl);
          return;
        }
        const { data: pub } = supabase.storage.from("lesson-files").getPublicUrl(path);
        if (pub?.publicUrl) {
          setResolvedUrl(pub.publicUrl);
          return;
        }
        setResolvedUrl(raw);
      } catch (e) {
        console.error("Failed to resolve storage URL", e);
        setResolvedUrl(raw);
      }
    };
    setPdfError(false);
    resolve();
  }, [lesson?.id, studentId]);

  const markLessonProgress = async (isComplete: boolean) => {
    if (!lesson || !studentId) return;
    
    // Don't track progress for teachers in preview mode
    if (isPreviewMode) {
      toast({
        title: t("courseContentPlayer.previewMode", "Preview Mode"),
        description: t("courseContentPlayer.progressIsNotTrackedForTeachers", "Progress is not tracked for teachers."),
      });
      return;
    }

    try {
      setMarkingComplete(true);
      
      const { error } = await supabase
        .from("student_lesson_progress")
        .upsert({
          student_id: studentId,
          lesson_id: lesson.id,
          is_completed: isComplete,
          completed_at: isComplete ? new Date().toISOString() : null,
        }, {
          onConflict: "student_id,lesson_id"
        });

      if (error) throw error;

      if (isComplete) {
        toast({
          title: t("courseContentPlayer.lessonCompleted", "Lesson completed!"),
          description: t("courseContentPlayer.yourProgressHasBeenSaved", "Your progress has been saved."),
        });
        onComplete?.();
      }
    } catch (error) {
      console.error("Error marking progress:", error);
    } finally {
      setMarkingComplete(false);
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Play className="h-4 w-4" />;
      case "pdf":
      case "document": return <FileText className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case "video": return "Video Lesson";
      case "pdf": return "PDF Document";
      case "document": return "Document";
      case "url": return "External Resource";
      case "quiz": return "Quiz";
      case "assignment": return "Assignment";
      default: return "Lesson";
    }
  };

  if (!lesson) {
    return (
      <Card className="border-0 rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Empty State with Premium Design */}
          <div className="relative min-h-[400px] flex items-center justify-center">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-leaf rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-leaf rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative text-center p-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-xl flex items-center justify-center shadow-primary/20 bg-forest">
                <Play className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-forest mb-2">{t("courseContentPlayer.readyToLearn", "Ready to Learn?")}</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                {t("courseContentPlayer.selectALessonToStart", "Select a lesson from the curriculum to start.")}
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-primary">
                <Sparkles className="h-4 w-4" />
                <span>{t("courseContentPlayer.pickALessonToBegin", "Pick a lesson to begin")}</span>
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Content Card */}
      <Card className="border-0 rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {/* Video Content */}
          {lesson.content_type === "video" && (
            <div className="relative w-full bg-primary rounded-t-xl overflow-hidden" style={{ paddingTop: "56.25%" }}>
              {(() => {
                const embedUrl = getYouTubeEmbedUrl(lesson.content_url);
                if (embedUrl) {
                  return (
                    <iframe
                      className="absolute top-0 left-0 w-full h-full"
                      src={embedUrl}
                      title={lesson.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  );
                }
                return (
                  <div className="absolute top-0 left-0 w-full h-full bg-gray-900 flex items-center justify-center">
                    <div className="text-center p-6">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-white/50" />
                      </div>
                      <p className="text-white/70">{t("courseContentPlayer.unableToLoadVideoPleaseCheck", "Unable to load video. Please check the URL.")}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* PDF/Document Content */}
          {(lesson.content_type === "pdf" || lesson.content_type === "document" || lesson.content_type === "assignment") && (
            <div className="relative w-full bg-muted/50" style={{ minHeight: "65vh" }}>
              {(() => {
                const raw = (lesson.file_url || lesson.content_url) || "";
                const isUploaded = !!lesson.file_url;
                const candidate = isUploaded ? resolvedUrl : (/^https?:\/\//i.test(raw) ? raw : null);
                const lower = (candidate || raw).toLowerCase();
                const isPDF = lower.endsWith(".pdf") || lesson.content_type === "pdf";

                if (isPDF && isUploaded) {
                  if (!candidate) {
                    return (
                      <div className="w-full h-[65vh] flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto mb-4" />
                          <p className="text-muted-foreground">{t("courseContentPlayer.loadingDocument", "Loading document...")}</p>
                        </div>
                      </div>
                    );
                  }
                  if (!pdfError) {
                    return <PdfJsInlineViewer src={candidate} onError={() => setPdfError(true)} />;
                  }
                  return (
                    <div className="relative w-full h-[65vh]">
                      <iframe
                        src={`${candidate}#toolbar=1&navpanes=1&scrollbar=1`}
                        title={lesson.title}
                        className="absolute inset-0 w-full h-full"
                      />
                    </div>
                  );
                }

                const urlToOpen = candidate || raw;
                return (
                  <div className="h-[40vh] flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="w-20 h-20 mx-auto mb-6 rounded-xl flex items-center justify-center">
                        <FileText className="h-10 w-10 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-forest mb-2">{t("courseContentPlayer.externalDocument", "External Document")}</h3>
                      <p className="text-sm text-muted-foreground mb-6 max-w-sm break-all">{urlToOpen}</p>
                      <Button 
                        onClick={() => window.open(urlToOpen, "_blank")}
                        className="bg-action hover:bg-action-hover rounded-xl px-6"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />{" "}{t("courseContentPlayer.openDocument", "Open Document")}
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* URL Content */}
          {lesson.content_type === "url" && (
            <div className="h-[40vh] flex items-center justify-center">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-xl flex items-center justify-center">
                  <ExternalLink className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-forest mb-2">{t("courseContentPlayer.externalResource", "External Resource")}</h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm break-all">{lesson.content_url}</p>
                <Button 
                  onClick={() => window.open(lesson.content_url, "_blank")}
                  className="bg-action hover:bg-action-hover rounded-xl px-6"
                > 
                  <ExternalLink className="h-4 w-4 mr-2" />{" "}{t("courseContentPlayer.openLink", "Open Link")}
                </Button>
              </div>
            </div>
          )}

          {/* Lesson Info Bar */}
          <div className="p-5 bg-card border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Left: Lesson Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-leaf text-primary hover:bg-leaf">
                    {getContentTypeIcon(lesson.content_type)}
                    <span className="ml-1.5">{getContentTypeLabel(lesson.content_type)}</span>
                  </Badge>
                  {lesson.duration && (
                    <Badge variant="outline" className="text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {lesson.duration} min
                    </Badge>
                  )}
                  {lesson.is_completed && (
                    <Badge className="bg-leaf text-primary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {t("courseContentPlayer.completed", "Completed")}
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl font-bold text-forest">{lesson.title}</h2>
              </div>

              {/* Right: Mark Complete Button - Only for students */}
              {studentId && lesson.content_type !== "quiz" && !isPreviewMode && (
                <Button
                  onClick={() => markLessonProgress(true)}
                  disabled={markingComplete || !!lesson.is_completed}
                  className={cn(
                    "rounded-xl px-6 transition-all",
                    lesson.is_completed 
                      ? "bg-leaf text-primary hover:bg-leaf cursor-default" 
                      : "bg-action hover:bg-action-hover shadow-primary/20 hover:scale-[1.02]"
                  )}
                >
                  {lesson.is_completed ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {t("courseContentPlayer.completed", "Completed")}
                    </>
                  ) : markingComplete ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                      {t("courseContentPlayer.saving", "Saving...")}
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      {t("courseContentPlayer.markComplete", "Mark Complete")}
                    </>
                  )}
                </Button>
              )}
              {/* Preview mode indicator for teachers */}
              {isPreviewMode && (
                <Badge className="bg-warning-surface text-warning px-4 py-2">
                  {studentId ? t("courseContentPlayer.staffPreview", "Staff preview: progress is not saved") : t("courseContentPlayer.freePreview", "Free preview")}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Card - Only show for students, not teachers */}
      {studentId && !isPreviewMode && (
        <Card className="border-0 rounded-xl overflow-hidden bg-forest">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">{t("courseContentPlayer.courseProgress", "Course Progress")}</p>
                  <p className="text-white font-bold text-xl">{Math.round(progressPercent)}%</p>
                </div>
              </div>
              {progressPercent >= 100 && (
                <Badge className="bg-white/20 text-white border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {t("courseContentPlayer.courseComplete", "Course Complete!")}
                </Badge>
              )}
            </div>
            {/* Progress Bar */}
            <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-card rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
              <div 
                className="absolute inset-y-0 left-0 to-transparent rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-white/60 text-xs mt-2">{t("courseContentPlayer.keepGoingYouReMakingGreat", "Keep going! You're making great progress.")}</p>
          </CardContent>
        </Card>
      )}

      {/* Accompanying PDF Card - Only for video lessons with an attached PDF */}
      {lesson.content_type === "video" && lesson.file_url && (
        <LessonPdfCard fileUrl={lesson.file_url} />
      )}

      {/* Description Card */}
      {lesson.description && (
        <Card className="border-0 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-leaf flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-bold text-forest">{t("courseContentPlayer.aboutThisLesson", "About This Lesson")}</h3>
            </div>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {lesson.description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
