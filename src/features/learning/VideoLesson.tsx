import { useEffect, useMemo, useRef } from "react";

function youTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1).split("/")[0] || null;
    if (parsed.hostname.includes("youtube")) {
      if (parsed.searchParams.get("v")) return parsed.searchParams.get("v");
      const match = parsed.pathname.match(/\/(embed|shorts|live)\/([^/?]+)/);
      if (match) return match[2];
    }
  } catch { /* not a URL */ }
  return null;
}

function otherEmbed(url: string): string {
  if (url.includes("vimeo.com/") && !url.includes("player.vimeo.com")) {
    return `https://player.vimeo.com/video/${url.split("vimeo.com/")[1].split(/[?/]/)[0]}`;
  }
  if (url.includes("dailymotion.com/video/")) {
    return `https://www.dailymotion.com/embed/video/${url.split("dailymotion.com/video/")[1].split("?")[0]}`;
  }
  return url;
}

/**
 * Lesson video. YouTube is the primary source and resumes from the saved
 * position; uploaded video files resume too. Other embeds (Vimeo and so on)
 * play normally but do not report a position, so they always start at 0.
 */
export function VideoLesson({ url, title, startAt = 0, onPosition }: {
  url: string; title: string; startAt?: number; onPosition?: (seconds: number) => void;
}) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const lastSaved = useRef(startAt);
  const id = useMemo(() => youTubeId(url), [url]);
  const isFile = /\.(mp4|webm|ogg)(\?|$)/i.test(url);

  useEffect(() => {
    if (!id || !onPosition) return;
    const frame = iframe.current;
    const origin = "https://www.youtube-nocookie.com";
    const listen = () => frame?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id: 1, channel: "widget" }), origin);
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frame?.contentWindow) return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        const seconds = Math.floor(data?.info?.currentTime ?? -1);
        if (seconds >= 0 && Math.abs(seconds - lastSaved.current) >= 15) {
          lastSaved.current = seconds;
          onPosition(seconds);
        }
      } catch { /* ignore non-JSON messages */ }
    };
    window.addEventListener("message", onMessage);
    frame?.addEventListener("load", listen);
    const timer = window.setInterval(listen, 4000);
    return () => {
      window.removeEventListener("message", onMessage);
      frame?.removeEventListener("load", listen);
      window.clearInterval(timer);
    };
  }, [id, onPosition]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-forest">
      {isFile ? (
        <video
          controls
          preload="metadata"
          className="h-full w-full"
          title={title}
          onLoadedMetadata={(event) => { if (startAt > 0) event.currentTarget.currentTime = startAt; }}
          onTimeUpdate={(event) => {
            const seconds = Math.floor(event.currentTarget.currentTime);
            if (onPosition && Math.abs(seconds - lastSaved.current) >= 15) { lastSaved.current = seconds; onPosition(seconds); }
          }}
        >
          <source src={url} />
        </video>
      ) : (
        <iframe
          ref={iframe}
          key={url}
          src={id
            ? `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1${startAt > 5 ? `&start=${startAt}` : ""}`
            : otherEmbed(url)}
          title={title}
          loading="lazy"
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
        />
      )}
    </div>
  );
}
