import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { beginPaymentSignUp, clearPaymentReturn } from "@/lib/coursePaymentReturn";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, BookOpen, Tag, Percent } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/services/paymentService";
import { PurchaseDialog } from "@/components/PurchaseDialog";

interface Bundle {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    original_price: number;
    bundle_price: number;
    currency: string;
    is_active: boolean;
    courses: {
        id: string;
        title: string;
        thumbnail_url: string | null;
    }[];
}

export default function BrowseBundles() {
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [searchParams] = useSearchParams();
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [loading, setLoading] = useState(true);
    const [purchaseBundle, setPurchaseBundle] = useState<Bundle | null>(null);

    useEffect(() => {
        fetchBundles();
    }, []);

    useEffect(() => {
        if (authLoading || !user || loading || searchParams.get("paymentStep") !== "payment") return;
        const bundle = bundles.find((item) => item.id === searchParams.get("bundle"));
        if (!bundle) return;
        setPurchaseBundle(bundle);
        clearPaymentReturn();
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete("paymentStep");
        navigate({ pathname: window.location.pathname, search: nextParams.toString(), hash: window.location.hash }, { replace: true });
    }, [authLoading, user, loading, bundles, searchParams, navigate]);

    const fetchBundles = async () => {
        setLoading(true);
        try {
            const { data: bundlesData, error: bundlesError } = await supabase
                .from("course_bundles")
                .select("*")
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            if (bundlesError) throw bundlesError;

            const bundleIds = (bundlesData || []).map((bundle) => bundle.id);
            let coursesByBundle = new Map<string, Bundle["courses"]>();

            if (bundleIds.length > 0) {
                const { data: bundleCourses, error: bundleCoursesError } = await supabase
                    .from("bundle_courses")
                    .select("bundle_id, courses:course_id(id, title, thumbnail_url)")
                    .in("bundle_id", bundleIds);

                if (bundleCoursesError) throw bundleCoursesError;

                coursesByBundle = (bundleCourses || []).reduce((map, bundleCourse: any) => {
                    const existingCourses = map.get(bundleCourse.bundle_id) || [];
                    if (bundleCourse.courses) {
                        existingCourses.push(bundleCourse.courses);
                    }
                    map.set(bundleCourse.bundle_id, existingCourses);
                    return map;
                }, new Map<string, Bundle["courses"]>());
            }

            const bundlesWithCourses: Bundle[] = (bundlesData || []).map((bundle) => ({
                ...bundle,
                courses: coursesByBundle.get(bundle.id) || [],
            }));

            setBundles(bundlesWithCourses);
        } catch (error) {
            console.error("Error fetching bundles:", error);
        } finally {
            setLoading(false);
        }
    };

    const getDiscount = (original: number, discounted: number) => {
        if (original <= 0) return 0;
        return Math.round(((original - discounted) / original) * 100);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#133223] to-[#006d2c] text-white py-12 px-4">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-3 mb-4">
                        <Package className="h-8 w-8" />
                        <h1 className="text-3xl font-bold">Course Bundles</h1>
                    </div>
                    <p className="text-lg text-white/80 max-w-2xl">
                        Save more by purchasing course bundles! Get multiple courses at a discounted price.
                    </p>
                </div>
            </div>

            {/* Bundles Grid */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-80 bg-gray-200 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : bundles.length === 0 ? (
                    <div className="text-center py-16">
                        <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-gray-600 mb-2">No bundles available</h2>
                        <p className="text-gray-500">Check back later for special offers!</p>
                        <Button onClick={() => navigate("/courses")} className="mt-4 bg-[#006d2c] hover:bg-[#005523]">
                            Browse Individual Courses
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bundles.map((bundle) => {
                            const discount = getDiscount(bundle.original_price, bundle.bundle_price);
                            return (
                                <Card
                                    key={bundle.id}
                                    className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-md group"
                                >
                                    {/* Bundle header */}
                                    <div className="relative bg-gradient-to-br from-purple-600 to-indigo-700 p-6 text-white">
                                        {discount > 0 && (
                                            <Badge className="absolute top-3 right-3 bg-amber-500 text-white text-sm font-bold">
                                                <Percent className="h-3.5 w-3.5 mr-1" />
                                                {discount}% OFF
                                            </Badge>
                                        )}
                                        <Package className="h-10 w-10 mb-3 opacity-80" />
                                        <h3 className="text-xl font-bold mb-1">{bundle.title}</h3>
                                        {bundle.description && (
                                            <p className="text-sm text-white/75 line-clamp-2">{bundle.description}</p>
                                        )}
                                    </div>

                                    <CardContent className="p-5 space-y-4">
                                        {/* Included courses */}
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                                                {bundle.courses.length} Courses Included
                                            </p>
                                            <div className="space-y-2">
                                                {bundle.courses.map((course) => (
                                                    <div key={course.id} className="flex items-center gap-2 text-sm">
                                                        <BookOpen className="h-4 w-4 text-[#006d2c] flex-shrink-0" />
                                                        <span className="truncate">{course.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Pricing */}
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-[#006d2c]">
                                                {formatPrice(bundle.bundle_price, bundle.currency)}
                                            </span>
                                            {bundle.original_price > bundle.bundle_price && (
                                                <span className="text-sm text-gray-400 line-through">
                                                    {formatPrice(bundle.original_price, bundle.currency)}
                                                </span>
                                            )}
                                        </div>

                                        {/* CTA */}
                                        <Button
                                            className="w-full bg-[#006d2c] hover:bg-[#005523] text-white h-11"
                                            onClick={() => {
                                                if (!user) {
                                                    navigate(beginPaymentSignUp(`/bundles?bundle=${bundle.id}`));
                                                    return;
                                                }
                                                setPurchaseBundle(bundle);
                                            }}
                                        >
                                            <Tag className="h-4 w-4 mr-2" />
                                            Claim Offer
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Purchase Dialog */}
            {purchaseBundle && (
                <PurchaseDialog
                    open={!!purchaseBundle}
                    onOpenChange={(open) => !open && setPurchaseBundle(null)}
                    type="bundle"
                    item={{
                        id: purchaseBundle.id,
                        title: purchaseBundle.title,
                        price: purchaseBundle.bundle_price,
                        currency: purchaseBundle.currency,
                    }}
                    onSuccess={() => {
                        setPurchaseBundle(null);
                        fetchBundles();
                    }}
                />
            )}
        </div>
    );
}
