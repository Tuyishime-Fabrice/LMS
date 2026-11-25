import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/shell/Brand";
import { ProgressBar } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import { INTERESTS, normaliseInterests, type InterestId } from "@/features/discovery/interests";
import { savePreferences, type PreferencesUpdate } from "@/features/preferences/api";
import { authContinuationUrl, postAuthDestination } from "@/lib/coursePaymentReturn";
import { cn } from "@/lib/utils";

type Answers = {
  fullName: string;
  goal: PreferencesUpdate["learning_goal"];
  level: PreferencesUpdate["experience_level"];
  interests: InterestId[];
  careerGoal: string;
  mode: PreferencesUpdate["preferred_mode"];
  hours: PreferencesUpdate["weekly_hours"];
  access: "individual" | "organisation";
  organisation: string;
  research: boolean;
};

/** A row of large, keyboard-friendly choices (radio or checkbox semantics). */
function Choices<T extends string>({ name, options, value, onChange, multiple = false, columns = 2 }: {
  name: string;
  options: { value: T; label: string; hint?: string }[];
  value: T | T[] | null | undefined;
  onChange: (value: T) => void;
  multiple?: boolean;
  columns?: 1 | 2 | 3;
}) {
  const selected = (option: T) => (Array.isArray(value) ? value.includes(option) : value === option);
  return (
    <div role={multiple ? "group" : "radiogroup"} aria-labelledby={`${name}-label`} className={cn("grid gap-2", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3")}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role={multiple ? "checkbox" : "radio"}
          aria-checked={selected(option.value)}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex min-h-11 items-start gap-3 rounded-lg border bg-card px-3.5 py-3 text-left text-sm transition-colors duration-150",
            selected(option.value) ? "border-primary bg-leaf text-forest" : "hover:border-forest/30",
          )}
        >
          <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border", multiple ? "rounded" : "rounded-full",
            selected(option.value) ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card")}>
            {selected(option.value) && <Check className="h-3 w-3" strokeWidth={3} />}
          </span>
          <span>
            <span className="font-medium">{option.label}</span>
            {option.hint && <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

function Question({ id, title, hint, optional, children }: { id: string; title: string; hint?: string; optional?: boolean; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <fieldset className="space-y-3">
      <legend id={`${id}-label`} className="text-sm font-semibold text-forest">
        {title}{optional && <span className="ml-1.5 font-normal text-muted-foreground">{t("onboarding.optional", "(optional)")}</span>}
      </legend>
      {hint && <p className="-mt-1.5 text-meta">{hint}</p>}
      {children}
    </fieldset>
  );
}

const StudentOnboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAppAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Answers>({
    fullName: "", goal: null, level: null, interests: [], careerGoal: "", mode: null, hours: null,
    access: "individual", organisation: "", research: false,
  });
  const set = <K extends keyof Answers>(key: K, value: Answers[K]) => setAnswers((current) => ({ ...current, [key]: value }));

  // Same routing rules as before: signed-out visitors sign in, finished learners
  // continue, instructors use their own onboarding.
  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(authContinuationUrl("/auth"), { replace: true }); return; }
    if (!profile) return;
    if (profile.onboarding_completed) { navigate(postAuthDestination(profile), { replace: true }); return; }
    if (profile.role === "teacher") { navigate(authContinuationUrl("/teacher/onboarding"), { replace: true }); return; }
    setAnswers((current) => ({
      ...current,
      fullName: current.fullName || profile.full_name || "",
      interests: current.interests.length ? current.interests : normaliseInterests((profile as { interests?: string[] | null }).interests || []),
    }));
  }, [loading, user, profile, navigate]);

  const steps = [
    t("onboarding.stepName.you", "You"),
    t("onboarding.stepName.goals", "Goals"),
    t("onboarding.stepName.plan", "How you learn"),
    t("onboarding.stepName.privacy", "Privacy"),
  ];
  const nameValid = answers.fullName.trim().length >= 2;

  const finish = async () => {
    if (!user || !nameValid) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({
        full_name: answers.fullName.trim(),
        interests: answers.interests,
        organization: answers.access === "organisation" ? answers.organisation.trim() || null : null,
        onboarding_completed: true,
      }).eq("id", user.id);
      if (error) throw error;
      await savePreferences(user.id, {
        learning_goal: answers.goal,
        experience_level: answers.level,
        interests: answers.interests,
        career_goal: answers.careerGoal.trim() || null,
        preferred_mode: answers.mode,
        weekly_hours: answers.hours,
        access_route: answers.access,
        sponsor_organisation: answers.access === "organisation" ? answers.organisation.trim() || null : null,
        research_consent: answers.research,
      });
      await refreshProfile();
      toast.success(t("onboarding.done", "You are all set"));
      navigate(postAuthDestination({ role: "student", onboarding_completed: true }), { replace: true });
    } catch (error) {
      console.error("Onboarding could not be saved", error);
      toast.error(t("onboarding.error", "Your answers could not be saved. Check your connection and try again."));
    } finally {
      setSaving(false);
    }
  };

  const next = () => (step < steps.length - 1 ? setStep(step + 1) : void finish());
  const toggleInterest = (id: InterestId) => set("interests", answers.interests.includes(id) ? answers.interests.filter((item) => item !== id) : [...answers.interests, id]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <Brand />
          <span className="text-meta">{t("onboarding.stepOf", "Step {{n}} of {{total}}", { n: step + 1, total: steps.length })}</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <ol className="mb-3 hidden grid-cols-4 gap-2 text-xs sm:grid" aria-label={t("onboarding.progress", "Progress")}>
          {steps.map((label, index) => (
            <li key={label} aria-current={index === step ? "step" : undefined} className={cn("font-medium", index <= step ? "text-forest" : "text-muted-foreground")}>{label}</li>
          ))}
        </ol>
        <ProgressBar value={((step + 1) / steps.length) * 100} size="sm" label={t("onboarding.progress", "Progress")} />

        <form className="mt-8 space-y-8" onSubmit={(event) => { event.preventDefault(); if (step > 0 || nameValid) next(); }}>
          {step === 0 && (
            <>
              <div>
                <h1 className="text-page-title">{t("onboarding.welcome", "Welcome to DATA+ Academy")}</h1>
                <p className="mt-2 text-[0.9375rem] leading-7 text-muted-foreground">
                  {t("onboarding.welcomeBody", "A few short questions help us suggest the right courses and tracks. Only your name is required; you can change any answer later in Settings.")}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="full-name">{t("onboarding.name", "Your name, as it should appear on certificates")}</Label>
                <Input id="full-name" autoComplete="name" value={answers.fullName} onChange={(event) => set("fullName", event.target.value)} aria-invalid={answers.fullName.length > 0 && !nameValid} required />
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="text-page-title">{t("onboarding.goalsTitle", "What brings you here?")}</h1>
              <Question id="goal" title={t("onboarding.goalQ", "Your main reason for learning")} optional>
                <Choices name="goal" value={answers.goal} onChange={(value) => set("goal", value)} options={[
                  { value: "start_career", label: t("onboarding.goal.start", "Start a career in data") },
                  { value: "change_career", label: t("onboarding.goal.change", "Change career") },
                  { value: "grow_in_role", label: t("onboarding.goal.grow", "Do my current job better") },
                  { value: "team_project", label: t("onboarding.goal.project", "A project at work or for my team") },
                  { value: "personal_interest", label: t("onboarding.goal.personal", "Personal interest") },
                  { value: "other", label: t("onboarding.goal.other", "Something else") },
                ]} />
              </Question>
              <Question id="level" title={t("onboarding.levelQ", "Your experience with data so far")} optional>
                <Choices name="level" columns={3} value={answers.level} onChange={(value) => set("level", value)} options={[
                  { value: "new", label: t("onboarding.level.new", "New to it"), hint: t("onboarding.level.newHint", "Little or no experience") },
                  { value: "some", label: t("onboarding.level.some", "Some"), hint: t("onboarding.level.someHint", "Spreadsheets, basic reports") },
                  { value: "experienced", label: t("onboarding.level.exp", "Experienced"), hint: t("onboarding.level.expHint", "I already analyse or code") },
                ]} />
              </Question>
              <Question id="interests" title={t("onboarding.interests", "Areas you want to develop")} hint={t("onboarding.interestsHint", "Choose any. We use these to suggest courses and tracks.")} optional>
                <Choices name="interests" multiple value={answers.interests} onChange={toggleInterest}
                  options={INTERESTS.map((item) => ({ value: item.id, label: t(`interests.${item.id}`, item.label) }))} />
              </Question>
              <div className="space-y-1.5">
                <Label htmlFor="career-goal">{t("onboarding.careerGoal", "A role or outcome you are aiming for")} <span className="font-normal text-muted-foreground">{t("onboarding.optional", "(optional)")}</span></Label>
                <Input id="career-goal" maxLength={200} value={answers.careerGoal} onChange={(event) => set("careerGoal", event.target.value)} placeholder={t("onboarding.careerGoalPlaceholder", "For example: M&E officer, junior data analyst")} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="text-page-title">{t("onboarding.planTitle", "How would you like to learn?")}</h1>
              <Question id="mode" title={t("onboarding.modeQ", "Preferred way of learning")} optional>
                <Choices name="mode" columns={3} value={answers.mode} onChange={(value) => set("mode", value)} options={[
                  { value: "self_paced", label: t("onboarding.mode.self", "Self-paced"), hint: t("onboarding.mode.selfHint", "In my own time") },
                  { value: "cohort", label: t("onboarding.mode.cohort", "With a cohort"), hint: t("onboarding.mode.cohortHint", "Schedule, instructor, peers") },
                  { value: "either", label: t("onboarding.mode.either", "Either"), hint: t("onboarding.mode.eitherHint", "Depends on the course") },
                ]} />
              </Question>
              <Question id="hours" title={t("onboarding.hoursQ", "Realistic time per week")} optional>
                <Choices name="hours" value={answers.hours} onChange={(value) => set("hours", value)} options={[
                  { value: "lt3", label: t("onboarding.hours.lt3", "Under 3 hours") },
                  { value: "3to5", label: t("onboarding.hours.3to5", "3 to 5 hours") },
                  { value: "6to10", label: t("onboarding.hours.6to10", "6 to 10 hours") },
                  { value: "gt10", label: t("onboarding.hours.gt10", "More than 10 hours") },
                ]} />
              </Question>
              <Question id="access" title={t("onboarding.accessQ", "Who is paying for your learning?")}>
                <Choices name="access" value={answers.access} onChange={(value) => set("access", value)} options={[
                  { value: "individual", label: t("onboarding.access.individual", "I am"), hint: t("onboarding.access.individualHint", "Individual access") },
                  { value: "organisation", label: t("onboarding.access.org", "My organisation"), hint: t("onboarding.access.orgHint", "Employer, NGO or programme sponsor") },
                ]} />
              </Question>
              {answers.access === "organisation" && (
                <div className="space-y-1.5">
                  <Label htmlFor="org">{t("onboarding.org", "Organisation name")} <span className="font-normal text-muted-foreground">{t("onboarding.optional", "(optional)")}</span></Label>
                  <Input id="org" maxLength={160} autoComplete="organization" value={answers.organisation} onChange={(event) => set("organisation", event.target.value)} />
                  <p className="text-meta">{t("onboarding.orgHint", "This helps the Academy match you to a sponsored cohort. Sponsorship itself is confirmed by the Academy, not by this answer.")}</p>
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="text-page-title">{t("onboarding.privacyTitle", "Your answers and your privacy")}</h1>
              <div className="surface space-y-3 p-5 text-sm leading-6">
                <p className="flex gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t("onboarding.privacy1", "Your answers personalise your dashboard and suggestions. Only you can see them. Instructors and facilitators do not see them.")}</p>
                <p className="flex gap-2.5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t("onboarding.privacy2", "You can change or delete them at any time in Settings → Learning and privacy.")}</p>
              </div>
              <label className="flex cursor-pointer gap-3 rounded-lg border bg-card p-4">
                <Checkbox checked={answers.research} onCheckedChange={(checked) => set("research", checked === true)} className="mt-0.5" />
                <span className="text-sm leading-6">
                  <span className="font-medium text-forest">{t("onboarding.research", "Help us plan better programmes (optional)")}</span>
                  <span className="mt-1 block text-muted-foreground">
                    {t("onboarding.researchBody", "Allow DATA+ Academy administrators to include your answers in anonymous totals used to plan courses and cohorts. Groups smaller than five people are never shown. Saying no changes nothing about your learning.")}
                  </span>
                </span>
              </label>
              <p className="text-meta">
                {t("onboarding.policy", "Read more in our")} <Link to="/privacy-policy" target="_blank" className="font-medium text-primary hover:underline">{t("onboarding.policyLink", "privacy policy")}</Link>.
              </p>
            </>
          )}

          <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center">
            {step > 0 && (
              <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft />{t("onboarding.back", "Back")}</Button>
            )}
            <div className="flex-1" />
            {(step === 1 || step === 2) && (
              <Button type="button" variant="ghost" onClick={() => setStep(step + 1)}>{t("onboarding.skip", "Skip this step")}</Button>
            )}
            <Button type="submit" disabled={saving || (step === 0 && !nameValid)}>
              {step === steps.length - 1 ? (saving ? t("onboarding.saving", "Saving…") : t("onboarding.finish", "Finish and start learning")) : t("onboarding.continue", "Continue")}
              {step < steps.length - 1 && <ArrowRight />}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default StudentOnboarding;
