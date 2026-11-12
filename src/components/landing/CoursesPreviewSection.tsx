import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Users, ArrowRight, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Define simpler type for the grid
type Course = {
    id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    level: string | null;
    category: string | null;
    duration: string | null;
    mode: string | null;
    profiles: {
        full_name: string;
    } | null;
};

export const CoursesPreviewSection = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("All");
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);

    const categories = ["All", "Data & Analytics", "AI & Digital Skills", "Project Management", "MEL", "Business & Finance"];

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                let query = supabase
                    .from("courses")
                    .select(`
            id,
            title,
            description,
            thumbnail_url,
            level,
            category,
            duration,
            mode,
            profiles (
              full_name
            )
          `)
                    .limit(8);

                if (activeTab !== "All") {
                    //   query = query.eq('category', activeTab); // Filter logic if category exists
                    // Note: Since 'category' might be null in old records, we handle filtering carefully.
                    // Ideally we apply filter here, but for now let's filter client side if only few courses
                }

                const { data, error } = await query;
                if (error) throw error;
                setCourses(data || []);
            } catch (error) {
                console.error("Error fetching courses:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCourses();
    }, [activeTab]);

    const filteredCourses = activeTab === "All"
        ? courses
        : courses.filter(c => c.category === activeTab || (!c.category && activeTab === "Data & Analytics")); // Fallback for demo

    return (
        <section id="courses" className="py-24 bg-white relative">
            {/* Decorative Blob */}
            <div className="absolute top-40 left-0 w-72 h-72 bg-blue-50/50 rounded-full blur-3xl -z-10" />

            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                    <div className="max-w-2xl">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4 font-poppins">
                            Explore Our <span className="text-[#006d2c]">Learning Tracks</span>
                        </h2>
                        <p className="text-gray-600">
                            Select a category to find the perfect course for your career goals.
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate("/courses")}
                        variant="ghost"
                        className="text-[#006d2c] hover:text-[#005523] hover:bg-green-50 group"
                    >
                        View Full Catalog
                        <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-12 border-b border-gray-100 pb-4">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveTab(cat)}
                            className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === cat
                                ? "bg-[#006d2c] text-white shadow-lg shadow-green-900/20"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {loading ? (
                        [1, 2, 3, 4].map(i => (
                            <div key={i} className="h-96 bg-gray-100 rounded-2xl animate-pulse" />
                        ))
                    ) : filteredCourses.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-500">No courses found in this category yet.</p>
                        </div>
                    ) : (
                        filteredCourses.map((course) => (
                            <Card
                                key={course.id}
                                className="group bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full"
                                onClick={() => navigate(`/course/${course.id}`)}
                            >
                                <div className="relative h-48 overflow-hidden">
                                    <img
                                        src={course.thumbnail_url || "/images/placeholder.jpg"}
                                        alt={course.title}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-[#006d2c]">
                                        {course.level || "Beginner"}
                                    </div>
                                    {course.mode && (
                                        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-white">
                                            {course.mode}
                                        </div>
                                    )}
                                </div>

                                <CardContent className="p-6 flex flex-col flex-grow">
                                    <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">
                                        {course.category || "Development"}
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-[#006d2c] transition-colors">
                                        {course.title}
                                    </h3>

                                    <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between text-sm text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-4 h-4" />
                                            <span>{course.duration || "Self-paced"}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-[#006d2c]" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
};
