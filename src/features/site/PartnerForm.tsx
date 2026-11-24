import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const empty = { name: "", email: "", phone: "", organization: "", message: "" };

/**
 * Enquiry form for organisations (training or research services), shown inline on the home page.
 * Same fields and the same insert into partner_requests as the earlier pop-up.
 */
export function PartnerForm() {
  const { t } = useTranslation();
  const [form, setForm] = useState(empty);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (key: keyof typeof empty) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: event.target.value });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    const { error } = await supabase.from("partner_requests").insert({
      name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
      organization: form.organization.trim(), message: form.message.trim() || null,
    });
    setSending(false);
    if (error) {
      toast.error(t("partner.failed", "Your request was not sent. Please try again."));
      return;
    }
    setForm(empty);
    setSent(true);
  };

  if (sent) {
    return (
      <div role="status" className="rounded-lg border bg-card p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-surface text-success"><CheckCircle2 className="h-7 w-7" aria-hidden /></span>
        <h3 className="text-xl font-semibold text-forest">{t("partner.sentTitle", "Request received")}</h3>
        <p className="mt-2 text-muted-foreground">{t("partner.sentBody", "Our team will contact you within two working days.")}</p>
        <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>{t("partner.another", "Send another request")}</Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-lg border bg-card p-5 sm:grid-cols-2 sm:p-7" aria-labelledby="partner-form-title">
      <h3 id="partner-form-title" className="text-xl font-semibold text-forest sm:col-span-2">{t("partner.formTitle", "Tell us about your organisation")}</h3>
      <div className="space-y-1.5">
        <Label htmlFor="partner-name">{t("partner.name", "Full name")}</Label>
        <Input id="partner-name" required value={form.name} onChange={set("name")} autoComplete="name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="partner-org">{t("partner.organization", "Organisation")}</Label>
        <Input id="partner-org" required value={form.organization} onChange={set("organization")} autoComplete="organization" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="partner-email">{t("partner.email", "Work email")}</Label>
        <Input id="partner-email" type="email" required value={form.email} onChange={set("email")} autoComplete="email" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="partner-phone">{t("partner.phone", "Phone number")}</Label>
        <Input id="partner-phone" type="tel" required value={form.phone} onChange={set("phone")} autoComplete="tel" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="partner-message">{t("partner.message", "What would you like to achieve? (optional)")}</Label>
        <Textarea id="partner-message" rows={4} value={form.message} onChange={set("message")} />
      </div>
      <Button type="submit" size="lg" disabled={sending} className="sm:col-span-2 sm:justify-self-start">
        {sending ? t("partner.sending", "Sending…") : t("partner.send", "Send request")}
      </Button>
    </form>
  );
}
