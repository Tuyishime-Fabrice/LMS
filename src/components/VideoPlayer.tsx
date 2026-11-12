import { useEffect, useState } from "react";

interface VideoPlayerProps {
  url: string;
  title?: string;
}

export default function VideoPlayer({ url, title }: VideoPlayerProps) {
  const [embedUrl, setEmbedUrl] = useState<string>("");

  useEffect(() => {
    // Convert various video URLs to embeddable format
    const convertToEmbedUrl = (videoUrl: string): string => {
      // YouTube
      if (videoUrl.includes("youtube.com/watch")) {
        const videoId = new URL(videoUrl).searchParams.get("v");
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (videoUrl.includes("youtu.be/")) {
        const videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
        return `https://www.youtube.com/embed/${videoId}`;
      }
      
      // Vimeo
      if (videoUrl.includes("vimeo.com/")) {
        const videoId = videoUrl.split("vimeo.com/")[1].split("?")[0];
        return `https://player.vimeo.com/video/${videoId}`;
      }
      
      // Dailymotion
      if (videoUrl.includes("dailymotion.com/video/")) {
        const videoId = videoUrl.split("dailymotion.com/video/")[1].split("?")[0];
        return `https://www.dailymotion.com/embed/video/${videoId}`;
      }
      
      // Direct video files or already embedded URLs
      return videoUrl;
    };

    setEmbedUrl(convertToEmbedUrl(url));
  }, [url]);

  // Check if it's a direct video file
  const isDirectVideo = embedUrl.match(/\.(mp4|webm|ogg)$/i);

  if (isDirectVideo) {
    return (
      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <video
          controls
          className="w-full h-full"
          title={title}
        >
          <source src={embedUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
      <iframe
        src={embedUrl}
        title={title || "Video player"}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
