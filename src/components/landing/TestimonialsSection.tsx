import { useState, useEffect } from "react";
import { Quote, Briefcase, GraduationCap, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Testimonial = {
    id: string;
    student_name: string;
    student_image_url: string | null;
    testimonial_text: string;
    profession: string | null;
    programs_participated: string | null;
    career_impact: string | null;
    rating: number;
};

export const TestimonialsSection = () => {
    const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTestimonials = async () => {
            try {
                const { data, error } = await supabase
                    .from("testimonials")
                    .select("id, student_name, student_image_url, testimonial_text, profession, programs_participated, career_impact, rating")
                    .eq("is_featured", true)
                    .order("display_order", { ascending: true });

                if (error) throw error;
                setTestimonials(data || []);
            } catch (err) {
                console.error("Error fetching testimonials:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTestimonials();
    }, []);

    if (loading) {
        return (
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl font-bold text-gray-900">What Our Graduates Say</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="animate-pulse bg-white rounded-2xl p-8 shadow-sm">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-gray-200 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-3 bg-gray-200 rounded w-full" />
                                    <div className="h-3 bg-gray-200 rounded w-4/5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    if (testimonials.length === 0) return null;

    return (
        <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-14">
                    <span className="inline-block px-4 py-1.5 bg-[#006d2c]/10 text-[#006d2c] text-sm font-semibold rounded-full mb-4">
                        Testimonials
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                        What Our Graduates Say
                    </h2>
                    <p className="text-gray-500 max-w-xl mx-auto">
                        Real stories from professionals who transformed their careers through our programs.
                    </p>
                </div>

                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {testimonials.map((t) => (
                        <div
                            key={t.id}
                            className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-gray-200 transition-all duration-300 flex flex-col"
                        >
                            {/* Quote Icon */}
                            <div className="mb-5">
                                <div className="w-10 h-10 bg-[#006d2c]/10 rounded-xl flex items-center justify-center">
                                    <Quote className="w-5 h-5 text-[#006d2c]" />
                                </div>
                            </div>

                            {/* Testimonial Quote */}
                            <p className="text-gray-600 text-sm leading-relaxed italic mb-6 flex-grow">
                                "{t.testimonial_text}"
                            </p>

                            {/* Career Impact */}
                            {t.career_impact && (
                                <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-100">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-4 h-4 text-[#006d2c]" />
                                        <span className="text-xs font-semibold text-[#006d2c] uppercase tracking-wide">Career Impact</span>
                                    </div>
                                    <p className="text-sm text-gray-700 leading-relaxed">{t.career_impact}</p>
                                </div>
                            )}

                            {/* Programs */}
                            {t.programs_participated && (
                                <div className="flex items-start gap-2 mb-5">
                                    <GraduationCap className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                                    <div>
                                        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-0.5">Programs</span>
                                        <span className="text-sm text-gray-600">{t.programs_participated}</span>
                                    </div>
                                </div>
                            )}

                            {/* Divider */}
                            <div className="border-t border-gray-100 pt-5 mt-auto">
                                <div className="flex items-center gap-4">
                                    {/* Avatar */}
                                    {t.student_image_url ? (
                                        <img
                                            src={t.student_image_url}
                                            alt={t.student_name}
                                            className="w-14 h-14 rounded-full object-cover ring-2 ring-gray-100"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-[#006d2c] flex items-center justify-center text-white text-xl font-bold ring-2 ring-green-100">
                                            {t.student_name.charAt(0)}
                                        </div>
                                    )}

                                    {/* Name & Profession */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 text-base truncate">{t.student_name}</h4>
                                        {t.profession && (
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <Briefcase className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span className="text-sm text-gray-500 truncate">{t.profession}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
