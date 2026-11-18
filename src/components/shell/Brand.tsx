import { cn } from "@/lib/utils";

/**
 * The DataPlus mark with the Academy name. `compact` shows the mark alone;
 * `tone="light"` is for navy backgrounds.
 */
export function Brand({ compact = false, tone = "dark", className }: { compact?: boolean; tone?: "dark" | "light"; className?: string }) {
  const light = tone === "light";
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", light ? "bg-white" : "")}>
        <img
          src="/images/dataplus-mark.png"
          alt={compact ? "DataPlus Academy" : ""}
          width={32}
          height={32}
          className={cn("shrink-0 object-contain", light ? "h-7 w-7" : "h-8 w-8")}
        />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className={cn("font-display text-[1.0625rem] font-bold tracking-tight", light ? "text-white" : "text-forest")}>DataPlus</span>
          <span className={cn("mt-0.5 text-[0.6875rem] font-medium uppercase tracking-[0.14em]", light ? "text-white/60" : "text-muted-foreground")}>Academy</span>
        </span>
      )}
    </span>
  );
}
