import { supabase } from "@/integrations/supabase/client";
import { db } from "@/features/learning/api";

export type Certificate = {
  id: string;
  courseId: string;
  courseTitle: string;
  holderName: string;
  number: string | null;
  code: string | null;
  issuedAt: string;
  status: "approved" | "revoked" | "pending" | "rejected";
  /** A file uploaded by an admin before certificates were generated. */
  legacyFileUrl: string | null;
  source: "auto" | "manual";
};

export function verificationUrl(code: string) {
  return `${window.location.origin}/verify/${code}`;
}

export function formatCode(code: string) {
  return code.replace(/(.{4})(?=.)/g, "$1-");
}

export async function fetchMyCertificates(userId: string, holderName: string): Promise<Certificate[]> {
  // If the 2026-11-12 migration is not applied yet the first query fails; the
  // page then still shows certificates uploaded by an admin.
  type Rows = { data: Array<Record<string, unknown>> | null; error: { message: string } | null };
  let result: Rows = await db.from("certificates")
    .select("id, course_id, status, certificate_url, completion_date, approved_at, certificate_number, verification_code, issued_at, issue_source, courses ( title )")
    .eq("student_id", userId).in("status", ["approved", "revoked"]).order("completion_date", { ascending: false });
  if (result.error) {
    result = await supabase.from("certificates")
      .select("id, course_id, status, certificate_url, completion_date, approved_at, courses ( title )")
      .eq("student_id", userId).eq("status", "approved").order("completion_date", { ascending: false });
  }
  if (result.error) throw result.error;
  return ((result.data as Array<Record<string, unknown>> | null) || []).map((row) => ({
    id: row.id as string,
    courseId: row.course_id as string,
    courseTitle: (row.courses as { title: string } | null)?.title || "",
    holderName,
    number: (row.certificate_number as string | null) ?? null,
    code: (row.verification_code as string | null) ?? null,
    issuedAt: (row.issued_at || row.approved_at || row.completion_date) as string,
    status: row.status as Certificate["status"],
    legacyFileUrl: (row.certificate_url as string | null) || null,
    source: (row.issue_source as "auto" | "manual") || "manual",
  }));
}

async function imageDataUrl(path: string): Promise<{ data: string; width: number; height: number } | null> {
  try {
    const blob = await (await fetch(path)).blob();
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const size = await new Promise<{ width: number; height: number }>((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = () => resolve({ width: 1, height: 1 });
      image.src = data;
    });
    return { data, ...size };
  } catch {
    return null;
  }
}

const FOREST: [number, number, number] = [15, 42, 29];
const GREEN: [number, number, number] = [0, 109, 44];
const MUTED: [number, number, number] = [94, 107, 99];

/**
 * Draws the certificate as a vector A4 landscape PDF and saves it.
 * The PDF and QR libraries are downloaded only when a learner asks for the file.
 */
export async function downloadCertificatePdf(certificate: Certificate, language: string) {
  const [{ jsPDF }, QRCode] = await Promise.all([import("jspdf"), import("qrcode")]);
  const fr = language.startsWith("fr");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const W = 297;
  const H = 210;

  doc.setFillColor(252, 252, 249);
  doc.rect(0, 0, W, H, "F");
  doc.setDrawColor(...FOREST);
  doc.setLineWidth(1.4);
  doc.rect(9, 9, W - 18, H - 18);
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.35);
  doc.rect(12.5, 12.5, W - 25, H - 25);

  const logo = await imageDataUrl("/images/dataplus-logo.png");
  if (logo) {
    const height = 26;
    const width = (logo.width / logo.height) * height;
    doc.addImage(logo.data, "PNG", (W - width) / 2, 21, width, height);
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text("DataPlus Academy", W / 2, 54, { align: "center" });

  doc.setFont("times", "bold");
  doc.setFontSize(31);
  doc.setTextColor(...FOREST);
  doc.text(fr ? "Certificat de réussite" : "Certificate of Completion", W / 2, 70, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...MUTED);
  doc.text(fr ? "Ce certificat est décerné à" : "This certificate is awarded to", W / 2, 84, { align: "center" });

  doc.setFont("times", "bolditalic");
  doc.setTextColor(...GREEN);
  let nameSize = 36;
  doc.setFontSize(nameSize);
  while (doc.getTextWidth(certificate.holderName) > W - 80 && nameSize > 20) { nameSize -= 2; doc.setFontSize(nameSize); }
  doc.text(certificate.holderName, W / 2, 101, { align: "center" });
  const nameWidth = Math.min(W - 80, Math.max(90, doc.getTextWidth(certificate.holderName) + 16));
  doc.setDrawColor(...GREEN);
  doc.setLineWidth(0.3);
  doc.line((W - nameWidth) / 2, 105.5, (W + nameWidth) / 2, 105.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...MUTED);
  doc.text(fr ? "pour avoir terminé avec succès le programme" : "for successfully completing the programme", W / 2, 116, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.setTextColor(...FOREST);
  const titleLines = doc.splitTextToSize(certificate.courseTitle, W - 90).slice(0, 2) as string[];
  doc.text(titleLines, W / 2, 128, { align: "center" });

  const issued = new Date(certificate.issuedAt);
  const dateText = new Intl.DateTimeFormat(fr ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(issued);

  const baseY = 172;
  doc.setDrawColor(...MUTED);
  doc.setLineWidth(0.25);
  doc.line(32, baseY, 92, baseY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...FOREST);
  doc.text(dateText, 62, baseY - 3, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(fr ? "Date de délivrance" : "Date of issue", 62, baseY + 5, { align: "center" });

  doc.line(118, baseY, 178, baseY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...FOREST);
  doc.text("DataPlus Academy", 148, baseY - 3, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  doc.text(fr ? "Autorité de délivrance" : "Issuing authority", 148, baseY + 5, { align: "center" });

  if (certificate.code) {
    const url = verificationUrl(certificate.code);
    const qr = await QRCode.toDataURL(url, { margin: 0, width: 360, color: { dark: "#0F2A1D", light: "#FCFCF9" } });
    doc.addImage(qr, "PNG", 232, 148, 30, 30);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(fr ? "Scannez pour vérifier" : "Scan to verify", 247, 183, { align: "center" });
    doc.setFontSize(8.5);
    doc.text(`${fr ? "Vérification" : "Verify at"}: ${url.replace(/^https?:\/\//, "")}`, W / 2, 191, { align: "center" });
  }
  if (certificate.number) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...FOREST);
    doc.text(`${fr ? "Certificat n°" : "Certificate no."} ${certificate.number}`, 32, 191);
  }

  const safe = certificate.courseTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60);
  doc.save(`DataPlus-Certificate-${safe || "course"}.pdf`);
}
