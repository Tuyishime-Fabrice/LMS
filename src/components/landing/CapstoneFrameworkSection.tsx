import { Database, Search, Hammer, PieChart, Lightbulb } from "lucide-react";

export const CapstoneFrameworkSection = () => {
    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-16 items-center">

                    {/* Left: Text Content */}
                    <div className="space-y-8">
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 font-poppins">
                            The <span className="text-[#006d2c]">Capstone</span> Framework
                        </h2>
                        <p className="text-lg text-gray-600 leading-relaxed">
                            We believe in learning by doing. Our Capstone Framework simulates real-world consulting projects, ensuring you don't just learn tools, but how to solve problems.
                        </p>

                        <div className="space-y-6">
                            <div className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div className="w-1 bg-[#006d2c] rounded-full" />
                                <p className="text-gray-700">
                                    <span className="font-bold text-gray-900 block mb-1">Prove Your Competence</span>
                                    Every student completes a rigorous project demonstrating their ability to turn data into insights.
                                </p>
                            </div>

                            <a href="/exhibition" className="inline-flex items-center gap-2 px-6 py-3 bg-[#006d2c] hover:bg-[#005523] text-white rounded-lg font-semibold transition-colors mt-4">
                                View Exhibition
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Right: Visual Blocks */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-blue-50 rounded-full blur-3xl -z-10" />

                        <div className="grid gap-4">
                            {[
                                { icon: <Search className="w-5 h-5" />, title: "Problem Definition", desc: "Formulate clearer research questions", color: "bg-red-100 text-red-700 border-red-200" },
                                { icon: <Database className="w-5 h-5" />, title: "Data / Evidence", desc: "Gather & clean real-world datasets", color: "bg-blue-100 text-blue-700 border-blue-200" },
                                { icon: <Hammer className="w-5 h-5" />, title: "Tools & Methods", desc: "Apply Python, R, PowerBI, SQL", color: "bg-purple-100 text-purple-700 border-purple-200" },
                                { icon: <PieChart className="w-5 h-5" />, title: "Analysis", desc: "Uncover patterns and insights", color: "bg-orange-100 text-orange-700 border-orange-200" },
                                { icon: <Lightbulb className="w-5 h-5" />, title: "Recommendations", desc: "Actionable strategies for stakeholders", color: "bg-green-100 text-green-700 border-green-200" },
                            ].map((item, i) => (
                                <div key={i} className={`flex items-center gap-4 p-5 rounded-xl border-l-4 bg-white shadow-sm hover:shadow-md transition-shadow ${item.color.replace('bg-', 'border-').split(' ')[2]}`}>
                                    <div className={`p-3 rounded-lg ${item.color}`}>
                                        {item.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{item.title}</h4>
                                        <p className="text-sm text-gray-500">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};
