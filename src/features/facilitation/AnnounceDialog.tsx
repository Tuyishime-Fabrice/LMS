import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { fetchCourseCohorts, postAnnouncement } from "@/features/announcements/api";
import { useAppAuth } from "@/contexts/AuthContext";

/**
 * Announcement by a facilitator. A cohort facilitator posts to their cohort
 * only; a course-wide facilitator chooses the whole course or one cohort.
 * The database applies the same rule (can_post_announcement).
 */
export function AnnounceDialog({ courseId, courseTitle, cohortId = null, cohortName = null }: {
  courseId: string; courseTitle: string; cohortId?: string | null; cohortName?: string | null;
}) {
  const { t } = useTranslation();
  const { user } = useAppAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [audience, setAudience] = useState<string>(cohortId || "course");
  const [cohorts, setCohorts] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (!open || cohortId) return;
    void fetchCourseCohorts(courseId).then(setCohorts);
  }, [open, cohortId, courseId]);

  const post = async () => {
    if (!user || !title.trim() || !message.trim()) return;
    setSaving(true);
    const target = audience === "course" ? null : audience;
    try {
      const result = await postAnnouncement({
        teacherId: user.id, courseId, cohortId: target,
        cohortName: target ? (cohortId ? cohortName : cohorts.find((item) => item.id === target)?.name) : null,
        title, message,
      });
      toast.success(target && result.scoped
        ? t("facilitation.announcedCohort", "Announcement posted to the cohort")
        : t("facilitation.announced", "Announcement posted to the course"));
      setTitle(""); setMessage(""); setOpen(false);
    } catch {
      toast.error(t("facilitation.announceError", "The announcement could not be posted."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Megaphone />{t("facilitation.announce", "Announce")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("facilitation.announceTitle", "Announcement for {{course}}", { course: courseTitle })}</DialogTitle>
          <DialogDescription>
            {cohortId
              ? t("facilitation.announceCohortBody", "Only learners in {{cohort}} see this on their Home page and are notified. Use Discord for conversation.", { cohort: cohortName })
              : t("facilitation.announceBody", "The learners you choose see this on their Home page and are notified. Use Discord for conversation.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="ann-title">{t("facilitation.annTitle", "Title")}</Label><Input id="ann-title" maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
          {!cohortId && cohorts.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t("teacherAnnouncements.audience", "Audience")}</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">{t("teacherAnnouncements.allCohorts", "Every learner of the course")}</SelectItem>
                  {cohorts.map((cohort) => <SelectItem key={cohort.id} value={cohort.id}>{t("teacherAnnouncements.onlyCohort", "Only {{cohort}}", { cohort: cohort.name })}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5"><Label htmlFor="ann-message">{t("facilitation.annMessage", "Message")}</Label><Textarea id="ann-message" rows={4} value={message} onChange={(event) => setMessage(event.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel", "Cancel")}</Button>
          <Button onClick={() => void post()} disabled={saving || !title.trim() || !message.trim()}>{t("facilitation.post", "Post")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
