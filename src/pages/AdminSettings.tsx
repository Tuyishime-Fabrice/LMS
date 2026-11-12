import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell/page";
import { AppShell } from "@/components/shell/AppShell";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Save } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

const AdminSettings = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    siteName: "DataPlus Learning",
    requireTeacherApproval: true,
    requireCourseApproval: false,
    maintenanceMode: false,
  });

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        toast.error(t("adminSettings.accessDenied", "Access denied"));
        navigate("/");
        return;
      }

      await loadSettings();
    } catch (error: any) {
      console.error("Error:", error);
      navigate("/");
    }
  };

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("*");

      if (error) throw error;

      const settingsMap: any = {};
      data?.forEach((setting) => {
        settingsMap[setting.key] = setting.value;
      });

      setSettings({
        siteName: settingsMap.site_name || "DataPlus Learning",
        requireTeacherApproval: settingsMap.require_teacher_approval || true,
        requireCourseApproval: settingsMap.require_course_approval || false,
        maintenanceMode: settingsMap.maintenance_mode || false,
      });
    } catch (error: any) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "site_name", value: settings.siteName },
        { key: "require_teacher_approval", value: settings.requireTeacherApproval },
        { key: "require_course_approval", value: settings.requireCourseApproval },
        { key: "maintenance_mode", value: settings.maintenanceMode },
      ];

      for (const update of updates) {
        await supabase
          .from("system_settings")
          .upsert({ key: update.key, value: JSON.stringify(update.value) });
      }

      toast.success(t("adminSettings.settingsSavedSuccessfully", "Settings saved successfully"));
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(t("adminSettings.failedToSaveSettings", "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <AppShell role="admin" width="wide">
      <PageHeader
        title={t("adminSettings.systemSettings", "System Settings")}
        description={t("adminSettings.configurePlatformSettings", "Configure platform settings")}
      />

            <div className="max-w-4xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("adminSettings.generalSettings", "General Settings")}</CardTitle>
                  <CardDescription>{t("adminSettings.basicPlatformConfiguration", "Basic platform configuration")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t("adminSettings.siteName", "Site Name")}</Label>
                    <Input
                      value={settings.siteName}
                      onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("adminSettings.approvalSettings", "Approval Settings")}</CardTitle>
                  <CardDescription>{t("adminSettings.controlWhatRequiresAdminApproval", "Control what requires admin approval")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t("adminSettings.requireTeacherApproval", "Require Teacher Approval")}</Label>
                      <p className="text-sm text-muted-foreground">{t("adminSettings.newTeachersNeedAdminApproval", "New teachers need admin approval")}</p>
                    </div>
                    <Switch
                      checked={settings.requireTeacherApproval}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, requireTeacherApproval: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t("adminSettings.requireCourseApproval", "Require Course Approval")}</Label>
                      <p className="text-sm text-muted-foreground">{t("adminSettings.newCoursesNeedAdminApproval", "New courses need admin approval")}</p>
                    </div>
                    <Switch
                      checked={settings.requireCourseApproval}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, requireCourseApproval: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("adminSettings.maintenance", "Maintenance")}</CardTitle>
                  <CardDescription>{t("adminSettings.platformMaintenanceMode", "Platform maintenance mode")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>{t("adminSettings.maintenanceMode", "Maintenance Mode")}</Label>
                      <p className="text-sm text-muted-foreground">{t("adminSettings.disablePublicAccess", "Disable public access")}</p>
                    </div>
                    <Switch
                      checked={settings.maintenanceMode}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, maintenanceMode: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Button
                onClick={saveSettings}
                disabled={saving}
                className="w-full bg-forest hover:bg-forest/90"
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? t("adminSettings.saving", "Saving...") : t("adminSettings.saveSettings", "Save Settings")}
              </Button>
            </div>
    </AppShell>
  );
};

export default AdminSettings;
