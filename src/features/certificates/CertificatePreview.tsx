import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useDateLocale } from "@/features/learning/hooks";
import { verificationUrl, type Certificate } from "./certificate";
import { cn } from "@/lib/utils";

/**
 * On-screen certificate. Sized in container units so the same markup works
 * as a small card and as a large preview.
 */
export function CertificatePreview({ certificate, className }: { certificate: Certificate; className?: string }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!certificate.code) { setQr(null); return; }
    void import("qrcode").then((QRCode) =>
      QRCode.toDataURL(verificationUrl(certificate.code!), { margin: 0, width: 240, color: { dark: "#0F2A1D", light: "#FCFCF9" } }))
      .then((data) => { if (active) setQr(data); });
    return () => { active = false; };
  }, [certificate.code]);

  return (
    <div className={cn("@container w-full", className)} style={{ containerType: "inline-size" }}>
      <div className="relative aspect-[297/210] w-full overflow-hidden bg-[#FCFCF9] text-center" style={{ fontSize: "1.6cqw" }}>
        <div className="absolute inset-[3%] border-[0.35em] border-forest" />
        <div className="absolute inset-[4.2%] border border-primary" />
        <div className="relative flex h-full flex-col items-center px-[10%] pb-[7%] pt-[8%]">
          <img src="/images/dataplus-logo.png" alt="DataPlus" className="h-[14%] w-auto object-contain" />
          <p className="mt-[1.2%] text-[1em] text-muted-foreground">DataPlus Academy</p>
          <p className="mt-[1.5%] font-serif text-[2.9em] font-bold leading-none text-forest">
            {t("certificate.title", "Certificate of Completion")}
          </p>
          <p className="mt-[2.4%] text-[1.1em] text-muted-foreground">{t("certificate.awardedTo", "This certificate is awarded to")}</p>
          <p className="mt-[1%] border-b border-primary px-[4%] pb-[0.6%] font-serif text-[3.2em] font-bold italic leading-tight text-primary">
            {certificate.holderName}
          </p>
          <p className="mt-[1.8%] text-[1.1em] text-muted-foreground">{t("certificate.for", "for successfully completing the programme")}</p>
          <p className="mt-[0.8%] line-clamp-2 font-display text-[1.75em] font-semibold leading-tight text-forest">{certificate.courseTitle}</p>

          <div className="mt-auto flex w-full items-end justify-between text-[0.85em]">
            <div className="w-[26%] border-t border-muted-foreground/60 pt-[2%]">
              <p className="font-semibold text-forest">{format(new Date(certificate.issuedAt), "d MMMM yyyy", { locale })}</p>
              <p className="text-muted-foreground">{t("certificate.date", "Date of issue")}</p>
            </div>
            <div className="w-[26%] border-t border-muted-foreground/60 pt-[2%]">
              <p className="font-semibold text-forest">DataPlus Academy</p>
              <p className="text-muted-foreground">{t("certificate.authority", "Issuing authority")}</p>
            </div>
            <div className="flex w-[14%] flex-col items-center">
              {qr ? <img src={qr} alt="" className="w-full" /> : <div className="aspect-square w-full bg-muted" />}
              <p className="mt-[6%] text-muted-foreground">{t("certificate.scan", "Scan to verify")}</p>
            </div>
          </div>
          {certificate.number && (
            <p className="absolute bottom-[5.8%] left-[10%] text-[0.8em] font-semibold text-forest">
              {t("certificate.number", "Certificate no.")} {certificate.number}
            </p>
          )}
        </div>
        {certificate.status === "revoked" && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="-rotate-12 border-[0.2em] border-destructive px-[3%] py-[1%] font-display text-[4em] font-semibold text-destructive">
              {t("certificate.revoked", "Revoked")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
