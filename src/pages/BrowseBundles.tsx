import { usePageMeta } from "@/lib/pageMeta";
import { PageBand } from "@/features/site/PageBand";
import { SiteHeader } from "@/features/site/SiteHeader";
import { useTranslation } from "react-i18next";
import { SiteFooter } from "@/features/site/SiteFooter";
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
  const { t } = useTranslation();
  usePageMeta({ title: t("meta.bundles.title", "Course bundles"), description: t("meta.bundles.description", "Groups of DATA+ Academy courses offered together at one price."), path: "/bundles" });
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
        <div className="min-h-screen bg-muted/50">
          <SiteHeader />
            <PageBand eyebrow={t("browseBundles.eyebrow", "Learning paths")} title={t("browseBundles.title", "Learning paths")} body={t("browseBundles.body", "Courses that build on each other, at a lower price than buying them one by one.")} />

            {/* Bundles Grid */}
            <div className="mx-auto max-w-site px-4 py-10 sm:px-6 lg:px-8">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-80 bg-border rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : bundles.length === 0 ? (
                    <div className="text-center py-16">
                        <Package className="h-16 w-16 text-muted-foreground/60 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-muted-foreground mb-2">{t("browseBundles.noBundlesAvailable", "No bundles available")}</h2>
                        <p className="text-muted-foreground">{t("browseBundles.checkBackLaterForSpecialOffers", "Check back later for special offers!")}</p>
                        <Button onClick={() => navigate("/courses")} className="mt-4 bg-action hover:bg-action-hover">
                            {t("browseBundles.browseIndividualCourses", "Browse Individual Courses")}
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {bundles.map((bundle) => {
                            const discount = getDiscount(bundle.original_price, bundle.bundle_price);
                            return (
                                <Card
                                    key={bundle.id}
                                    className="overflow-hidden transition-all duration-300 border-0 group"
                                >
                                    {/* Bundle header */}
                                    <div className="relative p-6 text-white bg-forest">
                                        {discount > 0 && (
                                            <Badge className="absolute top-3 right-3 bg-warning text-white text-sm font-bold">
                                                <Percent className="h-3.5 w-3.5 mr-1" />
                                                {discount}{t("browseBundles.off", "% OFF")}
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
                                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                                {t("browseBundles.coursesIncluded", "{{count}} Courses Included", { count: bundle.courses.length })}
                                            </p>
                                            <div className="space-y-2">
                                                {bundle.courses.map((course) => (
                                                    <div key={course.id} className="flex items-center gap-2 text-sm">
                                                        <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                                                        <span className="truncate">{course.title}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Pricing */}
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-2xl font-bold text-primary">
                                                {formatPrice(bundle.bundle_price, bundle.currency)}
                                            </span>
                                            {bundle.original_price > bundle.bundle_price && (
                                                <span className="text-sm text-muted-foreground/60 line-through">
                                                    {formatPrice(bundle.original_price, bundle.currency)}
                                                </span>
                                            )}
                                        </div>

                                        {/* CTA */}
                                        <Button
                                            className="w-full bg-action hover:bg-action-hover text-white h-11"
                                            onClick={() => {
                                                if (!user) {
                                                    navigate(beginPaymentSignUp(`/bundles?bundle=${bundle.id}`));
                                                    return;
                                                }
                                                setPurchaseBundle(bundle);
                                            }}
                                        >
                                            <Tag className="h-4 w-4 mr-2" />
                                            {t("browseBundles.claimOffer", "Claim Offer")}
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
          <SiteFooter />
        </div>
    );
}
