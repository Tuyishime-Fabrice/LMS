import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ExternalLink, Gavel, Pencil, Plus, Trophy } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyState, ErrorState, PageHeader, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCompetitions, type Competition, type Submission } from "@/features/competitions/api";
import { PhasePill } from "@/features/competitions/PhasePill";
import { safeDiscordUrl } from "@/features/community/discord";

type Draft = Omit<Competition, "id" | "created_at" | "updated_at" | "created_by"> & { id: string | null };
const blank: Draft = {
  id: null, slug: "", title: "", summary: null, description: null, eligibility: null, rules: null, prizes: null, submission_instructions: null,
  dataset_url: null, discord_url: null, status: "draft", open_to_public: true, registration_opens_at: null, registration_closes_at: null,
  starts_at: null, submission_deadline: null, results_published_at: null,
};
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "");
const fromLocal = (value: string) => (value ? new Date(value).toISOString() : null);
const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

function Judging({ competition, onClose }: { competition: Competition; onClose: () => void }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const submissions = useQuery({
    queryKey: ["admin-competition-submissions", competition.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("competition_submissions").select("*").eq("competition_id", competition.id).order("submitted_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set((data || []).map((row) => row.user_id)));
      const people = ids.length ? (await supabase.from("profiles").select("id, full_name").in("id", ids)).data || [] : [];
      return (data || []).map((row) => ({ ...row, name: people.find((p) => p.id === row.user_id)?.full_name || "" }));
    },
  });
  const [edits, setEdits] = useState<Record<string, { score: string; feedback: string }>>({});

  const save = async (row: Submission) => {
    const edit = edits[row.id];
    const score = Number(edit?.score);
    if (!edit || edit.score === "" || Number.isNaN(score) || score < 0) { toast.error(t("adminCompetitions.scoreInvalid", "Enter a score of 0 or more.")); return; }
    const { error } = await supabase.from("competition_submissions").update({
      score, judge_feedback: edit.feedback.trim() || null, status: "scored", scored_at: new Date().toISOString(),
    }).eq("id", row.id);
    if (error) { toast.error(t("adminCompetitions.scoreError", "The score could not be saved.")); return; }
    toast.success(t("adminCompetitions.scored", "Score saved"));
    await queryClient.invalidateQueries({ queryKey: ["admin-competition-submissions", competition.id] });
  };

  const publish = async () => {
    if (!window.confirm(t("adminCompetitions.confirmPublish", "Publish results? Participants will see the leaderboard with shortened names."))) return;
    const { error } = await supabase.from("competitions").update({ results_published_at: new Date().toISOString(), status: "closed", updated_at: new Date().toISOString() }).eq("id", competition.id);
    if (error) { toast.error(t("adminCompetitions.publishError", "Results could not be published.")); return; }
    toast.success(t("adminCompetitions.published", "Results published"));
    await queryClient.invalidateQueries({ queryKey: ["competitions"] });
    onClose();
  };

  return (
    <div className="space-y-4">
      {submissions.isLoading ? <SkeletonBlock className="h-32" /> : !(submissions.data || []).length ? (
        <p className="text-sm text-muted-foreground">{t("adminCompetitions.noSubmissions", "No submissions yet.")}</p>
      ) : (
        <ul className="max-h-[55vh] divide-y overflow-y-auto rounded-lg border">
          {submissions.data!.map((row) => (
            <li key={row.id} className="space-y-2 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{row.name || t("adminCompetitions.participant", "Participant")}</span>
                <a href={row.submission_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">{row.title}<ExternalLink className="h-3 w-3" /></a>
                {row.status === "scored" && <StatusPill tone="green">{t("adminCompetitions.scoredPill", "Scored {{score}}", { score: row.score })}</StatusPill>}
              </div>
              {row.description && <p className="text-sm text-muted-foreground">{row.description}</p>}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input className="h-9 sm:w-24" inputMode="decimal" placeholder={t("adminCompetitions.score", "Score")} aria-label={t("adminCompetitions.score", "Score")}
                  value={edits[row.id]?.score ?? (row.score?.toString() || "")} onChange={(event) => setEdits({ ...edits, [row.id]: { score: event.target.value, feedback: edits[row.id]?.feedback ?? row.judge_feedback ?? "" } })} />
                <Input className="h-9 flex-1" placeholder={t("adminCompetitions.feedback", "Feedback for the participant")} aria-label={t("adminCompetitions.feedback", "Feedback for the participant")}
                  value={edits[row.id]?.feedback ?? (row.judge_feedback || "")} onChange={(event) => setEdits({ ...edits, [row.id]: { score: edits[row.id]?.score ?? row.score?.toString() ?? "", feedback: event.target.value } })} />
                <Button size="sm" variant="outline" onClick={() => void save(row)}>{t("common.save", "Save")}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>{t("common.close", "Close")}</Button>
        <Button onClick={() => void publish()} disabled={Boolean(competition.results_published_at)}><Trophy />{t("adminCompetitions.publish", "Publish results")}</Button>
      </DialogFooter>
    </div>
  );
}

export default function AdminCompetitions() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const competitions = useCompetitions();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [judging, setJudging] = useState<Competition | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => current && { ...current, [key]: value });
  const text = (key: keyof Draft) => (value: string) => set(key, (value.trim() ? value : null) as never);

  const errors = draft ? [
    !draft.title.trim() && t("adminTracks.errTitle", "Add a title."),
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug) && t("adminTracks.errSlug", "The web address may use lower-case letters, numbers and dashes."),
    draft.dataset_url && !/^https:\/\//.test(draft.dataset_url) && t("adminCompetitions.errDataset", "The dataset link must start with https://."),
    draft.discord_url && !safeDiscordUrl(draft.discord_url) && t("community.editor.invalid", "This is not a Discord link."),
  ].filter(Boolean) as string[] : [];

  const save = async () => {
    if (!draft || errors.length) return;
    setSaving(true);
    const { id, ...row } = draft;
    const payload = { ...row, discord_url: row.discord_url ? safeDiscordUrl(row.discord_url) : null, updated_at: new Date().toISOString() };
    const { error } = id ? await supabase.from("competitions").update(payload).eq("id", id) : await supabase.from("competitions").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.code === "23505" ? t("adminTracks.errDuplicate", "Another item already uses this web address.") : t("adminCompetitions.saveError", "The competition could not be saved.")); return; }
    toast.success(t("adminCompetitions.saved", "Competition saved"));
    setDraft(null);
    await queryClient.invalidateQueries({ queryKey: ["competitions"] });
  };

  return (
    <AppShell role="admin">
      <PageHeader
        title={t("adminCompetitions.title", "Competitions")}
        description={t("adminCompetitions.description", "Announce challenges, judge submissions and publish results. Drafts are visible to administrators only.")}
        actions={<Button onClick={() => setDraft({ ...blank })}><Plus />{t("adminCompetitions.new", "New competition")}</Button>}
      />
      {competitions.isLoading ? <SkeletonBlock className="h-64" /> : competitions.isError ? (
        <ErrorState title={t("competitions.error", "Competitions could not be loaded")} onRetry={() => void competitions.refetch()} />
      ) : !competitions.data?.available ? (
        <ErrorState title={t("adminCompetitions.notReady", "Competitions need the latest database update")} description={t("adminTracks.notReadyBody", "Apply supabase/migrations/20261124000000_academy_experience.sql, then reload this page.")} />
      ) : competitions.data.competitions.length === 0 ? (
        <EmptyState icon={Trophy} title={t("adminCompetitions.empty", "No competitions yet")} action={<Button onClick={() => setDraft({ ...blank })}><Plus />{t("adminCompetitions.new", "New competition")}</Button>} />
      ) : (
        <ul className="surface divide-y">
          {competitions.data.competitions.map((item) => (
            <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-forest">{item.title}</p>
                  {item.status === "draft" ? <StatusPill>{t("adminTracks.draft", "Draft")}</StatusPill> : <PhasePill competition={item} />}
                </div>
                <p className="text-meta">/competitions/{item.slug}</p>
              </div>
              <div className="flex gap-2">
                {item.status !== "draft" && <Button asChild variant="ghost" size="sm"><Link to={`/competitions/${item.slug}`} target="_blank"><ExternalLink />{t("adminTracks.view", "View")}</Link></Button>}
                <Button variant="outline" size="sm" onClick={() => setJudging(item)}><Gavel />{t("adminCompetitions.judge", "Judge")}</Button>
                <Button variant="outline" size="sm" onClick={() => setDraft({ ...item })}><Pencil />{t("common.edit", "Edit")}</Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? t("adminCompetitions.edit", "Edit competition") : t("adminCompetitions.new", "New competition")}</DialogTitle>
            <DialogDescription>{t("adminCompetitions.dialogBody", "Times are in your local time zone. Registration and submission windows are enforced by the database.")}</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4">
              <div className="space-y-1.5"><Label htmlFor="c-title">{t("adminTracks.titleField", "Title")}</Label>
                <Input id="c-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value, slug: draft.id ? draft.slug : slugify(event.target.value) })} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="c-slug">{t("adminTracks.slug", "Web address")}</Label><Input id="c-slug" value={draft.slug} onChange={(event) => set("slug", slugify(event.target.value))} /></div>
                <div className="space-y-1.5"><Label>{t("adminCompetitions.status", "Status")}</Label>
                  <Select value={draft.status} onValueChange={(value) => set("status", value as Draft["status"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["draft", "upcoming", "open", "judging", "closed"] as const).map((value) => <SelectItem key={value} value={value}>{t(`adminCompetitions.statusValue.${value}`, value.charAt(0).toUpperCase() + value.slice(1))}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
              </div>
              <div className="space-y-1.5"><Label htmlFor="c-summary">{t("adminTracks.summary", "Summary")}</Label><Textarea id="c-summary" rows={2} value={draft.summary || ""} onChange={(event) => text("summary")(event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="c-desc">{t("adminCompetitions.overview", "Overview")}</Label><Textarea id="c-desc" rows={4} value={draft.description || ""} onChange={(event) => text("description")(event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="c-elig">{t("competitions.eligibility", "Who can take part")}</Label><Textarea id="c-elig" rows={2} value={draft.eligibility || ""} onChange={(event) => text("eligibility")(event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="c-rules">{t("competitions.rules", "Rules")}</Label><Textarea id="c-rules" rows={4} value={draft.rules || ""} onChange={(event) => text("rules")(event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="c-inst">{t("competitions.howToSubmit", "How to submit")}</Label><Textarea id="c-inst" rows={3} value={draft.submission_instructions || ""} onChange={(event) => text("submission_instructions")(event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="c-prizes">{t("competitions.prizes", "Prizes and recognition")}</Label><Textarea id="c-prizes" rows={2} value={draft.prizes || ""} onChange={(event) => text("prizes")(event.target.value)} /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                {([["registration_opens_at", t("adminCompetitions.regOpens", "Registration opens")], ["registration_closes_at", t("competitions.regCloses", "Registration closes")], ["starts_at", t("competitions.starts", "Starts")], ["submission_deadline", t("competitions.deadlineLabel", "Submission deadline")]] as const).map(([key, label]) => (
                  <div key={key} className="space-y-1.5"><Label htmlFor={`c-${key}`}>{label}</Label><Input id={`c-${key}`} type="datetime-local" value={toLocal(draft[key])} onChange={(event) => set(key, fromLocal(event.target.value))} /></div>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="c-data">{t("competitions.dataset", "Dataset and starter files")}</Label><Input id="c-data" inputMode="url" placeholder="https://" value={draft.dataset_url || ""} onChange={(event) => text("dataset_url")(event.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="c-discord">{t("competitions.discord", "Competition Discord")}</Label><Input id="c-discord" inputMode="url" placeholder="https://discord.gg/…" value={draft.discord_url || ""} onChange={(event) => text("discord_url")(event.target.value)} /></div>
              </div>
              <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span className="font-medium">{t("adminCompetitions.public", "Open to the public")}</span>
                <Switch checked={draft.open_to_public} onCheckedChange={(checked) => set("open_to_public", checked)} />
              </label>
              {errors.length > 0 && <ul className="list-disc space-y-1 pl-5 text-sm text-destructive" role="alert">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>{t("common.cancel", "Cancel")}</Button>
            <Button onClick={() => void save()} disabled={saving || errors.length > 0}>{saving ? t("common.saving", "Saving…") : t("common.save", "Save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(judging)} onOpenChange={(open) => !open && setJudging(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("adminCompetitions.judgeTitle", "Judge: {{title}}", { title: judging?.title })}</DialogTitle>
            <DialogDescription>{t("adminCompetitions.judgeBody", "Scores stay private until you publish results. The leaderboard shows the best score per participant.")}</DialogDescription>
          </DialogHeader>
          {judging && <Judging competition={judging} onClose={() => setJudging(null)} />}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
