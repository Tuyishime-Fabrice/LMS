import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { isMissingSchema } from "./api";
import { safeDiscordUrl } from "./discord";

/**
 * Lets course staff set the Discord invite for a course or a cohort.
 * Validated here for a clear message and again by a database constraint.
 */
export function CommunityLinkEditor({ target, id, name, current, onSaved }: {
  target: "courses" | "cohorts";
  id: string;
  name: string;
  current: string | null | undefined;
  onSaved?: (url: string | null) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(current || "");
  const [saving, setSaving] = useState(false);
  const trimmed = value.trim();
  const valid = trimmed === "" || safeDiscordUrl(trimmed) !== null;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    const url = trimmed ? safeDiscordUrl(trimmed) : null;
    const { error } = await supabase.from(target).update({ discord_url: url }).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error(isMissingSchema(error)
        ? t("community.editor.notReady", "Community links need the latest database update. Ask an administrator to apply it.")
        : t("community.editor.error", "The link could not be saved. Try again."));
      return;
    }
    toast.success(url ? t("community.editor.saved", "Discord link saved") : t("community.editor.removed", "Discord link removed"));
    onSaved?.(url);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setValue(current || ""); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label={t("community.editor.button", "Discord link")} title={t("community.editor.button", "Discord link")}>
          <MessagesSquare className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("community.editor.title", "Discord community for {{name}}", { name })}</DialogTitle>
          <DialogDescription>
            {t("community.editor.body", "Learners see this link in their course and on the Community page. Use a Discord invite that does not expire, or a channel link.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={`discord-${id}`}>{t("community.editor.label", "Discord invite or channel URL")}</Label>
          <Input
            id={`discord-${id}`}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="https://discord.gg/…"
            aria-invalid={!valid}
            aria-describedby={`discord-${id}-hint`}
            inputMode="url"
          />
          <p id={`discord-${id}-hint`} className={valid ? "text-meta" : "text-sm text-destructive"}>
            {valid
              ? t("community.editor.hint", "Starts with https://discord.gg/ or https://discord.com/. Leave empty to remove.")
              : t("community.editor.invalid", "This is not a Discord link. Copy the invite from Discord: Invite people → Copy.")}
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel", "Cancel")}</Button>
          <Button onClick={() => void save()} disabled={!valid || saving}>{saving ? t("common.saving", "Saving…") : t("common.save", "Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
