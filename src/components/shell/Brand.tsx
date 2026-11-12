import { cn } from "@/lib/utils";

/** The DataPlus mark with the Academy name. `compact` shows the mark alone. */
export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <img
        src="/images/dataplus-mark.png"
        alt={compact ? "DataPlus Academy" : ""}
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 object-contain"
      />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[1.0625rem] font-semibold tracking-tight text-forest">DataPlus</span>
          <span className="mt-0.5 text-[0.6875rem] font-medium tracking-wide text-muted-foreground">Academy</span>
        </span>
      )}
    </span>
  );
}
