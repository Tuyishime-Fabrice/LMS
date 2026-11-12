import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { toast } from "sonner";
import { AlertCircle, CalendarClock, CheckCircle2, ClipboardList, Clock, FileUp, MessageSquareText, Paperclip } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyState, ErrorState, PageHeader, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppAuth } from "@/contexts/AuthContext";
import { useDateLocale } from "@/features/learning/hooks";
import { fetchWorkItems, isOverdue, statusOf, submitWork, type WorkItem, type WorkStatus } from "@/features/assignments/api";
import { MAX_SUBMISSION_FILE_SIZE_MB, validateSubmissionFile } from "@/lib/submissionFiles";
import { cn } from "@/lib/utils";

function SubmitDialog({ item, onClose }: { item: WorkItem | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { user } = useAppAuth();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setFile(null); setNote(""); setFileError(null);
    onClose();
  };

  const choose = (event: React.ChangeEvent<HTMLInputElement>) => {
    const chosen = event.target.files?.[0] || null;
    setFileError(null);
    if (chosen && !validateSubmissionFile(chosen).valid) {
      setFile(null);
      event.target.value = "";
      setFileError(t("work.submit.fileRejected", "This file can't be uploaded. Use a document up to {{size}} MB (PDF, Word, Excel, PowerPoint, ZIP). Media and program files are not accepted.", { size: MAX_SUBMISSION_FILE_SIZE_MB }));
      return;
    }
    setFile(chosen);
  };

  const submit = async () => {
    if (!item || !user || !file) return;
    setBusy(true);
    try {
      await submitWork(item, user.id, file, note);
      await queryClient.invalidateQueries({ queryKey: ["work-items"] });
      toast.success(t("work.submit.done", "Submitted. Your instructor has been notified."));
      setBusy(false);
      setFile(null); setNote("");
      onClose();
    } catch {
      setBusy(false);
      toast.error(t("work.submit.failed", "Your work could not be uploaded. Check your connection and try again."));
    }
  };

  return (
    <Dialog open={Boolean(item)} onOpenChange={(open) => !open && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {item?.submission
              ? t("work.submit.replaceTitle", "Replace your submission")
              : t("work.submit.title", "Submit your work")}
          </DialogTitle>
          <DialogDescription>{item ? `${item.title} · ${item.courseTitle}` : ""}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="work-file">{t("work.submit.file", "File")}</Label>
            <input id="work-file" ref={input} type="file" className="sr-only" onChange={choose} />
            <button
              type="button"
              onClick={() => input.current?.click()}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border border-dashed px-4 py-4 text-left transition-colors hover:border-primary/60 hover:bg-leaf/40",
                file ? "border-primary/50 bg-leaf/40" : "border-input",
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-leaf text-primary">
                {file ? <Paperclip className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-forest">
                  {file ? file.name : t("work.submit.choose", "Choose a file")}
                </span>
                <span className="text-meta">
                  {file
                    ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
                    : t("work.submit.hint", "One document, up to {{size}} MB", { size: MAX_SUBMISSION_FILE_SIZE_MB })}
                </span>
              </span>
            </button>
            {fileError && <p role="alert" className="text-sm text-destructive">{fileError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="work-note">{t("work.submit.note", "Note for your instructor (optional)")}</Label>
            <Textarea id="work-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={busy}>{t("common.cancel", "Cancel")}</Button>
          <Button onClick={submit} disabled={!file || busy}>
            {busy ? t("work.submit.uploading", "Uploading…") : t("work.submit.action", "Submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WorkRow({ item, onSubmit }: { item: WorkItem; onSubmit: (item: WorkItem) => void }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const status = statusOf(item);
  const overdue = isOverdue(item);
  const day = (iso: string) => format(new Date(iso), "d MMM yyyy", { locale });

  return (
    <li className="surface p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <StatusPill tone={item.kind === "capstone" ? "forest" : "neutral"}>
              {item.kind === "capstone" ? t("work.kind.capstone", "Capstone") : t("work.kind.assignment", "Assignment")}
            </StatusPill>
            {status === "graded" && <StatusPill tone="green" icon={CheckCircle2}>{t("work.status.graded", "Graded")}</StatusPill>}
            {status === "submitted" && <StatusPill tone="blue" icon={Clock}>{t("work.status.submitted", "Awaiting grade")}</StatusPill>}
            {overdue && <StatusPill tone="red" icon={AlertCircle}>{t("work.status.overdue", "Overdue")}</StatusPill>}
          </div>
          <h2 className="text-card-title leading-snug">{item.title}</h2>
          <p className="mt-0.5 text-meta">{item.courseTitle}</p>
          {item.description && <p className="mt-2 line-clamp-2 max-w-2xl text-sm leading-6 text-foreground/80">{item.description}</p>}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-meta">
            {item.dueDate && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarClock className="h-3.5 w-3.5" />
                {t("work.due", "Due {{date}}", { date: day(item.dueDate) })}
              </span>
            )}
            {item.submission?.submittedAt && (
              <span>{t("work.submittedOn", "Submitted {{date}}", { date: day(item.submission.submittedAt) })}</span>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
          {status === "graded" && (
            <p className="tabular font-display text-2xl font-semibold text-forest">
              {item.submission!.grade}<span className="text-sm font-medium text-muted-foreground">/100</span>
            </p>
          )}
          {status === "todo" && (
            <Button onClick={() => onSubmit(item)}><FileUp />{t("work.submit.action", "Submit")}</Button>
          )}
          {status === "submitted" && (
            <Button variant="outline" onClick={() => onSubmit(item)}>{t("work.replace", "Replace file")}</Button>
          )}
          {item.kind === "assignment" && (
            <Link to={`/learn/${item.courseId}/${item.id}`} className="text-sm font-medium text-primary hover:underline">
              {t("work.openLesson", "Open lesson")}
            </Link>
          )}
        </div>
      </div>

      {item.submission?.feedback && (
        <div className="mt-4 rounded-lg bg-leaf/60 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-leaf-foreground">
            <MessageSquareText className="h-3.5 w-3.5" />
            {t("work.feedback", "Instructor feedback")}
          </p>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-foreground">{item.submission.feedback}</p>
        </div>
      )}
    </li>
  );
}

const filters: Array<{ id: WorkStatus; key: string; label: string }> = [
  { id: "todo", key: "work.filter.todo", label: "To do" },
  { id: "submitted", key: "work.filter.submitted", label: "Submitted" },
  { id: "graded", key: "work.filter.graded", label: "Graded" },
];

const StudentAssignments = () => {
  const { t } = useTranslation();
  const { user } = useAppAuth();
  const [filter, setFilter] = useState<WorkStatus>("todo");
  const [target, setTarget] = useState<WorkItem | null>(null);

  const { data: items, isLoading, isError, refetch } = useQuery({
    queryKey: ["work-items", user?.id],
    queryFn: () => fetchWorkItems(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 30_000,
  });

  const counts = useMemo(() => {
    const result: Record<WorkStatus, number> = { todo: 0, submitted: 0, graded: 0 };
    (items || []).forEach((item) => { result[statusOf(item)] += 1; });
    return result;
  }, [items]);
  const visible = (items || []).filter((item) => statusOf(item) === filter);

  const emptyCopy: Record<WorkStatus, { title: string; body: string }> = {
    todo: {
      title: t("work.empty.todoTitle", "Nothing to hand in"),
      body: t("work.empty.todoBody", "New assignments and your capstone appear here as your courses reach them."),
    },
    submitted: {
      title: t("work.empty.submittedTitle", "Nothing waiting for a grade"),
      body: t("work.empty.submittedBody", "Work you submit stays here until your instructor grades it."),
    },
    graded: {
      title: t("work.empty.gradedTitle", "No graded work yet"),
      body: t("work.empty.gradedBody", "Grades and feedback from your instructor will show up here."),
    },
  };

  return (
    <AppShell role="student">
      <PageHeader
        title={t("work.title", "Assignments")}
        description={t("work.description", "Assignments and capstone projects from all your courses, with deadlines and feedback.")}
      />

      <div role="tablist" aria-label={t("work.title", "Assignments")} className="mb-5 flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 sm:inline-flex">
        {filters.map((option) => (
          <button
            key={option.id}
            role="tab"
            type="button"
            aria-selected={filter === option.id}
            onClick={() => setFilter(option.id)}
            className={cn(
              "flex h-9 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-colors sm:flex-none",
              filter === option.id ? "bg-card text-forest shadow-sm" : "text-muted-foreground hover:text-forest",
            )}
          >
            {t(option.key, option.label)}
            <span className="tabular text-xs text-muted-foreground">{counts[option.id]}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((key) => <SkeletonBlock key={key} className="h-32" />)}
        </div>
      ) : isError ? (
        <ErrorState
          title={t("work.loadError", "Your assignments could not be loaded")}
          description={t("work.loadErrorBody", "Check your connection and try again.")}
          onRetry={() => void refetch()}
          retryLabel={t("common.tryAgain", "Try again")}
        />
      ) : visible.length === 0 ? (
        <EmptyState icon={ClipboardList} title={emptyCopy[filter].title} description={emptyCopy[filter].body} />
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => <WorkRow key={`${item.kind}-${item.id}`} item={item} onSubmit={setTarget} />)}
        </ul>
      )}

      <SubmitDialog item={target} onClose={() => setTarget(null)} />
    </AppShell>
  );
};

export default StudentAssignments;
