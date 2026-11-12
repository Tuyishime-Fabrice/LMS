import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Download, Share2, Calendar, CheckCircle2, Eye, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/StudentSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface Certificate {
  id: string;
  course_id: string;
  course_title: string;
  completion_date: string;
  grade: string;
  instructor_name: string;
  certificate_url: string;
  status: string;
  approved_at: string;
}

const StudentCertificates = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchCertificates();
    }
  }, [profile]);

  const fetchCertificates = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Fetch approved certificates for the student
      const { data, error } = await supabase
        .from("certificates")
        .select(`
          id,
          course_id,
          certificate_url,
          status,
          completion_date,
          grade,
          approved_at,
          courses:course_id (
            title,
            profiles:teacher_id (
              full_name
            )
          )
        `)
        .eq("student_id", user.id)
        .eq("status", "approved")
        .order("approved_at", { ascending: false });

      if (error) throw error;

      // Transform data to match Certificate interface
      const transformedCertificates: Certificate[] = (data || []).map((cert: any) => ({
        id: cert.id,
        course_id: cert.course_id,
        course_title: cert.courses?.title || "Unknown Course",
        completion_date: cert.completion_date,
        grade: cert.grade || "N/A",
        instructor_name: cert.courses?.profiles?.full_name || "Unknown Instructor",
        certificate_url: cert.certificate_url,
        status: cert.status,
        approved_at: cert.approved_at
      }));

      setCertificates(transformedCertificates);
    } catch (error: any) {
      console.error("Error fetching certificates:", error);
      toast.error(t('certificates.failedToLoad'));
    }
  };

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (profileData.role !== "student") {
        navigate("/teacher/dashboard");
        return;
      }

      setProfile(profileData);
    } catch (error: any) {
      toast.error(error.message);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certificate: Certificate) => {
    if (!certificate.certificate_url) {
      toast.error(t('certificates.certificateUrlNotAvailable'));
      return;
    }
    setDownloading(certificate.id);
    try {
      const response = await fetch(certificate.certificate_url);
      const blob = await response.blob();
      const ext = certificate.certificate_url.split('.').pop()?.split('?')[0] || 'pdf';
      const safeTitle = certificate.course_title.replace(/[^a-z0-9]/gi, '_');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Certificate_${safeTitle}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Certificate downloaded");
    } catch (error) {
      console.error("Download failed:", error);
      window.open(certificate.certificate_url, '_blank');
    } finally {
      setDownloading(null);
    }
  };

  const isPdf = (url: string) => url.toLowerCase().includes('.pdf');

  const handleShare = (certificate: Certificate) => {
    if (certificate.certificate_url) {
      navigator.clipboard.writeText(certificate.certificate_url);
      toast.success(t('certificates.certificateLinkCopied'));
    } else {
      toast.error(t('certificates.certificateUrlNotAvailable'));
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <StudentSidebar />

        <div className="flex-1 flex flex-col">
          <header className="border-b bg-white px-6 py-4 rounded-2xl shadow-lg mx-4 mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{t('certificates.myCertificates')}</h1>
                  <p className="text-sm text-gray-600">{t('certificates.viewDownload')}</p>
                </div>
              </div>
              <Avatar className="h-12 w-12 rounded-full shadow-lg border-2 border-white">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.full_name} className="object-cover" />
                ) : (
                  <AvatarFallback className="bg-[#006d2c] text-white">
                    {profile?.full_name?.charAt(0) || 'S'}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="border-2 border-[#006d2c]/20 bg-gradient-to-br from-green-50 to-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{t('certificates.totalCertificates')}</p>
                        <p className="text-3xl font-bold text-[#006d2c]">{certificates.length}</p>
                      </div>
                      <div className="w-14 h-14 rounded-full bg-[#006d2c]/10 flex items-center justify-center">
                        <Award className="h-7 w-7 text-[#006d2c]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{t('certificates.coursesCompleted')}</p>
                        <p className="text-3xl font-bold text-blue-600">{certificates.length}</p>
                      </div>
                      <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                        <CheckCircle2 className="h-7 w-7 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Certificates Grid */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{t('certificates.yourCertificates')}</h2>
                  {certificates.length > 0 && (
                    <Badge className="bg-[#006d2c] text-white">
                      {certificates.length} {certificates.length === 1 ? t('certificates.certificate') : t('certificates.certificatesPlural')}
                    </Badge>
                  )}
                </div>

                {certificates.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {certificates.map((cert) => {
                      const completionDate = new Date(cert.completion_date);
                      const formattedDate = completionDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      });

                      return (
                        <Card
                          key={cert.id}
                          onClick={() => setPreviewCert(cert)}
                          className="group relative overflow-hidden border border-gray-200 hover:border-[#006d2c] transition-all duration-300 hover:shadow-xl cursor-pointer bg-white"
                        >
                          {/* Certificate Preview Header — clean ivory + emerald accent */}
                          <div className="relative h-40 bg-[#fdfcf7] border-b border-gray-200 flex items-center justify-center overflow-hidden">
                            {/* subtle corner ornaments */}
                            <div className="absolute top-3 left-3 w-10 h-10 border-t-2 border-l-2 border-[#006d2c]/40" />
                            <div className="absolute top-3 right-3 w-10 h-10 border-t-2 border-r-2 border-[#006d2c]/40" />
                            <div className="absolute bottom-3 left-3 w-10 h-10 border-b-2 border-l-2 border-[#006d2c]/40" />
                            <div className="absolute bottom-3 right-3 w-10 h-10 border-b-2 border-r-2 border-[#006d2c]/40" />

                            <div className="relative text-center">
                              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#006d2c]/10 mb-2">
                                <Award className="h-8 w-8 text-[#006d2c]" />
                              </div>
                              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 font-semibold">
                                Certificate of Completion
                              </p>
                            </div>

                            {/* hover preview hint */}
                            <div className="absolute inset-0 bg-[#006d2c]/0 group-hover:bg-[#006d2c]/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <div className="bg-white px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 text-sm font-medium text-[#006d2c]">
                                <Eye className="h-4 w-4" />
                                Click to preview
                              </div>
                            </div>
                          </div>

                          {/* Certificate Content */}
                          <CardContent className="p-6">
                            <div className="mb-4">
                              <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-2">
                                {cert.course_title}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Instructor: <span className="font-medium text-gray-800">{cert.instructor_name}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-3 mb-4 text-sm">
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Calendar className="h-4 w-4 text-[#006d2c]" />
                                <span>{formattedDate}</span>
                              </div>
                              <Badge variant="secondary" className="bg-[#006d2c]/10 text-[#006d2c] border-0">
                                Grade: {cert.grade}
                              </Badge>
                            </div>

                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                onClick={() => setPreviewCert(cert)}
                                className="flex-1 bg-[#006d2c] hover:bg-[#005523] text-white"
                                size="sm"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </Button>
                              <Button
                                onClick={() => handleDownload(cert)}
                                disabled={downloading === cert.id}
                                variant="outline"
                                className="flex-1 border-[#006d2c] text-[#006d2c] hover:bg-[#006d2c]/10"
                                size="sm"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                {downloading === cert.id ? "..." : "Download"}
                              </Button>
                              <Button
                                onClick={() => handleShare(cert)}
                                variant="outline"
                                size="sm"
                                className="border-gray-300"
                                aria-label="Share"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>

                          {/* Verified Badge */}
                          <div className="absolute top-4 right-4">
                            <div className="w-10 h-10 rounded-full bg-[#006d2c] flex items-center justify-center shadow-md ring-2 ring-white">
                              <CheckCircle2 className="h-5 w-5 text-white" />
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="border-2 border-dashed border-gray-300 bg-white">
                    <CardContent className="py-16 text-center">
                      <div className="mb-6">
                        <img
                          src="/images/certificate.png"
                          alt="Certificate illustration"
                          className="w-64 h-64 mx-auto object-contain opacity-90"
                        />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('certificates.noCertificate')}</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        {t('certificates.takeCourse')}
                      </p>
                      <Button
                        onClick={() => navigate("/student/dashboard")}
                        className="bg-[#006d2c] hover:bg-[#005523] text-white"
                      >
                        {t('slider.browseCourses')}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Info Card */}
              <Card className="bg-gradient-to-r from-[#006d2c]/5 to-blue-50 border-[#006d2c]/20">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#006d2c]/10 flex items-center justify-center flex-shrink-0">
                      <Award className="h-6 w-6 text-[#006d2c]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-2">{t('certificates.aboutCertificates')}</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {t('certificates.aboutCertificatesDesc')}
                      </p>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#006d2c]" />
                          {t('certificates.verifiedAuthenticated')}
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#006d2c]" />
                          {t('certificates.shareableSocial')}
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#006d2c]" />
                          {t('certificates.downloadablePDF')}
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      {/* Certificate Preview Dialog */}
      <Dialog open={!!previewCert} onOpenChange={(open) => !open && setPreviewCert(null)}>
        <DialogContent className="max-w-4xl w-[95vw] max-h-[95vh] p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-[#006d2c] to-[#008c3a] text-white">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Award className="h-6 w-6 flex-shrink-0" />
                <div className="min-w-0">
                  <DialogTitle className="text-white text-base truncate">
                    {previewCert?.course_title}
                  </DialogTitle>
                  <p className="text-xs text-white/80 truncate">
                    Instructor: {previewCert?.instructor_name}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button
                  onClick={() => previewCert && handleDownload(previewCert)}
                  disabled={!previewCert || downloading === previewCert.id}
                  size="sm"
                  className="bg-white text-[#006d2c] hover:bg-gray-100"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  {previewCert && downloading === previewCert.id ? "Downloading..." : "Download"}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="bg-gray-100 overflow-auto" style={{ height: "75vh" }}>
            {previewCert?.certificate_url ? (
              isPdf(previewCert.certificate_url) ? (
                <iframe
                  src={previewCert.certificate_url}
                  className="w-full h-full border-0"
                  title="Certificate preview"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img
                    src={previewCert.certificate_url}
                    alt="Certificate"
                    className="max-w-full max-h-full object-contain shadow-2xl"
                  />
                </div>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                <FileText className="h-16 w-16 mb-3 opacity-30" />
                <p>Certificate file not available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default StudentCertificates;
