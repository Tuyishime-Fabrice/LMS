import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { criterionMax, scoreRubric, type Rubric, type RubricScores } from "./rubric";

/** Pick a level per criterion; the mark out of 100 follows from the rubric. */
export function RubricScorer({ rubric, value, onChange }: { rubric: Rubric; value: RubricScores; onChange: (scores: RubricScores, mark: number | null) => void }) {
  const { t } = useTranslation();
  const result = scoreRubric(rubric, value);
  return (
    <fieldset className="rounded-lg border bg-background p-3">
      <legend className="px-1 text-xs font-semibold text-muted-foreground">{t("rubric.scoreWith", "Score with the rubric")}</legend>
      <ul className="space-y-2.5">
        {rubric.criteria.map((criterion) => (
          <li key={criterion.id}>
            <p className="text-sm font-medium text-forest">{criterion.title} <span className="font-normal text-muted-foreground">({t("rubric.max", "up to {{max}}", { max: criterionMax(criterion) })})</span></p>
            <div className="mt-1 flex flex-wrap gap-1.5" role="radiogroup" aria-label={criterion.title}>
              {criterion.levels.map((level) => {
                const chosen = value[criterion.id]?.points === level.points;
                return (
                  <button key={level.label} type="button" role="radio" aria-checked={chosen}
                    onClick={() => {
                      const next = { ...value, [criterion.id]: { ...value[criterion.id], points: level.points } };
                      const scored = scoreRubric(rubric, next);
                      onChange(next, scored.complete ? scored.mark : null);
                    }}
                    className={cn("rounded-md border px-2.5 py-1 text-xs font-medium", chosen ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-forest/30")}>
                    {level.label} · {level.points}
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        {result.complete
          ? t("rubric.result", "{{points}} of {{max}} points = {{mark}}/100", { points: result.points, max: result.max, mark: result.mark })
          : t("rubric.pickAll", "Choose a level for every criterion to calculate the mark.")}
      </p>
    </fieldset>
  );
}
