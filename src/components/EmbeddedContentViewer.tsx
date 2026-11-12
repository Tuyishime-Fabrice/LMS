import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ExternalLink, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EmbeddedContentViewerProps {
  lessonId: string;
  contentType: "video" | "pdf" | "document" | "url";
  contentUrl: string;
  title: string;
  studentId: string;
  onClose: () => void;
}

export function EmbeddedContentViewer({
  lessonId,
  contentType,
  contentUrl,
  title,
  studentId,
  onClose,
}: EmbeddedContentViewerProps) {
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkProgress();
  }, [lessonId, studentId]);

  const checkProgress = async () => {
    const { data } = await supabase
      .from("student_lesson_progress")
      .select("is_completed")
      .eq("student_id", studentId)
      .eq("lesson_id", lessonId)
      .single();

    if (data) {
      setIsCompleted(data.is_completed);
    }
  };

  const markAsComplete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("student_lesson_progress")
        .upsert({
          student_id: studentId,
          lesson_id: lessonId,
          is_completed: true,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: "student_id,lesson_id",
        });

      if (error) throw error;

      setIsCompleted(true);
      toast.success("Lesson marked as complete!");
      
      // Close after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error("Error marking lesson complete:", error);
      toast.error("Failed to mark lesson as complete");
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (contentType) {
      case "video":
        // Check if it's YouTube
        const youtubeMatch = contentUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (youtubeMatch) {
          return (
            <iframe
              src={`https://www.youtube.com/embed/${youtubeMatch[1]}?enablejsapi=1`}
              title={title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          );
        }
        // Other video types
        return (
          <video
            src={contentUrl}
            controls
            className="w-full h-full"
            onEnded={markAsComplete}
          >
            Your browser does not support the video tag.
          </video>
        );

      case "pdf":
        return (
          <iframe
            src={`${contentUrl}#toolbar=1&navpanes=1&scrollbar=1`}
            title={title}
            className="w-full h-full"
          />
        );

      case "document":
        // Use Google Docs Viewer for DOC/DOCX
        return (
          <iframe
            src={`https://docs.google.com/gview?url=${encodeURIComponent(contentUrl)}&embedded=true`}
            title={title}
            className="w-full h-full"
          />
        );

      case "url":
        return (
          <iframe
            src={contentUrl}
            title={title}
            className="w-full h-full"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        );

      default:
        return <div className="p-4">Unsupported content type</div>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <Card className="w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white rounded-t-lg">
          <h3 className="font-semibold text-lg">{title}</h3>
          <div className="flex gap-2">
            {isCompleted && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-md">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Completed</span>
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(contentUrl, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open External
            </Button>
            {!isCompleted && (
              <Button
                size="sm"
                onClick={markAsComplete}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isLoading ? "Saving..." : "Mark Complete"}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-gray-100">{renderContent()}</div>
      </Card>
    </div>
  );
}
