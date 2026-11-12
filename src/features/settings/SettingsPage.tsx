import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, FileText, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type Role = "student" | "teacher";

/** Notification types grouped the way a person thinks about them. */
const notificationGroups: Array<{
  id: string; roles: Role[]; types: string[];
  titleKey: string; title: string; bodyKey: string; body: string;
}> = [
  {
    id: "sessions", roles: ["student", "teacher"],
    types: ["session_scheduled", "session_changed", "session_cancelled"],
    titleKey: "settingsPage.notify.sessions", title: "Live sessions",
    bodyKey: "settingsPage.notify.sessionsBody", body: "New sessions, time changes and cancellations.",
  },
  {
    id: "feedback", roles: ["student"],
    types: ["submission_received", "submission_graded"],
    titleKey: "settingsPage.notify.feedback", title: "Submissions and grades",
    bodyKey: "settingsPage.notify.feedbackBody", body: "Receipts for your work and the result when it is graded.",
  },
  {
    id: "submissions", roles: ["teacher"],
    types: ["new_submission"],
    titleKey: "settingsPage.notify.submissions", title: "New submissions",
    bodyKey: "settingsPage.notify.submissionsBody", body: "When a learner hands in an assignment or capstone.",
  },
  {
    id: "applications", roles: ["student", "teacher"],
    types: ["application_received", "application_decision"],
    titleKey: "settingsPage.notify.applications", title: "Applications",
    bodyKey: "settingsPage.notify.applicationsBody", body: "Cohort and scholarship requests and their decisions.",
  },
  {
    id: "certificates", roles: ["student"],
    types: ["certificate_issued"],
    titleKey: "settingsPage.notify.certificates", title: "Certificates",
    bodyKey: "settingsPage.notify.certificatesBody", body: "When a certificate is issued to you.",
  },
];

function Section({ title, description, children, tone }: {
  title: string; description?: string; children: ReactNode; tone?: "danger";
}) {
  return (
    <section className={cn("surface p-5 sm:p-6", tone === "danger" && "border-destructive/30")}>
      <h2 className="text-section-title">{title}</h2>
      {description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ProfileSection() {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useAppAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name || "");
    setPhone(profile?.phone || "");
  }, [profile?.full_name, profile?.phone]);

  const dirty = fullName.trim() !== (profile?.full_name || "") || phone.trim() !== (profile?.phone || "");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile || !fullName.trim()) {
      toast.error(t("settingsPage.profile.nameRequired", "Please enter your name."));
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast.error(t("settingsPage.profile.saveFailed", "We couldn't save your profile. Please try again."));
      return;
    }
    await refreshProfile().catch(() => undefined);
    toast.success(t("settingsPage.profile.saved", "Profile saved"));
  };

  return (
    <Section
      title={t("settingsPage.profile.title", "Profile")}
      description={t("settingsPage.profile.body", "Your name appears on your certificates, so write it the way you want it printed.")}
    >
      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="settings-name">{t("settingsPage.profile.name", "Full name")}</Label>
          <Input id="settings-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" maxLength={120} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="settings-phone">{t("settingsPage.profile.phone", "Phone number")}</Label>
          <Input id="settings-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" maxLength={30} placeholder="+250 788 123 456" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="settings-email">{t("settingsPage.profile.email", "Email")}</Label>
          <Input id="settings-email" value={profile?.email || ""} readOnly disabled />
          <p className="text-meta">{t("settingsPage.profile.emailHint", "Your email is your sign-in. Contact the Academy to change it.")}</p>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={!dirty || saving}>
            {saving ? t("settingsPage.saving", "Saving…") : t("settingsPage.profile.save", "Save profile")}
          </Button>
        </div>
      </form>
    </Section>
  );
}

