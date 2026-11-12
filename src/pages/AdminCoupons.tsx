import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatPrice } from "@/services/paymentService";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { toast as sonnerToast } from "sonner";

interface CourseOption {
    id: string;
    title: string;
}

interface BundleOption {
    id: string;
    title: string;
}

interface Coupon {
    id: string;
    code: string;
    description: string | null;
    coupon_type: "promo" | "scholarship" | "early_bird" | "staff" | "referral";
    discount_type: "percent" | "fixed";
    discount_value: number;
    currency: string;
    max_uses: number | null;
    uses_count: number;
    max_uses_per_user: number | null;
    valid_from: string | null;
    valid_until: string | null;
    is_active: boolean;
    applies_to: "all" | "course" | "bundle";
    course_id: string | null;
    bundle_id: string | null;
    min_purchase_amount: number | null;
    created_at: string;
}

export default function AdminCoupons() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [bundles, setBundles] = useState<BundleOption[]>([]);
    const [loading, setLoading] = useState(true);
    const [accessChecked, setAccessChecked] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    const [code, setCode] = useState("");
    const [description, setDescription] = useState("");
    const [couponType, setCouponType] = useState<Coupon["coupon_type"]>("promo");
    const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
    const [discountValue, setDiscountValue] = useState("");
    const [currency, setCurrency] = useState("RWF");
    const [maxUses, setMaxUses] = useState("");
    const [maxUsesPerUser, setMaxUsesPerUser] = useState("1");
    const [validFrom, setValidFrom] = useState("");
    const [validUntil, setValidUntil] = useState("");
    const [appliesTo, setAppliesTo] = useState<"all" | "course" | "bundle">("all");
    const [courseId, setCourseId] = useState("");
    const [bundleId, setBundleId] = useState("");
    const [minPurchase, setMinPurchase] = useState("");
    const [isActive, setIsActive] = useState(true);

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
                sonnerToast.error("Access denied. Admin privileges required.");
                navigate("/");
                return;
            }

            setAccessChecked(true);
            await fetchData();
        } catch (error) {
            console.error("Error checking admin access:", error);
            sonnerToast.error("Failed to verify admin access");
            navigate("/");
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [{ data: couponData }, { data: courseData }, { data: bundleData }] = await Promise.all([
                supabase.from("coupons").select("*").order("created_at", { ascending: false }),
                supabase.from("courses").select("id, title").order("title"),
                supabase.from("course_bundles").select("id, title").order("title"),
            ]);

            setCoupons((couponData as Coupon[]) || []);
            setCourses((courseData as CourseOption[]) || []);
            setBundles((bundleData as BundleOption[]) || []);
        } catch (error) {
            console.error("Error fetching coupons:", error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setCode("");
        setDescription("");
        setCouponType("promo");
        setDiscountType("percent");
        setDiscountValue("");
        setCurrency("RWF");
        setMaxUses("");
        setMaxUsesPerUser("1");
        setValidFrom("");
        setValidUntil("");
        setAppliesTo("all");
        setCourseId("");
        setBundleId("");
        setMinPurchase("");
        setIsActive(true);
    };

    const openCreateDialog = () => {
        setEditingCoupon(null);
        resetForm();
        setDialogOpen(true);
    };

    const openEditDialog = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setCode(coupon.code);
        setDescription(coupon.description || "");
        setCouponType(coupon.coupon_type || "promo");
        setDiscountType(coupon.discount_type);
        setDiscountValue(String(coupon.discount_value));
        setCurrency(coupon.currency || "RWF");
        setMaxUses(coupon.max_uses != null ? String(coupon.max_uses) : "");
        setMaxUsesPerUser(coupon.max_uses_per_user != null ? String(coupon.max_uses_per_user) : "1");
        setValidFrom(coupon.valid_from ? coupon.valid_from.slice(0, 16) : "");
        setValidUntil(coupon.valid_until ? coupon.valid_until.slice(0, 16) : "");
        setAppliesTo(coupon.applies_to);
        setCourseId(coupon.course_id || "");
        setBundleId(coupon.bundle_id || "");
        setMinPurchase(coupon.min_purchase_amount != null ? String(coupon.min_purchase_amount) : "");
        setIsActive(coupon.is_active);
        setDialogOpen(true);
    };

    const handleSave = async () => {
        const trimmedCode = code.trim().toUpperCase();
        if (!trimmedCode) {
            toast({ title: "Error", description: "Coupon code is required", variant: "destructive" });
            return;
        }

        const value = Number(discountValue);
        if (!Number.isFinite(value) || value <= 0) {
            toast({ title: "Error", description: "Enter a valid discount value", variant: "destructive" });
            return;
        }

        if (discountType === "percent" && value > 100) {
            toast({ title: "Error", description: "Percent discount cannot exceed 100", variant: "destructive" });
            return;
        }

        if (appliesTo === "course" && !courseId) {
            toast({ title: "Error", description: "Select a course for this coupon", variant: "destructive" });
            return;
        }

        if (appliesTo === "bundle" && !bundleId) {
            toast({ title: "Error", description: "Select a bundle for this coupon", variant: "destructive" });
            return;
        }

        const payload = {
            code: trimmedCode,
            description: description.trim() || null,
            coupon_type: couponType,
            discount_type: discountType,
            discount_value: value,
            currency: discountType === "fixed" ? currency : "RWF",
            max_uses: maxUses.trim() ? Number(maxUses) : null,
            max_uses_per_user: maxUsesPerUser.trim() ? Number(maxUsesPerUser) : 1,
            valid_from: validFrom ? new Date(validFrom).toISOString() : null,
            valid_until: validUntil ? new Date(validUntil).toISOString() : null,
            is_active: isActive,
            applies_to: appliesTo,
            course_id: appliesTo === "course" ? courseId : null,
            bundle_id: appliesTo === "bundle" ? bundleId : null,
            min_purchase_amount: minPurchase.trim() ? Number(minPurchase) : null,
        };

        try {
            if (editingCoupon) {
                const { error } = await supabase.from("coupons").update(payload).eq("id", editingCoupon.id);
                if (error) throw error;
                toast({ title: "Success", description: "Coupon updated" });
            } else {
                const { error } = await supabase.from("coupons").insert(payload);
                if (error) throw error;
                toast({ title: "Success", description: "Coupon created" });
            }

            setDialogOpen(false);
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const toggleActive = async (coupon: Coupon) => {
        try {
            const { error } = await supabase
                .from("coupons")
                .update({ is_active: !coupon.is_active })
                .eq("id", coupon.id);
            if (error) throw error;
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const deleteCoupon = async (couponId: string) => {
        if (!confirm("Delete this coupon? Existing redemptions will remain in history.")) return;
        try {
            const { error } = await supabase.from("coupons").delete().eq("id", couponId);
            if (error) throw error;
            toast({ title: "Success", description: "Coupon deleted" });
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const couponTypeLabel = (type: Coupon["coupon_type"]) => {
        const labels: Record<Coupon["coupon_type"], string> = {
            promo: "Promo",
            scholarship: "Scholarship",
            early_bird: "Early bird",
            staff: "Staff",
            referral: "Referral",
        };
        return labels[type] || type;
    };

    const scopeLabel = (coupon: Coupon) => {
        if (coupon.applies_to === "course") {
            const course = courses.find((c) => c.id === coupon.course_id);
            return course ? `Course: ${course.title}` : "Specific course";
        }
        if (coupon.applies_to === "bundle") {
            const bundle = bundles.find((b) => b.id === coupon.bundle_id);
            return bundle ? `Bundle: ${bundle.title}` : "Specific bundle";
        }
        return "All purchases";
    };

    const discountLabel = (coupon: Coupon) => {
        if (coupon.discount_type === "percent") {
            return `${coupon.discount_value}% off`;
        }
        return `${formatPrice(coupon.discount_value, coupon.currency)} off`;
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
                                        <h1 className="text-3xl font-bold mb-1">Coupon Codes</h1>
                                        <p className="text-white/90 text-sm">Create discount codes for courses and bundles</p>
                                    </div>
                                </div>
                                <Button onClick={openCreateDialog} variant="secondary" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Coupon
                                </Button>
                            </div>
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto px-2">
                        <div className="max-w-7xl mx-auto space-y-6">

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead>Scope</TableHead>
                                <TableHead>Usage</TableHead>
                                <TableHead>Valid Until</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                        Loading coupons...
                                    </TableCell>
                                </TableRow>
                            ) : coupons.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                        No coupons yet. Create your first discount code.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                coupons.map((coupon) => (
                                    <TableRow key={coupon.id}>
                                        <TableCell>
                                            <code className="font-semibold bg-gray-100 px-2 py-1 rounded">
                                                {coupon.code}
                                            </code>
                                            {coupon.description && (
                                                <p className="text-xs text-gray-500 mt-1">{coupon.description}</p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{couponTypeLabel(coupon.coupon_type || "promo")}</Badge>
                                        </TableCell>
                                        <TableCell>{discountLabel(coupon)}</TableCell>
                                        <TableCell className="text-sm">{scopeLabel(coupon)}</TableCell>
                                        <TableCell className="text-sm">
                                            {coupon.uses_count}
                                            {coupon.max_uses != null ? ` / ${coupon.max_uses}` : " uses"}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {coupon.valid_until
                                                ? new Date(coupon.valid_until).toLocaleDateString()
                                                : "No expiry"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={coupon.is_active ? "default" : "secondary"}>
                                                {coupon.is_active ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEditDialog(coupon)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Switch
                                                    checked={coupon.is_active}
                                                    onCheckedChange={() => toggleActive(coupon)}
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteCoupon(coupon.id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create Coupon"}</DialogTitle>
                        <DialogDescription>
                            Students enter this code at checkout. Discount is applied server-side.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Code</Label>
                            <Input
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="SUMMER20"
                                className="uppercase"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Description (optional)</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Summer promotion"
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Coupon type</Label>
                            <Select
                                value={couponType}
                                onValueChange={(v) => setCouponType(v as Coupon["coupon_type"])}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="promo">Promo</SelectItem>
                                    <SelectItem value="scholarship">Scholarship</SelectItem>
                                    <SelectItem value="early_bird">Early bird</SelectItem>
                                    <SelectItem value="staff">Staff</SelectItem>
                                    <SelectItem value="referral">Referral</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Discount Type</Label>
                                <Select
                                    value={discountType}
                                    onValueChange={(v) => setDiscountType(v as "percent" | "fixed")}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percent">Percent (%)</SelectItem>
                                        <SelectItem value="fixed">Fixed amount</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Value</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step={discountType === "percent" ? "1" : "0.01"}
                                    value={discountValue}
                                    onChange={(e) => setDiscountValue(e.target.value)}
                                    placeholder={discountType === "percent" ? "20" : "5000"}
                                />
                            </div>
                        </div>

                        {discountType === "fixed" && (
                            <div className="space-y-2">
                                <Label>Currency</Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RWF">RWF</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Max total uses</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={maxUses}
                                    onChange={(e) => setMaxUses(e.target.value)}
                                    placeholder="Unlimited"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Max uses per student</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={maxUsesPerUser}
                                    onChange={(e) => setMaxUsesPerUser(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Applies to</Label>
                            <Select
                                value={appliesTo}
                                onValueChange={(v) => setAppliesTo(v as "all" | "course" | "bundle")}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All purchases</SelectItem>
                                    <SelectItem value="course">Specific course</SelectItem>
                                    <SelectItem value="bundle">Specific bundle</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {appliesTo === "course" && (
                            <div className="space-y-2">
                                <Label>Course</Label>
                                <Select value={courseId} onValueChange={setCourseId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select course" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {courses.map((course) => (
                                            <SelectItem key={course.id} value={course.id}>
                                                {course.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {appliesTo === "bundle" && (
                            <div className="space-y-2">
                                <Label>Bundle</Label>
                                <Select value={bundleId} onValueChange={setBundleId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select bundle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {bundles.map((bundle) => (
                                            <SelectItem key={bundle.id} value={bundle.id}>
                                                {bundle.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>Minimum purchase (optional)</Label>
                            <Input
                                type="number"
                                min="0"
                                value={minPurchase}
                                onChange={(e) => setMinPurchase(e.target.value)}
                                placeholder="No minimum"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>Valid from</Label>
                                <Input
                                    type="datetime-local"
                                    value={validFrom}
                                    onChange={(e) => setValidFrom(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Valid until</Label>
                                <Input
                                    type="datetime-local"
                                    value={validUntil}
                                    onChange={(e) => setValidUntil(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <Label>Active</Label>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button className="flex-1 bg-[#006d2c] hover:bg-[#005523]" onClick={handleSave}>
                                {editingCoupon ? "Save Changes" : "Create Coupon"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    );
}
