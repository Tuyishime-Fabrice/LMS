import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const empty = { name: "", email: "", phone: "", organization: "", message: "" };

/** Request form for organisations that want training or research services. */
export function PartnerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(empty);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (key: keyof typeof empty) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: event.target.value });

  const close = (value: boolean) => {
    onOpenChange(value);
    if (!value) setSent(false);
  };

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

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        {sent ? (
          <div className="py-6 text-center">
            <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-success-surface text-success"><CheckCircle2 className="h-7 w-7" /></span>
            <DialogTitle>{t("partner.sentTitle", "Request received")}</DialogTitle>
            <DialogDescription className="mt-2">{t("partner.sentBody", "Our team will contact you within two working days.")}</DialogDescription>
            <Button className="mt-6 w-full" onClick={() => close(false)}>{t("common.close", "Close")}</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t("partner.title", "Train your team with DataPlus")}</DialogTitle>
              <DialogDescription>
                {t("partner.body", "Tell us about your organisation. We run tailored training and help with M&E systems, research and dashboards.")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
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
                <Textarea id="partner-message" rows={3} value={form.message} onChange={set("message")} />
              </div>
              <Button type="submit" disabled={sending} className="sm:col-span-2">
                {sending ? t("partner.sending", "Sending…") : t("partner.send", "Send request")}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
