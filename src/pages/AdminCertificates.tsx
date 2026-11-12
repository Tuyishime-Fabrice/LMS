import { useEffect, useState, useRef } from "react";
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
import { Award, CheckCircle, Search, FileSpreadsheet, ExternalLink, Upload, Users, Clock, X } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as XLSX from "xlsx";

interface EnrolledStudent {
  enrollment_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  course_id: string;
  course_title: string;
  teacher_name: string;
  enrolled_at: string;
  certificate_id: string | null;
  certificate_status: string | null;
  certificate_url: string | null;
}

interface Course { id: string; title: string; }

export default function AdminCertificates() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<EnrolledStudent[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [processing, setProcessing] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);
  const [certificateUrl, setCertificateUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { checkAdminAccess(); }, []);
  useEffect(() => { filterStudents(); }, [students, searchQuery, selectedCourse, statusFilter]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") { toast.error("Access denied"); navigate("/"); return; }
      await fetchData();
    } catch (error) { console.error("Error:", error); navigate("/"); }
  };

  const fetchData = async () => {
    try {
      // Fetch ALL enrolled students with their course info
      const { data: enrollments, error: enrollError } = await supabase
        .from("course_enrollments")
        .select(`
          id,
          student_id,
          course_id,
          enrolled_at,
          profiles:student_id (
            full_name,
            email
          ),
          courses (
            title,
            teacher_id,
            profiles:teacher_id (
              full_name
            )
          )
        `)
        .order("enrolled_at", { ascending: false });

      if (enrollError) throw enrollError;

      // Fetch existing certificates
      const { data: certificates, error: certError } = await supabase
        .from("certificates")
        .select("id, student_id, course_id, certificate_url, status");

      if (certError) throw certError;

      // Create a certificate lookup map
      const certMap = new Map<string, any>();
      (certificates || []).forEach((cert: any) => {
        certMap.set(`${cert.student_id}-${cert.course_id}`, cert);
      });

      // Transform into flat list
      const studentList: EnrolledStudent[] = (enrollments || []).map((e: any) => {
        const cert = certMap.get(`${e.student_id}-${e.course_id}`);
        return {
          enrollment_id: e.id,
          student_id: e.student_id,
          student_name: e.profiles?.full_name || "Unknown",
          student_email: e.profiles?.email || "",
          course_id: e.course_id,
          course_title: (e.courses as any)?.title || "Unknown Course",
          teacher_name: (e.courses as any)?.profiles?.full_name || "Unknown",
          enrolled_at: e.enrolled_at,
          certificate_id: cert?.id || null,
          certificate_status: cert?.status || null,
          certificate_url: cert?.certificate_url || null,
        };
      });

      setStudents(studentList);

      const { data: coursesData } = await supabase.from("courses").select("id, title").order("title");
      setCourses(coursesData || []);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = students;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((s) =>
        s.student_name?.toLowerCase().includes(q) ||
        s.student_email?.toLowerCase().includes(q) ||
        s.course_title?.toLowerCase().includes(q)
      );
    }
    if (selectedCourse !== "all") filtered = filtered.filter((s) => s.course_id === selectedCourse);
    if (statusFilter === "none") filtered = filtered.filter((s) => !s.certificate_status);
    else if (statusFilter === "approved") filtered = filtered.filter((s) => s.certificate_status === "approved");
    setFilteredStudents(filtered);
  };

  const handleUploadClick = (student: EnrolledStudent) => {
    setSelectedStudent(student);
    setCertificateUrl(student.certificate_url || "");
    setNotes("");
    setUploadedFileName("");
    setShowUploadDialog(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedStudent) return;

    // Validate file type
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF or image file (PNG, JPG)");
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const fileName = `${selectedStudent.student_id}_${selectedStudent.course_id}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("certificates")
        .getPublicUrl(fileName);

      setCertificateUrl(publicUrl);
      setUploadedFileName(file.name);
      toast.success("Certificate uploaded!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleIssueCertificate = async () => {
    if (!selectedStudent || !certificateUrl.trim()) {
      toast.error("Please upload or provide a certificate URL");
      return;
    }
    setProcessing(true);
    try {
      if (selectedStudent.certificate_id) {
        // Update existing certificate
        const { error } = await supabase
          .from("certificates")
          .update({
            certificate_url: certificateUrl.trim(),
            status: "approved",
            approved_at: new Date().toISOString(),
            completion_date: new Date().toISOString(),
          })
          .eq("id", selectedStudent.certificate_id);
        if (error) throw error;
      } else {
        // Insert new certificate
        const { error } = await supabase
          .from("certificates")
          .insert({
            student_id: selectedStudent.student_id,
            course_id: selectedStudent.course_id,
            certificate_url: certificateUrl.trim(),
            status: "approved",
            approved_at: new Date().toISOString(),
            completion_date: new Date().toISOString(),
          });
        if (error) throw error;
      }

      toast.success("Certificate issued successfully!");
      setShowUploadDialog(false);
      setSelectedStudent(null);
      setCertificateUrl("");
      setNotes("");
      setUploadedFileName("");
      fetchData();
    } catch (error: any) {
      console.error("Error:", error);
      toast.error(error.message || "Failed to issue certificate");
    } finally {
      setProcessing(false);
    }
  };

  const exportToExcel = () => {
    const data = filteredStudents.map((s) => ({
      "Student": s.student_name,
      "Email": s.student_email,
      "Course": s.course_title,
      "Teacher": s.teacher_name,
      "Enrolled": s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString() : "",
      "Certificate Status": s.certificate_status || "Not Issued",
      "Certificate URL": s.certificate_url || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "students_certificates.xlsx");
    toast.success("Exported!");
  };

  if (loading) return <LoadingSpinner />;

  const totalStudents = students.length;
  const issuedCount = students.filter((s) => s.certificate_status === "approved").length;
  const pendingCount = totalStudents - issuedCount;

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
                  <div className="text-white">
                    <h1 className="text-2xl font-bold">Certificate Management</h1>
                    <p className="text-sm opacity-90">View all students and issue certificates</p>
                  </div>
                </div>
                <Button onClick={exportToExcel} className="bg-white text-[#006d2c]" disabled={!filteredStudents.length}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />Export
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Total Students</p>
                      <p className="text-3xl font-bold text-blue-600">{totalStudents}</p>
                    </div>
                    <Users className="h-10 w-10 text-blue-500" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Not Issued</p>
                      <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
                    </div>
                    <Clock className="h-10 w-10 text-orange-500" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Certificates Issued</p>
                      <p className="text-3xl font-bold text-green-600">{issuedCount}</p>
                    </div>
                    <CheckCircle className="h-10 w-10 text-green-500" />
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input placeholder="Search student or course..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                    <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                      <SelectTrigger><SelectValue placeholder="All Courses" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger><SelectValue placeholder="All Status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="none">Not Issued</SelectItem>
                        <SelectItem value="approved">Issued</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Students Table */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Enrolled</TableHead>
                        <TableHead>Certificate</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!filteredStudents.length ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                            No students found
                          </TableCell>
                        </TableRow>
                      ) : filteredStudents.map((s) => (
                        <TableRow key={s.enrollment_id}>
                          <TableCell>
                            <p className="font-medium">{s.student_name}</p>
                            <p className="text-sm text-gray-500">{s.student_email}</p>
                          </TableCell>
                          <TableCell>
                            <p className="font-medium text-sm">{s.course_title}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-600">{s.teacher_name}</p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-gray-500">
                              {s.enrolled_at ? new Date(s.enrolled_at).toLocaleDateString() : "-"}
                            </p>
                          </TableCell>
                          <TableCell>
                            {s.certificate_status === "approved" ? (
                              <div className="flex items-center gap-2">
                                <Badge className="bg-green-100 text-green-800">Issued</Badge>
                                {s.certificate_url && (
                                  <a href={s.certificate_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-600">Not Issued</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => handleUploadClick(s)}
                              className={s.certificate_status === "approved" ? "bg-blue-600 hover:bg-blue-700" : "bg-[#006d2c] hover:bg-[#005522]"}
                            >
                              <Upload className="h-4 w-4 mr-1" />
                              {s.certificate_status === "approved" ? "Update" : "Issue"}
                            </Button>
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

      {/* Upload Certificate Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-[#006d2c]" />
              Issue Certificate
            </DialogTitle>
            <DialogDescription>
              Upload a certificate for <strong>{selectedStudent?.student_name}</strong> in <strong>{selectedStudent?.course_title}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Student Info */}
            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Student:</span>
                <span className="font-medium">{selectedStudent?.student_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Email:</span>
                <span className="font-medium">{selectedStudent?.student_email}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Course:</span>
                <span className="font-medium">{selectedStudent?.course_title}</span>
              </div>
            </div>

            {/* File Upload */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Upload Certificate (PDF/Image)</Label>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-[#006d2c] hover:bg-green-50/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {uploading ? (
                  <div className="text-sm text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#006d2c] mx-auto mb-2" />
                    Uploading...
                  </div>
                ) : uploadedFileName ? (
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">{uploadedFileName}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setUploadedFileName(""); setCertificateUrl(""); }}
                      className="ml-1 text-gray-400 hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload certificate file</p>
                    <p className="text-xs text-gray-400 mt-1">PDF, PNG, or JPG (max 10MB)</p>
                  </>
                )}
              </div>
            </div>

            {/* OR separator */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-400">OR paste URL</span>
              </div>
            </div>

            {/* URL Input */}
            <div>
              <Label className="text-sm font-medium">Certificate URL</Label>
              <Input
                placeholder="https://..."
                value={certificateUrl}
                onChange={(e) => setCertificateUrl(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Notes */}
            <div>
              <Label className="text-sm font-medium">Notes (Optional)</Label>
              <Textarea
                placeholder="Any notes about this certificate..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
            <Button
              onClick={handleIssueCertificate}
              disabled={processing || !certificateUrl.trim() || uploading}
              className="bg-[#006d2c] hover:bg-[#005522]"
            >
              {processing ? "Issuing..." : selectedStudent?.certificate_status === "approved" ? "Update Certificate" : "Issue Certificate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