function LanguageSection() {
  const { t, i18n } = useTranslation();
  const current = (i18n.resolvedLanguage || i18n.language || "en").slice(0, 2);
  const options = [
    { code: "en", label: "English" },
    { code: "fr", label: "Français" },
  ];
  const change = (code: string) => {
    void i18n.changeLanguage(code);
    document.documentElement.lang = code;
  };
  return (
    <Section
      title={t("settingsPage.language.title", "Language")}
      description={t("settingsPage.language.body", "The language of menus, buttons and messages. Course content stays in the language it was written in.")}
    >
      <div role="radiogroup" aria-label={t("settingsPage.language.title", "Language")} className="grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const active = current === option.code;
          return (
            <button
              key={option.code}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => change(option.code)}
              className={cn(
                "flex h-12 items-center justify-between rounded-lg border px-4 text-left text-sm font-medium transition-colors",
                active ? "border-primary bg-leaf text-leaf-foreground" : "border-input bg-card hover:border-primary/40",
              )}
            >
              {option.label}
              {active && <Check className="h-4 w-4 text-primary" />}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function NotificationSection({ role }: { role: Role }) {
  const { t } = useTranslation();
  const { user } = useAppAuth();
  const queryClient = useQueryClient();
  const queryKey = ["notification-preferences", user?.id];
  const { data: muted, isError } = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("notification_preferences")
        .select("muted_types").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data?.muted_types || [];
    },
  });

  // The table arrives with a database migration; without it there is nothing to configure.
  if (isError) return null;

  const groups = notificationGroups.filter((group) => group.roles.includes(role));

  const toggle = async (types: string[], on: boolean) => {
    if (!user) return;
    const previous = muted || [];
    const next = on ? previous.filter((type) => !types.includes(type)) : Array.from(new Set([...previous, ...types]));
    queryClient.setQueryData(queryKey, next);
    const { error } = await supabase.from("notification_preferences")
      .upsert({ user_id: user.id, muted_types: next, updated_at: new Date().toISOString() });
    if (error) {
      queryClient.setQueryData(queryKey, previous);
      toast.error(t("settingsPage.notify.saveFailed", "We couldn't save that preference. Please try again."));
    }
  };

  return (
    <Section
      title={t("settingsPage.notify.title", "Notifications")}
      description={t("settingsPage.notify.body", "Choose what appears under the bell. Announcements from the Academy are always shown.")}
    >
      <ul className="divide-y">
        {groups.map((group) => {
          const on = !group.types.every((type) => (muted || []).includes(type));
          const id = `notify-${group.id}`;
          return (
            <li key={group.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <Label htmlFor={id} className="text-[0.9375rem] font-medium">{t(group.titleKey, group.title)}</Label>
                <p className="text-meta">{t(group.bodyKey, group.body)}</p>
              </div>
              <Switch id={id} checked={on} disabled={muted === undefined} onCheckedChange={(checked) => void toggle(group.types, checked)} />
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function SecuritySection() {
  const { t } = useTranslation();
  const { profile } = useAppAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const sendReset = async () => {
    if (!profile?.email) return;
    setSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setSending(false);
    if (error) {
      toast.error(t("settingsPage.security.failed", "We couldn't send the email. Please try again in a minute."));
      return;
    }
    setSent(true);
    toast.success(t("settingsPage.security.sent", "Check your inbox for the reset link."));
  };

  return (
    <Section
      title={t("settingsPage.security.title", "Password")}
      description={t("settingsPage.security.body", "We email you a link to choose a new password. The link goes to {{email}}.", { email: profile?.email || "" })}
    >
      <Button variant="outline" onClick={sendReset} disabled={sending || sent}>
        <KeyRound />
        {sent
          ? t("settingsPage.security.sentShort", "Link sent")
          : sending ? t("settingsPage.sending", "Sending…") : t("settingsPage.security.send", "Email me a reset link")}
      </Button>
    </Section>
  );
}

function SignOutSection() {
  const { t } = useTranslation();
  const { signOut } = useAppAuth();
  const [busy, setBusy] = useState(false);
  return (
    <Section title={t("settingsPage.signOut.title", "Sign out")} description={t("settingsPage.signOut.body", "Sign out of DataPlus Academy on this device.")}>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="border-destructive/40 text-destructive hover:border-destructive hover:bg-destructive-surface hover:text-destructive">
            <LogOut />
            {t("settingsPage.signOut.action", "Sign out")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("settingsPage.signOut.confirmTitle", "Sign out?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("settingsPage.signOut.confirmBody", "Your progress is saved. You can sign back in at any time.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={async () => { setBusy(true); await signOut(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("settingsPage.signOut.action", "Sign out")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Section>
  );
}

/** Account settings, shared by learners and instructors. */
export function SettingsPage({ role }: { role: Role }) {
  const { t } = useTranslation();
  return (
    <AppShell role={role}>
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title={t("settingsPage.title", "Settings")}
          description={t("settingsPage.description", "Your profile, language, notifications and password.")}
        />
        <div className="space-y-5">
          <ProfileSection />
          <LanguageSection />
          <NotificationSection role={role} />
          <SecuritySection />
          <Section title={t("settingsPage.legal.title", "Privacy and terms")}>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to="/privacy-policy"><ShieldCheck />{t("settingsPage.legal.privacy", "Privacy policy")}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/terms-of-service"><FileText />{t("settingsPage.legal.terms", "Terms of service")}</Link>
              </Button>
            </div>
          </Section>
          <SignOutSection />
        </div>
      </div>
    </AppShell>
  );
}
