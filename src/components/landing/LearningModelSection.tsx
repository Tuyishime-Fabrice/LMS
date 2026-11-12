import { UserPlus, Presentation, Layout, Award } from "lucide-react";

export const LearningModelSection = () => {
    const steps = [
        {
            id: "01",
            icon: <UserPlus className="w-6 h-6" />,
            title: "Enroll",
            description: "Sign up and join a cohort that fits your schedule."
        },
        {
            id: "02",
            icon: <Presentation className="w-6 h-6" />,
            title: "Attend Sessions",
            description: "Join live expert-led classes and workshops."
        },
        {
            id: "03",
            icon: <Layout className="w-6 h-6" />,
            title: "Build Capstone",
            description: "Apply your skills to solve a real-world problem."
        },
        {
            id: "04",
            icon: <Award className="w-6 h-6" />,
            title: "Certification",
            description: "Earn a recognized certificate and portfolio."
        }
    ];

    return (
        <section className="py-24 bg-gradient-to-br from-[#006d2c] to-[#004d1f] text-white overflow-hidden relative">
            {/* Background patterns */}
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "30px 30px" }}></div>

            <div className="container mx-auto px-6 relative z-10">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4 font-poppins">How It Works</h2>
                    <p className="text-green-100 max-w-xl mx-auto">Your journey from beginner to professional in 4 steps.</p>
                </div>

                <div className="relative">
                    {/* Connecting Line (Desktop) */}
                    <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 bg-white/20 -translate-y-1/2 rounded-full" />

                    <div className="grid md:grid-cols-4 gap-8">
                        {steps.map((step, index) => (
                            <div key={index} className="relative group">
                                {/* Step Circle */}
                                <div className="w-16 h-16 mx-auto bg-green-900 border-4 border-[#00ff88] rounded-full flex items-center justify-center text-[#00ff88] shadow-lg shadow-black/20 group-hover:scale-110 transition-transform duration-300 relative z-10 mb-6 font-bold text-xl">
                                    {step.id}
                                </div>

                                {/* Content */}
                                <div className="text-center bg-white/5 backdrop-blur-sm p-6 rounded-2xl hover:bg-white/10 transition-colors border border-white/10 h-full">
                                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                                        {step.icon}
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                                    <p className="text-green-100 text-sm leading-relaxed">{step.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};
