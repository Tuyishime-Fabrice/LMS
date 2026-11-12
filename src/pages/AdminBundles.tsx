import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell/page";
import { AppShell } from "@/components/shell/AppShell";
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
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { formatPrice } from "@/services/paymentService";
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
  const { t } = useTranslation();
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
            toast({ title: t("adminBundles.error", "Error"), description: t("adminBundles.titleAtLeast2CoursesAnd", "Title, at least 2 courses, and price are required"), variant: "destructive" });
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

                toast({ title: t("adminBundles.success", "Success"), description: t("adminBundles.bundleUpdated", "Bundle updated!") });
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

                toast({ title: t("adminBundles.success", "Success"), description: t("adminBundles.bundleCreated", "Bundle created!") });
            }

            setDialogOpen(false);
            fetchData();
        } catch (error: any) {
            console.error("Error saving bundle:", error);
            toast({ title: t("adminBundles.error", "Error"), description: error.message, variant: "destructive" });
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
            toast({ title: t("adminBundles.error", "Error"), description: error.message, variant: "destructive" });
        }
    };

    const deleteBundle = async (bundleId: string) => {
        if (!confirm("Are you sure you want to delete this bundle?")) return;
        try {
            const { error } = await supabase.from("course_bundles").delete().eq("id", bundleId);
            if (error) throw error;
            toast({ title: t("adminBundles.success", "Success"), description: t("adminBundles.bundleDeleted", "Bundle deleted") });
            fetchData();
        } catch (error: any) {
            toast({ title: t("adminBundles.error", "Error"), description: error.message, variant: "destructive" });
        }
    };

    const toggleCourseSelection = (courseId: string) => {
        setSelectedCourseIds((prev) =>
            prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
        );
    };

    return (
        <AppShell role="admin" width="wide">
      <PageHeader
        title={t("adminBundles.courseBundles", "Course Bundles")}
        description={t("adminBundles.createAndManageCourseBundleOffers", "Create and manage course bundle offers")}
        actions={<>
          <Button onClick={openCreateDialog} variant="secondary" size="sm">
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t("adminBundles.createBundle", "Create Bundle")}
                                </Button>
        </>}
      />

                        <div className="space-y-6">

            {/* Bundles Table */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("adminBundles.bundle", "Bundle")}</TableHead>
                                <TableHead>{t("adminBundles.courses", "Courses")}</TableHead>
                                <TableHead>{t("adminBundles.originalPrice", "Original Price")}</TableHead>
                                <TableHead>{t("adminBundles.bundlePrice", "Bundle Price")}</TableHead>
                                <TableHead>{t("adminBundles.discount", "Discount")}</TableHead>
                                <TableHead>{t("adminBundles.status", "Status")}</TableHead>
                                <TableHead>{t("adminBundles.actions", "Actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        {t("adminBundles.loadingBundles", "Loading bundles...")}
                                    </TableCell>
                                </TableRow>
                            ) : bundles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        {t("adminBundles.noBundlesCreatedYet", "No bundles created yet")}
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
                                                        <p className="text-xs text-muted-foreground/60 truncate max-w-[200px]">{bundle.description}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {bundle.courses.map((c) => (
                                                        <div key={c.id} className="flex items-center gap-1 text-xs">
                                                            <BookOpen className="h-3 w-3 text-muted-foreground/60" />
                                                            <span className="truncate max-w-[150px]">{c.title}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground line-through">
                                                {formatPrice(bundle.original_price, bundle.currency)}
                                            </TableCell>
                                            <TableCell className="font-bold text-primary">
                                                {formatPrice(bundle.bundle_price, bundle.currency)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-warning-surface text-warning">{t("adminBundles.off", "{{count}}% OFF", { count: discount })}</Badge>
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
                                                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteBundle(bundle.id)}>
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingBundle ? t("adminBundles.editBundle", "Edit Bundle") : t("adminBundles.createBundle", "Create Bundle")}</DialogTitle>
                        <DialogDescription>
                            {editingBundle ? t("adminBundles.updateBundleDetails", "Update bundle details") : t("adminBundles.combineCoursesIntoADiscountedBundle", "Combine courses into a discounted bundle")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>{t("adminBundles.bundleTitle", "Bundle Title")}</Label>
                            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("adminBundles.eGDataScienceStarterPack", "e.g. Data Science Starter Pack")} />
                        </div>

                        <div>
                            <Label>{t("adminBundles.descriptionOptional", "Description (optional)")}</Label>
                            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("adminBundles.describeWhatSIncluded", "Describe what's included...")} rows={2} />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label>{t("adminBundles.bundlePrice", "Bundle Price")}</Label>
                                <Input type="number" value={bundlePrice} onChange={(e) => setBundlePrice(e.target.value)} placeholder="0" />
                            </div>
                            <div>
                                <Label>{t("adminBundles.currency", "Currency")}</Label>
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
                            <Label>{t("adminBundles.selectCoursesMin2", "Select Courses (min. 2)")}</Label>
                            <div className="border rounded-lg mt-1 max-h-48 overflow-y-auto">
                                {allCourses.map((course) => (
                                    <label
                                        key={course.id}
                                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted border-b last:border-0 ${selectedCourseIds.includes(course.id) ? "bg-leaf" : ""
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedCourseIds.includes(course.id)}
                                            onChange={() => toggleCourseSelection(course.id)}
                                            className="rounded"
                                        />
                                        <span className="flex-1 text-sm">{course.title}</span>
                                        <span className="text-xs text-muted-foreground/60">
                                            {course.is_free ? t("adminBundles.free", "Free") : formatPrice(course.price, course.currency)}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Price summary */}
                        {selectedCourseIds.length >= 2 && bundlePrice && (
                            <div className="bg-leaf p-3 rounded-lg text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t("adminBundles.originalTotal", "Original total:")}</span>
                                    <span className="line-through text-muted-foreground/60">{formatPrice(calculateOriginalPrice(), currency)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-primary">
                                    <span>{t("adminBundles.bundlePrice2", "Bundle price:")}</span>
                                    <span>{formatPrice(Number(bundlePrice), currency)}</span>
                                </div>
                                <div className="flex justify-between text-warning font-medium">
                                    <span>{t("adminBundles.savings", "Savings:")}</span>
                                    <span>
                                        {calculateOriginalPrice() > 0
                                            ? `${Math.round(((calculateOriginalPrice() - Number(bundlePrice)) / calculateOriginalPrice()) * 100)}% OFF`
                                            : "—"}
                                    </span>
                                </div>
                            </div>
                        )}

                        <Button onClick={handleSaveBundle} className="w-full bg-primary hover:bg-primary-hover">
                            {editingBundle ? t("adminBundles.updateBundle", "Update Bundle") : t("adminBundles.createBundle", "Create Bundle")}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
    </AppShell>
    );
}
