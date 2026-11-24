import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";

/** Course announcement by a course-wide facilitator (the database allows nobody else but staff). */
export function AnnounceDialog({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const { t } = useTranslation();
  const { user } = useAppAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const post = async () => {
    if (!user || !title.trim() || !message.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("teacher_announcements").insert({ teacher_id: user.id, course_id: courseId, title: title.trim(), message: message.trim() });
    setSaving(false);
    if (error) { toast.error(t("facilitation.announceError", "The announcement could not be posted.")); return; }
    toast.success(t("facilitation.announced", "Announcement posted to the course"));
    setTitle(""); setMessage(""); setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Megaphone />{t("facilitation.announce", "Announce")}</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("facilitation.announceTitle", "Announcement for {{course}}", { course: courseTitle })}</DialogTitle>
          <DialogDescription>{t("facilitation.announceBody", "Every learner of the course sees this on their Home page and is notified. Use Discord for conversation.")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="ann-title">{t("facilitation.annTitle", "Title")}</Label><Input id="ann-title" maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} /></div>
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
