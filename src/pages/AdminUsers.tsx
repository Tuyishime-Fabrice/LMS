import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell/page";
import { AppShell } from "@/components/shell/AppShell";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Ban, CheckCircle, User } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  pricing_tier?: string;
  created_at: string;
  is_suspended: boolean;
  suspension_reason: string | null;
  teacher_approved: boolean;
  last_login: string | null;
}

const AdminUsers = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showSuspendDialog, setShowSuspendDialog] = useState(false);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, roleFilter, statusFilter]);

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
        toast.error(t("adminUsers.accessDenied", "Access denied"));
        navigate("/");
        return;
      }

      await fetchUsers();
    } catch (error: any) {
      console.error("Error:", error);
      navigate("/");
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc("get_all_profiles");

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error(t("adminUsers.failedToLoadUsers", "Failed to load users"));
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter === "active") {
      filtered = filtered.filter((user) => !user.is_suspended);
    } else if (statusFilter === "suspended") {
      filtered = filtered.filter((user) => user.is_suspended);
    }

    setFilteredUsers(filtered);
  };

  const handleSuspend = async () => {
    if (!selectedUser || !suspensionReason.trim()) {
      toast.error(t("adminUsers.pleaseProvideAReasonForSuspension", "Please provide a reason for suspension"));
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.rpc("suspend_user", {
        p_user_id: selectedUser.id,
        p_suspension_reason: suspensionReason
      });

      if (error) throw error;

      toast.success(`${selectedUser.full_name} has been suspended`);
      setShowSuspendDialog(false);
      setSelectedUser(null);
      setSuspensionReason("");
      fetchUsers();
    } catch (error: any) {
      console.error("Error suspending user:", error);
      toast.error(error.message || t("adminUsers.failedToSuspendUser", "Failed to suspend user"));
    } finally {
      setProcessing(false);
    }
  };

  const handleUnsuspend = async (user: UserProfile) => {
    setProcessing(true);
    try {
      const { error } = await supabase.rpc("unsuspend_user", {
        p_user_id: user.id
      });

      if (error) throw error;

      toast.success(`${user.full_name} has been unsuspended`);
      fetchUsers();
    } catch (error: any) {
      console.error("Error unsuspending user:", error);
      toast.error(error.message || t("adminUsers.failedToUnsuspendUser", "Failed to unsuspend user"));
    } finally {
      setProcessing(false);
    }
  };

  const updatePricingTier = async (userId: string, tier: string) => {
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("update_user_pricing_tier", {
        p_user_id: userId,
        p_pricing_tier: tier,
      });

      if (error) throw error;
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid update response");
      if (!data.success) throw new Error(String(data.error || "Update failed"));

      toast.success(t("adminUsers.pricingTierUpdated", "Pricing tier updated"));
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || t("adminUsers.failedToUpdatePricingTier", "Failed to update pricing tier"));
    } finally {
      setProcessing(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: "bg-leaf text-forest",
      teacher: "bg-info-surface text-info",
      student: "bg-leaf text-leaf-foreground",
    };
    return colors[role as keyof typeof colors] || "bg-muted text-forest";
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <AppShell role="admin" width="wide">
      <PageHeader
        title={t("adminUsers.userManagement", "User Management")}
        description={t("adminUsers.manageAllPlatformUsers", "Manage all platform users")}
        actions={<>
          <Badge variant="secondary" className="text-lg px-4 py-2">
                  {t("adminUsers.users", "{{count}} Users", { count: filteredUsers.length })}
                </Badge>
        </>}
      />

            <div className="space-y-6">
              {/* Filters */}
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      <Input
                        placeholder={t("adminUsers.searchUsers", "Search users...")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("adminUsers.filterByRole", "Filter by role")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("adminUsers.allRoles", "All Roles")}</SelectItem>
                        <SelectItem value="student">{t("adminUsers.students", "Students")}</SelectItem>
                        <SelectItem value="teacher">{t("adminUsers.teachers", "Teachers")}</SelectItem>
                        <SelectItem value="admin">{t("adminUsers.admins", "Admins")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder={t("adminUsers.filterByStatus", "Filter by status")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("adminUsers.allStatus", "All Status")}</SelectItem>
                        <SelectItem value="active">{t("adminUsers.active", "Active")}</SelectItem>
                        <SelectItem value="suspended">{t("adminUsers.suspended", "Suspended")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Users Table */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("adminUsers.user", "User")}</TableHead>
                        <TableHead>{t("adminUsers.role", "Role")}</TableHead>
                        <TableHead>{t("adminUsers.pricingTier", "Pricing tier")}</TableHead>
                        <TableHead>{t("adminUsers.status", "Status")}</TableHead>
                        <TableHead>{t("adminUsers.joined", "Joined")}</TableHead>
                        <TableHead>{t("adminUsers.actions", "Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                {user.avatar_url ? (
                                  <img src={user.avatar_url} alt={user.full_name} />
                                ) : (
                                  <AvatarFallback className="bg-forest text-white">
                                    {user.full_name?.substring(0, 2).toUpperCase() || "U"}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.full_name || t("adminUsers.unknown", "Unknown")}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleBadge(user.role)}>
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.role === "student" ? (
                              <Select
                                value={user.pricing_tier || "standard"}
                                onValueChange={(val) => updatePricingTier(user.id, val)}
                                disabled={processing}
                              >
                                <SelectTrigger className="h-8 w-36 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="standard">{t("adminUsers.standard", "Standard")}</SelectItem>
                                  <SelectItem value="student">{t("adminUsers.student", "Student")}</SelectItem>
                                  <SelectItem value="ngo">NGO</SelectItem>
                                  <SelectItem value="corporate">{t("adminUsers.corporate", "Corporate")}</SelectItem>
                                  <SelectItem value="partner">{t("adminUsers.partner", "Partner")}</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.is_suspended ? (
                              <Badge variant="destructive">{t("adminUsers.suspended", "Suspended")}</Badge>
                            ) : (
                              <Badge className="bg-leaf text-leaf-foreground">{t("adminUsers.active", "Active")}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {user.is_suspended ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnsuspend(user)}
                                disabled={processing}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {t("adminUsers.unsuspend", "Unsuspend")}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowSuspendDialog(true);
                                }}
                                disabled={processing || user.role === "admin"}
                              >
                                <Ban className="h-4 w-4 mr-1" />
                                {t("adminUsers.suspend", "Suspend")}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adminUsers.suspendUser", "Suspend User")}</DialogTitle>
            <DialogDescription>
              {t("adminUsers.suspendSAccount", "Suspend {{fullName}}'s account", { fullName: selectedUser?.full_name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("adminUsers.suspensionReason", "Suspension Reason")}</Label>
              <Textarea
                placeholder={t("adminUsers.explainWhyThisUserIsBeing", "Explain why this user is being suspended...")}
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
              {t("adminUsers.cancel", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={processing || !suspensionReason.trim()}
            >
              {t("adminUsers.suspendUser", "Suspend User")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

export default AdminUsers;
