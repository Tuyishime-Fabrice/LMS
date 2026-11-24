import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowLeft, Database, ExternalLink, FileCheck2, MessagesSquare, Send, Trophy } from "lucide-react";
import { EmptyState, ErrorState, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import { safeDiscordUrl } from "@/features/community/discord";
import { useCompetitions, useLeaderboard, useMyCompetition } from "@/features/competitions/api";
import { PhasePill } from "@/features/competitions/PhasePill";
import { participantSteps, registrationOpen, resultsPublished, submissionsOpen } from "@/features/competitions/rules";
import { StatusTimeline } from "@/features/enrolment/StatusTimeline";
import { useDateLocale } from "@/features/learning/hooks";
import { DiscoveryLayout } from "@/features/site/DiscoveryLayout";
import { authContinuationUrl } from "@/lib/coursePaymentReturn";

function Prose({ text }: { text: string | null }) {
  const { t } = useTranslation();
  return text
    ? <p className="whitespace-pre-line text-[0.9375rem] leading-7 text-foreground/90">{text}</p>
    : <p className="text-sm text-muted-foreground">{t("competitions.notPublished", "Not published yet.")}</p>;
}

export default function CompetitionDetail() {
  const { slug } = useParams();
  const location = useLocation();
  const { t } = useTranslation();
  const locale = useDateLocale();
  const queryClient = useQueryClient();
  const { user } = useAppAuth();
  const competitions = useCompetitions();
  const competition = competitions.data?.competitions.find((item) => item.slug === slug);
  const mine = useMyCompetition(competition?.id);
  const published = competition ? resultsPublished(competition) : false;
  const leaderboard = useLeaderboard(competition?.id, published);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", description: "" });

  if (competitions.isLoading) return <DiscoveryLayout><SkeletonBlock className="h-32" /><SkeletonBlock className="mt-6 h-80" /></DiscoveryLayout>;
  if (competitions.isError) return <DiscoveryLayout><ErrorState title={t("competitions.error", "Competitions could not be loaded")} onRetry={() => void competitions.refetch()} /></DiscoveryLayout>;
  if (!competition) {
    return (
      <DiscoveryLayout>
        <EmptyState icon={Trophy} title={t("competitions.notFound", "This competition is not available")}
          action={<Button asChild variant="outline"><Link to="/competitions">{t("competitions.all", "All competitions")}</Link></Button>} />
      </DiscoveryLayout>
    );
  }

  const registration = mine.data?.registration ?? null;
  const submissions = mine.data?.submissions || [];
  const registered = registration?.status === "registered";
  const canRegister = !registered && registrationOpen(competition);
  const canSubmit = registered && submissionsOpen(competition);
  const discord = safeDiscordUrl(competition.discord_url);
  const when = (iso: string | null) => (iso ? format(new Date(iso), "d MMM yyyy, HH:mm", { locale }) : t("competitions.tba", "To be announced"));
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["my-competition", competition.id] }),
    queryClient.invalidateQueries({ queryKey: ["my-competition-registrations"] }),
  ]);

  const stepTitles: Record<string, string> = {
    registered: t("competitions.step.registered", "Registered"),
    submitted: t("competitions.step.submitted", "Submission"),
    judging: t("competitions.step.judging", "Judging"),
    results: t("competitions.step.results", "Results"),
  };
  const stepDetails: Record<string, string> = {
    not_registered: t("competitions.detail.notRegistered", "Not yet"),
    withdrawn: t("competitions.detail.withdrawn", "Withdrawn"),
    disqualified: t("competitions.detail.disqualified", "Disqualified"),
    open: t("competitions.detail.open", "Open"),
    missed: t("competitions.detail.missed", "No submission"),
    judging: t("competitions.detail.judging", "In progress"),
    not_yet: t("competitions.detail.notYet", "Not yet"),
  };
  const steps = participantSteps(competition, registration, submissions).map((step) => ({
    ...step, title: stepTitles[step.key], detail: stepDetails[step.status] || "",
  }));

  const register = async () => {
    if (!user) return;
    setBusy(true);
    const { error } = registration
      ? await supabase.from("competition_registrations").update({ status: "registered", updated_at: new Date().toISOString() }).eq("id", registration.id)
      : await supabase.from("competition_registrations").insert({ competition_id: competition.id, user_id: user.id });
    setBusy(false);
    if (error) { toast.error(t("competitions.registerError", "Registration did not go through. Registration may have closed.")); return; }
    toast.success(t("competitions.registered", "You are registered"));
    await refresh();
  };

  const withdraw = async () => {
    if (!registration || !window.confirm(t("competitions.confirmWithdraw", "Withdraw from this competition? You can register again while registration is open."))) return;
    const { error } = await supabase.from("competition_registrations").update({ status: "withdrawn", updated_at: new Date().toISOString() }).eq("id", registration.id);
    if (error) { toast.error(t("competitions.withdrawError", "Could not withdraw. Try again.")); return; }
    await refresh();
  };

  const urlValid = /^https:\/\/[^\s]+$/.test(form.url.trim());
  const submit = async () => {
    if (!user || !form.title.trim() || !urlValid) return;
    setBusy(true);
    const { error } = await supabase.from("competition_submissions").insert({
      competition_id: competition.id, user_id: user.id, title: form.title.trim(), submission_url: form.url.trim(), description: form.description.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(t("competitions.submitError", "Your submission was not accepted. The deadline may have passed.")); return; }
    toast.success(t("competitions.submitted", "Submission received"));
    setForm({ title: "", url: "", description: "" });
    await refresh();
  };

  const primary = !user
    ? <Button asChild size="lg"><Link to={authContinuationUrl("/auth", location.pathname)}>{t("competitions.signInToJoin", "Sign in to take part")}</Link></Button>
    : canRegister
      ? <Button size="lg" onClick={() => void register()} disabled={busy}>{t("competitions.register", "Register")}</Button>
      : null;

  return (
    <DiscoveryLayout>
      <nav aria-label={t("common.breadcrumb", "Breadcrumb")} className="mb-4 text-sm text-muted-foreground">
        <Link to="/competitions" className="inline-flex items-center gap-1 hover:text-forest"><ArrowLeft className="h-3.5 w-3.5" />{t("competitions.title", "Competitions")}</Link>
      </nav>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <PhasePill competition={competition} />
            {registered && <StatusPill tone="green">{t("competitions.youAreIn", "You are registered")}</StatusPill>}
          </div>
          <h1 className="text-page-title mt-3">{competition.title}</h1>
          {competition.summary && <p className="mt-2 text-[0.9375rem] leading-7 text-muted-foreground">{competition.summary}</p>}
        </div>
        {primary && <div className="shrink-0">{primary}</div>}
      </header>

      {user && (
        <section className="surface mb-6 p-5" aria-label={t("competitions.yourProgress", "Your progress")}>
          <StatusTimeline steps={steps} />
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Tabs defaultValue={registered ? "submit" : "overview"}>
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="overview">{t("competitions.tab.overview", "Overview")}</TabsTrigger>
            <TabsTrigger value="rules">{t("competitions.tab.rules", "Rules and eligibility")}</TabsTrigger>
            {registered && <TabsTrigger value="submit">{t("competitions.tab.submit", "My submissions")}</TabsTrigger>}
            <TabsTrigger value="results">{t("competitions.tab.results", "Results")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Prose text={competition.description} />
            {competition.prizes && (<div><h2 className="text-section-title mb-2">{t("competitions.prizes", "Prizes and recognition")}</h2><Prose text={competition.prizes} /></div>)}
          </TabsContent>

          <TabsContent value="rules" className="space-y-6">
            <div><h2 className="text-section-title mb-2">{t("competitions.eligibility", "Who can take part")}</h2><Prose text={competition.eligibility} /></div>
            <div><h2 className="text-section-title mb-2">{t("competitions.rules", "Rules")}</h2><Prose text={competition.rules} /></div>
          </TabsContent>

          {registered && (
            <TabsContent value="submit" className="space-y-6">
              {competition.submission_instructions && (
                <div className="rounded-lg border bg-leaf p-4"><h2 className="text-sm font-semibold text-forest">{t("competitions.howToSubmit", "How to submit")}</h2><p className="mt-1 whitespace-pre-line text-sm leading-6 text-forest/90">{competition.submission_instructions}</p></div>
              )}
              {canSubmit ? (
                <form className="surface space-y-4 p-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-title">{t("competitions.form.title", "Title")}</Label>
                    <Input id="sub-title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-url">{t("competitions.form.url", "Link to your work")}</Label>
                    <Input id="sub-url" required inputMode="url" placeholder="https://" value={form.url} aria-invalid={Boolean(form.url) && !urlValid} onChange={(event) => setForm({ ...form, url: event.target.value })} />
                    <p className={form.url && !urlValid ? "text-sm text-destructive" : "text-meta"}>
                      {t("competitions.form.urlHint", "A shared notebook (Colab, GitHub, JupyterLite), dashboard or report. It must start with https:// and be viewable by the judges.")}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="sub-desc">{t("competitions.form.description", "Short description (optional)")}</Label>
                    <Textarea id="sub-desc" rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                  </div>
                  <Button type="submit" disabled={busy || !form.title.trim() || !urlValid}><Send />{t("competitions.form.submit", "Submit")}</Button>
                  <p className="text-meta">{t("competitions.form.note", "You can submit more than once before the deadline; every submission is kept. Judges see your work, never your contact details.")}</p>
                </form>
              ) : (
                <p className="surface p-4 text-sm text-muted-foreground">{t("competitions.submitClosed", "Submissions are not open right now. Check the timeline on the right.")}</p>
              )}
              <div>
                <h2 className="text-section-title mb-2">{t("competitions.yourSubmissions", "Your submissions")}</h2>
                {submissions.length === 0 ? <p className="text-sm text-muted-foreground">{t("competitions.noSubmissions", "Nothing submitted yet.")}</p> : (
                  <ul className="surface divide-y">
                    {submissions.map((item) => (
                      <li key={item.id} className="flex flex-col gap-1 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <FileCheck2 className="h-4 w-4 text-primary" />
                          <a href={item.submission_url} target="_blank" rel="noopener noreferrer" className="font-medium text-forest hover:text-primary">{item.title}</a>
                          <StatusPill tone={item.status === "scored" ? "green" : item.status === "rejected" ? "red" : "blue"}>
                            {{ submitted: t("competitions.sub.submitted", "Received"), under_review: t("competitions.sub.review", "Under review"), scored: t("competitions.sub.scored", "Scored"), rejected: t("competitions.sub.rejected", "Not accepted") }[item.status]}
                          </StatusPill>
                        </div>
                        <p className="text-meta">{when(item.submitted_at)}{item.score != null && published ? ` · ${t("competitions.score", "Score {{score}}", { score: item.score })}` : ""}</p>
                        {item.judge_feedback && published && <p className="text-sm leading-6 text-foreground/90">{item.judge_feedback}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="button" onClick={() => void withdraw()} className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-destructive">{t("competitions.withdraw", "Withdraw from this competition")}</button>
            </TabsContent>
          )}

          <TabsContent value="results">
            {!published ? (
              <p className="surface p-4 text-sm text-muted-foreground">{t("competitions.resultsLater", "Results and the leaderboard appear here once the judges publish them.")}</p>
            ) : leaderboard.isLoading ? <SkeletonBlock className="h-40" /> : !(leaderboard.data || []).length ? (
              <p className="surface p-4 text-sm text-muted-foreground">{t("competitions.noScores", "No scored submissions.")}</p>
            ) : (
              <table className="surface w-full overflow-hidden text-sm">
                <thead className="border-b text-left text-eyebrow"><tr><th className="px-4 py-3">{t("competitions.rank", "Rank")}</th><th className="px-4 py-3">{t("competitions.participant", "Participant")}</th><th className="px-4 py-3 text-right">{t("competitions.scoreCol", "Score")}</th></tr></thead>
                <tbody className="divide-y">
                  {leaderboard.data!.map((row) => (
                    <tr key={`${row.rank}-${row.display_name}`}><td className="tabular px-4 py-3 font-semibold">{row.rank}</td><td className="px-4 py-3">{row.display_name}</td><td className="tabular px-4 py-3 text-right">{row.score}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabsContent>
        </Tabs>

        <aside className="space-y-4">
          <section className="surface p-5" aria-labelledby="comp-dates">
            <h2 id="comp-dates" className="text-card-title">{t("competitions.timeline", "Timeline")}</h2>
            <dl className="mt-3 divide-y text-sm">
              {[
                [t("competitions.regCloses", "Registration closes"), when(competition.registration_closes_at)],
                [t("competitions.starts", "Starts"), when(competition.starts_at)],
                [t("competitions.deadlineLabel", "Submission deadline"), when(competition.submission_deadline)],
                [t("competitions.results", "Results"), competition.results_published_at ? when(competition.results_published_at) : t("competitions.tba", "To be announced")],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-2.5"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium text-forest">{value}</dd></div>
              ))}
            </dl>
            <p className="mt-3 text-meta">{competition.open_to_public ? t("competitions.public", "Open to the public; a free DATA+ account is needed to take part.") : t("competitions.learnersOnly", "Open to DATA+ Academy learners.")}</p>
          </section>
          {(competition.dataset_url || discord) && (
            <section className="surface space-y-2 p-5">
              <h2 className="text-card-title">{t("competitions.resources", "Resources")}</h2>
              {competition.dataset_url && <a href={competition.dataset_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-forest hover:bg-forest/[0.05]"><Database className="h-4 w-4 text-primary" />{t("competitions.dataset", "Dataset and starter files")}<ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" /></a>}
              {discord && <a href={discord} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-forest hover:bg-forest/[0.05]"><MessagesSquare className="h-4 w-4 text-primary" />{t("competitions.discord", "Competition Discord")}<ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" /></a>}
            </section>
          )}
        </aside>
      </div>
    </DiscoveryLayout>
  );
}
