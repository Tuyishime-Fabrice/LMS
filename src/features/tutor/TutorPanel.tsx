import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { SendHorizontal, Sparkles } from "lucide-react";
import { useAppAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { askTutor, fetchTutorHistory, fetchTutorStatus, TutorError, type TutorTurn } from "./api";
import { cn } from "@/lib/utils";

const MAX_CHARS = 2000;

/**
 * AI tutor for the lesson the learner is on. Hidden when the tutor is not
 * switched on for this deployment.
 */
export function TutorPanel({ lessonId, graded }: { lessonId: string; graded: boolean }) {
  const { t, i18n } = useTranslation();
  const { user } = useAppAuth();
  const queryClient = useQueryClient();
  const [turns, setTurns] = useState<TutorTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  const status = useQuery({ queryKey: ["tutor-status", user?.id], queryFn: fetchTutorStatus, enabled: Boolean(user?.id), staleTime: 5 * 60_000 });
  const history = useQuery({
    queryKey: ["tutor-history", user?.id, lessonId],
    queryFn: () => fetchTutorHistory(user!.id, lessonId),
    enabled: Boolean(user?.id && status.data?.enabled),
    staleTime: Infinity,
  });

  // Each lesson has its own conversation.
  useEffect(() => {
    setTurns(history.data || []);
    setError(null);
  }, [history.data, lessonId]);

  useEffect(() => {
    if (turns.length) end.current?.scrollIntoView({ block: "nearest" });
  }, [turns]);

  if (!status.data?.enabled) return null;

  const remaining = Math.max(0, status.data.limit - status.data.used);
  const suggestions = [
    t("tutor.suggest.explain", "Explain this lesson in simple words"),
    graded ? t("tutor.suggest.hint", "Give me a hint, not the answer") : t("tutor.suggest.example", "Show me a worked example"),
    t("tutor.suggest.practice", "Ask me 3 practice questions"),
  ];

  const errorText = (failure: unknown) => {
    const code = failure instanceof TutorError ? failure.code : "server_error";
    if (code === "daily_limit") {
      return t("tutor.error.limit", "You have used today's {{limit}} questions. The tutor is available again tomorrow, and your instructor can still help.", { limit: (failure as TutorError).limit || status.data!.limit });
    }
    if (code === "offline") return t("tutor.error.offline", "No connection. Check your internet and try again.");
    if (code === "busy") return t("tutor.error.busy", "The tutor is busy right now. Try again in a minute.");
    if (code === "forbidden") return t("tutor.error.forbidden", "The tutor is available for lessons in courses you are enrolled in.");
    return t("tutor.error.generic", "The tutor could not answer. Try again.");
  };

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || pending) return;
    setError(null);
    setPending(true);
    setDraft("");
    const stamp = Date.now();
    setTurns((current) => [...current, { id: `q${stamp}`, role: "user", content: message }, { id: `a${stamp}`, role: "assistant", content: "" }]);
    try {
      const usage = await askTutor({ lessonId, message, language: i18n.language || "en" }, (answer) => {
        setTurns((current) => current.map((turn) => (turn.id === `a${stamp}` ? { ...turn, content: answer } : turn)));
      });
      if (usage.limit) queryClient.setQueryData(["tutor-status", user?.id], { enabled: true, ...usage });
    } catch (failure) {
      // Nothing was answered: take the question back so the learner can resend it.
      setTurns((current) => current.filter((turn) => turn.id !== `a${stamp}` && turn.id !== `q${stamp}`));
      setDraft(message);
      setError(errorText(failure));
      if (failure instanceof TutorError && failure.code === "daily_limit") {
        queryClient.setQueryData(["tutor-status", user?.id], { enabled: true, limit: status.data!.limit, used: status.data!.limit });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <section aria-labelledby="tutor-title">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf text-primary"><Sparkles className="h-4 w-4" /></span>
        <h3 id="tutor-title" className="text-card-title">{t("tutor.title", "AI tutor")}</h3>
      </div>
      <p className="mt-1.5 text-meta">
        {graded
          ? t("tutor.introGraded", "This is graded work. The tutor explains the ideas and gives hints, but the answer has to be yours.")
          : t("tutor.intro", "Ask about anything in this lesson, in English or French. You get an answer straight away.")}
      </p>

      {turns.length > 0 ? (
        <ol className="mt-3 max-h-[22rem] space-y-2 overflow-y-auto rounded-lg border bg-card p-3" aria-live="polite">
          {turns.map((turn) => (
            <li key={turn.id} className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start")}>
              <p className={cn(
                "max-w-[92%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm leading-6",
                turn.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-muted text-foreground",
              )}>
                {turn.content || <span className="text-muted-foreground">{t("tutor.thinking", "Thinking…")}</span>}
              </p>
            </li>
          ))}
          <div ref={end} />
        </ol>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                disabled={pending || remaining === 0}
                onClick={() => void send(suggestion)}
                className="rounded-full border bg-card px-3 py-1.5 text-left text-[0.8125rem] font-medium text-forest transition-colors hover:border-primary/50 hover:bg-leaf/50 disabled:opacity-50"
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p role="alert" className="mt-3 rounded-lg bg-destructive-surface px-3 py-2 text-sm text-destructive">{error}</p>}

      <form className="mt-3 flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); void send(draft); }}>
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value.slice(0, MAX_CHARS))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(draft); }
          }}
          rows={2}
          disabled={remaining === 0}
          placeholder={t("tutor.placeholder", "Ask the tutor a question")}
          aria-label={t("tutor.placeholder", "Ask the tutor a question")}
          className="min-h-[3.25rem] resize-none bg-card"
        />
        <Button type="submit" size="icon" disabled={pending || !draft.trim() || remaining === 0} aria-label={t("tutor.send", "Send to the tutor")}>
          <SendHorizontal />
        </Button>
      </form>

      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {remaining === 0
          ? t("tutor.noneLeft", "You have used today's questions. The tutor is available again tomorrow.")
          : t("tutor.remaining", "{{count}} questions left today.", { count: remaining })}{" "}
        {t("tutor.disclaimer", "AI answers can contain mistakes. For grades and deadlines, ask your instructor.")}
      </p>
    </section>
  );
}
