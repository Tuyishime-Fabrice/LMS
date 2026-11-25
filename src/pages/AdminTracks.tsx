import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Route, Trash2 } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyState, ErrorState, PageHeader, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useTracks, type Track } from "@/features/tracks/api";
import { TrackKindPill } from "@/features/tracks/TrackBits";

type Draft = {
  id: string | null;
  kind: "skill" | "career";
  title: string;
  slug: string;
  summary: string;
  description: string;
  target_role: string;
  outcomes: string;
  competencies: string;
  level: "" | "beginner" | "intermediate" | "advanced";
  estimated_hours: string;
  language: string;
  is_published: boolean;
  display_order: string;
  items: { courseId: string; required: boolean; milestone: string }[];
};

const slugify = (value: string) => value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const empty: Draft = {
  id: null, kind: "skill", title: "", slug: "", summary: "", description: "", target_role: "", outcomes: "", competencies: "",
  level: "", estimated_hours: "", language: "", is_published: false, display_order: "0", items: [],
};

function toDraft(track: Track): Draft {
  return {
    id: track.id, kind: track.kind, title: track.title, slug: track.slug, summary: track.summary || "", description: track.description || "",
    target_role: track.target_role || "", outcomes: track.outcomes.join("\n"), competencies: track.competencies.join(", "),
    level: track.level || "", estimated_hours: track.estimated_hours ? String(track.estimated_hours) : "", language: track.language || "",
    is_published: track.is_published, display_order: String(track.display_order),
    items: track.items.map((item) => ({ courseId: item.courseId, required: item.required, milestone: item.milestone || "" })),
  };
}

