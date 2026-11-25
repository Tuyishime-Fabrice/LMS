import type { ReactNode } from "react";
import { PlusMotif } from "@/components/brand/PlusMotif";
import { cn } from "@/lib/utils";

/** One width and rhythm for every home section. */
export function Section({ id, tone = "cream", className, innerClassName, children, labelledBy }: {
  id?: string; tone?: "cream" | "white" | "green"; className?: string; innerClassName?: string; children: ReactNode; labelledBy?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        "relative overflow-hidden scroll-mt-20",
        tone === "cream" && "bg-background",
        tone === "white" && "bg-card",
        tone === "green" && "bg-forest text-cream",
        className,
      )}
    >
      <div className={cn("relative mx-auto max-w-site px-4 py-16 sm:px-6 sm:py-24 lg:px-8", innerClassName)}>{children}</div>
    </section>
  );
}

/**
 * Section heading. `marker` adds the stepped plus (28 px) in place of an eyebrow label;
 * the brief allows it on at most three home sections.
 */
export function SectionTitle({ id, title, body, marker = false, light = false, action, className }: {
  id: string; title: string; body?: string; marker?: boolean; light?: boolean; action?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {marker && <PlusMotif variant="stepped" size={28} tone={light ? "dark" : "light"} className="mb-4" />}
        <h2 id={id} className={cn("text-[2rem] font-bold leading-[1.1] sm:text-[2.5rem]", light ? "text-cream" : "text-forest")}>{title}</h2>
        {body && <p className={cn("mt-4 text-base leading-7 sm:text-lg", light ? "text-cream/80" : "text-muted-foreground")}>{body}</p>}
      </div>
      {action}
    </div>
  );
}
