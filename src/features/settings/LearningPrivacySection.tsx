import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { toast } from "sonner";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import { INTERESTS, normaliseInterests, type InterestId } from "@/features/discovery/interests";
import { useDateLocale } from "@/features/learning/hooks";
import { deletePreferences, savePreferences, usePreferences } from "@/features/preferences/api";
import { cn } from "@/lib/utils";

/**
 * Learners review and change what they told us at onboarding, give or
 * withdraw research consent, or delete their answers altogether.
 */
export function LearningPrivacySection() {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const queryClient = useQueryClient();
  const { user, profile, refreshProfile } = useAppAuth();
  const preferences = usePreferences();
  const row = preferences.data?.row;
  const [interests, setInterests] = useState<InterestId[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInterests(normaliseInterests([...(row?.interests || []), ...((profile as { interests?: string[] | null } | null)?.interests || [])]));
  }, [row?.interests, profile]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["learner-preferences"] });
    await refreshProfile();
  };

  const saveInterests = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("profiles").update({ interests }).eq("id", user.id);
      if (error) throw error;
      if (preferences.data?.available) await savePreferences(user.id, { interests, research_consent: row?.research_consent ?? false });
      toast.success(t("privacy.saved", "Saved"));
      await refresh();
    } catch {
      toast.error(t("privacy.error", "This could not be saved. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const setConsent = async (value: boolean) => {
    if (!user) return;
    setBusy(true);
    try {
      await savePreferences(user.id, { research_consent: value, interests });
      toast.success(value ? t("privacy.consentOn", "Thank you. You can withdraw at any time.") : t("privacy.consentOff", "Consent withdrawn. Your answers are no longer included in totals."));
      await refresh();
    } catch {
      toast.error(t("privacy.error", "This could not be saved. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const erase = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await deletePreferences(user.id);
      await supabase.from("profiles").update({ interests: [] }).eq("id", user.id);
      toast.success(t("privacy.deleted", "Your onboarding answers were deleted"));
      await refresh();
    } catch {
      toast.error(t("privacy.error", "This could not be saved. Try again."));
    } finally {
      setBusy(false);
    }
  };

  const toggle = (id: InterestId) => setInterests((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));

  return (
    <section id="learning" className="surface scroll-mt-24 p-5 sm:p-6">
      <h2 className="text-section-title">{t("privacy.title", "Learning and privacy")}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        {t("privacy.body", "What you told us when you joined. Only you can see these answers; they are used to suggest courses and tracks.")}
      </p>

      <div className="mt-5 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-forest" id="interest-label">{t("privacy.interests", "Interests")}</h3>
          <div role="group" aria-labelledby="interest-label" className="mt-2 flex flex-wrap gap-2">
            {INTERESTS.map((item) => {
              const on = interests.includes(item.id);
              return (
                <button key={item.id} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(item.id)}
                  className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors", on ? "border-primary bg-leaf font-medium text-forest" : "bg-card hover:border-forest/30")}>
                  {on && <Check className="h-3.5 w-3.5 text-primary" />}{t(`interests.${item.id}`, item.label)}
                </button>
              );
            })}
          </div>
          <Button className="mt-3" variant="outline" size="sm" disabled={busy} onClick={() => void saveInterests()}>{t("privacy.saveInterests", "Save interests")}</Button>
        </div>

        {preferences.data?.available ? (
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div>
              <p className="text-sm font-medium text-forest" id="consent-label">{t("privacy.research", "Include my answers in anonymous programme planning")}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t("privacy.researchBody", "Administrators see totals only, never your individual answers, and never groups smaller than five people.")}
              </p>
              {row?.research_consent && row.research_consent_at && (
                <p className="mt-1 text-meta">{t("privacy.consentSince", "Consent given on {{date}}", { date: format(new Date(row.research_consent_at), "d MMMM yyyy", { locale }) })}</p>
              )}
            </div>
            <Switch aria-labelledby="consent-label" checked={Boolean(row?.research_consent)} disabled={busy} onCheckedChange={(value) => void setConsent(value)} />
          </div>
        ) : preferences.isSuccess ? (
          <p className="text-meta">{t("privacy.unavailable", "Research consent settings will appear here after the next platform update.")}</p>
        ) : null}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive-surface hover:text-destructive" disabled={busy}>
              <Trash2 />{t("privacy.delete", "Delete my onboarding answers")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("privacy.deleteTitle", "Delete your onboarding answers?")}</AlertDialogTitle>
              <AlertDialogDescription>{t("privacy.deleteBody", "Your goals, interests, availability and consent are removed. Your account, courses, grades and certificates are not affected.")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => void erase()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t("privacy.deleteConfirm", "Delete")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
