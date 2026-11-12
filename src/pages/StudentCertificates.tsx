import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Award, Check, Copy, Download, FileText, GraduationCap, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyState, ErrorState, PageHeader, SectionHeader, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAppAuth } from "@/contexts/AuthContext";
import { useDateLocale, useEnrolledCourses } from "@/features/learning/hooks";
import { CertificatePreview } from "@/features/certificates/CertificatePreview";
import { downloadCertificatePdf, fetchMyCertificates, formatCode, verificationUrl, type Certificate } from "@/features/certificates/certificate";

const PASS_MARK = 65;

const StudentCertificates = () => {
  const { t, i18n } = useTranslation();
  const locale = useDateLocale();
  const { user, profile } = useAppAuth();
  const [open, setOpen] = useState<Certificate | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const holder = profile?.full_name || profile?.email || "";

  const certificates = useQuery({
    queryKey: ["my-certificates", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchMyCertificates(user!.id, holder),
  });
  const courses = useEnrolledCourses();

  // Capstone status for courses that have not produced a certificate yet.
  const capstones = useQuery({
    queryKey: ["my-capstone-status", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const [projects, submissions] = await Promise.all([
        supabase.from("capstone_projects").select("id, course_id"),
        supabase.from("capstone_submissions").select("capstone_project_id, grade").eq("student_id", user!.id),
      ]);
      const byProject = new Map((submissions.data || []).map((row) => [row.capstone_project_id, row]));
      return new Map((projects.data || []).map((project) => [project.course_id, { submission: byProject.get(project.id) || null }]));
    },
  });

  const download = async (certificate: Certificate) => {
    setBusy(certificate.id);
    try {
      await downloadCertificatePdf(certificate, i18n.language || "en");
    } catch (error) {
      console.error("Certificate download failed", error);
      toast.error(t("certificates2.downloadError", "The certificate could not be created. Try again."));
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async (certificate: Certificate) => {
    if (!certificate.code) return;
    await navigator.clipboard.writeText(verificationUrl(certificate.code));
    setCopied(certificate.id);
    window.setTimeout(() => setCopied(null), 2000);
  };

  const earned = certificates.data || [];
  const earnedCourseIds = new Set(earned.map((certificate) => certificate.courseId));
  const inProgress = (courses.data || []).filter((course) => !earnedCourseIds.has(course.courseId));

  return (
    <AppShell role="student">
      <PageHeader
        title={t("certificates2.title", "Certificates")}
        description={t("certificates2.description", "A certificate is issued automatically when your capstone project is graded {{mark}}% or higher. Each one can be verified online.", { mark: PASS_MARK })}
      />

      {certificates.isLoading ? (
        <div className="grid gap-5 md:grid-cols-2">{[0, 1].map((i) => <SkeletonBlock key={i} className="aspect-[297/260] rounded-xl" />)}</div>
      ) : certificates.isError ? (
        <ErrorState
          title={t("certificates2.error", "Your certificates could not be loaded")}
          description={t("home.error.body", "Check your connection and try again.")}
          onRetry={() => void certificates.refetch()}
          retryLabel={t("common.tryAgain", "Try again")}
        />
      ) : earned.length === 0 ? (
        <EmptyState
          icon={Award}
          title={t("certificates2.empty.title", "No certificates yet")}
          description={t("certificates2.empty.body", "Finish a course capstone with {{mark}}% or more and your certificate appears here, ready to download and share.", { mark: PASS_MARK })}
          action={<Button asChild><Link to="/student/my-courses">{t("certificates2.empty.cta", "Go to my courses")}</Link></Button>}
        />
      ) : (
        <ul className="grid gap-5 md:grid-cols-2">
          {earned.map((certificate) => (
            <li key={certificate.id} className="surface overflow-hidden">
              <button type="button" onClick={() => setOpen(certificate)} className="block w-full border-b" aria-label={t("certificates2.view", "View certificate for {{course}}", { course: certificate.courseTitle })}>
                <CertificatePreview certificate={certificate} />
              </button>
              <div className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="text-card-title">{certificate.courseTitle}</h2>
                  {certificate.status === "revoked"
                    ? <StatusPill tone="red">{t("certificate.revoked", "Revoked")}</StatusPill>
                    : <StatusPill tone="green" icon={Check}>{t("certificates2.valid", "Valid")}</StatusPill>}
                </div>
                <p className="mt-1 text-meta">
                  {t("certificates2.issued", "Issued {{date}}", { date: format(new Date(certificate.issuedAt), "d MMMM yyyy", { locale }) })}
                  {certificate.number ? `, ${certificate.number}` : ""}
                </p>
                {certificate.status !== "revoked" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => void download(certificate)} disabled={busy === certificate.id}>
                      <Download />
                      {busy === certificate.id ? t("certificates2.preparing", "Preparing…") : t("certificates2.download", "Download PDF")}
                    </Button>
                    {certificate.code && (
                      <Button variant="outline" onClick={() => void copyLink(certificate)}>
                        {copied === certificate.id ? <Check /> : <Copy />}
                        {copied === certificate.id ? t("certificates2.copied", "Link copied") : t("certificates2.copy", "Copy verification link")}
                      </Button>
                    )}
                    {certificate.legacyFileUrl && (
                      <Button asChild variant="ghost">
                        <a href={certificate.legacyFileUrl} target="_blank" rel="noreferrer"><FileText />{t("certificates2.original", "Original file")}</a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {inProgress.length > 0 && (
        <section className="mt-10">
          <SectionHeader title={t("certificates2.progress.title", "Still to earn")} />
          <ul className="surface divide-y">
            {inProgress.map((course) => {
              const status = capstones.data?.get(course.courseId);
              const grade = status?.submission?.grade ?? null;
              const submitted = Boolean(status?.submission);
              return (
                <li key={course.courseId} className="flex flex-wrap items-center gap-4 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Lock className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-forest">{course.title}</p>
                    <p className="mt-0.5 text-meta">
                      {!status
                        ? t("certificates2.progress.noCapstone", "This course has no capstone yet. Your instructor will tell you how it is certified.")
                        : grade !== null
                          ? t("certificates2.progress.graded", "Capstone graded {{grade}}%. {{mark}}% is needed, so revise and resubmit.", { grade, mark: PASS_MARK })
                          : submitted
                            ? t("certificates2.progress.submitted", "Capstone submitted and waiting for a grade.")
                            : t("certificates2.progress.todo", "Submit your capstone and score {{mark}}% or more.", { mark: PASS_MARK })}
                    </p>
                  </div>
                  {status && grade === null && submitted
                    ? <StatusPill tone="amber">{t("certificates2.progress.waiting", "Awaiting grade")}</StatusPill>
                    : status && (
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/learn/${course.courseId}?capstone=1`}><GraduationCap />{t("room.allDone.cta", "Open capstone")}</Link>
                      </Button>
                    )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Dialog open={Boolean(open)} onOpenChange={(value) => !value && setOpen(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="font-display text-forest">{open?.courseTitle}</DialogTitle>
            <DialogDescription>
              {open?.code
                ? t("certificates2.codeLine", "Verification code {{code}}", { code: formatCode(open.code) })
                : t("certificates2.noCode", "This certificate was uploaded before online verification existed.")}
            </DialogDescription>
          </DialogHeader>
          {open && <CertificatePreview certificate={open} className="border" />}
          {open && open.status !== "revoked" && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void download(open)} disabled={busy === open.id}><Download />{t("certificates2.download", "Download PDF")}</Button>
              {open.code && (
                <Button asChild variant="outline"><Link to={`/verify/${open.code}`} target="_blank">{t("certificates2.openVerify", "Open verification page")}</Link></Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default StudentCertificates;
