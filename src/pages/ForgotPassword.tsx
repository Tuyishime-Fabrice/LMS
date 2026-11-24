import { usePageMeta } from "@/lib/pageMeta";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ForgotPassword = () => {
  const { t } = useTranslation();
  usePageMeta({ title: t("meta.forgot.title", "Reset your password"), path: "/forgot-password", noindex: true });
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error(t("forgotPassword.pleaseEnterYourEmailAddress", "Please enter your email address"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      setSentTo(normalizedEmail);
      toast.success(t("forgotPassword.passwordResetLinkSentPleaseCheck", "Password reset link sent. Please check your email."));
    } catch (error: any) {
      toast.error(error.message || t("forgotPassword.failedToSendPasswordResetEmail", "Failed to send password reset email"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <Button
            type="button"
            variant="ghost"
            className="w-fit px-0 text-muted-foreground hover:text-primary"
            onClick={() => navigate("/auth")}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("forgotPassword.backToLogin", "Back to login")}
          </Button>
          <div className="space-y-1">
            <CardTitle className="text-2xl">{t("forgotPassword.forgotPassword", "Forgot password?")}</CardTitle>
            <CardDescription>
              {t("forgotPassword.enterYourAccountEmailAndWe", "Enter your account email and we will send you a secure reset link.")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {sentTo && (
            <Alert className="border-primary/30 bg-leaf text-leaf-foreground">
              <Mail className="h-4 w-4" />
              <AlertTitle>{t("forgotPassword.checkYourEmail", "Check your email")}</AlertTitle>
              <AlertDescription>
                {t("forgotPassword.weSentAResetLinkTo", "We sent a reset link to {{sentTo}}. Open it to create a new password.", { sentTo: sentTo })}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">{t("forgotPassword.emailAddress", "Email address")}</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder={t("forgotPassword.youExampleCom", "you@example.com")}
                autoComplete="email"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover text-white"
            >
              {loading ? t("forgotPassword.sending", "Sending...") : t("forgotPassword.sendResetLink", "Send reset link")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
