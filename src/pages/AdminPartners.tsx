import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
      toast.error("Failed to load partner requests");
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
      toast.error("Failed to update status");
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
      toast.success("Request deleted successfully");
      setDeleteDialogOpen(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error("Failed to delete request");
    }
  };

  const openViewDialog = (request: PartnerRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.admin_notes || "");
    setViewDialogOpen(true);
  };

  const getStatusBadge = (status: PartnerRequest["status"]) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      contacted: "bg-blue-100 text-blue-800 border-blue-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AdminSidebar />
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Partner Requests</h1>
              <p className="text-gray-600 mt-1">Manage partnership inquiries from the landing page</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <Card className="border-l-4 border-l-gray-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-100 rounded-xl">
                      <Handshake className="w-6 h-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-sm text-gray-600">Total Requests</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-yellow-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-yellow-100 rounded-xl">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.pending}</p>
                      <p className="text-sm text-gray-600">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-blue-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Mail className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.contacted}</p>
                      <p className="text-sm text-gray-600">Contacted</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-l-green-500">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.approved}</p>
                      <p className="text-sm text-gray-600">Approved</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Requests Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Partner Requests</CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-gray-100 rounded-lg">
                        <div className="w-10 h-10 bg-gray-300 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-300 rounded w-1/4" />
                          <div className="h-3 bg-gray-300 rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Handshake className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No partner requests</h3>
                    <p className="text-gray-600">Partner requests from the landing page will appear here</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.name}</p>
                              <p className="text-sm text-gray-500">{request.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span>{request.organization}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
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
                                className="text-red-600 hover:text-red-700"
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
        </main>
      </div>

      {/* View/Edit Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Partner Request Details</DialogTitle>
            <DialogDescription>
              Review and manage this partnership inquiry
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-6">
              {/* Contact Info */}
              <div className="bg-gradient-to-r from-[#006d2c]/10 to-green-50 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-[#006d2c] flex items-center justify-center text-white text-xl font-bold">
                    {selectedRequest.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedRequest.name}</h3>
                    <p className="text-sm text-gray-600">{selectedRequest.organization}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <a href={`mailto:${selectedRequest.email}`} className="text-blue-600 hover:underline">
                      {selectedRequest.email}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <a href={`tel:${selectedRequest.phone}`} className="text-blue-600 hover:underline">
                      {selectedRequest.phone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Message */}
              {selectedRequest.message && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Message</Label>
                  <p className="mt-1 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    {selectedRequest.message}
                  </p>
                </div>
              )}

              {/* Submitted Date */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                Submitted on {format(new Date(selectedRequest.created_at), "MMMM d, yyyy 'at' h:mm a")}
              </div>

              {/* Admin Notes */}
              <div className="space-y-2">
                <Label htmlFor="admin_notes">Admin Notes</Label>
                <Textarea
                  id="admin_notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                  rows={3}
                />
              </div>

              {/* Status Actions */}
              <div className="space-y-2">
                <Label>Update Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={() => updateStatus(selectedRequest.id, "contacted")}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Mark Contacted
                  </Button>
                  <Button
                    variant="outline"
                    className="border-green-200 text-green-700 hover:bg-green-50"
                    onClick={() => updateStatus(selectedRequest.id, "approved")}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                    onClick={() => updateStatus(selectedRequest.id, "rejected")}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    className="border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                    onClick={() => updateStatus(selectedRequest.id, "pending")}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Mark Pending
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
            <AlertDialogTitle>Delete Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this partner request from {selectedRequest?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default AdminPartners;
