import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, ExternalLink, FileText, Lock, PencilLine } from "lucide-react";
import { EmptyState, PageHeader, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import { FacilitationGate } from "@/features/facilitation/Gate";
import { fetchQueue, saveReview, useRoster, type Assignment, type QueueItem } from "@/features/facilitation/api";
import { useDateLocale } from "@/features/learning/hooks";
import { RubricScorer } from "@/features/rubrics/RubricScorer";
import type { RubricScores } from "@/features/rubrics/rubric";

type Filter = "todo" | "reviewed" | "marked";

async function openFile(path: string) {
  if (/^https?:\/\//i.test(path)) { window.open(path, "_blank", "noopener,noreferrer"); return; }
  const cleaned = path.replace(/^\/+/, "").replace(/^lesson-files\//, "");
  const { data, error } = await supabase.storage.from("lesson-files").createSignedUrl(cleaned, 600);
  if (error || !data?.signedUrl) throw error || new Error("No URL");
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

function ReviewCard({ item, learner }: { item: QueueItem; learner: string }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const { user } = useAppAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(!item.myReview && item.grade === null);
  const [grade, setGrade] = useState(item.myReview?.suggestedGrade?.toString() ?? "");
  const [notes, setNotes] = useState(item.myReview?.notes ?? "");
  const [scores, setScores] = useState<RubricScores>(item.myReview?.rubricScores ?? {});
  const [saving, setSaving] = useState(false);
  const files = [...item.links, ...(item.fileUrl ? [item.fileUrl] : [])];
  const gradeNumber = grade === "" ? null : Number(grade);
  const gradeValid = gradeNumber === null || (Number.isFinite(gradeNumber) && gradeNumber >= 0 && gradeNumber <= 100);

  const save = async () => {
    if (!user || !gradeValid) return;
    setSaving(true);
    try {
      await saveReview(user.id, item, { suggestedGrade: gradeNumber, notes, rubricScores: Object.keys(scores).length ? scores : null });
      toast.success(t("facilitation.reviewSaved", "Review saved for the instructor"));
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey: ["facilitation-queue"] });
    } catch {
      toast.error(t("facilitation.reviewError", "Your review could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-forest">{learner}</p>
          <p className="text-meta">{item.itemTitle} · {item.submittedAt ? format(new Date(item.submittedAt), "d MMM, HH:mm", { locale }) : ""}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusPill tone={item.type === "capstone" ? "forest" : "neutral"}>{item.type === "capstone" ? t("facilitation.capstone", "Capstone") : t("facilitation.assignment", "Assignment")}</StatusPill>
          {item.grade !== null
            ? <StatusPill tone="green" icon={CheckCircle2}>{t("facilitation.marked", "Marked {{grade}}/100", { grade: item.grade })}</StatusPill>
            : item.myReview ? <StatusPill tone="blue">{t("facilitation.reviewed", "Your review is with the instructor")}</StatusPill>
            : <StatusPill tone="amber">{t("facilitation.needsReview", "Needs review")}</StatusPill>}
        </div>
      </div>
      {item.note && <p className="mt-3 whitespace-pre-line text-sm leading-6">{item.note}</p>}
      {files.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {files.map((path) => (
            <li key={path}>
              <Button variant="outline" size="sm" onClick={() => void openFile(path).catch(() => toast.error(t("facilitation.fileError", "This file could not be opened.")))}>
                {/^https?:/i.test(path) ? <ExternalLink /> : <FileText />}
                <span className="max-w-[14rem] truncate">{path.split("/").pop()}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      {item.grade !== null && item.feedback && (
        <div className="mt-4 rounded-lg bg-leaf/60 px-4 py-3 text-sm">
          <p className="text-xs font-semibold text-leaf-foreground">{t("facilitation.instructorFeedback", "Instructor feedback (published)")}</p>
          <p className="mt-1 whitespace-pre-line leading-6">{item.feedback}</p>
        </div>
      )}

      {editing ? (
        <div className="mt-4 space-y-3 border-t pt-4">
          {item.rubric && (
            <RubricScorer rubric={item.rubric} value={scores} onChange={(next, mark) => { setScores(next); if (mark !== null) setGrade(String(mark)); }} />
          )}
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <div className="space-y-1.5">
              <Label htmlFor={`g-${item.id}`}>{t("facilitation.suggested", "Suggested mark")}</Label>
              <Input id={`g-${item.id}`} inputMode="numeric" placeholder="0–100" value={grade} aria-invalid={!gradeValid} onChange={(event) => setGrade(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`n-${item.id}`}>{t("facilitation.notes", "Notes for the instructor")}</Label>
              <Textarea id={`n-${item.id}`} rows={3} maxLength={4000} value={notes} onChange={(event) => setNotes(event.target.value)}
                placeholder={t("facilitation.notesPlaceholder", "What works, what is missing, and what you would tell the learner.")} />
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-meta"><Lock className="h-3.5 w-3.5" />{t("facilitation.private", "Only course staff see this. The instructor writes the feedback the learner receives.")}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void save()} disabled={saving || !gradeValid || (!notes.trim() && gradeNumber === null)}>{t("facilitation.saveReview", "Save review")}</Button>
            {item.myReview && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>{t("common.cancel", "Cancel")}</Button>}
          </div>
        </div>
      ) : item.myReview ? (
        <div className="mt-4 flex flex-col gap-2 border-t pt-4 text-sm sm:flex-row sm:items-start">
          <div className="flex-1">
            <p className="text-xs font-semibold text-muted-foreground">{t("facilitation.yourReview", "Your review")}{item.myReview.suggestedGrade !== null ? ` · ${item.myReview.suggestedGrade}/100` : ""}</p>
            {item.myReview.notes && <p className="mt-1 whitespace-pre-line leading-6">{item.myReview.notes}</p>}
          </div>
          {item.grade === null && <Button size="sm" variant="outline" onClick={() => setEditing(true)}><PencilLine />{t("common.edit", "Edit")}</Button>}
        </div>
      ) : null}
    </li>
  );
}

function Review({ assignments }: { assignments: Assignment[] }) {
  const { t } = useTranslation();
  const { user } = useAppAuth();
  const [params] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("todo");
  const roster = useRoster();
  const queue = useQuery({
    queryKey: ["facilitation-queue", user?.id, roster.data?.length],
    queryFn: () => fetchQueue(user!.id, roster.data || []),
    enabled: Boolean(user?.id && roster.data),
  });
  const course = params.get("course");
  const nameOf = (item: QueueItem) => roster.data?.find((row) => row.studentId === item.studentId && row.courseId === item.courseId)?.fullName || t("facilitation.unnamed", "Learner");
  const all = (queue.data || []).filter((item) => !course || item.courseId === course);
  const groups: Record<Filter, QueueItem[]> = {
    todo: all.filter((item) => item.grade === null && !item.myReview),
    reviewed: all.filter((item) => item.grade === null && item.myReview),
    marked: all.filter((item) => item.grade !== null),
  };
  const courseTitle = course ? assignments.find((item) => item.courseId === course)?.courseTitle : null;

  return (
    <>
      <PageHeader
        title={t("facilitation.reviewTitle", "Review work")}
        description={courseTitle || t("facilitation.reviewBody", "Submissions from the learners you facilitate. Your suggested mark and notes go to the instructor, who publishes the final mark.")}
      />
      <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)} className="mb-5">
        <TabsList>
          <TabsTrigger value="todo">{t("facilitation.tab.todo", "Needs review")} ({groups.todo.length})</TabsTrigger>
          <TabsTrigger value="reviewed">{t("facilitation.tab.reviewed", "Reviewed")} ({groups.reviewed.length})</TabsTrigger>
          <TabsTrigger value="marked">{t("facilitation.tab.marked", "Marked")} ({groups.marked.length})</TabsTrigger>
        </TabsList>
      </Tabs>
      {queue.isLoading || roster.isLoading ? <SkeletonBlock className="h-64" /> : groups[filter].length === 0 ? (
        <EmptyState icon={ClipboardCheck} title={filter === "todo" ? t("facilitation.emptyTodo", "Nothing waiting for review") : t("facilitation.emptyOther", "Nothing here yet")} />
      ) : (
        <ul className="space-y-4">{groups[filter].map((item) => <ReviewCard key={`${item.type}-${item.id}`} item={item} learner={nameOf(item)} />)}</ul>
      )}
    </>
  );
}

export default function FacilitationReview() {
  return <FacilitationGate>{(assignments) => <Review assignments={assignments} />}</FacilitationGate>;
}
