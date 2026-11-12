import { readBrowserStorage, writeBrowserStorage, removeBrowserStorage } from "@/lib/browserStorage";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authContinuationUrl, postAuthDestination } from "@/lib/coursePaymentReturn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAppAuth } from "@/contexts/AuthContext";

const AUTH_METHOD_KEY = "lastAuthMethod";

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, profile, loading: authLoading } = useAppAuth();
  const [formLoading, setFormLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lastAuthMethod, setLastAuthMethod] = useState<string | null>(null);

  useEffect(() => {
    setLastAuthMethod(readBrowserStorage("local", AUTH_METHOD_KEY));
  }, []);

  /**
   * When AuthContext finishes loading and both user + profile are present,
   * navigate to the correct destination. This fires after handleSignIn triggers
   * signInWithPassword → onAuthStateChange → scheduleProfileFetch → setProfile.
   * We never fetch the profile manually here; the context owns that.
   */
  useEffect(() => {
    if (authLoading || !user || !profile) return;

    if (!profile.onboarding_completed && profile.role !== "admin") {
      toast.info("Please complete your profile setup");
    } else {
      toast.success(t('login.signedInSuccess'));
    }
    navigate(postAuthDestination(profile), { replace: true });
  }, [authLoading, user, profile, navigate, t]);

  const handleGoogleAuth = async () => {
    try {
      writeBrowserStorage("local", AUTH_METHOD_KEY, "google");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${authContinuationUrl("/auth/callback")}`,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });
      if (error) toast.error(error.message);
    } catch (error: any) {
      toast.error(error.message || "Google authentication failed");
    }
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error(t('login.invalidCredentials'));
        } else if (error.message.includes("Email not confirmed")) {
          writeBrowserStorage("session", "pendingVerificationEmail", email);
          toast.info("Please verify your email to continue.");
          navigate(authContinuationUrl("/verify-email"));
        } else {
          toast.error(error.message);
        }
        return;
      }

      writeBrowserStorage("local", AUTH_METHOD_KEY, "email");
      // Sign-in succeeded. onAuthStateChange will fire SIGNED_IN → scheduleProfileFetch
      // (deferred with setTimeout 0, outside Supabase's lock) → setProfile → setLoading(false).
      // The useEffect above watching [user, profile] will then navigate automatically.
      // Keep formLoading true so the button stays disabled until navigation.
    } catch (error: any) {
      console.error("Sign-in error:", error);
      toast.error(error.message || "An error occurred during sign in");
    } finally {
      // Only clear formLoading on error paths; on success the component unmounts on navigate.
      if (!user) setFormLoading(false);
    }
  };

  const isLoading = formLoading || authLoading;

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img
              src="/images/dataplus_logggg-removebg-preview.png"
              alt="DataPlus Logo"
              className="w-10 h-10 object-contain"
            />
          </div>

          {/* Language Selector */}
          <div className="flex justify-end mb-2">
            <LanguageSelector />
          </div>

          {/* Header */}
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-black leading-tight">
              {t('login.masterSkills')}
            </h1>
            <p className="text-gray-500 text-sm">{t('login.signInToStart')}</p>
          </div>

          {/* Google Auth Button */}
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className={`w-full h-11 text-sm font-medium bg-white border hover:bg-gray-50 rounded-lg group ${
                lastAuthMethod === "google" ? "border-[#006d2c] border-2" : "border-gray-300"
              }`}
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="text-gray-700 group-hover:text-[#006d2c] transition-colors">
                {t('auth.signInWithGoogle')}
              </span>
            </Button>
            {lastAuthMethod === "google" && (
              <Badge className="absolute -top-2 -right-2 bg-[#006d2c] text-white text-xs px-2 py-0.5">
                {t('auth.usedLast', 'Used last')}
              </Badge>
            )}
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-gray-400">{t('common.or', 'or')}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                {t('auth.email')}*
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t('auth.email')}
                required
                disabled={isLoading}
                className="h-11 px-4 border-gray-300 rounded-lg focus:border-black focus:ring-black"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  {t('auth.password')}*
                </Label>
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-sm font-medium text-[#006d2c] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t('auth.password')}
                  required
                  minLength={6}
                  disabled={isLoading}
                  className="h-11 px-4 pr-12 border-gray-300 rounded-lg focus:border-black focus:ring-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="relative">
              <Button
                type="submit"
                disabled={isLoading}
                className={`w-full h-11 bg-black hover:bg-[#006d2c] text-white font-medium rounded-lg transition-colors duration-300 ${
                  lastAuthMethod === "email" ? "ring-2 ring-[#006d2c] ring-offset-2" : ""
                }`}
              >
                {isLoading ? `${t('auth.signIn')}...` : t('auth.signIn')}
              </Button>
              {lastAuthMethod === "email" && (
                <Badge className="absolute -top-2 -right-2 bg-[#006d2c] text-white text-xs px-2 py-0.5">
                  {t('auth.usedLast', 'Used last')}
                </Badge>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {t('auth.dontHaveAccount')}{" "}
              <button
                onClick={() => navigate(authContinuationUrl("/signup"))}
                className="text-black font-bold hover:underline"
              >
                {t('auth.signUp')}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex flex-1 relative">
        <img
          src="/images/mainpagepicture.jpg"
          alt="Students learning together"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        <div className="absolute bottom-8 left-8 text-white z-10">
          <h3 className="text-2xl font-bold mb-2">{t('login.joinCommunity')}</h3>
          <p className="text-lg opacity-90">{t('login.connectWorldwide')}</p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
