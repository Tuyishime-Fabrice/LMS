import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Handshake, Mail, Phone, Building2, Clock, CheckCircle, XCircle, Eye, Trash2, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type PartnerRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  organization: string;
  message: string | null;
  status: "pending" | "contacted" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

const AdminPartners = () => {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PartnerRequest | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("partner_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast.error(t("adminPartners.failedToLoadPartnerRequests", "Failed to load partner requests"));
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: PartnerRequest["status"]) => {
    try {
      const { error } = await supabase
        .from("partner_requests")
        .update({ 
          status, 
          admin_notes: adminNotes || null,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Status updated to ${status}`);
      fetchRequests();
      setViewDialogOpen(false);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(t("adminPartners.failedToUpdateStatus", "Failed to update status"));
    }
  };

  const handleDelete = async () => {
    if (!selectedRequest) return;

    try {
      const { error } = await supabase
        .from("partner_requests")
        .delete()
        .eq("id", selectedRequest.id);

      if (error) throw error;
      toast.success(t("adminPartners.requestDeletedSuccessfully", "Request deleted successfully"));
      setDeleteDialogOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error(t("adminPartners.failedToDeleteRequest", "Failed to delete request"));
    }
  };

  const openViewDialog = (request: PartnerRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || "");
    setViewDialogOpen(true);
  };

  const getStatusBadge = (status: PartnerRequest["status"]) => {
    const styles = {
      pending: "bg-warning-surface text-warning border-warning/30",
      contacted: "bg-info-surface text-info border-info/30",
      approved: "bg-leaf text-leaf-foreground border-primary/30",
      rejected: "bg-destructive-surface text-destructive border-destructive/30",
    };
    return styles[status as keyof typeof styles] || styles.pending;
  };

  const filteredRequests = statusFilter === "all" 
    ? requests 
    : requests.filter(r => r.status === statusFilter);

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === "pending").length,
    contacted: requests.filter(r => r.status === "contacted").length,
    approved: requests.filter(r => r.status === "approved").length,
  };


  return (
    <AppShell role="admin" width="wide">
      

          <div>
      <PageHeader
        title={t("adminPartners.partnerRequests", "Partner Requests")}
        description={t("adminPartners.managePartnershipInquiriesFromTheLanding", "Manage partnership inquiries from the landing page")}
      />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="border-l-4 border-l-gray-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-xl">
                      <Handshake className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-sm text-muted-foreground">{t("adminPartners.totalRequests", "Total Requests")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-warning-surface rounded-xl">
                      <Clock className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.pending}</p>
                      <p className="text-sm text-muted-foreground">{t("adminPartners.pending", "Pending")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-info-surface rounded-xl">
                      <Mail className="w-6 h-6 text-info" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.contacted}</p>
                      <p className="text-sm text-muted-foreground">{t("adminPartners.contacted", "Contacted")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-leaf rounded-xl">
                      <CheckCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.approved}</p>
                      <p className="text-sm text-muted-foreground">{t("adminPartners.approved", "Approved")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Requests Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t("adminPartners.allPartnerRequests", "All Partner Requests")}</CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder={t("adminPartners.filterByStatus", "Filter by status")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("adminPartners.allStatus", "All Status")}</SelectItem>
                      <SelectItem value="pending">{t("adminPartners.pending", "Pending")}</SelectItem>
                      <SelectItem value="contacted">{t("adminPartners.contacted", "Contacted")}</SelectItem>
                      <SelectItem value="approved">{t("adminPartners.approved", "Approved")}</SelectItem>
                      <SelectItem value="rejected">{t("adminPartners.rejected", "Rejected")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-muted rounded-lg">
                        <div className="w-10 h-10 bg-border rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-border rounded w-1/4" />
                          <div className="h-3 bg-border rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Handshake className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-forest mb-2">{t("adminPartners.noPartnerRequests", "No partner requests")}</h3>
                    <p className="text-muted-foreground">{t("adminPartners.partnerRequestsFromTheLandingPage", "Partner requests from the landing page will appear here")}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("adminPartners.contact", "Contact")}</TableHead>
                        <TableHead>{t("adminPartners.organization", "Organization")}</TableHead>
                        <TableHead>{t("adminPartners.date", "Date")}</TableHead>
                        <TableHead>{t("adminPartners.status", "Status")}</TableHead>
                        <TableHead className="text-right">{t("adminPartners.actions", "Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.name}</p>
                              <p className="text-sm text-muted-foreground">{request.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-muted-foreground/60" />
                              <span>{request.organization}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(request.created_at), "MMM d, yyyy")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadge(request.status)}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openViewDialog(request)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
      {/* View/Edit Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("adminPartners.partnerRequestDetails", "Partner Request Details")}</DialogTitle>
            <DialogDescription>
              {t("adminPartners.reviewAndManageThisPartnershipInquiry", "Review and manage this partnership inquiry")}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold">
                    {selectedRequest.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedRequest.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedRequest.organization}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${selectedRequest.email}`} className="text-info hover:underline">
                      {selectedRequest.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${selectedRequest.phone}`} className="text-info hover:underline">
                      {selectedRequest.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Message */}
              {selectedRequest.message && (
                <div>
                  <Label className="text-sm font-medium text-foreground">{t("adminPartners.message", "Message")}</Label>
                  <p className="mt-1 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                    {selectedRequest.message}
                  </p>
                </div>
              )}

              {/* Submitted Date */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {t("adminPartners.submittedOn", "Submitted on")}{" "}{format(new Date(selectedRequest.created_at), "MMMM d, yyyy 'at' h:mm a")}
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label htmlFor="admin_notes">{t("adminPartners.adminNotes", "Admin Notes")}</Label>
                <Textarea
                  id="admin_notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={t("adminPartners.addNotesAboutThisRequest", "Add notes about this request...")}
                  rows={3}
                />
              </div>

              {/* Status Actions */}
              <div className="space-y-2">
                <Label>{t("adminPartners.updateStatus", "Update Status")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="border-info/30 text-info hover:bg-info-surface"
                    onClick={() => updateStatus(selectedRequest.id, "contacted")}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {t("adminPartners.markContacted", "Mark Contacted")}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-primary/30 text-primary hover:bg-leaf"
                    onClick={() => updateStatus(selectedRequest.id, "approved")}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t("adminPartners.approve", "Approve")}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive-surface"
                    onClick={() => updateStatus(selectedRequest.id, "rejected")}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {t("adminPartners.reject", "Reject")}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-warning/30 text-warning hover:bg-warning-surface"
                    onClick={() => updateStatus(selectedRequest.id, "pending")}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    {t("adminPartners.markPending", "Mark Pending")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminPartners.deleteRequest", "Delete Request")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminPartners.areYouSureYouWantTo", "Are you sure you want to delete this partner request from {{name}}? This action cannot be undone.", { name: selectedRequest?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("adminPartners.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t("adminPartners.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default AdminPartners;
