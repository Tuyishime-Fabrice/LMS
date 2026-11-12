import { z } from "zod";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Bell, Plus, Trash2, Users, GraduationCap, UserCheck } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Announcement {
  id: string;
  title: string;
  message: string;
  target_audience: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export default function AdminAnnouncements() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [processing, setProcessing] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState<string>("all");

  useEffect(() => { checkAdminAccess(); }, []);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { toast.error("Access denied"); navigate("/"); return; }
      await fetchAnnouncements();
    } catch (error) { console.error("Error:", error); navigate("/"); }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) { console.error("Error:", error); toast.error("Failed to load announcements"); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) { toast.error("Please fill in all fields"); return; }
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("announcements").insert({ title: title.trim(), message: message.trim(), target_audience: z.enum(["all", "students", "teachers"]).parse(targetAudience), created_by: user?.id });
      if (error) throw error;
      toast.success("Announcement created!");
      setShowCreateDialog(false);
      setTitle(""); setMessage(""); setTargetAudience("all");
      fetchAnnouncements();
    } catch (error: any) { toast.error(error.message || "Failed to create"); }
    finally { setProcessing(false); }
  };

  const handleDelete = async () => {
    if (!selectedAnnouncement) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", selectedAnnouncement.id);
      if (error) throw error;
      toast.success("Announcement deleted");
      setShowDeleteDialog(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (error: any) { toast.error(error.message || "Failed to delete"); }
    finally { setProcessing(false); }
  };

  const toggleActive = async (announcement: Announcement) => {
    try {
      const { error } = await supabase.from("announcements").update({ is_active: !announcement.is_active }).eq("id", announcement.id);
      if (error) throw error;
      toast.success(announcement.is_active ? "Deactivated" : "Activated");
      fetchAnnouncements();
    } catch (error: any) { toast.error("Failed to update"); }
  };

  const getAudienceIcon = (audience: string) => {
    if (audience === "students") return <GraduationCap className="h-4 w-4" />;
    if (audience === "teachers") return <UserCheck className="h-4 w-4" />;
    return <Users className="h-4 w-4" />;
  };

  const getAudienceBadge = (audience: string) => {
    const colors = { students: "bg-blue-100 text-blue-800", teachers: "bg-purple-100 text-purple-800", all: "bg-green-100 text-green-800" };
    return <Badge className={colors[audience as keyof typeof colors] || "bg-gray-100"}>{audience}</Badge>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AdminSidebar />
        <div className="flex-1 flex flex-col p-4">
          <header className="bg-white rounded-2xl shadow mb-6">
            <div className="bg-gradient-to-r from-[#006d2c] to-[#008000] p-6 rounded-t-2xl">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-white" />
                  <div className="text-white"><h1 className="text-2xl font-bold">Announcements</h1><p className="text-sm opacity-90">Create and manage announcements</p></div>
                </div>
                <Button onClick={() => setShowCreateDialog(true)} className="bg-white text-[#006d2c] hover:bg-gray-100"><Plus className="h-4 w-4 mr-2" />New Announcement</Button>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardContent className="p-6 flex justify-between items-center"><div><p className="text-sm text-gray-600">Total</p><p className="text-3xl font-bold text-blue-600">{announcements.length}</p></div><Bell className="h-10 w-10 text-blue-500" /></CardContent></Card>
                <Card><CardContent className="p-6 flex justify-between items-center"><div><p className="text-sm text-gray-600">Active</p><p className="text-3xl font-bold text-green-600">{announcements.filter(a => a.is_active).length}</p></div><Bell className="h-10 w-10 text-green-500" /></CardContent></Card>
                <Card><CardContent className="p-6 flex justify-between items-center"><div><p className="text-sm text-gray-600">Inactive</p><p className="text-3xl font-bold text-gray-600">{announcements.filter(a => !a.is_active).length}</p></div><Bell className="h-10 w-10 text-gray-400" /></CardContent></Card>
              </div>
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Audience</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {announcements.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No announcements yet</TableCell></TableRow> : announcements.map(a => (
                      <TableRow key={a.id}>
                        <TableCell><p className="font-medium">{a.title}</p><p className="text-sm text-gray-500 line-clamp-1">{a.message}</p></TableCell>
                        <TableCell><div className="flex items-center gap-2">{getAudienceIcon(a.target_audience)}{getAudienceBadge(a.target_audience)}</div></TableCell>
                        <TableCell><Badge className={a.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>{a.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                        <TableCell className="text-sm text-gray-500">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => toggleActive(a)}>{a.is_active ? "Deactivate" : "Activate"}</Button>
                            <Button size="sm" variant="destructive" onClick={() => { setSelectedAnnouncement(a); setShowDeleteDialog(true); }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </div>
          </main>
        </div>
      </div>


      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Announcement</DialogTitle><DialogDescription>Send a message to students, teachers, or everyone</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Title</Label><Input placeholder="Announcement title..." value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>Message</Label><Textarea placeholder="Write your announcement..." value={message} onChange={(e) => setMessage(e.target.value)} rows={4} /></div>
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <Select value={targetAudience} onValueChange={setTargetAudience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all"><div className="flex items-center gap-2"><Users className="h-4 w-4" />Everyone</div></SelectItem>
                  <SelectItem value="students"><div className="flex items-center gap-2"><GraduationCap className="h-4 w-4" />Students Only</div></SelectItem>
                  <SelectItem value="teachers"><div className="flex items-center gap-2"><UserCheck className="h-4 w-4" />Teachers Only</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={processing || !title.trim() || !message.trim()} className="bg-[#006d2c] hover:bg-[#005523]">{processing ? "Creating..." : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Announcement</AlertDialogTitle><AlertDialogDescription>Are you sure? This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">{processing ? "Deleting..." : "Delete"}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
}
