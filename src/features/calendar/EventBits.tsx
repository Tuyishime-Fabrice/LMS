import { format } from "date-fns";
import type { Locale } from "date-fns";
import { CalendarClock, ClipboardList, Flag, GraduationCap, MapPin, Video, type LucideIcon } from "lucide-react";
import type { CalendarEvent, CalendarEventKind } from "./events";

export const kindMeta: Record<CalendarEventKind, { icon: LucideIcon; labelKey: string; label: string; className: string; dot: string }> = {
  session: { icon: CalendarClock, labelKey: "calendar2.kind.session", label: "Live session", className: "border-l-primary bg-leaf/70 text-leaf-foreground", dot: "bg-primary" },
  assignment: { icon: ClipboardList, labelKey: "calendar2.kind.assignment", label: "Assignment due", className: "border-l-warning bg-warning-surface text-warning", dot: "bg-warning" },
  capstone: { icon: GraduationCap, labelKey: "calendar2.kind.capstone", label: "Capstone due", className: "border-l-warning bg-warning-surface text-warning", dot: "bg-warning" },
  cohort_start: { icon: Flag, labelKey: "calendar2.kind.cohortStart", label: "Cohort starts", className: "border-l-info bg-info-surface text-info", dot: "bg-info" },
  cohort_end: { icon: Flag, labelKey: "calendar2.kind.cohortEnd", label: "Cohort ends", className: "border-l-info bg-info-surface text-info", dot: "bg-info" },
};

export function eventTimeLabel(event: CalendarEvent, locale: Locale) {
  if (event.allDay) return format(event.start, "EEE d MMM", { locale });
  const start = format(event.start, "HH:mm", { locale });
  return event.end ? `${start} – ${format(event.end, "HH:mm", { locale })}` : start;
}

/** The viewer's time zone, named, so a time is never ambiguous. */
export function timeZoneLabel() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const short = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;
    return short ? `${zone.replace(/_/g, " ")} (${short})` : zone;
  } catch {
    return "";
  }
}

export function ModalityIcon({ event, className }: { event: CalendarEvent; className?: string }) {
  if (event.kind !== "session") return null;
  const Icon = event.modality === "in_person" ? MapPin : Video;
  return <Icon className={className} />;
}
