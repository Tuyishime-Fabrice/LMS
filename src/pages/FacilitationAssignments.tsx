import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, Clock, FilePlus2, MessageSquareWarning, Pencil, Trash2 } from "lucide-react";
import { EmptyState, ErrorState, PageHeader, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppAuth } from "@/contexts/AuthContext";
import { FacilitationGate } from "@/features/facilitation/Gate";
import type { Assignment } from "@/features/facilitation/api";
import { deleteDraft, fetchModules, fetchMyDrafts, saveDraft, type Draft, type DraftInput } from "@/features/facilitation/drafts";
import { useDateLocale } from "@/features/learning/hooks";
import { RubricEditor } from "@/features/rubrics/RubricEditor";
import { RubricView } from "@/features/rubrics/RubricView";

const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "");

function DraftDialog({ courses, initial, open, onClose }: {
  courses: { id: string; title: string }[]; initial: { id: string | null; input: DraftInput }; open: boolean; onClose: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAppAuth();
  const [input, setInput] = useState<DraftInput>(initial.input);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setInput(initial.input); }, [open, initial]);
  const modules = useQuery({ queryKey: ["draft-modules", input.courseId], queryFn: () => fetchModules(input.courseId), enabled: Boolean(input.courseId) });
  const set = <K extends keyof DraftInput>(key: K, value: DraftInput[K]) => setInput((current) => ({ ...current, [key]: value }));
  const valid = Boolean(input.courseId && input.chapterId && input.title.trim());

  const save = async (submit: boolean) => {
    setSaving(true);
    try {
      await saveDraft(initial.id, input, submit, user!.id);
      toast.success(submit ? t("drafts.submitted", "Sent to the instructor for approval") : t("drafts.saved", "Draft saved"));
      await queryClient.invalidateQueries({ queryKey: ["my-drafts"] });
      onClose();
    } catch {
      toast.error(t("drafts.saveError", "The draft could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial.id ? t("drafts.edit", "Edit assignment draft") : t("drafts.new", "New assignment draft")}</DialogTitle>
          <DialogDescription>{t("drafts.dialogBody", "Learners see nothing until the instructor approves it. On approval it is added at the end of the module you choose.")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("drafts.course", "Course")}</Label>
              <Select value={input.courseId} onValueChange={(value) => setInput({ ...input, courseId: value, chapterId: "" })} disabled={Boolean(initial.id)}>
                <SelectTrigger><SelectValue placeholder={t("drafts.pickCourse", "Choose a course")} /></SelectTrigger>
                <SelectContent>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("drafts.module", "Module")}</Label>
              <Select value={input.chapterId} onValueChange={(value) => set("chapterId", value)} disabled={!input.courseId}>
                <SelectTrigger><SelectValue placeholder={t("drafts.pickModule", "Choose a module")} /></SelectTrigger>
                <SelectContent>{(modules.data || []).map((item) => <SelectItem key={item.id} value={item.id}>{item.title}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="draft-title">{t("drafts.title", "Title")}</Label><Input id="draft-title" maxLength={200} value={input.title} onChange={(event) => set("title", event.target.value)} /></div>
          <div className="space-y-1.5">
            <Label htmlFor="draft-instructions">{t("drafts.instructions", "Instructions for learners")}</Label>
            <Textarea id="draft-instructions" rows={6} maxLength={8000} value={input.instructions} onChange={(event) => set("instructions", event.target.value)}
              placeholder={t("drafts.instructionsPlaceholder", "What to do, what to hand in, and how it will be judged.")} />
          </div>
          <div className="space-y-1.5 sm:w-64">
            <Label htmlFor="draft-due">{t("drafts.due", "Due (optional)")}</Label>
            <Input id="draft-due" type="datetime-local" value={toLocal(input.dueDate)} onChange={(event) => set("dueDate", event.target.value ? new Date(event.target.value).toISOString() : null)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>{t("drafts.rubric", "Rubric")}</Label>
              <RubricEditor name={input.title || t("drafts.new", "New assignment draft")} current={input.rubric} onApply={(rubric) => set("rubric", rubric)} />
            </div>
            {input.rubric ? <RubricView rubric={input.rubric} /> : <p className="text-meta">{t("drafts.noRubric", "Major assignments should have a rubric. Learners see it before they submit.")}</p>}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>{t("common.cancel", "Cancel")}</Button>
          <Button variant="outline" onClick={() => void save(false)} disabled={!valid || saving}>{t("drafts.saveDraft", "Save draft")}</Button>
          <Button onClick={() => void save(true)} disabled={!valid || saving}>{t("drafts.submit", "Submit for approval")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Drafts({ assignments }: { assignments: Assignment[] }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const { user } = useAppAuth();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const courses = Array.from(new Map(assignments.map((item) => [item.courseId, { id: item.courseId, title: item.courseTitle }])).values());
  const blank = { id: null, input: { courseId: params.get("course") || (courses.length === 1 ? courses[0].id : ""), chapterId: "", title: "", instructions: "", dueDate: null, rubric: null } };
  const [editing, setEditing] = useState<{ id: string | null; input: DraftInput } | null>(null);
  const drafts = useQuery({ queryKey: ["my-drafts", user?.id], queryFn: () => fetchMyDrafts(user!.id), enabled: Boolean(user?.id) });

  const remove = async (draft: Draft) => {
    if (!window.confirm(t("drafts.confirmDelete", "Delete the draft “{{title}}”?", { title: draft.title }))) return;
    try { await deleteDraft(draft.id); await queryClient.invalidateQueries({ queryKey: ["my-drafts"] }); }
    catch { toast.error(t("drafts.deleteError", "The draft could not be deleted.")); }
  };
  const editable = (draft: Draft) => draft.status === "draft" || draft.status === "changes_requested";
  const pill = (draft: Draft) => ({
    draft: <StatusPill>{t("drafts.status.draft", "Draft")}</StatusPill>,
    submitted: <StatusPill tone="blue" icon={Clock}>{t("drafts.status.submitted", "With the instructor")}</StatusPill>,
    changes_requested: <StatusPill tone="amber" icon={MessageSquareWarning}>{t("drafts.status.changes", "Changes requested")}</StatusPill>,
    approved: <StatusPill tone="green" icon={CheckCircle2}>{t("drafts.status.approved", "Approved and live")}</StatusPill>,
  })[draft.status];

  return (
    <>
      <PageHeader
        title={t("drafts.pageTitle", "Assignment drafts")}
        description={t("drafts.pageBody", "Write assignments for the courses you facilitate. The instructor approves them before learners see anything.")}
        actions={<Button onClick={() => setEditing(blank)} disabled={!drafts.data?.available}><FilePlus2 />{t("drafts.new", "New assignment draft")}</Button>}
      />
      {drafts.isLoading ? <SkeletonBlock className="h-48" /> : drafts.isError ? (
        <ErrorState title={t("drafts.error", "Your drafts could not be loaded")} onRetry={() => void drafts.refetch()} />
      ) : !drafts.data?.available ? (
        <ErrorState title={t("drafts.notReady", "Assignment drafts need the latest database update")} description="supabase/migrations/20261126000000_drafts_and_cohort_announcements.sql" />
      ) : drafts.data.drafts.length === 0 ? (
        <EmptyState icon={FilePlus2} title={t("drafts.empty", "No drafts yet")} description={t("drafts.emptyBody", "Draft an exercise or project brief with its rubric; the instructor reviews it and adds it to the course.")}
          action={<Button onClick={() => setEditing(blank)}><FilePlus2 />{t("drafts.new", "New assignment draft")}</Button>} />
      ) : (
        <ul className="space-y-4">
          {drafts.data.drafts.map((draft) => (
            <li key={draft.id} className="surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-card-title">{draft.title}</h2>
                  <p className="text-meta">{draft.courseTitle} · {draft.chapterTitle}{draft.due_date ? ` · ${t("drafts.dueOn", "due {{date}}", { date: format(new Date(draft.due_date), "d MMM, HH:mm", { locale }) })}` : ""}</p>
                </div>
                {pill(draft)}
              </div>
              {draft.status === "changes_requested" && draft.review_note && (
                <div className="mt-3 rounded-lg border border-warning/25 bg-warning-surface p-3 text-sm">
                  <p className="text-xs font-semibold text-warning">{t("drafts.instructorNote", "Instructor's note")}</p>
                  <p className="mt-1 whitespace-pre-line leading-6 text-forest">{draft.review_note}</p>
                </div>
              )}
              {draft.instructions && <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm leading-6 text-muted-foreground">{draft.instructions}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {editable(draft) && (
                  <Button size="sm" variant="outline" onClick={() => setEditing({ id: draft.id, input: { courseId: draft.course_id, chapterId: draft.chapter_id, title: draft.title, instructions: draft.instructions || "", dueDate: draft.due_date, rubric: draft.rubric } })}>
                    <Pencil />{draft.status === "changes_requested" ? t("drafts.revise", "Revise and resubmit") : t("common.edit", "Edit")}
                  </Button>
                )}
                {draft.status === "approved" && draft.lesson_id && (
                  <Button asChild size="sm" variant="outline"><Link to={`/learn/${draft.course_id}/${draft.lesson_id}`}>{t("drafts.openLive", "Open in the course")}</Link></Button>
                )}
                {draft.status !== "approved" && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(draft)}><Trash2 />{t("common.delete", "Delete")}</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <DraftDialog courses={courses} initial={editing} open={Boolean(editing)} onClose={() => setEditing(null)} />}
    </>
  );
}

export default function FacilitationAssignments() {
  return <FacilitationGate>{(assignments) => <Drafts assignments={assignments} />}</FacilitationGate>;
}
