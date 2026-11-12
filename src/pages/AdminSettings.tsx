import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Settings, Save } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

const AdminSettings = () => {
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
        toast.error("Access denied");
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

      toast.success("Settings saved successfully");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <AdminSidebar />

        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <header className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100 mb-6">
            <div className="bg-gradient-to-r from-[#006d2c] to-[#008000] p-6 rounded-t-3xl">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-white" />
                <div className="text-white">
                  <h1 className="text-3xl font-bold mb-1">System Settings</h1>
                  <p className="text-white/90 text-sm">Configure platform settings</p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-2">
            <div className="max-w-4xl mx-auto space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>General Settings</CardTitle>
                  <CardDescription>Basic platform configuration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Site Name</Label>
                    <Input
                      value={settings.siteName}
                      onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Approval Settings</CardTitle>
                  <CardDescription>Control what requires admin approval</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Teacher Approval</Label>
                      <p className="text-sm text-gray-600">New teachers need admin approval</p>
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
                      <Label>Require Course Approval</Label>
                      <p className="text-sm text-gray-600">New courses need admin approval</p>
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
                  <CardTitle>Maintenance</CardTitle>
                  <CardDescription>Platform maintenance mode</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Maintenance Mode</Label>
                      <p className="text-sm text-gray-600">Disable public access</p>
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
                className="w-full bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminSettings;
