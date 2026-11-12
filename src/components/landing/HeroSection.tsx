import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Users, BookOpen, Award } from "lucide-react";

export const HeroSection = () => {
    const navigate = useNavigate();

    return (
        <section id="home" className="relative min-h-screen flex items-center overflow-hidden">

            {/* Video Background */}
            <div className="absolute inset-0 z-0">
                <video
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                    poster="/image1.jpg"
                >
                    <source src="/videos/A_group_of_202511231942_dqqwc.mp4" type="video/mp4" />
                </video>
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/55" />
                {/* Clean white bottom line */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white" />
            </div>

            {/* Floating Particles Effect */}
            <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-[#006d2c]/30 rounded-full animate-pulse" />
                <div className="absolute top-1/3 right-1/3 w-3 h-3 bg-white/10 rounded-full animate-bounce" style={{ animationDelay: '1s', animationDuration: '3s' }} />
                <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-[#006d2c]/20 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Content */}
            <div className="container mx-auto px-6 relative z-10 pt-28 pb-20">
                <div className="max-w-3xl">

                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 mb-8 animate-fade-in">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                        </span>
                        <span className="text-xs font-semibold text-white/90 uppercase tracking-widest">
                            Enrolling Now — Limited Seats
                        </span>
                    </div>

                    {/* Headline */}
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.1] text-white mb-6 tracking-tight">
                        Build Practical{" "}
                        <span className="text-[#00c853]">Data & AI</span>{" "}
                        Skills for Africa's Future
                    </h1>

                    {/* Subheading */}
                    <p className="text-lg md:text-xl text-white/70 leading-relaxed max-w-2xl mb-10">
                        Expert-led cohorts in data science, AI, M&E, and project management.
                        Real-world capstone projects. Industry-recognized certifications.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button
                            onClick={() => navigate("/courses")}
                            size="lg"
                            className="bg-[#006d2c] hover:bg-[#005523] text-white px-8 py-7 text-base font-semibold shadow-2xl shadow-green-900/30 transition-all hover:scale-105 hover:shadow-green-900/40 rounded-xl group"
                        >
                            Browse Courses
                            <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                        </Button>
                        <Button
                            onClick={() => document.getElementById("partner-dialog")?.click()}
                            variant="ghost"
                            size="lg"
                            className="bg-transparent border border-white/30 text-white hover:bg-white/10 px-8 py-7 text-base font-semibold rounded-xl transition-all"
                        >
                            Partner With Us
                        </Button>
                    </div>


                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
                <span className="text-white/40 text-xs font-medium tracking-widest uppercase">Scroll</span>
                <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
                    <div className="w-1.5 h-3 bg-white/50 rounded-full animate-bounce" />
                </div>
            </div>
        </section>
    );
};
