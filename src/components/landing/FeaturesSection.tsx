import { Laptop, Award, Users, Globe, Network, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const FeaturesSection = () => {
    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                    <div className="max-w-2xl">
                        <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 font-poppins leading-tight">
                            Why the Top 1% of <br />
                            <span className="text-[#006d2c]">African Talent</span> start here.
                        </h2>
                        <p className="text-gray-600 text-lg">
                            We don't match the standard. We set a new one. A curriculum designed for the reality of Africa's digital economy.
                        </p>
                    </div>
                    <div className="hidden md:block">
                        {/* Decorative element or secondary CTA if needed */}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* 1. Practical Learning - Dark Card (Large) */}
                    <div className="md:col-span-2 bg-[#0a0f1c] rounded-3xl p-8 md:p-12 relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div className="mb-8">
                                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-6 text-[#00ff88]">
                                    <Laptop className="w-7 h-7" />
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-4">Practical, Tool-First Learning</h3>
                                <p className="text-gray-400 max-w-md leading-relaxed">
                                    Forget dry theory. You'll spend 80% of your time in Python, R, PowerBI, and SQL—solving real problems on day one.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                {['Python', 'SQL', 'PowerBI', 'Excel'].map((tool) => (
                                    <span key={tool} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300">
                                        {tool}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {/* Decorative Pattern using CSS gradients */}
                        <div className="absolute right-0 top-0 w-64 h-64 bg-[#006d2c] opacity-20 blur-[100px] rounded-full pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-full h-full opacity-10"
                            style={{ backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                    </div>

                    {/* 2. Built for Africa - Vertical Card */}
                    <div className="md:col-span-1 md:row-span-2 bg-gradient-to-b from-[#f0fdf4] to-white border border-green-100 rounded-3xl p-8 relative overflow-hidden group">
                        <div className="relative z-10">
                            <div className="w-14 h-14 bg-[#006d2c]/10 rounded-2xl flex items-center justify-center mb-6 text-[#006d2c]">
                                <Globe className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Built for Africa's Context</h3>
                            <p className="text-gray-600 mb-8 leading-relaxed">
                                Data isn't just numbers; it's people. We teach you how to gather quality data in resource-constrained environments and turn it into policy-shaping insights.
                            </p>

                            {/* Abstract Map Visualization (CSS Only) */}
                            <div className="relative h-48 w-full mt-auto">
                                <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-20" />
                                {/* Circles representing nodes */}
                                <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-[#006d2c] rounded-full animate-ping" />
                                <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-[#006d2c] rounded-full" />

                                <div className="absolute top-2/3 right-1/3 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                                <div className="absolute bottom-1/4 left-1/2 w-2 h-2 bg-blue-500 rounded-full" />

                                {/* Connecting lines */}
                                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                                    <path d="M 80 60 Q 150 150 200 180" stroke="#006d2c" strokeWidth="1" strokeDasharray="4 4" fill="none" className="opacity-30" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    {/* 3. Capstone Projects */}
                    <div className="md:col-span-1 bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 group">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform">
                            <Award className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Capstone Portfolio</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Don't just graduate with a certificate. Graduate with a solved problem and a portfolio that gets you hired.
                        </p>
                    </div>

                    {/* 4. Industry Expert */}
                    <div className="md:col-span-1 bg-white border border-gray-100 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 group">
                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-6 text-orange-600 group-hover:scale-110 transition-transform">
                            <Users className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-3">Expert Mentorship</h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Learn directly from seniors who are currently leading data teams at top NGOs and tech firms.
                        </p>
                    </div>

                    {/* 5. Hybrid Delivery - Full Width Bottom (or Split) */}
                    <div className="md:col-span-3 bg-gray-50 rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 group hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">
                                    <Network className="w-5 h-5" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Flexible Hybrid Delivery</h3>
                            </div>
                            <p className="text-gray-600 max-w-2xl">
                                Designed for working professionals. specific in-person workshops for deep dives, combined with flexible online learning for the rest.
                            </p>
                        </div>

                    </div>

                </div>
            </div>
        </section>
    );
};
