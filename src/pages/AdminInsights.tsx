import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Lock, PieChart } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyState, ErrorState, PageHeader, SkeletonBlock } from "@/components/shell/page";
import { supabase } from "@/integrations/supabase/client";
import { isMissingSchema } from "@/features/community/api";
import { INTERESTS } from "@/features/discovery/interests";

type Insights = {
  minimum_group_size: number;
  learners_with_answers: number;
  consenting_learners: number;
  questions: Record<string, { counts: Record<string, number>; suppressed: number }>;
};

/**
 * Onboarding answers for programme planning. Aggregates only, from
 * learners who opted in, with small groups suppressed by the database
 * (get_onboarding_insights). No individual answer is ever shown here.
 */
export default function AdminInsights() {
  const { t } = useTranslation();
  const insights = useQuery({
    queryKey: ["onboarding-insights"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_onboarding_insights");
      if (error) {
        if (isMissingSchema(error) || error.code === "PGRST202") return null;
        throw error;
      }
      return data as unknown as Insights;
    },
  });

  const answerLabel = (question: string, answer: string) => {
    if (question === "interest") return t(`interests.${answer}`, INTERESTS.find((item) => item.id === answer)?.label || answer);
    return t(`insights.answer.${question}.${answer}`, answer.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()));
  };
  const questions: [string, string][] = [
    ["goal", t("insights.q.goal", "Main reason for learning")],
    ["level", t("insights.q.level", "Experience level")],
    ["interest", t("insights.q.interest", "Interests")],
    ["mode", t("insights.q.mode", "Preferred way of learning")],
    ["hours", t("insights.q.hours", "Time per week")],
    ["access", t("insights.q.access", "Who pays")],
  ];

  return (
    <AppShell role="admin">
      <PageHeader
        title={t("insights.title", "Onboarding insights")}
        description={t("insights.description", "Totals from learners who agreed to research use, for planning courses, tracks and cohorts.")}
      />
      <div className="mb-6 flex items-start gap-3 rounded-xl border bg-card p-4 text-sm leading-6 text-muted-foreground">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>{t("insights.privacy", "Individual answers are private to each learner and are not available here or to instructors. Any answer given by fewer than {{n}} learners is folded into “Fewer than {{n}}”.", { n: insights.data?.minimum_group_size ?? 5 })}</p>
      </div>

      {insights.isLoading ? <SkeletonBlock className="h-64" /> : insights.isError ? (
        <ErrorState title={t("insights.error", "Insights could not be loaded")} onRetry={() => void insights.refetch()} />
      ) : !insights.data ? (
        <ErrorState title={t("insights.notReady", "Insights need the latest database update")} description={t("adminTracks.notReadyBody", "Apply supabase/migrations/20261124000000_academy_experience.sql, then reload this page.")} />
      ) : insights.data.consenting_learners === 0 ? (
        <EmptyState icon={PieChart} title={t("insights.empty", "No consenting learners yet")} description={t("insights.emptyBody", "{{count}} learners have answered onboarding questions; none has opted in to research use yet.", { count: insights.data.learners_with_answers })} />
      ) : (
        <>
          <dl className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="surface p-5"><dt className="text-eyebrow">{t("insights.consenting", "Consenting learners")}</dt><dd className="tabular mt-2 text-3xl font-semibold text-forest">{insights.data.consenting_learners}</dd></div>
            <div className="surface p-5"><dt className="text-eyebrow">{t("insights.answered", "Learners who answered")}</dt><dd className="tabular mt-2 text-3xl font-semibold text-forest">{insights.data.learners_with_answers}</dd></div>
          </dl>
          <div className="grid gap-4 lg:grid-cols-2">
            {questions.map(([key, title]) => {
              const question = insights.data!.questions[key];
              const rows = Object.entries(question?.counts || {}).sort((a, b) => b[1] - a[1]);
              return (
                <section key={key} className="surface p-5">
                  <h2 className="text-card-title">{title}</h2>
                  {rows.length === 0 && !question?.suppressed ? <p className="mt-3 text-sm text-muted-foreground">{t("insights.noAnswers", "No answers yet.")}</p> : (
                    <table className="mt-3 w-full text-sm">
                      <thead className="sr-only"><tr><th>{t("insights.answerCol", "Answer")}</th><th>{t("insights.learners", "Learners")}</th></tr></thead>
                      <tbody className="divide-y">
                        {rows.map(([answer, count]) => (
                          <tr key={answer}><td className="py-2">{answerLabel(key, answer)}</td><td className="tabular py-2 text-right font-medium text-forest">{count}</td></tr>
                        ))}
                        {question?.suppressed > 0 && (
                          <tr><td className="py-2 text-muted-foreground">{t("insights.suppressed", "Fewer than {{n}} (combined)", { n: insights.data!.minimum_group_size })}</td><td className="tabular py-2 text-right text-muted-foreground">{question.suppressed}</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </AppShell>
  );
}
