import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" || session?.user) {
        setHasRecoverySession(true);
        setSessionError("");
        setCheckingSession(false);
      }
    });

    const prepareRecoverySession = async () => {
      try {
        const code = new URLSearchParams(window.location.search).get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!mounted) return;

        if (data.session?.user) {
          setHasRecoverySession(true);
          setSessionError("");
        } else {
          setHasRecoverySession(false);
          setSessionError("This reset link is invalid or has expired. Please request a new link.");
        }
      } catch (error: any) {
        if (!mounted) return;
        setHasRecoverySession(false);
        setSessionError(error.message || "Unable to verify your reset link.");
      } finally {
        if (mounted) {
          setCheckingSession(false);
        }
      }
    };

    prepareRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 6) {
      toast.error(t("resetPassword.passwordMustBeAtLeast6", "Password must be at least 6 characters"));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(t("resetPassword.passwordsDoNotMatch", "Passwords do not match"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success(t("resetPassword.passwordUpdatedSuccessfullyPleaseSignIn", "Password updated successfully. Please sign in again."));
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast.error(error.message || t("resetPassword.failedToUpdatePassword", "Failed to update password"));
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
            {t("resetPassword.backToLogin", "Back to login")}
          </Button>
          <div className="space-y-1">
            <CardTitle className="text-2xl">{t("resetPassword.createANewPassword", "Create a new password")}</CardTitle>
            <CardDescription>
              {t("resetPassword.chooseANewPasswordForYour", "Choose a new password for your DATA+ Academy account.")}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {checkingSession ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary" />
              <p className="text-sm text-muted-foreground">{t("resetPassword.verifyingResetLink", "Verifying reset link...")}</p>
            </div>
          ) : !hasRecoverySession ? (
            <>
              <Alert variant="destructive">
                <LockKeyhole className="h-4 w-4" />
                <AlertTitle>{t("resetPassword.resetLinkUnavailable", "Reset link unavailable")}</AlertTitle>
                <AlertDescription>{sessionError}</AlertDescription>
              </Alert>
              <Button
                type="button"
                className="w-full bg-primary hover:bg-primary-hover text-white"
                onClick={() => navigate("/forgot-password")}
              >
                {t("resetPassword.requestANewResetLink", "Request a new reset link")}
              </Button>
            </>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t("resetPassword.newPassword", "New password")}</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-forest"
                    aria-label={showPassword ? t("resetPassword.hidePassword", "Hide password") : t("resetPassword.showPassword", "Show password")}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">{t("resetPassword.confirmNewPassword", "Confirm new password")}</Label>
                <div className="relative">
                  <Input
                    id="confirm-new-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    minLength={6}
                    required
                    className="pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-forest"
                    aria-label={showConfirmPassword ? t("resetPassword.hideConfirmationPassword", "Hide confirmation password") : t("resetPassword.showConfirmationPassword", "Show confirmation password")}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover text-white"
              >
                {loading ? t("resetPassword.updating", "Updating...") : t("resetPassword.updatePassword", "Update password")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
