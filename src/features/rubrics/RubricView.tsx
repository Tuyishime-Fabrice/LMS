import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { criterionMax, rubricMax, type Rubric, type RubricScores } from "./rubric";

/**
 * The rubric as learners see it before they submit, and with the awarded
 * level highlighted once the work is marked.
 */
export function RubricView({ rubric, scores, className }: { rubric: Rubric; scores?: RubricScores; className?: string }) {
  const { t } = useTranslation();
  return (
    <section className={cn("rounded-lg border bg-card", className)} aria-label={t("rubric.title", "Marking rubric")}>
      <header className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-forest">{t("rubric.title", "Marking rubric")}</h3>
        <span className="text-meta">{t("rubric.total", "{{points}} points, scaled to 100", { points: rubricMax(rubric) })}</span>
      </header>
      <ul className="divide-y">
        {rubric.criteria.map((criterion) => {
          const awarded = scores?.[criterion.id];
          return (
            <li key={criterion.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-medium text-forest">{criterion.title}</p>
                <span className="tabular shrink-0 text-xs text-muted-foreground">
                  {awarded ? t("rubric.awarded", "{{points}} / {{max}}", { points: awarded.points, max: criterionMax(criterion) }) : t("rubric.max", "up to {{max}}", { max: criterionMax(criterion) })}
                </span>
              </div>
              {criterion.description && <p className="mt-0.5 text-sm leading-6 text-muted-foreground">{criterion.description}</p>}
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {criterion.levels.map((level) => {
                  const chosen = awarded?.points === level.points;
                  return (
                    <li key={level.label} className={cn("rounded-md border px-2.5 py-2 text-xs leading-5", chosen ? "border-primary bg-leaf" : "bg-background")}>
                      <span className="flex justify-between gap-2 font-medium text-forest"><span>{level.label}</span><span className="tabular">{level.points}</span></span>
                      {level.description && <span className="mt-0.5 block text-muted-foreground">{level.description}</span>}
                      {chosen && <span className="sr-only">{t("rubric.awardedLevel", "Awarded")}</span>}
                    </li>
                  );
                })}
              </ul>
              {awarded?.comment && <p className="mt-2 text-sm text-forest">{awarded.comment}</p>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
