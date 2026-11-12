import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { BadgeCheck, CircleX, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brand } from "@/components/shell/Brand";
import { LanguageSelector } from "@/components/LanguageSelector";
import { SkeletonBlock } from "@/components/shell/page";
import { db } from "@/features/learning/api";
import { useDateLocale } from "@/features/learning/hooks";
import { formatCode } from "@/features/certificates/certificate";

type Verification = {
  certificate_number: string | null; holder_name: string | null; course_title: string | null;
  issued_at: string | null; completion_date: string | null; is_valid: boolean; status: string;
};

const clean = (value: string) => value.replace(/[^a-z0-9]/gi, "").toUpperCase();

/**
 * Public page: anyone holding a certificate's code (or scanning its QR code)
 * can confirm it is genuine. Shows the holder, the course, the date and
 * whether it is still valid. Nothing else about the learner is exposed.
 */
export default function VerifyCertificate() {
  const { code: routeCode } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const locale = useDateLocale();
  const code = clean(routeCode || "");
  const [input, setInput] = useState(code ? formatCode(code) : "");

  useEffect(() => { setInput(code ? formatCode(code) : ""); }, [code]);
  useEffect(() => { document.title = "Verify a certificate | DataPlus Academy"; }, []);

  const result = useQuery({
    queryKey: ["verify-certificate", code],
    enabled: code.length >= 8,
    retry: 1,
    queryFn: async (): Promise<Verification | null> => {
      const { data, error } = await db.rpc("verify_certificate", { p_code: code });
      if (error) throw error;
      return (Array.isArray(data) ? data[0] : data) || null;
    },
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = clean(input);
    if (next) navigate(`/verify/${next}`);
  };

  const record = result.data;
  const date = record?.issued_at || record?.completion_date;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b bg-card px-4 sm:px-8">
        <Link to="/" aria-label="DataPlus Academy"><Brand /></Link>
        <LanguageSelector />
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10 sm:py-16">
        <h1 className="text-page-title">{t("verify.title", "Verify a certificate")}</h1>
        <p className="mt-2 text-[0.9375rem] leading-6 text-muted-foreground">
          {t("verify.description", "Enter the verification code printed on a DataPlus Academy certificate, or scan its QR code.")}
        </p>

        <form onSubmit={submit} className="mt-6 flex gap-2">
          <label htmlFor="verify-code" className="sr-only">{t("verify.codeLabel", "Verification code")}</label>
          <Input
            id="verify-code"
            value={input}
            onChange={(event) => setInput(event.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX-XXXX"
            autoComplete="off"
            spellCheck={false}
            className="tabular h-11 bg-card font-mono text-base tracking-wider"
          />
          <Button type="submit" size="lg" disabled={clean(input).length < 8}><Search />{t("verify.submit", "Verify")}</Button>
        </form>

        <div className="mt-8" aria-live="polite">
          {!code ? null : result.isLoading ? (
            <SkeletonBlock className="h-56 rounded-xl" />
          ) : result.isError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive-surface p-6">
              <p className="font-display font-semibold text-destructive">{t("verify.error.title", "Verification is unavailable right now")}</p>
              <p className="mt-1 text-sm text-foreground/80">{t("verify.error.body", "Nothing is wrong with the certificate. Try again in a moment.")}</p>
              <Button variant="outline" className="mt-4" onClick={() => void result.refetch()}>{t("common.tryAgain", "Try again")}</Button>
            </div>
          ) : !record ? (
            <div className="surface p-6">
              <CircleX className="h-8 w-8 text-destructive" />
              <p className="mt-3 text-card-title">{t("verify.notFound.title", "No certificate matches this code")}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t("verify.notFound.body", "Check the code for typing mistakes. If it still does not match, this certificate was not issued by DataPlus Academy.")}
              </p>
            </div>
          ) : (
            <div className={`overflow-hidden rounded-xl border ${record.is_valid ? "border-primary/40" : "border-destructive/40"}`}>
              <div className={`flex items-center gap-3 px-6 py-4 ${record.is_valid ? "bg-leaf text-leaf-foreground" : "bg-destructive-surface text-destructive"}`}>
                {record.is_valid ? <BadgeCheck className="animate-confirm h-7 w-7" /> : <ShieldAlert className="h-7 w-7" />}
                <p className="font-display text-lg font-semibold">
                  {record.is_valid ? t("verify.valid", "This certificate is valid") : t("verify.revoked", "This certificate has been revoked")}
                </p>
              </div>
              <dl className="divide-y bg-card text-sm">
                {[
                  [t("verify.holder", "Awarded to"), record.holder_name],
                  [t("verify.course", "Programme"), record.course_title],
                  [t("verify.issued", "Date of issue"), date ? format(new Date(date), "d MMMM yyyy", { locale }) : null],
                  [t("verify.number", "Certificate number"), record.certificate_number],
                  [t("verify.issuer", "Issued by"), "DataPlus Academy"],
                ].filter(([, value]) => value).map(([label, value]) => (
                  <div key={label as string} className="grid grid-cols-[9.5rem_1fr] gap-3 px-6 py-3">
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd className="font-semibold text-forest">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t px-4 py-5 text-center text-xs text-muted-foreground">
        DataPlus Academy, Kigali, Rwanda
      </footer>
    </div>
  );
}
