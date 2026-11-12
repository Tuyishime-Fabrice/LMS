import { Briefcase, GraduationCap, Building2, Users } from "lucide-react";

export const TargetAudienceSection = () => {
    const audiences = [
        {
            icon: <Briefcase className="w-6 h-6" />,
            title: "Professionals",
            desc: "Upskill to advance your career or shift into data roles."
        },
        {
            icon: <GraduationCap className="w-6 h-6" />,
            title: "Master’s Students",
            desc: "Gain practical skills to support your academic research."
        },
        {
            icon: <Building2 className="w-6 h-6" />,
            title: "NGO Staff",
            desc: "Enhance M&E systems and reporting capabilities."
        },
        {
            icon: <Users className="w-6 h-6" />,
            title: "Consultants",
            desc: "Deliver data-driven value to your clients."
        }
    ];

    return (
        <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-6">
                <h2 className="text-3xl font-bold text-center mb-12 font-poppins">Who is this for?</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {audiences.map((aud, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-lg transition-shadow text-center border border-gray-100">
                            <div className="w-14 h-14 mx-auto bg-[#006d2c]/10 rounded-full flex items-center justify-center text-[#006d2c] mb-4">
                                {aud.icon}
                            </div>
                            <h3 className="font-bold text-gray-900 mb-2">{aud.title}</h3>
                            <p className="text-sm text-gray-600">{aud.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};
