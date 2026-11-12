import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Package, Plus, Pencil, Trash2, BookOpen, X } from "lucide-react";
import { formatPrice } from "@/services/paymentService";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useToast } from "@/hooks/use-toast";

interface Course {
    id: string;
    title: string;
    price: number;
    is_free: boolean;
    currency: string;
}

interface Bundle {
    id: string;
    title: string;
    description: string | null;
    original_price: number;
    bundle_price: number;
    currency: string;
    is_active: boolean;
    created_at: string;
    courses: Course[];
}

export default function AdminBundles() {
    const { toast } = useToast();
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [allCourses, setAllCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [bundlePrice, setBundlePrice] = useState("");
    const [currency, setCurrency] = useState("RWF");
    const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all paid courses
            const { data: courses } = await supabase
                .from("courses")
                .select("id, title, price, is_free, currency")
                .order("title");
            setAllCourses((courses as Course[]) || []);

            // Fetch all bundles
            const { data: bundlesData } = await supabase
                .from("course_bundles")
                .select("*")
                .order("created_at", { ascending: false });

            const enrichedBundles: Bundle[] = [];
            for (const bundle of bundlesData || []) {
                const { data: bundleCourses } = await supabase
                    .from("bundle_courses")
                    .select("course_id, courses:course_id(id, title, price, is_free, currency)")
                    .eq("bundle_id", bundle.id);

                enrichedBundles.push({
                    ...bundle,
                    courses: (bundleCourses || []).map((bc: any) => bc.courses).filter(Boolean),
                });
            }
            setBundles(enrichedBundles);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateDialog = () => {
        setEditingBundle(null);
        setTitle("");
        setDescription("");
        setBundlePrice("");
        setCurrency("RWF");
        setSelectedCourseIds([]);
        setDialogOpen(true);
    };

    const openEditDialog = (bundle: Bundle) => {
        setEditingBundle(bundle);
        setTitle(bundle.title);
        setDescription(bundle.description || "");
        setBundlePrice(String(bundle.bundle_price));
        setCurrency(bundle.currency);
        setSelectedCourseIds(bundle.courses.map((c) => c.id));
        setDialogOpen(true);
    };

    const calculateOriginalPrice = () => {
        return selectedCourseIds.reduce((sum, id) => {
            const course = allCourses.find((c) => c.id === id);
            return sum + (course?.price || 0);
        }, 0);
    };

    const handleSaveBundle = async () => {
        if (!title || selectedCourseIds.length < 2 || !bundlePrice) {
            toast({ title: "Error", description: "Title, at least 2 courses, and price are required", variant: "destructive" });
            return;
        }

        const originalPrice = calculateOriginalPrice();

        try {
            if (editingBundle) {
                // Update bundle
                const { error: updateError } = await supabase
                    .from("course_bundles")
                    .update({
                        title,
                        description: description || null,
                        original_price: originalPrice,
                        bundle_price: Number(bundlePrice),
                        currency,
                    })
                    .eq("id", editingBundle.id);

                if (updateError) throw updateError;

                // Delete old course associations
                await supabase.from("bundle_courses").delete().eq("bundle_id", editingBundle.id);

                // Insert new associations
                const { error: insertError } = await supabase
                    .from("bundle_courses")
                    .insert(selectedCourseIds.map((courseId) => ({
                        bundle_id: editingBundle.id,
                        course_id: courseId,
                    })));

                if (insertError) throw insertError;

                toast({ title: "Success", description: "Bundle updated!" });
            } else {
                // Create bundle
                const { data: newBundle, error: createError } = await supabase
                    .from("course_bundles")
                    .insert({
                        title,
                        description: description || null,
                        original_price: originalPrice,
                        bundle_price: Number(bundlePrice),
                        currency,
                    })
                    .select()
                    .single();

                if (createError) throw createError;

                // Insert course associations
                const { error: insertError } = await supabase
                    .from("bundle_courses")
                    .insert(selectedCourseIds.map((courseId) => ({
                        bundle_id: newBundle.id,
                        course_id: courseId,
                    })));

                if (insertError) throw insertError;

                toast({ title: "Success", description: "Bundle created!" });
            }

            setDialogOpen(false);
            fetchData();
        } catch (error: any) {
            console.error("Error saving bundle:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const toggleBundleActive = async (bundle: Bundle) => {
        try {
            const { error } = await supabase
                .from("course_bundles")
                .update({ is_active: !bundle.is_active })
                .eq("id", bundle.id);

            if (error) throw error;
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const deleteBundle = async (bundleId: string) => {
        if (!confirm("Are you sure you want to delete this bundle?")) return;
        try {
            const { error } = await supabase.from("course_bundles").delete().eq("id", bundleId);
            if (error) throw error;
            toast({ title: "Success", description: "Bundle deleted" });
            fetchData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const toggleCourseSelection = (courseId: string) => {
        setSelectedCourseIds((prev) =>
            prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
        );
    };

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
                                        <h1 className="text-3xl font-bold mb-1">Course Bundles</h1>
                                        <p className="text-white/90 text-sm">Create and manage course bundle offers</p>
                                    </div>
                                </div>
                                <Button onClick={openCreateDialog} variant="secondary" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Bundle
                                </Button>
                            </div>
                        </div>
                    </header>
                    <main className="flex-1 overflow-y-auto px-2">
                        <div className="max-w-7xl mx-auto space-y-6">

            {/* Bundles Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Bundle</TableHead>
                                <TableHead>Courses</TableHead>
                                <TableHead>Original Price</TableHead>
                                <TableHead>Bundle Price</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        Loading bundles...
                                    </TableCell>
                                </TableRow>
                            ) : bundles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        No bundles created yet
                                    </TableCell>
                                </TableRow>
                            ) : (
                                bundles.map((bundle) => {
                                    const discount = bundle.original_price > 0
                                        ? Math.round(((bundle.original_price - bundle.bundle_price) / bundle.original_price) * 100)
                                        : 0;
                                    return (
                                        <TableRow key={bundle.id}>
                                            <TableCell>
                                                <div>
                                                    <p className="font-medium">{bundle.title}</p>
                                                    {bundle.description && (
                                                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{bundle.description}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {bundle.courses.map((c) => (
                                                        <div key={c.id} className="flex items-center gap-1 text-xs">
                                                            <BookOpen className="h-3 w-3 text-gray-400" />
                                                            <span className="truncate max-w-[150px]">{c.title}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-gray-500 line-through">
                                                {formatPrice(bundle.original_price, bundle.currency)}
                                            </TableCell>
                                            <TableCell className="font-bold text-[#006d2c]">
                                                {formatPrice(bundle.bundle_price, bundle.currency)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-amber-100 text-amber-800">{discount}% OFF</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={bundle.is_active}
                                                    onCheckedChange={() => toggleBundleActive(bundle)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => openEditDialog(bundle)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteBundle(bundle.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
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
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingBundle ? "Edit Bundle" : "Create Bundle"}</DialogTitle>
                        <DialogDescription>
                            {editingBundle ? "Update bundle details" : "Combine courses into a discounted bundle"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>Bundle Title</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Data Science Starter Pack" />
                        </div>

                        <div>
                            <Label>Description (optional)</Label>
                            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what's included..." rows={2} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>Bundle Price</Label>
                                <Input type="number" value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value)} placeholder="0" />
                            </div>
                            <div>
                                <Label>Currency</Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="RWF">RWF</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Course selector */}
                        <div>
                            <Label>Select Courses (min. 2)</Label>
                            <div className="border rounded-lg mt-1 max-h-48 overflow-y-auto">
                                {allCourses.map((course) => (
                                    <label
                                        key={course.id}
                                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 border-b last:border-0 ${selectedCourseIds.includes(course.id) ? "bg-green-50" : ""
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCourseIds.includes(course.id)}
                                            onChange={() => toggleCourseSelection(course.id)}
                                            className="rounded"
                                        />
                                        <span className="flex-1 text-sm">{course.title}</span>
                                        <span className="text-xs text-gray-400">
                                            {course.is_free ? "Free" : formatPrice(course.price, course.currency)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Price summary */}
                        {selectedCourseIds.length >= 2 && bundlePrice && (
                            <div className="bg-green-50 p-3 rounded-lg text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Original total:</span>
                                    <span className="line-through text-gray-400">{formatPrice(calculateOriginalPrice(), currency)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-[#006d2c]">
                                    <span>Bundle price:</span>
                                    <span>{formatPrice(Number(bundlePrice), currency)}</span>
                                </div>
                                <div className="flex justify-between text-amber-600 font-medium">
                                    <span>Savings:</span>
                                    <span>
                                        {calculateOriginalPrice() > 0
                                            ? `${Math.round(((calculateOriginalPrice() - Number(bundlePrice)) / calculateOriginalPrice()) * 100)}% OFF`
                                            : "—"}
                                    </span>
                                </div>
                            </div>
                        )}

                        <Button onClick={handleSaveBundle} className="w-full bg-[#006d2c] hover:bg-[#005523]">
                            {editingBundle ? "Update Bundle" : "Create Bundle"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    );
}
