import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Search, Ban, CheckCircle, Shield, User } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
        toast.error("Access denied");
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
      toast.error("Failed to load users");
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
      toast.error("Please provide a reason for suspension");
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
      toast.error(error.message || "Failed to suspend user");
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
      toast.error(error.message || "Failed to unsuspend user");
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

      toast.success("Pricing tier updated");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update pricing tier");
    } finally {
      setProcessing(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: "bg-purple-100 text-purple-800",
      teacher: "bg-blue-100 text-blue-800",
      student: "bg-green-100 text-green-800",
    };
    return colors[role as keyof typeof colors] || "bg-gray-100 text-gray-800";
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-white" />
                  <div className="text-white">
                    <h1 className="text-3xl font-bold mb-1">User Management</h1>
                    <p className="text-white/90 text-sm">Manage all platform users</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {filteredUsers.length} Users
                </Badge>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-2">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Filters */}
              <Card>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="student">Students</SelectItem>
                        <SelectItem value="teacher">Teachers</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
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
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Pricing tier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
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
                                  <AvatarFallback className="bg-purple-600 text-white">
                                    {user.full_name?.substring(0, 2).toUpperCase() || "U"}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.full_name || "Unknown"}</p>
                                <p className="text-sm text-gray-600">{user.email}</p>
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
                                  <SelectItem value="standard">Standard</SelectItem>
                                  <SelectItem value="student">Student</SelectItem>
                                  <SelectItem value="ngo">NGO</SelectItem>
                                  <SelectItem value="corporate">Corporate</SelectItem>
                                  <SelectItem value="partner">Partner</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.is_suspended ? (
                              <Badge variant="destructive">Suspended</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
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
                                Unsuspend
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
                                Suspend
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
          </main>
        </div>
      </div>

      {/* Suspend Dialog */}
      <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Suspend {selectedUser?.full_name}'s account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Suspension Reason</Label>
              <Textarea
                placeholder="Explain why this user is being suspended..."
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleSuspend}
              disabled={processing || !suspensionReason.trim()}
            >
              Suspend User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default AdminUsers;
