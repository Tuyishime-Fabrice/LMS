import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Course image. When a course has no thumbnail (or it fails to load) the
 * course initials sit on a quiet green field, so every course still has a
 * recognisable tile.
 */
export function CourseThumb({ src, title, className }: { src: string | null | undefined; title: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const initials = title.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("");
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-leaf", className)}>
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <div
          aria-hidden
          className="flex h-full w-full items-center justify-center font-display text-lg font-semibold text-primary/70"
          style={{ backgroundImage: "radial-gradient(hsl(var(--primary) / 0.14) 1px, transparent 1px)", backgroundSize: "14px 14px" }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