export default function AdminTracks() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const tracks = useTracks();
  const courses = useQuery({
    queryKey: ["admin-track-courses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title, approval_status").order("title");
      if (error) throw error;
      return data || [];
    },
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState("");
  const courseTitle = useMemo(() => new Map((courses.data || []).map((row) => [row.id, row.title])), [courses.data]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => current && { ...current, [key]: value });
  const move = (index: number, delta: number) => setDraft((current) => {
    if (!current) return current;
    const items = [...current.items];
    const [item] = items.splice(index, 1);
    items.splice(index + delta, 0, item);
    return { ...current, items };
  });

  const errors = draft ? [
    !draft.title.trim() && t("adminTracks.errTitle", "Add a title."),
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug) && t("adminTracks.errSlug", "The web address may use lower-case letters, numbers and dashes."),
    draft.items.length === 0 && t("adminTracks.errCourses", "Add at least one course."),
    draft.estimated_hours && !(Number(draft.estimated_hours) > 0) && t("adminTracks.errHours", "Estimated hours must be a positive number."),
  ].filter(Boolean) as string[] : [];

  const save = async () => {
    if (!draft || errors.length) return;
    setSaving(true);
    try {
      const row = {
        kind: draft.kind, title: draft.title.trim(), slug: draft.slug, summary: draft.summary.trim() || null,
        description: draft.description.trim() || null, target_role: draft.kind === "career" ? draft.target_role.trim() || null : null,
        outcomes: draft.outcomes.split("\n").map((line) => line.trim()).filter(Boolean),
        competencies: draft.competencies.split(",").map((line) => line.trim()).filter(Boolean),
        level: draft.level || null, estimated_hours: draft.estimated_hours ? Math.round(Number(draft.estimated_hours)) : null,
        language: draft.language || null, is_published: draft.is_published, display_order: Number(draft.display_order) || 0,
        updated_at: new Date().toISOString(),
      };
      const saved = draft.id
        ? await supabase.from("learning_paths").update(row).eq("id", draft.id).select("id").single()
        : await supabase.from("learning_paths").insert(row).select("id").single();
      if (saved.error) throw saved.error;
      const pathId = saved.data.id;
      const removed = await supabase.from("learning_path_items").delete().eq("path_id", pathId);
      if (removed.error) throw removed.error;
      const inserted = await supabase.from("learning_path_items").insert(draft.items.map((item, position) => ({
        path_id: pathId, course_id: item.courseId, position, is_required: item.required, milestone: item.milestone.trim() || null,
      })));
      if (inserted.error) throw inserted.error;
      toast.success(t("adminTracks.saved", "Track saved"));
      setDraft(null);
      await queryClient.invalidateQueries({ queryKey: ["tracks"] });
    } catch (error) {
      const message = (error as { code?: string; message?: string })?.code === "23505"
        ? t("adminTracks.errDuplicate", "Another track already uses this web address.")
        : t("adminTracks.errSave", "The track could not be saved.");
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (track: Track) => {
    if (!window.confirm(t("adminTracks.confirmDelete", "Delete “{{title}}”? Courses and learner progress are not affected.", { title: track.title }))) return;
    const { error } = await supabase.from("learning_paths").delete().eq("id", track.id);
    if (error) { toast.error(t("adminTracks.errDelete", "The track could not be deleted.")); return; }
    toast.success(t("adminTracks.deleted", "Track deleted"));
    await queryClient.invalidateQueries({ queryKey: ["tracks"] });
  };

  return (
    <AppShell role="admin">
      <PageHeader
        title={t("adminTracks.title", "Skill and career tracks")}
        description={t("adminTracks.description", "Build tracks from existing courses. Courses are reused, never copied, and learner progress is counted from the courses they complete.")}
        actions={<Button onClick={() => setDraft({ ...empty })}><Plus />{t("adminTracks.new", "New track")}</Button>}
      />

      {tracks.isLoading ? <SkeletonBlock className="h-64" /> : tracks.isError ? (
        <ErrorState title={t("tracks.error", "Tracks could not be loaded")} onRetry={() => void tracks.refetch()} />
      ) : !tracks.data?.available ? (
        <ErrorState title={t("adminTracks.notReady", "Tracks need the latest database update")} description={t("adminTracks.notReadyBody", "Apply supabase/migrations/20261124000000_academy_experience.sql, then reload this page.")} />
      ) : tracks.data.tracks.length === 0 ? (
        <EmptyState icon={Route} title={t("adminTracks.empty", "No tracks yet")} description={t("adminTracks.emptyBody", "Create a skill track (one capability) or a career track (a role) from your published courses.")}
          action={<Button onClick={() => setDraft({ ...empty })}><Plus />{t("adminTracks.new", "New track")}</Button>} />
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-eyebrow">
              <tr><th className="px-4 py-3">{t("adminTracks.col.track", "Track")}</th><th className="px-4 py-3">{t("adminTracks.col.type", "Type")}</th><th className="px-4 py-3">{t("adminTracks.col.courses", "Courses")}</th><th className="px-4 py-3">{t("adminTracks.col.status", "Status")}</th><th className="px-4 py-3"><span className="sr-only">{t("common.actions", "Actions")}</span></th></tr>
            </thead>
            <tbody className="divide-y">
              {tracks.data.tracks.map((track) => (
                <tr key={track.id}>
                  <td className="px-4 py-3"><p className="font-medium text-forest">{track.title}</p><p className="text-meta">/tracks/{track.slug}</p></td>
                  <td className="px-4 py-3"><TrackKindPill kind={track.kind} /></td>
                  <td className="tabular px-4 py-3">{track.items.length}</td>
                  <td className="px-4 py-3">{track.is_published ? <StatusPill tone="green">{t("adminTracks.published", "Published")}</StatusPill> : <StatusPill>{t("adminTracks.draft", "Draft")}</StatusPill>}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      {track.is_published && <Button asChild variant="ghost" size="icon" aria-label={t("adminTracks.view", "View")}><Link to={`/tracks/${track.slug}`} target="_blank"><ExternalLink /></Link></Button>}
                      <Button variant="ghost" size="icon" aria-label={t("common.edit", "Edit")} onClick={() => setDraft(toDraft(track))}><Pencil /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" aria-label={t("common.delete", "Delete")} onClick={() => void remove(track)}><Trash2 /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? t("adminTracks.edit", "Edit track") : t("adminTracks.new", "New track")}</DialogTitle>
            <DialogDescription>{t("adminTracks.dialogBody", "Learners see published tracks under Explore. Drafts are visible to administrators only.")}</DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>{t("adminTracks.kind", "Type")}</Label>
                  <Select value={draft.kind} onValueChange={(value) => set("kind", value as Draft["kind"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skill">{t("tracks.kind.skill", "Skill track")}</SelectItem>
                      <SelectItem value="career">{t("tracks.kind.career", "Career track")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t("adminTracks.level", "Level")}</Label>
                  <Select value={draft.level || "none"} onValueChange={(value) => set("level", value === "none" ? "" : value as Draft["level"])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("adminTracks.noLevel", "Not set")}</SelectItem>
                      <SelectItem value="beginner">{t("landing.level.beginner", "Beginner")}</SelectItem>
                      <SelectItem value="intermediate">{t("landing.level.intermediate", "Intermediate")}</SelectItem>
                      <SelectItem value="advanced">{t("landing.level.advanced", "Advanced")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="track-title">{t("adminTracks.titleField", "Title")}</Label>
                <Input id="track-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value, slug: draft.id ? draft.slug : slugify(event.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="track-slug">{t("adminTracks.slug", "Web address")}</Label>
                <Input id="track-slug" value={draft.slug} onChange={(event) => set("slug", slugify(event.target.value))} />
              </div>
              {draft.kind === "career" && (
                <div className="space-y-1.5">
                  <Label htmlFor="track-role">{t("adminTracks.role", "Target role")}</Label>
                  <Input id="track-role" value={draft.target_role} onChange={(event) => set("target_role", event.target.value)} placeholder={t("adminTracks.rolePlaceholder", "Junior data analyst")} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="track-summary">{t("adminTracks.summary", "Summary")}</Label>
                <Textarea id="track-summary" rows={2} value={draft.summary} onChange={(event) => set("summary", event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="track-outcomes">{t("adminTracks.outcomes", "Outcomes (one per line)")}</Label>
                <Textarea id="track-outcomes" rows={3} value={draft.outcomes} onChange={(event) => set("outcomes", event.target.value)} />
              </div>
              {draft.kind === "career" && (
                <div className="space-y-1.5">
                  <Label htmlFor="track-competencies">{t("adminTracks.competencies", "Competencies (comma separated)")}</Label>
                  <Input id="track-competencies" value={draft.competencies} onChange={(event) => set("competencies", event.target.value)} />
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="track-hours">{t("adminTracks.hours", "Estimated hours")}</Label>
                  <Input id="track-hours" inputMode="numeric" value={draft.estimated_hours} onChange={(event) => set("estimated_hours", event.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("adminTracks.language", "Language")}</Label>
                  <Select value={draft.language || "none"} onValueChange={(value) => set("language", value === "none" ? "" : value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("adminTracks.noLevel", "Not set")}</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="track-order">{t("adminTracks.order", "Display order")}</Label>
                  <Input id="track-order" inputMode="numeric" value={draft.display_order} onChange={(event) => set("display_order", event.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="track-description">{t("adminTracks.descriptionField", "About this track")}</Label>
                <Textarea id="track-description" rows={3} value={draft.description} onChange={(event) => set("description", event.target.value)} />
              </div>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">{t("adminTracks.courses", "Courses, in order")}</legend>
                <ol className="space-y-2">
                  {draft.items.map((item, index) => (
                    <li key={item.courseId} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <span className="tabular w-5 text-xs text-muted-foreground">{index + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{courseTitle.get(item.courseId) || item.courseId}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === 0} onClick={() => move(index, -1)} aria-label={t("adminTracks.up", "Move up")}><ArrowUp /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={index === draft.items.length - 1} onClick={() => move(index, 1)} aria-label={t("adminTracks.down", "Move down")}><ArrowDown /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => set("items", draft.items.filter((_, i) => i !== index))} aria-label={t("common.remove", "Remove")}><Trash2 /></Button>
                      </div>
                      <div className="mt-2 flex flex-col gap-2 pl-7 sm:flex-row sm:items-center">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox checked={item.required} onCheckedChange={(checked) => set("items", draft.items.map((row, i) => i === index ? { ...row, required: checked === true } : row))} />
                          {t("adminTracks.required", "Required")}
                        </label>
                        <Input className="h-8 flex-1" placeholder={t("adminTracks.milestone", "Milestone or project (optional)")} value={item.milestone}
                          onChange={(event) => set("items", draft.items.map((row, i) => i === index ? { ...row, milestone: event.target.value } : row))} />
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="flex gap-2">
                  <Select value={adding} onValueChange={setAdding}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder={t("adminTracks.pickCourse", "Choose a course to add")} /></SelectTrigger>
                    <SelectContent>
                      {(courses.data || []).filter((course) => !draft.items.some((item) => item.courseId === course.id)).map((course) => (
                        <SelectItem key={course.id} value={course.id}>{course.title}{course.approval_status !== "approved" ? ` (${t("adminTracks.notApproved", "not approved")})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" disabled={!adding} onClick={() => { set("items", [...draft.items, { courseId: adding, required: true, milestone: "" }]); setAdding(""); }}>
                    <Plus />{t("adminTracks.add", "Add")}
                  </Button>
                </div>
              </fieldset>

              <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span><span className="font-medium">{t("adminTracks.publish", "Published")}</span><span className="block text-meta">{t("adminTracks.publishBody", "Visible to everyone under Explore.")}</span></span>
                <Switch checked={draft.is_published} onCheckedChange={(checked) => set("is_published", checked)} />
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
    </AppShell>
  );
}
