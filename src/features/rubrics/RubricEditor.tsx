import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ListChecks, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { isMissingSchema } from "@/features/community/api";
import { parseRubric, rubricMax, type Rubric } from "./rubric";

const newId = () => `c${Math.random().toString(36).slice(2, 8)}`;
const starter = (): Rubric => ({ criteria: [{ id: newId(), title: "", levels: [{ label: "Excellent", points: 10 }, { label: "Good", points: 7 }, { label: "Needs work", points: 3 }] }] });

/**
 * Course staff write the rubric for an assignment (course_lessons.rubric)
 * or a capstone (capstone_projects.rubric). Learners see it before they submit.
 */
export function RubricEditor({ target, id, name, current, onSaved, onApply }: {
  target?: "course_lessons" | "capstone_projects";
  id?: string;
  /** Edit a rubric that is not stored yet (an assignment draft): no database write. */
  onApply?: (rubric: Rubric | null) => void;
  name: string;
  current: unknown;
  onSaved?: (rubric: Rubric | null) => void;
}) {
  const { t } = useTranslation();
  const existing = parseRubric(current);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Rubric>(existing || starter());
  const [saving, setSaving] = useState(false);
  const valid = parseRubric(draft) !== null && draft.criteria.every((criterion) => criterion.levels.every((level) => level.label.trim()));

  const update = (index: number, patch: Partial<Rubric["criteria"][number]>) =>
    setDraft({ criteria: draft.criteria.map((criterion, i) => (i === index ? { ...criterion, ...patch } : criterion)) });

  const save = async (rubric: Rubric | null) => {
    if (onApply || !target || !id) {
      onApply?.(rubric);
      setOpen(false);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from(target).update({ rubric: rubric as never }).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(isMissingSchema(error) ? t("rubric.notReady", "Rubrics need the latest database update.") : t("rubric.saveError", "The rubric could not be saved."));
      return;
    }
    toast.success(rubric ? t("rubric.saved", "Rubric saved. Learners can see it now.") : t("rubric.removed", "Rubric removed"));
    onSaved?.(rubric);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setDraft(parseRubric(current) || starter()); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><ListChecks />{existing ? t("rubric.edit", "Edit rubric") : t("rubric.add", "Add rubric")}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("rubric.editorTitle", "Rubric for {{name}}", { name })}</DialogTitle>
          <DialogDescription>{t("rubric.editorBody", "Criteria and performance levels. Learners see this before they submit; the total is scaled to 100 when you mark.")}</DialogDescription>
        </DialogHeader>
        <ol className="space-y-4">
          {draft.criteria.map((criterion, index) => (
            <li key={criterion.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex gap-2">
                <Input aria-label={t("rubric.criterion", "Criterion")} placeholder={t("rubric.criterionPlaceholder", "Criterion, e.g. Data cleaning")} value={criterion.title} onChange={(event) => update(index, { title: event.target.value })} />
                <Button type="button" variant="ghost" size="icon" className="shrink-0 text-destructive" disabled={draft.criteria.length === 1}
                  onClick={() => setDraft({ criteria: draft.criteria.filter((_, i) => i !== index) })} aria-label={t("rubric.removeCriterion", "Remove criterion")}><Trash2 /></Button>
              </div>
              <Input aria-label={t("rubric.description", "What good looks like")} placeholder={t("rubric.descriptionPlaceholder", "What good looks like (optional)")} value={criterion.description || ""} onChange={(event) => update(index, { description: event.target.value })} />
              <ul className="space-y-1.5">
                {criterion.levels.map((level, levelIndex) => (
                  <li key={levelIndex} className="flex gap-2">
                    <Input className="h-9" aria-label={t("rubric.level", "Level")} value={level.label}
                      onChange={(event) => update(index, { levels: criterion.levels.map((item, i) => (i === levelIndex ? { ...item, label: event.target.value } : item)) })} />
                    <Input className="h-9 w-20" inputMode="numeric" aria-label={t("rubric.points", "Points")} value={String(level.points)}
                      onChange={(event) => update(index, { levels: criterion.levels.map((item, i) => (i === levelIndex ? { ...item, points: Math.max(0, Number(event.target.value) || 0) } : item)) })} />
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" disabled={criterion.levels.length === 1}
                      onClick={() => update(index, { levels: criterion.levels.filter((_, i) => i !== levelIndex) })} aria-label={t("rubric.removeLevel", "Remove level")}><Trash2 /></Button>
                  </li>
                ))}
              </ul>
              {criterion.levels.length < 8 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => update(index, { levels: [...criterion.levels, { label: "", points: 0 }] })}><Plus />{t("rubric.addLevel", "Add level")}</Button>
              )}
            </li>
          ))}
        </ol>
        {draft.criteria.length < 20 && (
          <Button type="button" variant="outline" size="sm" onClick={() => setDraft({ criteria: [...draft.criteria, { ...starter().criteria[0], id: newId() }] })}><Plus />{t("rubric.addCriterion", "Add criterion")}</Button>
        )}
        <p className="text-meta">{valid ? t("rubric.totalPoints", "Total: {{points}} points", { points: rubricMax(draft) }) : t("rubric.incomplete", "Every criterion needs a title, and every level a name.")}</p>
        <DialogFooter className="gap-2 sm:justify-between">
          {existing ? <Button variant="ghost" className="text-destructive" onClick={() => void save(null)} disabled={saving}>{t("rubric.remove", "Remove rubric")}</Button> : <span />}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel", "Cancel")}</Button>
            <Button onClick={() => void save(draft)} disabled={!valid || saving}>{saving ? t("common.saving", "Saving…") : t("common.save", "Save")}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
