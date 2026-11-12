import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell/page";
import { AppShell } from "@/components/shell/AppShell";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, User, Activity } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: any;
  created_at: string;
  user_full_name: string | null;
  user_email: string | null;
}

const AdminLogs = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchQuery, actionFilter]);

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
        toast.error(t("adminLogs.accessDenied", "Access denied"));
        navigate("/");
        return;
      }

      await fetchLogs();
    } catch (error: any) {
      console.error("Error:", error);
      navigate("/");
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase.rpc("get_activity_logs", {
        p_limit: 100,
        p_offset: 0
      });

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error fetching logs:", error);
      toast.error(t("adminLogs.failedToLoadActivityLogs", "Failed to load activity logs"));
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user_full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.user_email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    setFilteredLogs(filtered);
  };

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      teacher_approved: "bg-leaf text-leaf-foreground",
      teacher_rejected: "bg-destructive-surface text-destructive",
      user_suspended: "bg-warning-surface text-warning",
      user_unsuspended: "bg-info-surface text-info",
      course_approved: "bg-leaf text-leaf-foreground",
      course_rejected: "bg-destructive-surface text-destructive",
    };
    return colors[action] || "bg-muted text-forest";
  };

  const uniqueActions = [...new Set(logs.map((log) => log.action))];

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <AppShell role="admin" width="wide">
      <PageHeader
        title={t("adminLogs.activityLogs", "Activity Logs")}
        description={t("adminLogs.trackAllSystemActivities", "Track all system activities")}
        actions={<>
          <Badge variant="secondary" className="text-lg px-4 py-2">
                  {t("adminLogs.logs", "{{count}} Logs", { count: filteredLogs.length })}
                </Badge>
        </>}
      />

            <div className="space-y-6">
              {/* Filters */}
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        placeholder={t("adminLogs.searchLogs", "Search logs...")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={actionFilter} onValueChange={setActionFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("adminLogs.filterByAction", "Filter by action")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("adminLogs.allActions", "All Actions")}</SelectItem>
                        {uniqueActions.map((action) => (
                          <SelectItem key={action} value={action}>
                            {action.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Logs Table */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("adminLogs.action", "Action")}</TableHead>
                        <TableHead>{t("adminLogs.user", "User")}</TableHead>
                        <TableHead>{t("adminLogs.entity", "Entity")}</TableHead>
                        <TableHead>{t("adminLogs.date", "Date")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <Badge className={getActionBadge(log.action)}>
                              {log.action.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{log.user_full_name || t("adminLogs.system", "System")}</p>
                              <p className="text-sm text-muted-foreground">{log.user_email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.entity_type && (
                              <span className="text-sm text-muted-foreground">
                                {log.entity_type}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
    </AppShell>
  );
};

export default AdminLogs;
