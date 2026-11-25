import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A row of filter buttons that looks like tabs. It filters the list below rather than switching
 * panels, so it is a labelled group of pressed/unpressed buttons (not role="tab", which would
 * need a tab panel for each option).
 */
export function FilterTabs<T extends string>({ label, value, onChange, options, className }: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={cn("inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1", className)}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-card text-forest shadow-sm" : "text-muted-foreground hover:text-forest",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
