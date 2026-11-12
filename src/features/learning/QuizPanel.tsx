import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleX, RotateCcw } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { ErrorState, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { db } from "./api";
import { cn } from "@/lib/utils";

const questionSchema = z.object({
  id: z.string(),
  question_text: z.string(),
  options: z.array(z.object({ id: z.string(), text: z.string() })),
  points: z.number().nullable().transform((value) => value ?? 1),
});
const resultSchema = z.object({
  score: z.number(),
  total_points: z.number(),
  passed: z.boolean().nullable().transform(Boolean),
  review: z.array(z.object({
    question_id: z.string(),
    selected: z.string().nullable(),
    correct_answer: z.string(),
    is_correct: z.boolean().nullable().transform(Boolean),
    explanation: z.string().nullable(),
  })),
});
type QuizResult = z.infer<typeof resultSchema>;

/**
 * Lesson quiz. Questions arrive without answers; the attempt is marked in the
 * database and the answers and explanations are only returned afterwards.
 */
export function QuizPanel({ lessonId, preview = false, onPassed }: { lessonId: string; preview?: boolean; onPassed?: () => void }) {
  const { t } = useTranslation();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = useQuery({
    queryKey: ["lesson-quiz", lessonId],
    queryFn: async () => {
      const { data, error: rpcError } = await db.rpc("get_lesson_quiz", { p_lesson_id: lessonId });
      if (rpcError) throw rpcError;
      return z.array(questionSchema).parse(data || []);
    },
  });

  const previous = useQuery({
    queryKey: ["lesson-quiz-review", lessonId],
    enabled: !preview,
    queryFn: async () => {
      const { data, error: rpcError } = await db.rpc("get_lesson_quiz_review", { p_lesson_id: lessonId });
      if (rpcError) throw rpcError;
      return data ? resultSchema.parse(data) : null;
    },
  });

  useEffect(() => {
    setAnswers({});
    setResult(null);
    setError(null);
  }, [lessonId]);

  useEffect(() => {
    if (previous.data && !result) {
      setResult(previous.data);
      setAnswers(Object.fromEntries(previous.data.review.filter((r) => r.selected).map((r) => [r.question_id, r.selected as string])));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previous.data]);

  if (questions.isLoading) {
    return <div className="space-y-4"><SkeletonBlock className="h-32" /><SkeletonBlock className="h-32" /></div>;
  }
  if (questions.isError) {
    return (
      <ErrorState
        title={t("quiz.loadError", "This quiz could not be loaded")}
        description={t("home.error.body", "Check your connection and try again.")}
        onRetry={() => void questions.refetch()}
        retryLabel={t("common.tryAgain", "Try again")}
      />
    );
  }
  const list = questions.data || [];
  if (list.length === 0) {
    return <p className="surface px-5 py-8 text-center text-sm text-muted-foreground">{t("quiz.empty", "This quiz has no questions yet.")}</p>;
  }

  const total = list.reduce((sum, question) => sum + question.points, 0);
  const passMark = Math.ceil(total * 0.6);
  const answered = list.filter((question) => answers[question.id]).length;
  const reviewById = new Map((result?.review || []).map((entry) => [entry.question_id, entry]));

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const { data, error: rpcError } = await db.rpc("submit_lesson_quiz", { p_lesson_id: lessonId, p_answers: answers });
    setSubmitting(false);
    if (rpcError) {
      setError(rpcError.message || t("quiz.submitError", "Your answers could not be submitted. Try again."));
      return;
    }
    const parsed = resultSchema.parse(data);
    setResult(parsed);
    if (parsed.passed) onPassed?.();
  };

  const retry = () => {
    setResult(null);
    setAnswers({});
  };

  return (
    <div className="space-y-5">
      {preview && (
        <p className="rounded-lg bg-info-surface px-4 py-3 text-sm text-info">
          {t("quiz.preview", "You are previewing this quiz. Answers are not recorded.")}
        </p>
      )}

      {result ? (
        <div
          role="status"
          className={cn("flex flex-wrap items-center gap-4 rounded-xl border px-5 py-4",
            result.passed ? "border-primary/30 bg-leaf" : "border-warning/30 bg-warning-surface")}
        >
          {result.passed
            ? <CheckCircle2 className="animate-confirm h-8 w-8 text-primary" />
            : <CircleX className="h-8 w-8 text-warning" />}
          <div className="min-w-0 flex-1">
            <p className="text-card-title">
              {result.passed ? t("quiz.passed", "Passed") : t("quiz.notPassed", "Not passed yet")}
              <span className="tabular ml-2 font-sans text-sm font-normal text-foreground/70">
                {t("quiz.score", "{{score}} of {{total}} points", { score: result.score, total: result.total_points })}
              </span>
            </p>
            <p className="mt-0.5 text-sm text-foreground/75">
              {result.passed
                ? t("quiz.passedBody", "This lesson is complete. Review the explanations below or move on.")
                : t("quiz.notPassedBody", "You need {{pass}} points to pass. Review the explanations and try again.", { pass: passMark })}
            </p>
          </div>
          {!preview && (
            <Button variant="outline" onClick={retry}><RotateCcw />{t("quiz.retry", "Try again")}</Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("quiz.intro", "{{count}} questions. You need {{pass}} of {{total}} points to pass, and you can retry.", { count: list.length, pass: passMark, total })}
        </p>
      )}

      <ol className="space-y-4">
        {list.map((question, index) => {
          const review = reviewById.get(question.id);
          return (
            <li key={question.id} className="surface p-5">
              <fieldset disabled={Boolean(result) || preview}>
                <legend className="flex w-full items-start gap-3">
                  <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-forest">{index + 1}</span>
                  <span className="flex-1 pt-0.5 text-[0.9375rem] font-semibold leading-6 text-forest">{question.question_text}</span>
                  {review && (
                    <StatusPill tone={review.is_correct ? "green" : "red"} icon={review.is_correct ? CheckCircle2 : CircleX}>
                      {review.is_correct ? t("quiz.correct", "Correct") : t("quiz.incorrect", "Incorrect")}
                    </StatusPill>
                  )}
                </legend>
                <div className="mt-4 space-y-2 sm:pl-10">
                  {question.options.map((option) => {
                    const selected = answers[question.id] === option.id;
                    const isCorrect = review?.correct_answer === option.id;
                    const isWrongPick = Boolean(review) && selected && !isCorrect;
                    return (
                      <label
                        key={option.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border px-3.5 py-2.5 text-sm leading-6 transition-colors",
                          !review && selected && "border-primary bg-leaf/60",
                          !review && !selected && "hover:border-primary/40 hover:bg-muted/50",
                          isCorrect && "border-primary/50 bg-leaf",
                          isWrongPick && "border-destructive/40 bg-destructive-surface",
                          (result || preview) && "cursor-default",
                        )}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option.id}
                          checked={selected}
                          onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                          className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                        />
                        <span className="flex-1">{option.text}</span>
                        {isCorrect && <span className="text-xs font-semibold text-primary">{t("quiz.correctAnswer", "Correct answer")}</span>}
                        {isWrongPick && <span className="text-xs font-semibold text-destructive">{t("quiz.yourAnswer", "Your answer")}</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
              {review?.explanation && (
                <p className="mt-3 rounded-lg sm:ml-10 bg-muted px-3.5 py-2.5 text-sm leading-6 text-foreground/85">
                  <span className="font-semibold text-forest">{t("quiz.explanation", "Explanation")}: </span>
                  {review.explanation}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}

      {!result && !preview && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="tabular text-sm text-muted-foreground">
            {t("quiz.answered", "{{answered}} of {{count}} answered", { answered, count: list.length })}
          </p>
          <Button onClick={() => void submit()} disabled={submitting || answered < list.length} size="lg">
            {submitting ? t("quiz.submitting", "Submitting…") : t("quiz.submit", "Submit answers")}
          </Button>
        </div>
      )}
    </div>
  );
}
