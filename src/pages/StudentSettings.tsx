import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/StudentSidebar";
import { Globe, Lock, LogOut, Shield, KeyRound } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from "@/components/LanguageSelector";

const StudentSettings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    // Load saved language preference from localStorage
    const savedLanguage = localStorage.getItem("language") || "en";
    setLanguage(savedLanguage);
  }, []);

  const handleLanguageChange = (value: string) => {
    setLanguage(value);
    localStorage.setItem("language", value);
    toast.success(`${t('settings.languageChanged')} ${value === "en" ? t('settings.english') : t('settings.french')}`);
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error(t('settings.enterEmailError'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast.success(t('settings.resetEmailSent'));
      setShowResetDialog(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error(error.message || t('studentSettings.failedToSendReset'));
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success(t('settings.signOutSuccess'));
      navigate("/auth");
    } catch (error: any) {
      toast.error(error.message || t('studentSettings.failedToSignOut'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50 dark:bg-gray-900">
        <StudentSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white dark:bg-gray-800 border dark:border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm mx-4 mt-4 sticky top-4 z-10">
            <div className="container mx-auto px-4 sm:px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div className="flex-1">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('settings.settings')}</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {t('settings.manageAccount')}
                  </p>
                </div>
                <LanguageSelector />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            <div className="container mx-auto max-w-4xl space-y-6">
              {/* Language */}
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Globe className="h-5 w-5" />
                    {t('settings.language')}
                  </CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    {t('settings.chooseLanguage')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="language" className="dark:text-white">{t('grades.selectCourse')}</Label>
                    <Select value={language} onValueChange={handleLanguageChange}>
                      <SelectTrigger id="language" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <SelectValue placeholder={t('settings.language')} />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-700 dark:border-gray-600">
                        <SelectItem value="en" className="dark:text-white dark:focus:bg-gray-600">
                          {t('settings.english')}
                        </SelectItem>
                        <SelectItem value="fr" className="dark:text-white dark:focus:bg-gray-600">
                          {t('settings.french')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Security */}
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Lock className="h-5 w-5" />
                    {t('settings.security')}
                  </CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    {t('settings.passwordSecurity')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base dark:text-white">{t('settings.resetPassword')}</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('settings.sendResetLink')}
                      </p>
                    </div>
                    <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600">
                          <KeyRound className="h-4 w-4 mr-2" />
                          {t('settings.resetPassword')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="dark:text-white">{t('settings.resetPassword')}</AlertDialogTitle>
                          <AlertDialogDescription className="dark:text-gray-400">
                            {t('settings.enterEmail')}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="py-4">
                          <Input
                            type="email"
                            placeholder={t('auth.email')}
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600">
                            {t('settings.cancel')}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleForgotPassword}
                            disabled={loading}
                            className="bg-[#006d2c] hover:bg-[#005523] text-white"
                          >
                            {loading ? `${t('common.loading')}...` : t('settings.sendResetLink')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>

              {/* Privacy */}
              <Card className="dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 dark:text-white">
                    <Shield className="h-5 w-5" />
                    {t('studentSettings.privacyLegal')}
                  </CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    {t('studentSettings.reviewPolicies')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    className="w-full justify-start dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600"
                    onClick={() => navigate("/privacy-policy")}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {t('studentSettings.privacyPolicy')}
                  </Button>
                </CardContent>
              </Card>

              <Separator className="dark:bg-gray-700" />

              {/* Sign Out */}
              <Card className="border-red-200 dark:border-red-900 dark:bg-gray-800">
                <CardHeader>
                  <CardTitle className="text-red-600 dark:text-red-400">{t('settings.security')}</CardTitle>
                  <CardDescription className="dark:text-gray-400">
                    {t('settings.signOut')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {t('settings.signOut')}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="dark:text-white">{t('common.confirm')}</AlertDialogTitle>
                        <AlertDialogDescription className="dark:text-gray-400">
                          {t('studentSettings.signOutRedirect')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:bg-gray-600">
                          {t('common.cancel')}
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleSignOut}
                          disabled={loading}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {loading ? t('studentSettings.signingOut') : t('settings.signOut')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default StudentSettings;
