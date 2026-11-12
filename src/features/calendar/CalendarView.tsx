import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  addDays, addMonths, addWeeks, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
  isToday, startOfDay, startOfMonth, startOfWeek,
} from "date-fns";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, ExternalLink, MapPin, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { useCalendarEvents, useDateLocale } from "@/features/learning/hooks";
import type { AppRole } from "@/components/shell/navigation";
import { findConflicts, type CalendarEvent } from "./events";
import { eventTimeLabel, kindMeta, timeZoneLabel } from "./EventBits";
import { cn } from "@/lib/utils";

type View = "month" | "week" | "agenda";
const WEEK = { weekStartsOn: 1 as const };
const HOUR_PX = 52;

function EventChip({ event, conflicted, onOpen, compact }: {
  event: CalendarEvent; conflicted: boolean; onOpen: (event: CalendarEvent) => void; compact?: boolean;
}) {
  const locale = useDateLocale();
  const meta = kindMeta[event.kind];
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onOpen(event); }}
      className={cn(
        "flex w-full items-center gap-1.5 truncate rounded-md border-l-[3px] px-1.5 py-1 text-left text-xs leading-4 transition-[filter] hover:brightness-95",
        meta.className, event.cancelled && "opacity-55 line-through", conflicted && "ring-1 ring-destructive",
      )}
    >
      {!event.allDay && !compact && <span className="tabular shrink-0 font-semibold">{format(event.start, "HH:mm", { locale })}</span>}
      <span className="truncate font-medium text-forest">{event.title}</span>
    </button>
  );
}

