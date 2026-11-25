import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, Undo2 } from "lucide-react";
import { StatusPill } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDateLocale } from "@/features/learning/hooks";
import { RubricView } from "@/features/rubrics/RubricView";
import { approveDraft, fetchCourseDrafts, returnDraft, type Draft } from "./drafts";

function DraftItem({ draft, onDecided }: { draft: Draft; onDecided: () => void }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const waiting = draft.status === "submitted";

  const approve = async () => {
    setBusy(true);
    try { await approveDraft(draft.id); toast.success(t("drafts.approved", "Approved: the assignment is now in the course")); onDecided(); }
    catch { toast.error(t("drafts.approveError", "The draft could not be approved.")); }
    finally { setBusy(false); }
  };
  const sendBack = async () => {
    setBusy(true);
    try { await returnDraft(draft.id, note); toast.success(t("drafts.returned", "Returned with your note")); onDecided(); }
    catch { toast.error(t("drafts.returnError", "The draft could not be returned.")); }
    finally { setBusy(false); }
  };

  return (
    <li className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-forest">{draft.title}</p>
          <p className="text-meta">
            {t("drafts.by", "By {{name}}", { name: draft.authorName || t("facilitation.facilitator", "a facilitator") })} · {draft.chapterTitle}
            {draft.due_date ? ` · ${t("drafts.dueOn", "due {{date}}", { date: format(new Date(draft.due_date), "d MMM, HH:mm", { locale }) })}` : ""}
          </p>
        </div>
        {waiting
          ? <StatusPill tone="amber">{t("drafts.awaitingYou", "Awaiting your approval")}</StatusPill>
          : <StatusPill>{t("drafts.status.changes", "Changes requested")}</StatusPill>}
      </div>
      {draft.instructions && <p className="whitespace-pre-line text-sm leading-6">{draft.instructions}</p>}
      {draft.rubric ? <RubricView rubric={draft.rubric} /> : <p className="text-sm text-warning">{t("drafts.noRubricWarning", "No rubric yet. Consider asking for one before approving a major assignment.")}</p>}
      {waiting && (returning ? (
        <div className="space-y-2">
          <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} aria-label={t("drafts.noteLabel", "What needs to change")}
            placeholder={t("drafts.notePlaceholder", "What needs to change before you approve it?")} />
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => void sendBack()} disabled={busy || note.trim().length < 10}><Undo2 />{t("drafts.sendBack", "Send back")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setReturning(false)}>{t("common.cancel", "Cancel")}</Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => void approve()} disabled={busy}><Check />{t("drafts.approve", "Approve and publish")}</Button>
          <Button size="sm" variant="outline" onClick={() => setReturning(true)} disabled={busy}><Undo2 />{t("drafts.requestChanges", "Request changes")}</Button>
        </div>
      ))}
    </li>
  );
}

/** Instructor's queue of facilitator drafts for one course. Hidden when there are none. */
export function DraftApprovals({ courseId, onApproved }: { courseId: string; onApproved?: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const drafts = useQuery({ queryKey: ["course-drafts", courseId], queryFn: () => fetchCourseDrafts(courseId), enabled: Boolean(courseId) });
  if (!drafts.data?.length) return null;
  const decided = () => { void queryClient.invalidateQueries({ queryKey: ["course-drafts", courseId] }); onApproved?.(); };
  return (
    <section className="surface p-4 sm:p-5" aria-labelledby="drafts-heading">
      <h2 id="drafts-heading" className="text-card-title">{t("drafts.queueTitle", "Assignment drafts from facilitators")}</h2>
      <p className="mt-1 text-meta">{t("drafts.queueBody", "Approving adds the assignment, with its rubric and due date, at the end of the chosen module. Learners see it straight away.")}</p>
      <ul className="mt-4 divide-y">{drafts.data.map((draft) => <DraftItem key={draft.id} draft={draft} onDecided={decided} />)}</ul>
    </section>
  );
}
