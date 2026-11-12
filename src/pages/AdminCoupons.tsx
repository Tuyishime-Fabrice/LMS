import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell/page";
import { AppShell } from "@/components/shell/AppShell";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { formatPrice } from "@/services/paymentService";
import { useToast } from "@/hooks/use-toast";
import LoadingSpinner from "@/components/LoadingSpinner";
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
  const { t } = useTranslation();
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
            toast({ title: t("adminCoupons.error", "Error"), description: t("adminCoupons.couponCodeIsRequired", "Coupon code is required"), variant: "destructive" });
            return;
        }

        const value = Number(discountValue);
        if (!Number.isFinite(value) || value <= 0) {
            toast({ title: t("adminCoupons.error", "Error"), description: t("adminCoupons.enterAValidDiscountValue", "Enter a valid discount value"), variant: "destructive" });
            return;
        }

        if (discountType === "percent" && value > 100) {
            toast({ title: t("adminCoupons.error", "Error"), description: t("adminCoupons.percentDiscountCannotExceed100", "Percent discount cannot exceed 100"), variant: "destructive" });
            return;
        }

        if (appliesTo === "course" && !courseId) {
            toast({ title: t("adminCoupons.error", "Error"), description: t("adminCoupons.selectACourseForThisCoupon", "Select a course for this coupon"), variant: "destructive" });
            return;
        }

        if (appliesTo === "bundle" && !bundleId) {
            toast({ title: t("adminCoupons.error", "Error"), description: t("adminCoupons.selectABundleForThisCoupon", "Select a bundle for this coupon"), variant: "destructive" });
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
                toast({ title: t("adminCoupons.success", "Success"), description: t("adminCoupons.couponUpdated", "Coupon updated") });
            } else {
                const { error } = await supabase.from("coupons").insert(payload);
                if (error) throw error;
                toast({ title: t("adminCoupons.success", "Success"), description: t("adminCoupons.couponCreated", "Coupon created") });
            }

            setDialogOpen(false);
            fetchData();
        } catch (error: any) {
            toast({ title: t("adminCoupons.error", "Error"), description: error.message, variant: "destructive" });
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
            toast({ title: t("adminCoupons.error", "Error"), description: error.message, variant: "destructive" });
        }
    };

    const deleteCoupon = async (couponId: string) => {
        if (!confirm("Delete this coupon? Existing redemptions will remain in history.")) return;
        try {
            const { error } = await supabase.from("coupons").delete().eq("id", couponId);
            if (error) throw error;
            toast({ title: t("adminCoupons.success", "Success"), description: t("adminCoupons.couponDeleted", "Coupon deleted") });
            fetchData();
        } catch (error: any) {
            toast({ title: t("adminCoupons.error", "Error"), description: error.message, variant: "destructive" });
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
        <AppShell role="admin" width="wide">
      <PageHeader
        title={t("adminCoupons.couponCodes", "Coupon Codes")}
        description={t("adminCoupons.createDiscountCodesForCoursesAnd", "Create discount codes for courses and bundles")}
        actions={<>
          <Button onClick={openCreateDialog} variant="secondary" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t("adminCoupons.createCoupon", "Create Coupon")}
                                </Button>
        </>}
      />

                        <div className="space-y-6">

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("adminCoupons.code", "Code")}</TableHead>
                                <TableHead>{t("adminCoupons.type", "Type")}</TableHead>
                                <TableHead>{t("adminCoupons.discount", "Discount")}</TableHead>
                                <TableHead>{t("adminCoupons.scope", "Scope")}</TableHead>
                                <TableHead>{t("adminCoupons.usage", "Usage")}</TableHead>
                                <TableHead>{t("adminCoupons.validUntil", "Valid Until")}</TableHead>
                                <TableHead>{t("adminCoupons.status", "Status")}</TableHead>
                                <TableHead>{t("adminCoupons.actions", "Actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        {t("adminCoupons.loadingCoupons", "Loading coupons...")}
                                    </TableCell>
                                </TableRow>
                            ) : coupons.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                        {t("adminCoupons.noCouponsYetCreateYourFirst", "No coupons yet. Create your first discount code.")}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                coupons.map((coupon) => (
                                    <TableRow key={coupon.id}>
                                        <TableCell>
                                            <code className="font-semibold bg-muted px-2 py-1 rounded">
                                                {coupon.code}
                                            </code>
                                            {coupon.description && (
                                                <p className="text-xs text-muted-foreground mt-1">{coupon.description}</p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{couponTypeLabel(coupon.coupon_type || "promo")}</Badge>
                                        </TableCell>
                                        <TableCell>{discountLabel(coupon)}</TableCell>
                                        <TableCell className="text-sm">{scopeLabel(coupon)}</TableCell>
                                        <TableCell className="text-sm">
                                            {coupon.uses_count}
                                            {coupon.max_uses != null ? ` / ${coupon.max_uses}` : t("adminCoupons.uses", "uses")}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {coupon.valid_until
                                                ? new Date(coupon.valid_until).toLocaleDateString()
                                                : t("adminCoupons.noExpiry", "No expiry")}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={coupon.is_active ? "default" : "secondary"}>
                                                {coupon.is_active ? t("adminCoupons.active", "Active") : t("adminCoupons.inactive", "Inactive")}
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
                                                    <Trash2 className="h-4 w-4 text-destructive" />
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingCoupon ? t("adminCoupons.editCoupon", "Edit Coupon") : t("adminCoupons.createCoupon", "Create Coupon")}</DialogTitle>
                        <DialogDescription>
                            {t("adminCoupons.studentsEnterThisCodeAtCheckout", "Students enter this code at checkout. Discount is applied server-side.")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t("adminCoupons.code", "Code")}</Label>
                            <Input
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder={t("adminCoupons.summer20", "SUMMER20")}
                                className="uppercase"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t("adminCoupons.descriptionOptional", "Description (optional)")}</Label>
                            <Textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder={t("adminCoupons.summerPromotion", "Summer promotion")}
                                rows={2}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t("adminCoupons.couponType", "Coupon type")}</Label>
                            <Select
                                value={couponType}
                                onValueChange={(v) => setCouponType(v as Coupon["coupon_type"])}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="promo">{t("adminCoupons.promo", "Promo")}</SelectItem>
                                    <SelectItem value="scholarship">{t("adminCoupons.scholarship", "Scholarship")}</SelectItem>
                                    <SelectItem value="early_bird">{t("adminCoupons.earlyBird", "Early bird")}</SelectItem>
                                    <SelectItem value="staff">{t("adminCoupons.staff", "Staff")}</SelectItem>
                                    <SelectItem value="referral">{t("adminCoupons.referral", "Referral")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>{t("adminCoupons.discountType", "Discount Type")}</Label>
                                <Select
                                    value={discountType}
                                    onValueChange={(v) => setDiscountType(v as "percent" | "fixed")}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percent">{t("adminCoupons.percent", "Percent (%)")}</SelectItem>
                                        <SelectItem value="fixed">{t("adminCoupons.fixedAmount", "Fixed amount")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("adminCoupons.value", "Value")}</Label>
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
                                <Label>{t("adminCoupons.currency", "Currency")}</Label>
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
                                <Label>{t("adminCoupons.maxTotalUses", "Max total uses")}</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={maxUses}
                                    onChange={(e) => setMaxUses(e.target.value)}
                                    placeholder={t("adminCoupons.unlimited", "Unlimited")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("adminCoupons.maxUsesPerStudent", "Max uses per student")}</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={maxUsesPerUser}
                                    onChange={(e) => setMaxUsesPerUser(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t("adminCoupons.appliesTo", "Applies to")}</Label>
                            <Select
                                value={appliesTo}
                                onValueChange={(v) => setAppliesTo(v as "all" | "course" | "bundle")}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("adminCoupons.allPurchases", "All purchases")}</SelectItem>
                                    <SelectItem value="course">{t("adminCoupons.specificCourse", "Specific course")}</SelectItem>
                                    <SelectItem value="bundle">{t("adminCoupons.specificBundle", "Specific bundle")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {appliesTo === "course" && (
                            <div className="space-y-2">
                                <Label>{t("adminCoupons.course", "Course")}</Label>
                                <Select value={courseId} onValueChange={setCourseId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("adminCoupons.selectCourse", "Select course")} />
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
                                <Label>{t("adminCoupons.bundle", "Bundle")}</Label>
                                <Select value={bundleId} onValueChange={setBundleId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t("adminCoupons.selectBundle", "Select bundle")} />
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
                            <Label>{t("adminCoupons.minimumPurchaseOptional", "Minimum purchase (optional)")}</Label>
                            <Input
                                type="number"
                                min="0"
                                value={minPurchase}
                                onChange={(e) => setMinPurchase(e.target.value)}
                                placeholder={t("adminCoupons.noMinimum", "No minimum")}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>{t("adminCoupons.validFrom", "Valid from")}</Label>
                                <Input
                                    type="datetime-local"
                                    value={validFrom}
                                    onChange={(e) => setValidFrom(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("adminCoupons.validUntil2", "Valid until")}</Label>
                                <Input
                                    type="datetime-local"
                                    value={validUntil}
                                    onChange={(e) => setValidUntil(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <Label>{t("adminCoupons.active", "Active")}</Label>
                            <Switch checked={isActive} onCheckedChange={setIsActive} />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                                {t("adminCoupons.cancel", "Cancel")}
                            </Button>
                            <Button className="flex-1 bg-primary hover:bg-primary-hover" onClick={handleSave}>
                                {editingCoupon ? t("adminCoupons.saveChanges", "Save Changes") : t("adminCoupons.createCoupon", "Create Coupon")}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
    </AppShell>
    );
}
