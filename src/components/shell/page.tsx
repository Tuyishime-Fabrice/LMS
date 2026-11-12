import { type ReactNode } from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Title block at the top of a page: what this page is, and its one main action. */
export function PageHeader({
  title, description, actions, className,
}: { title: ReactNode; description?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-page-title">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[0.9375rem] leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeader({ title, action, className }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-section-title">{title}</h2>
      {action}
    </div>
  );
}

/** An empty screen says what belongs here and offers the next step. */
export function EmptyState({
  icon: Icon, title, description, action, className,
}: { icon: LucideIcon; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("surface flex flex-col items-center px-6 py-12 text-center", className)}>
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-leaf text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="text-card-title">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Something failed to load: say so, and offer a retry. */
export function ErrorState({ title, description, onRetry, retryLabel = "Try again" }: {
  title: string; description?: string; onRetry?: () => void; retryLabel?: string;
}) {
  return (
    <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive-surface px-5 py-4">
      <p className="text-sm font-semibold text-destructive">{title}</p>
      {description && <p className="mt-1 text-sm text-foreground/80">{description}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-3 text-sm font-semibold text-destructive underline underline-offset-4">
          {retryLabel}
        </button>
      )}
    </div>
  );
}

/** Progress bar. Fills from zero the first time it is drawn. */
export function ProgressBar({
  value, label, className, tone = "green", size = "md",
}: { value: number; label?: string; className?: string; tone?: "green" | "onForest"; size?: "sm" | "md" }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={label}
      className={cn(
        "w-full overflow-hidden rounded-full",
        size === "sm" ? "h-1.5" : "h-2",
        tone === "green" ? "bg-forest/10" : "bg-white/15",
        className,
      )}
    >
      <div style={{ width: `${clamped}%` }} className="h-full">
        <div className={cn("animate-grow-x h-full rounded-full", tone === "green" ? "bg-primary" : "bg-[hsl(140_55%_62%)]")} />
      </div>
    </div>
  );
}

const pillTones = {
  neutral: "bg-muted text-foreground/80",
  green: "bg-leaf text-leaf-foreground",
  amber: "bg-warning-surface text-warning",
  red: "bg-destructive-surface text-destructive",
  blue: "bg-info-surface text-info",
  forest: "bg-forest text-forest-foreground",
} as const;

/** Small status label. Always text, never colour alone. */
export function StatusPill({ tone = "neutral", icon: Icon, children, className }: {
  tone?: keyof typeof pillTones; icon?: LucideIcon; children: ReactNode; className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", pillTones[tone], className)}>
      {Icon && <Icon className="h-3 w-3" />}
      {children}
    </span>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-forest/[0.07]", className)} />;
}
