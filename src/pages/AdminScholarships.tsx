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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle, XCircle } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";

interface Application {
    id: string;
    course_id: string;
    student_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    motivation: string;
    status: string;
    scholarship_level: string | null;
    generated_code: string | null;
    created_at: string;
    course_title?: string;
}

export default function AdminScholarships() {
  const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [accessChecked, setAccessChecked] = useState(false);
    const [applications, setApplications] = useState<Application[]>([]);
    const [filter, setFilter] = useState("pending");
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        checkAdminAccess();
    }, []);

    const checkAdminAccess = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            navigate("/auth");
            return;
        }
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
        if (profile?.role !== "admin") {
            toast.error(t("adminScholarships.accessDenied", "Access denied"));
            navigate("/");
            return;
        }
        setAccessChecked(true);
        await fetchApplications();
    };

    const fetchApplications = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("scholarship_applications")
                .select("*")
                .order("created_at", { ascending: false });

            if (filter !== "all") {
                query = query.eq("status", z.enum(["pending", "approved", "rejected", "redeemed"]).parse(filter));
            }

            const { data, error } = await query;
            if (error) throw error;

            const enriched: Application[] = [];
            for (const app of data || []) {
                const { data: course } = await supabase
                    .from("courses")
                    .select("title")
                    .eq("id", app.course_id)
                    .maybeSingle();
                enriched.push({ ...app, course_title: course?.title });
            }
            setApplications(enriched);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (accessChecked) fetchApplications();
    }, [filter, accessChecked]);

    const approve = async (app: Application, level: "full" | "partial" | "reduced") => {
        setProcessingId(app.id);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase.rpc("approve_scholarship_application", {
                p_application_id: app.id,
                p_admin_id: user.id,
                p_scholarship_level: level,
                p_discount_percent: level === "full" ? 100 : level === "partial" ? 50 : null,
                p_discount_fixed: level === "reduced" ? 20000 : null,
            });

            if (error) throw error;
            if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid approval response");
            if (!data.success) throw new Error(String(data.error || "Approval failed"));

            toast.success(`Approved — code: ${data.code}`);
            fetchApplications();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const reject = async (app: Application) => {
        setProcessingId(app.id);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase.rpc("reject_scholarship_application", {
                p_application_id: app.id,
                p_admin_id: user.id,
            });

            if (error) throw error;
            if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid rejection response");
            if (!data.success) throw new Error(String(data.error || "Rejection failed"));

            toast.success(t("adminScholarships.applicationRejected", "Application rejected"));
            fetchApplications();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setProcessingId(null);
        }
    };

    if (!accessChecked) return <LoadingSpinner />;

    return (
        <AppShell role="admin" width="wide">
      <PageHeader
        title={t("adminScholarships.scholarshipApplications", "Scholarship Applications")}
        description={t("adminScholarships.reviewApplicationsAndIssueScholarshipCodes", "Review applications and issue scholarship codes")}
        actions={<>
          <Select value={filter} onValueChange={setFilter}>
                                    <SelectTrigger className="w-40 bg-card">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">{t("adminScholarships.pending", "Pending")}</SelectItem>
                                        <SelectItem value="approved">{t("adminScholarships.approved", "Approved")}</SelectItem>
                                        <SelectItem value="redeemed">{t("adminScholarships.redeemed", "Redeemed")}</SelectItem>
                                        <SelectItem value="rejected">{t("adminScholarships.rejected", "Rejected")}</SelectItem>
                                        <SelectItem value="all">{t("adminScholarships.all", "All")}</SelectItem>
                                    </SelectContent>
                                </Select>
        </>}
      />

                        <div className="space-y-6">

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("adminScholarships.applicant", "Applicant")}</TableHead>
                                <TableHead>{t("adminScholarships.course", "Course")}</TableHead>
                                <TableHead>{t("adminScholarships.status", "Status")}</TableHead>
                                <TableHead>{t("adminScholarships.code", "Code")}</TableHead>
                                <TableHead>{t("adminScholarships.actions", "Actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">{t("adminScholarships.loading", "Loading...")}</TableCell>
                                </TableRow>
                            ) : applications.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        {t("adminScholarships.noApplicationsFound", "No applications found")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                applications.map((app) => (
                                    <TableRow key={app.id}>
                                        <TableCell>
                                            <div className="font-medium">{app.full_name}</div>
                                            <div className="text-xs text-muted-foreground">{app.email}</div>
                                        </TableCell>
                                        <TableCell className="text-sm">{app.course_title}</TableCell>
                                        <TableCell>
                                            <Badge variant={app.status === "pending" ? "secondary" : "default"}>
                                                {app.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {app.generated_code ? (
                                                <code className="text-xs bg-leaf px-2 py-1 rounded">{app.generated_code}</code>
                                            ) : "—"}
                                        </TableCell>
                                        <TableCell>
                                            {app.status === "pending" && (
                                                <div className="flex flex-wrap gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={processingId === app.id}
                                                        onClick={() => approve(app, "full")}
                                                    >
                                                        <CheckCircle className="h-3 w-3 mr-1" /> 100%
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={processingId === app.id}
                                                        onClick={() => approve(app, "partial")}
                                                    >
                                                        50%
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        disabled={processingId === app.id}
                                                        onClick={() => reject(app)}
                                                    >
                                                        <XCircle className="h-3 w-3 mr-1" />{" "}{t("adminScholarships.reject", "Reject")}
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
                        </div>
    </AppShell>
    );
}
