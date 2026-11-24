import { readBrowserStorage, writeBrowserStorage, removeBrowserStorage } from "@/lib/browserStorage";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authContinuationUrl } from "@/lib/coursePaymentReturn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { GraduationCap, Users, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

type UserRole = "student" | "teacher";

const AUTH_METHOD_KEY = "lastAuthMethod";
const PENDING_VERIFICATION_EMAIL_KEY = "pendingVerificationEmail";

const SignUp = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [selectedRole, setSelectedRole] = useState<UserRole>(searchParams.get("role") === "teacher" ? "teacher" : "student");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [lastAuthMethod, setLastAuthMethod] = useState<string | null>(null);

  useEffect(() => {
    // Check localStorage for last used auth method
    const savedMethod = readBrowserStorage("local", AUTH_METHOD_KEY);
    setLastAuthMethod(savedMethod);
  }, []);

  const handleGoogleAuth = async () => {
    try {
      // Save auth method before redirect
      writeBrowserStorage("local", AUTH_METHOD_KEY, "google");
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${authContinuationUrl(`/auth/callback?role=${selectedRole}`)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (error: any) {
      toast.error(error.message || t("signUp.anErrorOccurredWithGoogleAuthentication", "An error occurred with Google authentication"));
    }
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;
    const fullName = formData.get("fullName") as string;

    if (password !== confirmPassword) {
      toast.error(t('signUp.passwordsDoNotMatch'));
      setLoading(false);
      return;
    }

    try {
      // First, check if email already exists in profiles table
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("email")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (existingProfile) {
        toast.error(
          t('signUp.emailAlreadyExists', 'This email is already registered. Please sign in instead.'),
          {
            duration: 5000,
            action: {
              label: t('signUp.goToLogin', 'Sign In'),
              onClick: () => navigate(authContinuationUrl("/auth")),
            },
          }
        );
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${authContinuationUrl("/auth/callback")}`,
          data: {
            full_name: fullName,
            role: selectedRole,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered") || error.message.includes("User already registered")) {
          toast.error(
            t('signUp.emailAlreadyExists', 'This email is already registered. Please sign in instead.'),
            {
              duration: 5000,
              action: {
                label: t('signUp.goToLogin', 'Sign In'),
                onClick: () => navigate(authContinuationUrl("/auth")),
              },
            }
          );
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        writeBrowserStorage("local", AUTH_METHOD_KEY, "email");
        if (!data.session) {
          writeBrowserStorage("session", PENDING_VERIFICATION_EMAIL_KEY, email);
          toast.success(t("signUp.checkYourEmailToVerifyYour", "Check your email to verify your account and continue."));
          navigate(authContinuationUrl("/verify-email"));
          return;
        }

        removeBrowserStorage("session", PENDING_VERIFICATION_EMAIL_KEY);
        toast.success(t("signUp.accountCreatedCompleteYourProfileTo", "Account created! Complete your profile to continue."));
        navigate(authContinuationUrl(selectedRole === "teacher" ? "/teacher/onboarding" : "/onboarding"));
      }
    } catch (error: any) {
      console.error("Signup error:", error);
      toast.error(error.message || t("signUp.anErrorOccurredDuringSignup", "An error occurred during signup"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-card">
        <div className="w-full max-w-md space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img
              src="/images/dataplus_logggg-removebg-preview.png"
              alt="DATA+ Academy"
              className="w-10 h-10 object-contain"
            />
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-forest leading-tight">
              {t('signUp.masterSkills')}
            </h1>
            <p className="text-muted-foreground text-sm">{t('signUp.signUpToStart')}</p>
          </div>

          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={selectedRole === "student" ? "default" : "outline"}
              onClick={() => setSelectedRole("student")}
              className={`w-full h-10 text-sm font-medium rounded-lg transition-colors duration-300 group ${selectedRole === "student"
                ? "bg-primary hover:bg-primary-hover text-white"
                : "bg-card border border-border hover:bg-muted"
                }`}
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              <span className={selectedRole === "student" ? "" : "text-forest group-hover:text-primary transition-colors"}>
                {t('signUp.student')}
              </span>
            </Button>
            <Button
              type="button"
              variant={selectedRole === "teacher" ? "default" : "outline"}
              onClick={() => setSelectedRole("teacher")}
              className={`w-full h-10 text-sm font-medium rounded-lg transition-colors duration-300 group ${selectedRole === "teacher"
                ? "bg-primary hover:bg-primary-hover text-white"
                : "bg-card border border-border hover:bg-muted"
                }`}
            >
              <Users className="mr-2 h-4 w-4" />
              <span className={selectedRole === "teacher" ? "" : "text-forest group-hover:text-primary transition-colors"}>
                {t('signUp.teacher')}
              </span>
            </Button>
          </div>

          {/* Google Auth Button */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleAuth}
              className={`w-full h-11 text-sm font-medium bg-white border hover:bg-gray-50 rounded-lg group ${
                lastAuthMethod === "google" ? "border-primary border-2" : "border-border"
              }`}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-foreground group-hover:text-primary transition-colors">
                {t('signUp.signUpWithGoogle')}
              </span>
            </Button>
            {lastAuthMethod === "google" && (
              <Badge className="absolute -top-2 -right-2 bg-primary text-white text-xs px-2 py-0.5">
                {t('auth.usedLast', 'Used last')}
              </Badge>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-card text-muted-foreground/60">{t("common.or", "or")}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSignUp} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="fullName" className="text-sm font-medium text-foreground">
                {t('signUp.name')}
              </Label>
              <Input
                id="fullName"
                name="fullName"
                type="text"
                placeholder={t('signUp.enterName')}
                required
                className="h-11 px-4 border-border rounded-lg focus:border-black focus:ring-black"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm font-medium text-foreground">
                {t('signUp.email')}
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t('signUp.enterEmail')}
                required
                className="h-11 px-4 border-border rounded-lg focus:border-black focus:ring-black"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                {t('signUp.password')}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('signUp.enterPassword')}
                  required
                  minLength={6}
                  className="h-11 px-4 pr-12 border-border rounded-lg focus:border-black focus:ring-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground/60 hover:text-forest"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                {t('signUp.confirmPassword')}
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t('signUp.confirmYourPassword')}
                  required
                  minLength={6}
                  className="h-11 px-4 pr-12 border-border rounded-lg focus:border-black focus:ring-black"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground/60 hover:text-forest"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="relative">
              <Button
                type="submit"
                disabled={loading}
                className={`w-full h-11 bg-primary hover:bg-primary-hover text-white font-medium rounded-lg transition-colors duration-300 ${
                  lastAuthMethod === "email" ? "ring-2 ring-primary ring-offset-2" : ""
                }`}
              >
                {loading ? t('signUp.creatingAccount') : t('signUp.createAccount')}
              </Button>
              {lastAuthMethod === "email" && (
                <Badge className="absolute -top-2 -right-2 bg-primary text-white text-xs px-2 py-0.5">
                  {t('auth.usedLast', 'Used last')}
                </Badge>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {t('signUp.alreadyHaveAccount')}{" "}
              <button
                onClick={() => navigate(authContinuationUrl("/auth"))}
                className="text-forest font-bold hover:underline"
              >
                {t('signUp.loginHere')}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex flex-1 relative">
        <img
          src="/images/mainpagepicture.jpg"
          alt={t("signUp.studentsLearningTogether", "Students learning together")}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 to-transparent" />
        <div className="absolute bottom-8 left-8 text-white z-10">
          <h3 className="text-2xl font-bold mb-2">{t('signUp.joinCommunity')}</h3>
          <p className="text-lg opacity-90">{t('signUp.connectWorldwide')}</p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
