import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { DollarSign, Search, Filter, CheckCircle, XCircle, Clock, CreditCard, Smartphone, Tag } from "lucide-react";
import { formatPrice } from "@/services/paymentService";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { toast } from "sonner";

interface Payment {
    id: string;
    student_id: string;
    course_id: string | null;
    bundle_id: string | null;
    amount: number;
    currency: string;
    payment_method: string | null;
    reference_id: string;
    transaction_id: string | null;
    status: string;
    payer_phone: string | null;
    payer_email: string | null;
    payment_provider?: string | null;
    payment_track?: string | null;
    created_at: string;
    student_name?: string;
    course_title?: string;
    bundle_title?: string;
}

interface InstalmentRow {
    enrollment_id: string;
    student_name: string;
    course_title: string;
    total_amount: number;
    currency: string;
    status: string;
    paid_count: number;
    pending_count: number;
    overdue_count: number;
    next_due_date: string | null;
}

interface CouponStat {
    coupon_id: string;
    code: string;
    coupon_type: string;
    discount_type: string;
    discount_value: number;
    max_uses: number | null;
    uses_count: number;
    redemption_count: number;
    total_discount: number;
    is_active: boolean;
}

export default function AdminPayments() {
    const navigate = useNavigate();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [accessChecked, setAccessChecked] = useState(false);
    const [filter, setFilter] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [period, setPeriod] = useState<string>("30d");
    const [instalments, setInstalments] = useState<InstalmentRow[]>([]);
    const [couponStats, setCouponStats] = useState<CouponStat[]>([]);

    useEffect(() => {
        checkAdminAccess();
    }, []);

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
                toast.error("Access denied. Admin privileges required.");
                navigate("/");
                return;
            }

            setAccessChecked(true);
            await Promise.all([fetchPayments(), fetchInstalments(), fetchCouponStats()]);
        } catch (error) {
            console.error("Error checking admin access:", error);
            toast.error("Failed to verify admin access");
            navigate("/");
        }
    };

    const periodStart = useMemo(() => {
        const now = new Date();
        if (period === "7d") return new Date(now.getTime() - 7 * 86400000);
        if (period === "30d") return new Date(now.getTime() - 30 * 86400000);
        if (period === "90d") return new Date(now.getTime() - 90 * 86400000);
        return null;
    }, [period]);

    const { stats, trackStats, topCourses } = useMemo(() => {
        const inPeriod = periodStart
            ? payments.filter((p) => new Date(p.created_at) >= periodStart)
            : payments;
        const successPayments = inPeriod.filter((p) => p.status === "success");

        const tracks: Record<string, number> = {};
        for (const p of successPayments) {
            const key = p.payment_track || "full";
            tracks[key] = (tracks[key] || 0) + p.amount;
        }

        const courseRevenue: Record<string, number> = {};
        for (const p of successPayments) {
            if (p.course_title) {
                courseRevenue[p.course_title] = (courseRevenue[p.course_title] || 0) + p.amount;
            }
        }

        return {
            stats: {
                total: inPeriod.length,
                success: successPayments.length,
                pending: inPeriod.filter((p) => p.status === "pending").length,
                failed: inPeriod.filter((p) => p.status === "failed").length,
                revenue: successPayments.reduce((sum, p) => sum + p.amount, 0),
            },
            trackStats: tracks,
            topCourses: Object.entries(courseRevenue)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([title, revenue]) => ({ title, revenue })),
        };
    }, [payments, periodStart]);

    const fetchCouponStats = async () => {
        try {
            const { data, error } = await supabase.rpc("get_coupon_redemption_stats");
            if (error) throw error;
            setCouponStats((data as CouponStat[]) || []);
        } catch (error) {
            console.error("Error fetching coupon stats:", error);
        }
    };

    const fetchInstalments = async () => {
        try {
            const { data, error } = await supabase.rpc("get_instalment_tracker");
            if (error) throw error;
            setInstalments((data as InstalmentRow[]) || []);
        } catch (error) {
            console.error("Error fetching instalments:", error);
        }
    };

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("payments")
                .select("*")
                .order("created_at", { ascending: false });

            if (error) throw error;

            // Enrich with student names, course titles
            const enriched: Payment[] = [];
            for (const payment of data || []) {
                let student_name = payment.payer_email || "Unknown";
                let course_title = null;
                let bundle_title = null;

                // Get student name
                const { data: profile } = await supabase
                    .from("profiles")
                    .select("full_name")
                    .eq("id", payment.student_id)
                    .single();
                if (profile) student_name = profile.full_name || student_name;

                // Get course/bundle title
                if (payment.course_id) {
                    const { data: course } = await supabase
                        .from("courses")
                        .select("title")
                        .eq("id", payment.course_id)
                        .single();
                    if (course) course_title = course.title;
                }
                if (payment.bundle_id) {
                    const { data: bundle } = await supabase
                        .from("course_bundles")
                        .select("title")
                        .eq("id", payment.bundle_id)
                        .single();
                    if (bundle) bundle_title = bundle.title;
                }

                enriched.push({ ...payment, student_name, course_title, bundle_title });
            }

            setPayments(enriched);
        } catch (error) {
            console.error("Error fetching payments:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPayments = payments.filter((p) => {
        const matchesFilter = filter === "all" || p.status === filter;
        const matchesSearch =
            search === "" ||
            p.student_name?.toLowerCase().includes(search.toLowerCase()) ||
            p.course_title?.toLowerCase().includes(search.toLowerCase()) ||
            p.bundle_title?.toLowerCase().includes(search.toLowerCase()) ||
            p.reference_id.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "success":
                return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
            case "pending":
                return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
            case "failed":
                return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const getMethodIcon = (method: string | null) => {
        if (method === "MTN_MOMO_RWA") return <Smartphone className="h-4 w-4 text-yellow-600" />;
        if (method === "card") return <CreditCard className="h-4 w-4 text-blue-600" />;
        return null;
    };

    if (!accessChecked) {
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
                                        <h1 className="text-3xl font-bold mb-1">Payments</h1>
                                        <p className="text-white/90 text-sm">Track all course and bundle purchases</p>
                                    </div>
                                </div>
                                <Button
                                    onClick={() => {
                                        fetchPayments();
                                        fetchInstalments();
                                        fetchCouponStats();
                                    }}
                                    variant="secondary"
                                    size="sm"
                                >
                                    Refresh
                                </Button>
                            </div>
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto px-2">
                        <div className="max-w-7xl mx-auto space-y-6">

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Revenue</p>
                                <p className="text-2xl font-bold text-green-700">{formatPrice(stats.revenue, "RWF")}</p>
                            </div>
                            <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Successful</p>
                                <p className="text-2xl font-bold text-green-600">{stats.success}</p>
                            </div>
                            <CheckCircle className="h-8 w-8 text-green-400 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Pending</p>
                                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                            </div>
                            <Clock className="h-8 w-8 text-yellow-400 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Failed</p>
                                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
                            </div>
                            <XCircle className="h-8 w-8 text-red-400 opacity-50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-40">
                        <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                        <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {(Object.keys(trackStats).length > 0 || topCourses.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Revenue by payment track</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {Object.entries(trackStats).map(([track, amount]) => (
                                <div key={track} className="flex justify-between text-sm">
                                    <span className="capitalize text-gray-600">{track.replace("_", " ")}</span>
                                    <span className="font-semibold">{formatPrice(amount, "RWF")}</span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Top courses by revenue</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {topCourses.length === 0 ? (
                                <p className="text-sm text-gray-500">No course revenue in this period</p>
                            ) : (
                                topCourses.map((c) => (
                                    <div key={c.title} className="flex justify-between text-sm">
                                        <span className="truncate max-w-[200px]">{c.title}</span>
                                        <span className="font-semibold">{formatPrice(c.revenue, "RWF")}</span>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search by student, course, or reference ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="w-40">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Payments Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Course / Bundle</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Track</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Reference</TableHead>
                                <TableHead>Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                        Loading payments...
                                    </TableCell>
                                </TableRow>
                            ) : filteredPayments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                        No payments found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <TableRow key={payment.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium text-sm">{payment.student_name}</p>
                                                <p className="text-xs text-gray-400">{payment.payer_email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                {payment.bundle_id ? (
                                                    <Badge variant="outline" className="text-xs">Bundle</Badge>
                                                ) : null}
                                                <span className="text-sm truncate max-w-[200px]">
                                                    {payment.course_title || payment.bundle_title || "—"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-semibold text-sm">
                                            {formatPrice(payment.amount, payment.currency)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs capitalize">
                                                {(payment.payment_track || "full").replace("_", " ")}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    {getMethodIcon(payment.payment_method)}
                                                    <span className="text-xs text-gray-500">
                                                        {payment.payment_method === "MTN_MOMO_RWA" ? "MoMo" : payment.payment_method || "—"}
                                                    </span>
                                                </div>
                                                {payment.payment_provider && (
                                                    <span className="text-[10px] text-gray-400 capitalize">
                                                        {payment.payment_provider}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                                        <TableCell>
                                            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                                {payment.reference_id}
                                            </code>
                                        </TableCell>
                                        <TableCell className="text-xs text-gray-500">
                                            {new Date(payment.created_at).toLocaleDateString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Tag className="h-5 w-5 text-[#006d2c]" />
                        Coupon redemption stats
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Uses</TableHead>
                                <TableHead>Redemptions</TableHead>
                                <TableHead>Total discount</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {couponStats.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        No coupon data yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                couponStats.slice(0, 15).map((row) => (
                                    <TableRow key={row.coupon_id}>
                                        <TableCell>
                                            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                                                {row.code}
                                            </code>
                                        </TableCell>
                                        <TableCell className="capitalize text-sm">{row.coupon_type}</TableCell>
                                        <TableCell className="text-sm">
                                            {row.uses_count}
                                            {row.max_uses != null ? ` / ${row.max_uses}` : ""}
                                        </TableCell>
                                        <TableCell className="text-sm">{row.redemption_count}</TableCell>
                                        <TableCell className="text-sm font-medium">
                                            {formatPrice(Number(row.total_discount), "RWF")}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={row.is_active ? "default" : "secondary"}>
                                                {row.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Instalment tracker</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Student</TableHead>
                                <TableHead>Course</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Paid</TableHead>
                                <TableHead>Pending</TableHead>
                                <TableHead>Next due</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {instalments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        No active instalment plans
                                    </TableCell>
                                </TableRow>
                            ) : (
                                instalments.map((row) => (
                                    <TableRow key={row.enrollment_id}>
                                        <TableCell className="text-sm">{row.student_name}</TableCell>
                                        <TableCell className="text-sm">{row.course_title}</TableCell>
                                        <TableCell>{formatPrice(Number(row.total_amount), row.currency)}</TableCell>
                                        <TableCell>{row.paid_count}</TableCell>
                                        <TableCell>{row.pending_count}</TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {row.next_due_date
                                                ? new Date(row.next_due_date).toLocaleDateString()
                                                : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="capitalize">
                                                {row.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
                        </div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
