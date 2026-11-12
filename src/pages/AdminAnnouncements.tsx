import { z } from "zod";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell/page";
import { AppShell } from "@/components/shell/AppShell";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const { t } = useTranslation();
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
      if (profile?.role !== "admin") { toast.error(t("adminAnnouncements.accessDenied", "Access denied")); navigate("/"); return; }
      await fetchAnnouncements();
    } catch (error) { console.error("Error:", error); navigate("/"); }
  };

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) { console.error("Error:", error); toast.error(t("adminAnnouncements.failedToLoadAnnouncements", "Failed to load announcements")); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) { toast.error(t("adminAnnouncements.pleaseFillInAllFields", "Please fill in all fields")); return; }
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("announcements").insert({ title: title.trim(), message: message.trim(), target_audience: z.enum(["all", "students", "teachers"]).parse(targetAudience), created_by: user?.id });
      if (error) throw error;
      toast.success(t("adminAnnouncements.announcementCreated", "Announcement created!"));
      setShowCreateDialog(false);
      setTitle(""); setMessage(""); setTargetAudience("all");
      fetchAnnouncements();
    } catch (error: any) { toast.error(error.message || t("adminAnnouncements.failedToCreate", "Failed to create")); }
    finally { setProcessing(false); }
  };

  const handleDelete = async () => {
    if (!selectedAnnouncement) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from("announcements").delete().eq("id", selectedAnnouncement.id);
      if (error) throw error;
      toast.success(t("adminAnnouncements.announcementDeleted", "Announcement deleted"));
      setShowDeleteDialog(false);
      setSelectedAnnouncement(null);
      fetchAnnouncements();
    } catch (error: any) { toast.error(error.message || t("adminAnnouncements.failedToDelete", "Failed to delete")); }
    finally { setProcessing(false); }
  };

  const toggleActive = async (announcement: Announcement) => {
    try {
      const { error } = await supabase.from("announcements").update({ is_active: !announcement.is_active }).eq("id", announcement.id);
      if (error) throw error;
      toast.success(announcement.is_active ? "Deactivated" : "Activated");
      fetchAnnouncements();
    } catch (error: any) { toast.error(t("adminAnnouncements.failedToUpdate", "Failed to update")); }
  };

  const getAudienceIcon = (audience: string) => {
    if (audience === "students") return <GraduationCap className="h-4 w-4" />;
    if (audience === "teachers") return <UserCheck className="h-4 w-4" />;
    return <Users className="h-4 w-4" />;
  };

  const getAudienceBadge = (audience: string) => {
    const colors = { students: "bg-info-surface text-info", teachers: "bg-leaf text-forest", all: "bg-leaf text-leaf-foreground" };
    return <Badge className={colors[audience as keyof typeof colors] || "bg-muted"}>{audience}</Badge>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <AppShell role="admin" width="wide">
      <PageHeader
        title={t("adminAnnouncements.announcements", "Announcements")}
        actions={<>
          <p className="text-sm opacity-90">{t("adminAnnouncements.createAndManageAnnouncements", "Create and manage announcements")}</p>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-card text-primary hover:bg-muted"><Plus className="h-4 w-4 mr-2" />{t("adminAnnouncements.newAnnouncement", "New Announcement")}</Button>
        </>}
      />

            <div className="max-w-5xl mx-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card><CardContent className="p-6 flex justify-between items-center"><div><p className="text-sm text-muted-foreground">{t("adminAnnouncements.total", "Total")}</p><p className="text-3xl font-bold text-info">{announcements.length}</p></div><Bell className="h-10 w-10 text-info" /></CardContent></Card>
                <Card><CardContent className="p-6 flex justify-between items-center"><div><p className="text-sm text-muted-foreground">{t("adminAnnouncements.active", "Active")}</p><p className="text-3xl font-bold text-primary">{announcements.filter(a => a.is_active).length}</p></div><Bell className="h-10 w-10 text-primary" /></CardContent></Card>
                <Card><CardContent className="p-6 flex justify-between items-center"><div><p className="text-sm text-muted-foreground">{t("adminAnnouncements.inactive", "Inactive")}</p><p className="text-3xl font-bold text-muted-foreground">{announcements.filter(a => !a.is_active).length}</p></div><Bell className="h-10 w-10 text-muted-foreground/60" /></CardContent></Card>
              </div>
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>{t("adminAnnouncements.title", "Title")}</TableHead><TableHead>{t("adminAnnouncements.audience", "Audience")}</TableHead><TableHead>{t("adminAnnouncements.status", "Status")}</TableHead><TableHead>{t("adminAnnouncements.created", "Created")}</TableHead><TableHead>{t("adminAnnouncements.actions", "Actions")}</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {announcements.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t("adminAnnouncements.noAnnouncementsYet", "No announcements yet")}</TableCell></TableRow> : announcements.map(a => (
                      <TableRow key={a.id}>
                        <TableCell><p className="font-medium">{a.title}</p><p className="text-sm text-muted-foreground line-clamp-1">{a.message}</p></TableCell>
                        <TableCell><div className="flex items-center gap-2">{getAudienceIcon(a.target_audience)}{getAudienceBadge(a.target_audience)}</div></TableCell>
                        <TableCell><Badge className={a.is_active ? "bg-leaf text-leaf-foreground" : "bg-muted text-forest"}>{a.is_active ? t("adminAnnouncements.active", "Active") : t("adminAnnouncements.inactive", "Inactive")}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(a.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => toggleActive(a)}>{a.is_active ? t("adminAnnouncements.deactivate", "Deactivate") : t("adminAnnouncements.activate", "Activate")}</Button>
                            <Button size="sm" variant="destructive" onClick={() => { setSelectedAnnouncement(a); setShowDeleteDialog(true); }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </div>
      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t("adminAnnouncements.createAnnouncement", "Create Announcement")}</DialogTitle><DialogDescription>{t("adminAnnouncements.sendAMessageToStudentsTeachers", "Send a message to students, teachers, or everyone")}</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>{t("adminAnnouncements.title", "Title")}</Label><Input placeholder={t("adminAnnouncements.announcementTitle", "Announcement title...")} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="space-y-2"><Label>{t("adminAnnouncements.message", "Message")}</Label><Textarea placeholder={t("adminAnnouncements.writeYourAnnouncement", "Write your announcement...")} value={message} onChange={(e) => setMessage(e.target.value)} rows={4} /></div>
            <div className="space-y-2">
              <Label>{t("adminAnnouncements.targetAudience", "Target Audience")}</Label>
              <Select value={targetAudience} onValueChange={setTargetAudience}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all"><div className="flex items-center gap-2"><Users className="h-4 w-4" />{t("adminAnnouncements.everyone", "Everyone")}</div></SelectItem>
                  <SelectItem value="students"><div className="flex items-center gap-2"><GraduationCap className="h-4 w-4" />{t("adminAnnouncements.studentsOnly", "Students Only")}</div></SelectItem>
                  <SelectItem value="teachers"><div className="flex items-center gap-2"><UserCheck className="h-4 w-4" />{t("adminAnnouncements.teachersOnly", "Teachers Only")}</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t("adminAnnouncements.cancel", "Cancel")}</Button>
            <Button onClick={handleCreate} disabled={processing || !title.trim() || !message.trim()} className="bg-primary hover:bg-primary-hover">{processing ? t("adminAnnouncements.creating", "Creating...") : t("adminAnnouncements.create", "Create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>{t("adminAnnouncements.deleteAnnouncement", "Delete Announcement")}</AlertDialogTitle><AlertDialogDescription>{t("adminAnnouncements.areYouSureThisCannotBe", "Are you sure? This cannot be undone.")}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>{t("adminAnnouncements.cancel", "Cancel")}</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">{processing ? t("adminAnnouncements.deleting", "Deleting...") : t("adminAnnouncements.delete", "Delete")}</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
