import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format, isSameDay, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, MessagesSquare, Search, SendHorizontal, UsersRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/shell/AppShell";
import { ErrorState, SkeletonBlock } from "@/components/shell/page";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDateLocale } from "@/features/learning/hooks";
import { fetchInbox, fetchMessages, markConversationRead, sendMessage, type MessageRole, type Thread } from "./api";
import { cn } from "@/lib/utils";

const initialsOf = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";

function PersonAvatar({ thread, className }: { thread: Thread; className?: string }) {
  return (
    <Avatar className={cn("h-10 w-10 shrink-0", className)}>
      {thread.peerAvatar && <AvatarImage src={thread.peerAvatar} alt="" />}
      <AvatarFallback className="bg-leaf text-xs font-semibold text-leaf-foreground">{initialsOf(thread.peerName)}</AvatarFallback>
    </Avatar>
  );
}

function ConversationPane({ thread, role, onBack }: { thread: Thread; role: MessageRole; onBack: () => void }) {
  const { t } = useTranslation();
  const { user } = useAppAuth();
  const locale = useDateLocale();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const fallbackName = role === "student" ? t("messages.instructor", "Instructor") : t("messages.learner", "Learner");

  const { data: messages, isLoading } = useQuery({
    queryKey: ["messages", thread.conversationId],
    queryFn: () => fetchMessages(thread.conversationId!),
    enabled: Boolean(thread.conversationId),
  });

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [messages?.length, thread.peerId]);

  // Opening a conversation marks what the other person wrote as read.
  useEffect(() => {
    if (!thread.conversationId || thread.unread === 0) return;
    void markConversationRead(thread.conversationId).then(() => queryClient.invalidateQueries({ queryKey: ["inbox"] }));
  }, [thread.conversationId, thread.unread, queryClient]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !user || sending) return;
    setSending(true);
    try {
      const conversationId = await sendMessage(thread, user.id, role, text);
      setDraft("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["inbox"] }),
        queryClient.invalidateQueries({ queryKey: ["messages", conversationId] }),
      ]);
    } catch {
      toast.error(t("messages.sendFailed", "Your message was not sent. Check your connection and try again."));
    } finally {
      setSending(false);
    }
  };

  const dayLabel = (date: Date) => {
    if (isToday(date)) return t("messages.today", "Today");
    if (isYesterday(date)) return t("messages.yesterday", "Yesterday");
    return format(date, "EEEE d MMMM", { locale });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b px-3 sm:px-5">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onBack} aria-label={t("messages.back", "Back to conversations")}>
          <ArrowLeft />
        </Button>
        <PersonAvatar thread={thread} />
        <div className="min-w-0">
          <h2 className="truncate font-display text-base font-semibold text-forest">{thread.peerName || fallbackName}</h2>
          {thread.courses.length > 0 && <p className="truncate text-meta">{thread.courses.join(" · ")}</p>}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite">
        {isLoading ? (
          <div className="space-y-3">
            <SkeletonBlock className="h-12 w-56" />
            <SkeletonBlock className="ml-auto h-10 w-44" />
            <SkeletonBlock className="h-14 w-64" />
          </div>
        ) : !messages?.length ? (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-leaf text-primary">
              <MessagesSquare className="h-5 w-5" />
            </span>
            <p className="text-card-title">{t("messages.emptyThreadTitle", "No messages yet")}</p>
            <p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">
              {role === "student"
                ? t("messages.emptyThreadStudent", "Ask a question about the course, a deadline or your work.")
                : t("messages.emptyThreadTeacher", "Write the first message to this learner.")}
            </p>
          </div>
        ) : (
          <ol className="space-y-1.5">
            {messages.map((message, index) => {
              const date = new Date(message.createdAt);
              const previous = messages[index - 1];
              const newDay = !previous || !isSameDay(new Date(previous.createdAt), date);
              const own = message.senderId === user?.id;
              return (
                <li key={message.id}>
                  {newDay && (
                    <p className="my-3 text-center text-xs font-medium text-muted-foreground first:mt-0">{dayLabel(date)}</p>
                  )}
                  <div className={cn("flex", own ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2 sm:max-w-[70%]",
                      own ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground",
                    )}>
                      <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-6">{message.text}</p>
                      <p className={cn("tabular mt-0.5 text-right text-[0.6875rem]", own ? "text-primary-foreground/75" : "text-muted-foreground")}>
                        {format(date, "HH:mm")}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={end} />
      </div>

      <form
        className="flex shrink-0 items-end gap-2 border-t p-3 sm:px-5"
        onSubmit={(event) => { event.preventDefault(); void send(); }}
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); }
          }}
          rows={1}
          maxLength={4000}
          placeholder={t("messages.placeholder", "Write a message")}
          aria-label={t("messages.placeholder", "Write a message")}
          className="max-h-32 min-h-10 resize-none py-2"
        />
        <Button type="submit" size="icon" disabled={!draft.trim() || sending} aria-label={t("messages.send", "Send")}>
          <SendHorizontal />
        </Button>
      </form>
    </div>
  );
}

/** Direct messages between a learner and their instructors. One page for both roles. */
export function MessagesPage({ role }: { role: MessageRole }) {
  const { t } = useTranslation();
  const { user } = useAppAuth();
  const locale = useDateLocale();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const selectedId = params.get("with");
  const fallbackName = role === "student" ? t("messages.instructor", "Instructor") : t("messages.learner", "Learner");

  const { data: inbox, isLoading, isError, refetch } = useQuery({
    queryKey: ["inbox", user?.id, role],
    queryFn: () => fetchInbox(user!.id, role),
    enabled: Boolean(user?.id),
    staleTime: 15_000,
  });

  // New messages arrive live.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase.channel(`direct-messages-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        void queryClient.invalidateQueries({ queryKey: ["inbox"] });
        void queryClient.invalidateQueries({ queryKey: ["messages", (payload.new as { conversation_id?: string }).conversation_id] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const threads = useMemo(() => inbox?.threads || [], [inbox]);
  const selected = threads.find((thread) => thread.peerId === selectedId) || null;
  const needle = search.trim().toLowerCase();
  const visible = needle
    ? threads.filter((thread) => thread.peerName.toLowerCase().includes(needle) || thread.courses.some((course) => course.toLowerCase().includes(needle)))
    : threads;

  const open = (peerId: string | null) => {
    const next = new URLSearchParams(params);
    if (peerId) next.set("with", peerId); else next.delete("with");
    setParams(next, { replace: true });
  };

  const timeLabel = (iso: string) => {
    const date = new Date(iso);
    if (isToday(date)) return format(date, "HH:mm");
    if (isYesterday(date)) return t("messages.yesterday", "Yesterday");
    return format(date, "d MMM", { locale });
  };

  return (
    <AppShell role={role} width="wide">
      <div className={cn(
        "surface grid min-h-[26rem] overflow-hidden lg:h-[calc(100dvh-8.5rem)] lg:grid-cols-[21rem_1fr]",
        role === "student" ? "h-[calc(100dvh-11.5rem)] md:h-[calc(100dvh-7.5rem)]" : "h-[calc(100dvh-7.5rem)]",
      )}>
        {/* Conversation list */}
        <div className={cn("min-h-0 flex-col border-r", selected ? "hidden lg:flex" : "flex")}>
          <div className="shrink-0 border-b p-4">
            <h1 className="text-section-title">{t("messages.title", "Messages")}</h1>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={role === "student" ? t("messages.searchStudent", "Search instructors") : t("messages.searchTeacher", "Search learners")}
                aria-label={role === "student" ? t("messages.searchStudent", "Search instructors") : t("messages.searchTeacher", "Search learners")}
                className="pl-9"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2 p-3">{[0, 1, 2, 3].map((key) => <SkeletonBlock key={key} className="h-16" />)}</div>
            ) : isError ? (
              <div className="p-3">
                <ErrorState
                  title={t("messages.loadError", "Your messages could not be loaded")}
                  onRetry={() => void refetch()}
                  retryLabel={t("common.tryAgain", "Try again")}
                />
              </div>
            ) : threads.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm leading-6 text-muted-foreground">
                {role === "student"
                  ? t("messages.noPeopleStudent", "When you enrol in a course, its instructor appears here.")
                  : t("messages.noPeopleTeacher", "Learners appear here once they enrol in one of your courses.")}
              </p>
            ) : visible.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">{t("messages.noMatch", "No one matches that search.")}</p>
            ) : (
              <ul className="p-2">
                {visible.map((thread) => {
                  const active = thread.peerId === selectedId;
                  return (
                    <li key={thread.peerId}>
                      <button
                        type="button"
                        onClick={() => open(thread.peerId)}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                          active ? "bg-leaf" : "hover:bg-forest/[0.05]",
                        )}
                      >
                        <PersonAvatar thread={thread} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className={cn("truncate text-[0.9375rem] text-forest", thread.unread ? "font-semibold" : "font-medium")}>
                              {thread.peerName || fallbackName}
                            </span>
                            {thread.lastAt && <span className="tabular shrink-0 text-xs text-muted-foreground">{timeLabel(thread.lastAt)}</span>}
                          </span>
                          <span className="flex items-center justify-between gap-2">
                            <span className={cn("truncate text-[0.8125rem]", thread.unread ? "font-medium text-foreground" : "text-muted-foreground")}>
                              {thread.lastMessage
                                ? `${thread.lastFromMe ? `${t("messages.you", "You")}: ` : ""}${thread.lastMessage}`
                                : thread.courses.join(" · ") || t("messages.startHint", "Start a conversation")}
                            </span>
                            {thread.unread > 0 && (
                              <span
                                className="tabular flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[0.6875rem] font-semibold text-primary-foreground"
                                aria-label={t("messages.unread", "{{count}} unread", { count: thread.unread })}
                              >
                                {thread.unread}
                              </span>
                            )}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {(inbox?.groups.length || 0) > 0 && (
            <div className="shrink-0 border-t p-3">
              <p className="mb-1 flex items-center gap-1.5 px-2 text-xs font-medium text-muted-foreground">
                <UsersRound className="h-3.5 w-3.5" />
                {t("messages.groups", "Course WhatsApp groups")}
              </p>
              <ul className="max-h-28 overflow-y-auto">
                {inbox!.groups.map((group) => (
                  <li key={group.courseId}>
                    <a
                      href={group.link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-forest hover:bg-forest/[0.05]"
                    >
                      <span className="truncate">{group.title}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Conversation */}
        <div className={cn("min-h-0", selected ? "block" : "hidden lg:block")}>
          {selected ? (
            <ConversationPane key={selected.peerId} thread={selected} role={role} onBack={() => open(null)} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-leaf text-primary">
                <MessagesSquare className="h-5 w-5" />
              </span>
              <p className="text-card-title">{t("messages.pickTitle", "Choose a conversation")}</p>
              <p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">
                {role === "student"
                  ? t("messages.pickStudent", "Select an instructor on the left to read or write messages.")
                  : t("messages.pickTeacher", "Select a learner on the left to read or write messages.")}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
