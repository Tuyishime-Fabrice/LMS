import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText, Play, CheckCircle2, Clock, BookOpen, Target, ChevronRight, Sparkles, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import PdfJsInlineViewer from "@/components/PdfJsInlineViewer";
import { cn } from "@/lib/utils";

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
      <Card className="border-0 shadow-lg rounded-2xl">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Lesson PDF</h3>
              <p className="text-sm text-gray-500">Loading document...</p>
            </div>
          </div>
          <div className="mt-4 h-[50vh] flex items-center justify-center bg-gray-50 rounded-xl">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pdfResolvedUrl) return null;

  return (
    <Card className="border-0 shadow-lg rounded-2xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900">Lesson PDF</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => window.open(pdfResolvedUrl, "_blank")}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Download
          </Button>
        </div>
        <div className="rounded-xl overflow-hidden border border-gray-200" style={{ minHeight: "50vh" }}>
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
  const { toast } = useToast();
  const [markingComplete, setMarkingComplete] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);

  useEffect(() => {
    // Only track progress for students, not teachers in preview mode
    if (lesson && studentId && lesson.content_type === "video" && !isPreviewMode) {
      markLessonProgress(false);
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
        title: "Preview Mode",
        description: "Progress is not tracked for teachers.",
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
          title: "Lesson completed!",
          description: "Your progress has been saved.",
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
      <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {/* Empty State with Premium Design */}
          <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 min-h-[400px] flex items-center justify-center">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0A400C]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#0A400C]/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            
            <div className="relative text-center p-8">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#0A400C] to-[#116315] flex items-center justify-center shadow-xl shadow-[#0A400C]/20">
                <Play className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Ready to Learn?</h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Select a lesson from the curriculum to start your learning journey
              </p>
              <div className="mt-6 flex items-center justify-center gap-2 text-sm text-[#0A400C]">
                <Sparkles className="h-4 w-4" />
                <span>Pick a lesson to begin</span>
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
      <Card className="border-0 shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          {/* Video Content */}
          {lesson.content_type === "video" && (
            <div className="relative w-full bg-black rounded-t-2xl overflow-hidden" style={{ paddingTop: "56.25%" }}>
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
                      <p className="text-white/70">Unable to load video. Please check the URL.</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* PDF/Document Content */}
          {(lesson.content_type === "pdf" || lesson.content_type === "document" || lesson.content_type === "assignment") && (
            <div className="relative w-full bg-gray-50" style={{ minHeight: "65vh" }}>
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
                          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0A400C]/20 border-t-[#0A400C] mx-auto mb-4" />
                          <p className="text-gray-500">Loading document...</p>
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
                      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl">
                        <FileText className="h-10 w-10 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">External Document</h3>
                      <p className="text-sm text-gray-500 mb-6 max-w-sm break-all">{urlToOpen}</p>
                      <Button 
                        onClick={() => window.open(urlToOpen, "_blank")}
                        className="bg-[#0A400C] hover:bg-[#083308] rounded-xl px-6"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" /> Open Document
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* URL Content */}
          {lesson.content_type === "url" && (
            <div className="h-[40vh] flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-xl">
                  <ExternalLink className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">External Resource</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-sm break-all">{lesson.content_url}</p>
                <Button 
                  onClick={() => window.open(lesson.content_url, "_blank")}
                  className="bg-[#0A400C] hover:bg-[#083308] rounded-xl px-6"
                > 
                  <ExternalLink className="h-4 w-4 mr-2" /> Open Link
                </Button>
              </div>
            </div>
          )}

          {/* Lesson Info Bar */}
          <div className="p-5 bg-white border-t">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Left: Lesson Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-[#0A400C]/10 text-[#0A400C] hover:bg-[#0A400C]/20">
                    {getContentTypeIcon(lesson.content_type)}
                    <span className="ml-1.5">{getContentTypeLabel(lesson.content_type)}</span>
                  </Badge>
                  {lesson.duration && (
                    <Badge variant="outline" className="text-gray-500">
                      <Clock className="h-3 w-3 mr-1" />
                      {lesson.duration} min
                    </Badge>
                  )}
                  {lesson.is_completed && (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{lesson.title}</h2>
              </div>

              {/* Right: Mark Complete Button - Only for students */}
              {studentId && lesson.content_type !== "quiz" && !isPreviewMode && (
                <Button
                  onClick={() => markLessonProgress(true)}
                  disabled={markingComplete || !!lesson.is_completed}
                  className={cn(
                    "rounded-xl px-6 transition-all",
                    lesson.is_completed 
                      ? "bg-green-100 text-green-700 hover:bg-green-100 cursor-default" 
                      : "bg-[#0A400C] hover:bg-[#083308] shadow-lg shadow-[#0A400C]/20 hover:shadow-xl hover:scale-[1.02]"
                  )}
                >
                  {lesson.is_completed ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Completed
                    </>
                  ) : markingComplete ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4 mr-2" />
                      Mark Complete
                    </>
                  )}
                </Button>
              )}
              {/* Preview mode indicator for teachers */}
              {isPreviewMode && (
                <Badge className="bg-yellow-100 text-yellow-800 px-4 py-2">
                  Teacher Preview Mode
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Card - Only show for students, not teachers */}
      {studentId && !isPreviewMode && (
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden bg-gradient-to-r from-[#0A400C] to-[#116315]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Target className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-sm">Course Progress</p>
                  <p className="text-white font-bold text-xl">{Math.round(progressPercent)}%</p>
                </div>
              </div>
              {progressPercent >= 100 && (
                <Badge className="bg-white/20 text-white border-0">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Course Complete!
                </Badge>
              )}
            </div>
            {/* Progress Bar */}
            <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-white rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-white/50 to-transparent rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-white/60 text-xs mt-2">Keep going! You're making great progress.</p>
          </CardContent>
        </Card>
      )}

      {/* Accompanying PDF Card - Only for video lessons with an attached PDF */}
      {lesson.content_type === "video" && lesson.file_url && (
        <LessonPdfCard fileUrl={lesson.file_url} />
      )}

      {/* Description Card */}
      {lesson.description && (
        <Card className="border-0 shadow-lg rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#0A400C]/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-[#0A400C]" />
              </div>
              <h3 className="font-bold text-gray-900">About This Lesson</h3>
            </div>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
              {lesson.description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
