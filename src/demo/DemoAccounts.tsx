import { useState } from "react";
import { useTranslation } from "react-i18next";
import { GraduationCap, Presentation, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "./config";
import { cn } from "@/lib/utils";

const icons = { student: GraduationCap, teacher: Presentation, admin: ShieldCheck } as const;

/** One-click sign-in as each demo person. Shown only in demo mode. */
export function DemoAccounts({ className, onSignedIn }: { className?: string; onSignedIn?: (role: string) => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const labels: Record<string, string> = {
    student: t("demo.role.student", "Learner"),
    teacher: t("demo.role.teacher", "Instructor"),
    admin: t("demo.role.admin", "Admin"),
  };

  const signIn = async (email: string, role: string) => {
    setBusy(role);
    await supabase.auth.signOut();
    const { error } = await supabase.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    onSignedIn?.(role);
  };

  return (
    <section className={cn("rounded-xl border border-primary/30 bg-leaf/60 p-4", className)} aria-labelledby="demo-accounts-title">
      <h2 id="demo-accounts-title" className="text-sm font-semibold text-forest">{t("demo.accountsTitle", "Try the demo")}</h2>
      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
        {t("demo.accountsBody", "Sample data only. Sign in with one click, or type an email below with the password {{password}}.", { password: DEMO_PASSWORD })}
      </p>
      <ul className="mt-3 grid gap-2">
        {DEMO_ACCOUNTS.map((account) => {
          const Icon = icons[account.role];
          return (
            <li key={account.role}>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void signIn(account.email, account.role)}
                className="flex w-full items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/50 disabled:opacity-60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-leaf text-primary"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-forest">
                    {busy === account.role ? t("demo.signingIn", "Signing in…") : `${labels[account.role]} · ${account.name}`}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{account.email}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
