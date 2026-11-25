import { usePageMeta } from "@/lib/pageMeta";
import { readBrowserStorage } from "@/lib/browserStorage";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { authContinuationUrl } from "@/lib/coursePaymentReturn";

const PENDING_VERIFICATION_EMAIL_KEY = "pendingVerificationEmail";

const VerifyEmail = () => {
  const { t } = useTranslation();
  usePageMeta({ title: t("meta.verifyEmail.title", "Check your email"), noindex: true });
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const storedEmail = readBrowserStorage("session", PENDING_VERIFICATION_EMAIL_KEY) || "";
    setEmail(storedEmail);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email) {
      toast.error(t("verifyEmail.weCouldnTFindTheEmail", "We couldn't find the email address to resend to. Please try signing up or signing in again."));
      return;
    }

    setResending(true);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${authContinuationUrl("/auth/callback")}`,
        },
      });

      if (error) {
        throw error;
      }

      setCooldown(30);
      toast.success(`Verification email sent again to ${email}.`);
    } catch (error: any) {
      console.error("Verification resend error:", error);
      toast.error(error.message || t("verifyEmail.failedToResendVerificationEmail", "Failed to resend verification email."));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t("verifyEmail.verifyYourEmail", "Verify Your Email")}</CardTitle>
          <CardDescription className="text-base">
            {t("verifyEmail.pleaseCheckYourInboxToComplete", "Please check your inbox to complete your registration")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-info-surface border-info/30">
            <CheckCircle2 className="h-4 w-4 text-info" />
            <AlertDescription className="text-sm text-info">
              {email
                ? `We've sent a verification email to ${email}. Click the link in the email to verify your account.`
                : t("verifyEmail.weVeSentAVerificationEmail", "We've sent a verification email to your inbox. Click the link in the email to verify your account.")}
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-foreground">{t("verifyEmail.whatHappensNext", "What happens next?")}</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">1</span>
                </div>
                <p className="pt-0.5">
                  <span className="font-medium text-foreground">{t("verifyEmail.checkYourEmailInbox", "Check your email inbox")}</span>
                  <br />
                  <span className="text-xs">{t("verifyEmail.lookForAnEmailFromDataplus", "Look for an email from DATA+ Academy")}</span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">2</span>
                </div>
                <p className="pt-0.5">
                  <span className="font-medium text-foreground">{t("verifyEmail.clickTheVerificationLink", "Click the verification link")}</span>
                  <br />
                  <span className="text-xs">{t("verifyEmail.thisWillVerifyYourEmailAddress", "This will verify your email address")}</span>
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">3</span>
                </div>
                <p className="pt-0.5">
                  <span className="font-medium text-foreground">{t("verifyEmail.completeYourProfile", "Complete your profile")}</span>
                  <br />
                  <span className="text-xs">{t("verifyEmail.youLlBeRedirectedToComplete", "You'll be redirected to complete your onboarding")}</span>
                </p>
              </div>
            </div>
          </div>

          <Alert className="bg-warning-surface border-warning/30">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-xs text-warning">
              <strong>{t("verifyEmail.didnTReceiveTheEmail", "Didn't receive the email?")}</strong>{" "}{t("verifyEmail.checkYourSpamOrJunkFolder", "Check your spam or junk folder first. If it's still missing, use resend below.")}
            </AlertDescription>
          </Alert>

          <div className="space-y-3 pt-2">
            <Button
              className="w-full"
              onClick={handleResend}
              disabled={resending || cooldown > 0}
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("verifyEmail.resending", "Resending...")}
                </>
              ) : cooldown > 0 ? (
                `Resend available in ${cooldown}s`
              ) : (
                t("verifyEmail.resendVerificationEmail", "Resend verification email")
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(authContinuationUrl("/auth"))}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("verifyEmail.backToSignIn", "Back to Sign In")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
