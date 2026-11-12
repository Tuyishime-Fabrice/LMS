import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell/page";
import { AppShell } from "@/components/shell/AppShell";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { formatPrice } from "@/services/paymentService";
import { toast } from "sonner";

const TIER_OPTIONS = [
    { code: "student", label: "Student / Individual" },
    { code: "ngo", label: "NGO / Non-profit" },
    { code: "corporate", label: "Corporate" },
    { code: "partner", label: "Partner" },
];

interface Course {
    id: string;
    title: string;
    price: number;
    currency: string;
}

interface TierRow {
    id: string;
    tier_code: string;
    price: number;
    currency: string;
    label: string | null;
    is_active: boolean;
}

export default function AdminPricing() {
  const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [accessChecked, setAccessChecked] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [tiers, setTiers] = useState<TierRow[]>([]);
    const [newTier, setNewTier] = useState("student");
    const [newPrice, setNewPrice] = useState("");

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
            toast.error(t("adminPricing.accessDenied", "Access denied"));
            navigate("/");
            return;
        }
        setAccessChecked(true);

        const { data } = await supabase
            .from("courses")
            .select("id, title, price, currency")
            .eq("is_free", false)
            .order("title");
        setCourses((data as Course[]) || []);
        setLoading(false);
    };

    const fetchTiers = async (courseId: string) => {
        if (!courseId) {
            setTiers([]);
            return;
        }
        const { data, error } = await supabase
            .from("course_price_tiers")
            .select("*")
            .eq("course_id", courseId)
            .order("tier_code");
        if (error) {
            toast.error(error.message);
            return;
        }
        setTiers((data as TierRow[]) || []);
    };

    useEffect(() => {
        if (selectedCourseId) fetchTiers(selectedCourseId);
    }, [selectedCourseId]);

    const addTier = async () => {
        if (!selectedCourseId || !newPrice.trim()) return;
        const course = courses.find((c) => c.id === selectedCourseId);
        const { error } = await supabase.from("course_price_tiers").insert({
            course_id: selectedCourseId,
            tier_code: newTier,
            price: Number(newPrice),
            currency: course?.currency || "RWF",
            label: TIER_OPTIONS.find((t) => t.code === newTier)?.label,
        });
        if (error) {
            toast.error(error.message);
            return;
        }
        toast.success(t("adminPricing.tierPriceAdded", "Tier price added"));
        setNewPrice("");
        fetchTiers(selectedCourseId);
    };

    const deleteTier = async (id: string) => {
        const { error } = await supabase.from("course_price_tiers").delete().eq("id", id);
        if (error) toast.error(error.message);
        else fetchTiers(selectedCourseId);
    };

    if (!accessChecked) return <LoadingSpinner />;

    const selectedCourse = courses.find((c) => c.id === selectedCourseId);

    return (
        <AppShell role="admin" width="wide">
      <PageHeader
        title={t("adminPricing.audiencePricingTiers", "Audience Pricing Tiers")}
        description={t("adminPricing.setDifferentPricesPerLearnerCategory", "Set different prices per learner category. Assign users a tier in their profile.")}
      />

                        <div className="space-y-6">

            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                        <Label>{t("adminPricing.paidCourse", "Paid course")}</Label>
                        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("adminPricing.selectCourse", "Select course")} />
                            </SelectTrigger>
                            <SelectContent>
                                {courses.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {t("adminPricing.standard", "{{title}} — {{formatPrice}} (standard)", { title: c.title, formatPrice: formatPrice(c.price, c.currency) })}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedCourse && (
                        <>
                            <div className="flex flex-wrap gap-2 items-end">
                                <div className="space-y-1">
                                    <Label>{t("adminPricing.tier", "Tier")}</Label>
                                    <Select value={newTier} onValueChange={setNewTier}>
                                        <SelectTrigger className="w-44">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TIER_OPTIONS.map((t) => (
                                                <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label>{t("adminPricing.price", "Price ({{currency}})", { currency: selectedCourse.currency })}</Label>
                                    <Input
                                        type="number"
                                        className="w-32"
                                        value={newPrice}
                                        onChange={(e) => setNewPrice(e.target.value)}
                                    />
                                </div>
                                <Button onClick={addTier} className="bg-primary hover:bg-primary-hover">
                                    <Plus className="h-4 w-4 mr-1" />{" "}{t("adminPricing.addTierPrice", "Add tier price")}
                                </Button>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t("adminPricing.tier", "Tier")}</TableHead>
                                        <TableHead>{t("adminPricing.price2", "Price")}</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tiers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                                                {t("adminPricing.noTierPricesStandardPriceApplies", "No tier prices — standard price applies to all users")}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        tiers.map((tier) => (
                                            <TableRow key={tier.id}>
                                                <TableCell>{tier.label || tier.tier_code}</TableCell>
                                                <TableCell>{formatPrice(tier.price, tier.currency)}</TableCell>
                                                <TableCell>
                                                    <Button size="icon" variant="ghost" onClick={() => deleteTier(tier.id)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </>
                    )}
                </CardContent>
            </Card>
                        </div>
    </AppShell>
    );
}