function EventDetails({ event, conflicted, onClose }: { event: CalendarEvent | null; conflicted: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  if (!event) return null;
  const meta = kindMeta[event.kind];
  const isSession = event.kind === "session";
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex flex-wrap gap-1.5">
            <StatusPill tone={isSession ? "green" : event.kind.startsWith("cohort") ? "blue" : "amber"} icon={meta.icon}>
              {t(meta.labelKey, meta.label)}
            </StatusPill>
            {event.cancelled && <StatusPill tone="red">{t("calendar2.cancelled", "Cancelled")}</StatusPill>}
          </div>
          <DialogTitle className="text-left font-display text-xl text-forest">{event.title}</DialogTitle>
          <DialogDescription className="text-left">
            {event.courseTitle || t("calendar2.noCourse", "DataPlus Academy")}
          </DialogDescription>
        </DialogHeader>

        <dl className="space-y-3 text-sm">
          <div className="flex gap-3">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div>
              <dt className="sr-only">{t("calendar2.when", "When")}</dt>
              <dd className="font-medium text-forest">
                {format(event.start, "EEEE d MMMM yyyy", { locale })}
                {!event.allDay && <span className="tabular">, {eventTimeLabel(event, locale)}</span>}
              </dd>
              {!event.allDay && <dd className="text-meta">{timeZoneLabel()}</dd>}
            </div>
          </div>
          {isSession && (
            <div className="flex gap-3">
              {event.modality === "in_person"
                ? <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                : <Video className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />}
              <div>
                <dt className="sr-only">{t("calendar2.where", "Where")}</dt>
                <dd className="font-medium text-forest">
                  {event.modality === "in_person" ? t("calendar2.inPerson", "In person")
                    : event.modality === "hybrid" ? t("calendar2.hybrid", "In person and online")
                    : t("calendar2.online", "Online")}
                </dd>
                {event.location && <dd className="text-meta">{event.location}</dd>}
              </div>
            </div>
          )}
          {event.cohortName && event.kind === "session" && <p className="text-meta">{event.cohortName}</p>}
          {event.description && <p className="whitespace-pre-line leading-6 text-foreground/85">{event.description}</p>}
          {conflicted && (
            <p role="alert" className="flex items-start gap-2 rounded-lg bg-destructive-surface px-3 py-2.5 text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {t("calendar2.conflict", "This session overlaps another one for the same teacher or room.")}
            </p>
          )}
        </dl>

        <div className="flex flex-wrap gap-2 pt-1">
          {isSession && event.link && !event.cancelled && (
            <Button asChild>
              <a href={event.link} target="_blank" rel="noreferrer">{t("calendar2.join", "Join session")}<ExternalLink /></a>
            </Button>
          )}
          {event.href && (
            <Button asChild variant={isSession && event.link ? "outline" : "default"}>
              <Link to={event.href}>
                {event.kind === "assignment" ? t("calendar2.openAssignment", "Open assignment")
                  : event.kind === "capstone" ? t("calendar2.openCapstone", "Open capstone")
                  : t("calendar2.openCourse", "Open course")}
              </Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AgendaList({ events, conflicts, onOpen }: { events: CalendarEvent[]; conflicts: Set<string>; onOpen: (e: CalendarEvent) => void }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const days = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const key = format(event.start, "yyyy-MM-dd");
      map.set(key, [...(map.get(key) || []), event]);
    });
    return [...map.entries()];
  }, [events]);

  return (
    <ol className="space-y-6">
      {days.map(([key, items]) => {
        const date = items[0].start;
        return (
          <li key={key} className="grid gap-3 sm:grid-cols-[9rem_1fr]">
            <div className="flex items-baseline gap-2 sm:block">
              <p className={cn("font-display text-base font-semibold", isToday(date) ? "text-primary" : "text-forest")}>
                {isToday(date) ? t("home.week.today", "Today") : format(date, "EEEE", { locale })}
              </p>
              <p className="text-meta">{format(date, "d MMMM", { locale })}</p>
            </div>
            <ul className="surface divide-y">
              {items.map((event) => {
                const meta = kindMeta[event.kind];
                return (
                  <li key={event.id}>
                    <button type="button" onClick={() => onOpen(event)} className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50">
                      <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", meta.dot)} aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm font-semibold text-forest", event.cancelled && "line-through opacity-60")}>{event.title}</span>
                        <span className="mt-0.5 block text-meta">
                          {t(meta.labelKey, meta.label)}{event.courseTitle ? `, ${event.courseTitle}` : ""}
                        </span>
                        {event.kind === "session" && (
                          <span className="mt-0.5 flex items-center gap-1 text-meta">
                            {event.modality === "in_person" ? <MapPin className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                            {event.modality === "in_person" ? event.location || t("calendar2.inPerson", "In person") : t("calendar2.online", "Online")}
                          </span>
                        )}
                      </span>
                      <span className="tabular shrink-0 text-right text-sm font-medium text-forest">
                        {event.allDay ? t("calendar2.allDay", "All day") : eventTimeLabel(event, locale)}
                        {conflicts.has(event.id) && (
                          <span className="mt-1 flex items-center justify-end gap-1 text-xs font-semibold text-destructive">
                            <AlertTriangle className="h-3 w-3" />{t("calendar2.conflictShort", "Conflict")}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}

function WeekGrid({ days, events, conflicts, onOpen }: {
  days: Date[]; events: CalendarEvent[]; conflicts: Set<string>; onOpen: (e: CalendarEvent) => void;
}) {
  const locale = useDateLocale();
  const { t } = useTranslation();
  const dueLabel = t("calendar2.due", "Due");
  const timed = events.filter((event) => !event.allDay && event.kind === "session");
  const untimed = events.filter((event) => event.allDay || event.kind !== "session");
  const firstHour = Math.max(0, Math.min(8, ...timed.map((event) => event.start.getHours())));
  const lastHour = Math.min(24, Math.max(18, ...timed.map((event) => (event.end || event.start).getHours() + 1)));
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);

  return (
    <div className="surface overflow-hidden">
      <div className="grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] border-b bg-muted/40">
        <div />
        {days.map((day) => (
          <div key={day.toISOString()} className="border-l px-2 py-2 text-center">
            <p className="text-xs text-muted-foreground">{format(day, "EEE", { locale })}</p>
            <p className={cn("tabular mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full font-display text-sm font-semibold",
              isToday(day) ? "bg-primary text-primary-foreground" : "text-forest")}>{format(day, "d")}</p>
          </div>
        ))}
      </div>
      {untimed.length > 0 && (
        <div className="grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))] border-b">
          <div className="px-1 py-2 text-right text-[0.6875rem] leading-4 text-muted-foreground">{dueLabel}</div>
          {days.map((day) => (
            <div key={day.toISOString()} className="min-h-9 space-y-1 border-l p-1">
              {untimed.filter((event) => isSameDay(event.start, day)).map((event) => (
                <EventChip key={event.id} event={event} conflicted={false} onOpen={onOpen} />
              ))}
            </div>
          ))}
        </div>
      )}
      <div className="max-h-[34rem] overflow-y-auto">
        <div className="relative grid grid-cols-[3.25rem_repeat(7,minmax(0,1fr))]" style={{ height: hours.length * HOUR_PX }}>
          <div>
            {hours.map((hour) => (
              <div key={hour} style={{ height: HOUR_PX }} className="tabular -translate-y-2 pr-2 text-right text-[0.6875rem] text-muted-foreground first:translate-y-0">
                {String(hour).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((day) => {
            const dayEvents = timed.filter((event) => isSameDay(event.start, day));
            return (
              <div key={day.toISOString()} className={cn("relative border-l", isToday(day) && "bg-leaf/30")}>
                {hours.map((hour) => <div key={hour} style={{ height: HOUR_PX }} className="border-b border-dashed border-border/70" />)}
                {dayEvents.map((event) => {
                  const overlapping = dayEvents.filter((other) => other.start < (event.end || event.start) && event.start < (other.end || other.start));
                  const column = overlapping.indexOf(event);
                  const top = (event.start.getHours() + event.start.getMinutes() / 60 - firstHour) * HOUR_PX;
                  const minutes = ((event.end || event.start).getTime() - event.start.getTime()) / 60_000 || 60;
                  const meta = kindMeta[event.kind];
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => onOpen(event)}
                      style={{
                        top, height: Math.max(26, (minutes / 60) * HOUR_PX - 2),
                        left: `calc(${(column / overlapping.length) * 100}% + 2px)`,
                        width: `calc(${100 / overlapping.length}% - 4px)`,
                      }}
                      className={cn(
                        "absolute overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-xs leading-4 transition-[filter] hover:brightness-95",
                        meta.className, event.cancelled && "opacity-55 line-through", conflicts.has(event.id) && "ring-1 ring-destructive",
                      )}
                    >
                      <span className="block truncate font-semibold text-forest">{event.title}</span>
                      <span className="tabular block truncate">{eventTimeLabel(event, locale)}</span>
                      {event.modality === "in_person" && event.location && <span className="block truncate">{event.location}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * The Academy calendar. One component for learners, teachers and admins:
 * the role decides which courses feed it, and admins also see conflicts.
 */
export function CalendarView({ role, toolbarExtra }: { role: AppRole; toolbarExtra?: React.ReactNode }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const [view, setView] = useState<View>(() => (typeof window !== "undefined" && window.innerWidth < 768 ? "agenda" : "month"));
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [active, setActive] = useState<CalendarEvent | null>(null);

  const range = useMemo(() => {
    if (view === "month") return { from: startOfWeek(startOfMonth(anchor), WEEK), to: endOfWeek(endOfMonth(anchor), WEEK) };
    if (view === "week") return { from: startOfWeek(anchor, WEEK), to: endOfWeek(anchor, WEEK) };
    return { from: anchor, to: addDays(anchor, 42) };
  }, [view, anchor]);

  const query = useCalendarEvents(range.from, range.to, role);
  const events = useMemo(() => query.data || [], [query.data]);
  const conflicts = useMemo(() => (role === "admin" ? findConflicts(events) : new Set<string>()), [events, role]);

  const move = (direction: 1 | -1) => setAnchor((current) =>
    view === "month" ? addMonths(current, direction) : view === "week" ? addWeeks(current, direction) : addDays(current, direction * 28));

  const label = view === "month"
    ? format(anchor, "MMMM yyyy", { locale })
    : view === "week"
      ? `${format(range.from, "d MMM", { locale })} – ${format(range.to, "d MMM yyyy", { locale })}`
      : t("calendar2.from", "From {{date}}", { date: format(anchor, "d MMMM yyyy", { locale }) });

  const days = eachDayOfInterval({ start: range.from, end: range.to });
  const views: Array<{ id: View; label: string }> = [
    { id: "month", label: t("calendar2.view.month", "Month") },
    { id: "week", label: t("calendar2.view.week", "Week") },
    { id: "agenda", label: t("calendar2.view.agenda", "Agenda") },
  ];
  const dayEvents = selectedDay ? events.filter((event) => isSameDay(event.start, selectedDay)) : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => { setAnchor(startOfDay(new Date())); setSelectedDay(null); }}>
          {t("home.week.today", "Today")}
        </Button>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => move(-1)} aria-label={t("calendar2.previous", "Previous")}><ChevronLeft /></Button>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => move(1)} aria-label={t("calendar2.next", "Next")}><ChevronRight /></Button>
        </div>
        <h2 className="text-section-title capitalize" aria-live="polite">{label}</h2>
        <div className="ml-auto flex items-center gap-2">
          {toolbarExtra}
          <div role="tablist" aria-label={t("calendar2.viewLabel", "Calendar view")} className="flex rounded-lg border bg-card p-0.5">
            {views.map((item) => (
              <button
                key={item.id}
                role="tab"
                type="button"
                aria-selected={view === item.id}
                onClick={() => setView(item.id)}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === item.id ? "bg-forest text-forest-foreground" : "text-muted-foreground hover:text-forest")}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {role === "admin" && conflicts.size > 0 && (
        <p role="alert" className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive-surface px-4 py-2.5 text-sm font-medium text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t("calendar2.conflictCount", "{{count}} sessions overlap for the same teacher or room.", { count: conflicts.size })}
        </p>
      )}

      {query.isLoading ? (
        <SkeletonBlock className="h-[32rem] rounded-xl" />
      ) : query.isError ? (
        <ErrorState
          title={t("calendar2.error", "The calendar could not be loaded")}
          description={t("home.error.body", "Check your connection and try again.")}
          onRetry={() => void query.refetch()}
          retryLabel={t("common.tryAgain", "Try again")}
        />
      ) : view === "agenda" ? (
        events.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t("calendar2.empty.title", "Nothing scheduled")} description={t("calendar2.empty.body", "Sessions and deadlines for your courses will appear here.")} />
        ) : <AgendaList events={events} conflicts={conflicts} onOpen={setActive} />
      ) : view === "week" ? (
        <>
          <div className="hidden md:block"><WeekGrid days={days} events={events} conflicts={conflicts} onOpen={setActive} /></div>
          <div className="md:hidden">
            {events.length === 0
              ? <EmptyState icon={CalendarDays} title={t("calendar2.empty.week", "Nothing scheduled this week")} />
              : <AgendaList events={events} conflicts={conflicts} onOpen={setActive} />}
          </div>
        </>
      ) : (
        <>
          <div className="surface overflow-hidden">
            <div className="grid grid-cols-7 border-b bg-muted/40">
              {days.slice(0, 7).map((day) => (
                <div key={day.toISOString()} className="px-2 py-2 text-center text-xs font-medium text-muted-foreground">
                  {format(day, "EEE", { locale })}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const items = events.filter((event) => isSameDay(event.start, day));
                const selected = selectedDay && isSameDay(day, selectedDay);
                return (
                  <div
                    key={day.toISOString()}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDay(day)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedDay(day); } }}
                    aria-label={`${format(day, "EEEE d MMMM", { locale })}, ${items.length}`}
                    className={cn(
                      "min-h-[4.25rem] cursor-pointer border-b border-r p-1.5 text-left transition-colors hover:bg-muted/40 md:min-h-[7.25rem]",
                      index % 7 === 6 && "border-r-0",
                      !isSameMonth(day, anchor) && "bg-muted/30 text-muted-foreground",
                      selected && "bg-leaf/50",
                    )}
                  >
                    <span className={cn("tabular flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      isToday(day) ? "bg-primary text-primary-foreground" : isSameMonth(day, anchor) ? "text-forest" : "")}>
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 hidden space-y-1 md:block">
                      {items.slice(0, 3).map((event) => (
                        <EventChip key={event.id} event={event} conflicted={conflicts.has(event.id)} onOpen={setActive} />
                      ))}
                      {items.length > 3 && (
                        <span className="block px-1 text-xs font-medium text-muted-foreground">
                          {t("calendar2.more", "+{{count}} more", { count: items.length - 3 })}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-0.5 md:hidden">
                      {items.slice(0, 4).map((event) => <span key={event.id} className={cn("h-1.5 w-1.5 rounded-full", kindMeta[event.kind].dot)} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {selectedDay && (
            <div className="mt-5">
              {dayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("calendar2.dayEmpty", "Nothing on {{date}}.", { date: format(selectedDay, "EEEE d MMMM", { locale }) })}
                </p>
              ) : <AgendaList events={dayEvents} conflicts={conflicts} onOpen={setActive} />}
            </div>
          )}
        </>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        {t("calendar2.zone", "Times are shown in your time zone: {{zone}}", { zone: timeZoneLabel() })}
      </p>

      <EventDetails event={active} conflicted={Boolean(active && conflicts.has(active.id))} onClose={() => setActive(null)} />
    </div>
  );
}
