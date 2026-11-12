import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
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
            toast.error("Access denied");
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
        toast.success("Tier price added");
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
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 via-white to-gray-50">
                <AdminSidebar />
                <div className="flex-1 flex flex-col overflow-hidden p-4">
                    <header className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100 mb-6">
                        <div className="bg-gradient-to-r from-[#006d2c] to-[#008000] p-6 rounded-t-3xl">
                            <div className="flex items-center gap-4">
                                <SidebarTrigger className="text-white" />
                                <div className="text-white">
                                    <h1 className="text-3xl font-bold mb-1">Audience Pricing Tiers</h1>
                                    <p className="text-white/90 text-sm">
                                        Set different prices per learner category. Assign users a tier in their profile.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto px-2">
                        <div className="max-w-7xl mx-auto space-y-6">

            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="space-y-2">
                        <Label>Paid course</Label>
                        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select course" />
                            </SelectTrigger>
                            <SelectContent>
                                {courses.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.title} — {formatPrice(c.price, c.currency)} (standard)
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedCourse && (
                        <>
                            <div className="flex flex-wrap gap-2 items-end">
                                <div className="space-y-1">
                                    <Label>Tier</Label>
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
                                    <Label>Price ({selectedCourse.currency})</Label>
                                    <Input
                                        type="number"
                                        className="w-32"
                                        value={newPrice}
                                        onChange={(e) => setNewPrice(e.target.value)}
                                    />
                                </div>
                                <Button onClick={addTier} className="bg-[#006d2c] hover:bg-[#005523]">
                                    <Plus className="h-4 w-4 mr-1" /> Add tier price
                                </Button>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tier</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tiers.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-gray-500 py-6">
                                                No tier prices — standard price applies to all users
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        tiers.map((tier) => (
                                            <TableRow key={tier.id}>
                                                <TableCell>{tier.label || tier.tier_code}</TableCell>
                                                <TableCell>{formatPrice(tier.price, tier.currency)}</TableCell>
                                                <TableCell>
                                                    <Button size="icon" variant="ghost" onClick={() => deleteTier(tier.id)}>
                                                        <Trash2 className="h-4 w-4 text-red-500" />
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
                    </main>
                </div>
            </div>
        </SidebarProvider>
    );
}
