import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import {
  Award, Bell, CalendarClock, CheckCheck, ClipboardCheck, FileCheck2, Megaphone, type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type FeedItem = {
  id: string;
  source: "notification" | "announcement";
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  read: boolean;
};

const iconFor: Record<string, LucideIcon> = {
  certificate_issued: Award,
  certificate_revoked: Award,
  submission_received: FileCheck2,
  submission_graded: ClipboardCheck,
  new_submission: ClipboardCheck,
  application_received: FileCheck2,
  application_decision: FileCheck2,
  session_scheduled: CalendarClock,
  session_changed: CalendarClock,
  session_cancelled: CalendarClock,
  announcement: Megaphone,
};

// The notifications table arrives with the 2026-11-12 migration. Until it is
// applied the query fails; the bell then shows Academy announcements only.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

async function loadFeed(userId: string, role: string): Promise<FeedItem[]> {
  const audience = role === "student" ? "students" : role === "teacher" ? "teachers" : "all";
  const [notifications, announcements, reads] = await Promise.all([
    db.from("notifications").select("id, type, title, body, link, read_at, created_at")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    supabase.from("announcements").select("id, title, message, created_at")
      .eq("is_active", true).or(`target_audience.eq.all,target_audience.eq.${audience}`)
      .order("created_at", { ascending: false }).limit(20),
    supabase.from("announcement_reads").select("announcement_id").eq("user_id", userId),
  ]);

  const readIds = new Set((reads.data || []).map((r) => r.announcement_id));
  const items: FeedItem[] = [
    ...((notifications.data as Array<Record<string, string | null>> | null) || []).map((n) => ({
      id: n.id as string,
      source: "notification" as const,
      type: n.type as string,
      title: n.title as string,
      body: n.body,
      link: n.link,
      createdAt: n.created_at as string,
      read: Boolean(n.read_at),
    })),
    ...(announcements.data || []).map((a) => ({
      id: a.id,
      source: "announcement" as const,
      type: "announcement",
      title: a.title,
      body: a.message,
      link: null,
      createdAt: a.created_at,
      read: readIds.has(a.id),
    })),
  ];
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 40);
}

export function NotificationBell() {
  const { user, profile } = useAppAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const queryKey = useMemo(() => ["notification-feed", user?.id], [user?.id]);

  const { data: items = [] } = useQuery({
    queryKey,
    queryFn: () => loadFeed(user!.id, profile?.role || "student"),
    enabled: Boolean(user?.id && profile),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void queryClient.invalidateQueries({ queryKey }))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" },
        () => void queryClient.invalidateQueries({ queryKey }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, queryClient, queryKey]);

  const unread = items.filter((item) => !item.read).length;
  const locale = i18n.language?.startsWith("fr") ? fr : enUS;

  const markRead = async (targets: FeedItem[]) => {
    if (!user?.id || targets.length === 0) return;
    const notificationIds = targets.filter((i) => i.source === "notification").map((i) => i.id);
    const announcementIds = targets.filter((i) => i.source === "announcement").map((i) => i.id);
    queryClient.setQueryData<FeedItem[]>(queryKey, (previous = []) =>
      previous.map((item) => (targets.some((target) => target.id === item.id) ? { ...item, read: true } : item)));
    await Promise.all([
      notificationIds.length ? db.rpc("mark_notifications_read", { p_ids: notificationIds }) : null,
      announcementIds.length
        ? supabase.from("announcement_reads").upsert(
            announcementIds.map((id) => ({ announcement_id: id, user_id: user.id })),
            { onConflict: "announcement_id,user_id" })
        : null,
    ]);
  };

  const openItem = (item: FeedItem) => {
    void markRead([item]);
    if (item.link) {
      setOpen(false);
      navigate(item.link);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:text-forest"
          aria-label={unread > 0
            ? t("shell.notifications.unreadLabel", "Notifications, {{count}} unread", { count: unread })
            : t("shell.notifications.title", "Notifications")}
        >
          <Bell className="!size-[1.125rem]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-semibold leading-none text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-card-title">{t("shell.notifications.title", "Notifications")}</h2>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => void markRead(items.filter((item) => !item.read))}
              className="flex items-center gap-1 rounded-md text-xs font-medium text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              {t("shell.notifications.markAll", "Mark all as read")}
            </button>
          )}
        </div>
        {items.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Bell className="mx-auto mb-3 h-6 w-6 text-muted-foreground/60" />
            <p className="text-sm font-medium text-forest">{t("shell.notifications.emptyTitle", "You're all caught up")}</p>
            <p className="mt-1 text-meta">{t("shell.notifications.emptyBody", "Feedback, schedule changes and certificates will show up here.")}</p>
          </div>
        ) : (
          <ul className="max-h-[26rem] divide-y overflow-y-auto">
            {items.map((item) => {
              const Icon = iconFor[item.type] || Bell;
              return (
                <li key={`${item.source}-${item.id}`}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={cn(
                      "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                      !item.read && "bg-leaf/50",
                    )}
                  >
                    <span className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      item.read ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary")}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-sm leading-5 text-forest", !item.read && "font-semibold")}>{item.title}</span>
                      {item.body && <span className="mt-0.5 line-clamp-2 block text-meta">{item.body}</span>}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale })}
                      </span>
                    </span>
                    {!item.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
