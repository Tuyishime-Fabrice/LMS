import { cn } from "@/lib/utils";

/**
 * The official DATA+ Academy lock-up (target, dart, "DATA+", "ACADEMY").
 * Until DATA+ supplies the logo as SVG, these images are cut from the intro's poster frame
 * (public/brand/intro/intro-poster.jpg) with the background made transparent; see DESIGN_SYSTEM.md.
 * `compact` shows the target and dart alone; `tone="light"` is for dark green surfaces.
 */
export function Brand({ compact = false, tone = "dark", className }: { compact?: boolean; tone?: "dark" | "light"; className?: string }) {
  const light = tone === "light";
  if (compact) {
    return (
      <span className={cn("flex items-center", className)}>
        <img
          src={light ? "/brand/dataplus-academy-mark-light.webp" : "/brand/dataplus-academy-mark.webp"}
          alt="DATA+ Academy"
          width={36}
          height={36}
          className="h-9 w-9 shrink-0 object-contain"
        />
      </span>
    );
  }
  return (
    <span className={cn("flex items-center", className)}>
      <img
        src={light ? "/brand/dataplus-academy-logo-light.webp" : "/brand/dataplus-academy-logo.webp"}
        alt="DATA+ Academy"
        width={91}
        height={48}
        className="h-12 w-auto shrink-0"
      />
    </span>
  );
}
