import { cn } from "@/lib/utils";

/**
 * Marks content DATA+ still has to supply (a testimonial, a bio, a verified
 * figure, a screenshot). Visible as a dashed outline while developing,
 * renders nothing in production, so nothing invented ever ships.
 */
export function ContentTodo({ label, className }: { label: string; className?: string }) {
  if (!import.meta.env.DEV) return null;
  return (
    <div
      role="note"
      className={cn("rounded-lg border-2 border-dashed border-warning/60 bg-warning-surface/40 px-4 py-3 text-sm font-medium text-warning", className)}
    >
      Content needed: {label}
    </div>
  );
}
