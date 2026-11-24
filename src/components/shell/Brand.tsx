import { cn } from "@/lib/utils";

/**
 * The DATA+ mark with the Academy wordmark. `compact` shows the mark alone;
 * `tone="light"` is for dark surfaces.
 */
export function Brand({ compact = false, tone = "dark", className }: { compact?: boolean; tone?: "dark" | "light"; className?: string }) {
  const light = tone === "light";
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", light ? "bg-white" : "bg-card ring-1 ring-border")}>
        <img
          src="/images/dataplus-mark.png"
          alt={compact ? "DATA+ Academy" : ""}
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 object-contain"
        />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className={cn("font-display text-[1.0625rem] font-extrabold tracking-[-0.01em]", light ? "text-white" : "text-forest")}>
            DATA<span className={light ? "text-flame" : "text-primary"}>+</span>
          </span>
          <span className={cn("mt-1 text-[0.625rem] font-semibold uppercase tracking-[0.16em]", light ? "text-white/60" : "text-muted-foreground")}>Academy</span>
        </span>
      )}
    </span>
  );
}
