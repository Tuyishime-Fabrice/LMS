import { Button } from "@/components/ui/button";
import { ArrowRight, BarChart, LineChart } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const B2BSection = () => {
    return (
        <section className="py-20 bg-white">
            <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-2 gap-8">
                    {/* B2B Card */}
                    <div className="bg-gray-900 rounded-3xl p-10 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/20 rounded-full blur-3xl group-hover:bg-green-500/30 transition-colors" />
                        <h3 className="text-3xl font-bold mb-4">Train Your Team</h3>
                        <p className="text-gray-300 mb-8 max-w-sm">
                            Tailored corporate training programs for organizations looking to build internal data capacity.
                        </p>
                        <Button className="bg-white text-black hover:bg-gray-100">
                            Partner With DATA+
                        </Button>
                    </div>

                    {/* Research Card */}
                    <div className="bg-gray-50 rounded-3xl p-10 border border-gray-200 relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="p-2 bg-green-100 text-[#006d2c] rounded-lg">
                                <BarChart className="w-6 h-6" />
                            </span>
                            <h3 className="text-2xl font-bold text-gray-900">Research Services</h3>
                        </div>
                        <p className="text-gray-600 mb-8">
                            We offer research consultancy, M&E system design, and custom data dashboard development.
                        </p>
                        <Button variant="outline" className="border-gray-300">
                            Explore Services
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    )
}

export const FinalCTASection = () => {
    const navigate = useNavigate();
    return (
        <section className="py-24 relative overflow-hidden">
            {/* Background Image */}
            <div className="absolute inset-0 -z-10">
                <img
                    src="/images/Screenshot 2025-10-25 193149 (1).webp"
                    alt="Background"
                    className="w-full h-full object-cover"
                />
                {/* Dark overlay for text visibility */}
                <div className="absolute inset-0 bg-black/70"></div>
            </div>

            <div className="container mx-auto px-6 text-center relative z-10">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-poppins">Ready to Start Learning?</h2>
                <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
                    Join the next cohort of professionals transforming their careers with data.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        size="lg"
                        className="bg-[#006d2c] hover:bg-[#005523] text-white px-8 h-14 text-lg"
                        onClick={() => navigate("/signup")}
                    >
                        Join Next Cohort
                    </Button>
                    <Button
                        size="lg"
                        variant="outline"
                        className="bg-transparent border-white text-white hover:bg-white hover:text-black px-8 h-14 text-lg"
                        onClick={() => navigate("/courses")}
                    >
                        Browse Courses
                    </Button>
                </div>
            </div>
        </section>
    )
}

export const Footer = () => {
    return (
        <footer className="bg-gray-900 text-gray-300 py-6 text-sm">
            <div className="container mx-auto px-6">
                <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-8 mb-6 items-center">
                    {/* Brand */}
                    <div className="lg:col-span-1">
                        <div className="flex items-center gap-2 mb-6">
                            <img src="/images/dataplus_logggg-removebg-preview.png" alt="Logo" className="w-8 h-8 opacity-90 grayscale brightness-200" />
                            <span className="text-white font-bold text-xl">DATA+</span>
                        </div>
                        <p className="leading-relaxed opacity-80">
                            Empowering Africa's workforce with practical data, AI, and project management skills.
                        </p>
                    </div>

                    {/* Courses */}
                    <div>
                        <h4 className="text-white font-bold mb-4">Courses</h4>
                        <ul className="space-y-3">
                            <li><a href="#" className="hover:text-white transition-colors">Data Science</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Monitoring &amp; Evaluation</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">Project Management</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">AI &amp; Digital Skills</a></li>
                        </ul>
                    </div>

                    {/* Connect */}
                    <div>
                        <h4 className="text-white font-bold mb-4">Connect</h4>
                        <ul className="space-y-3">
                            <li><a href="https://www.linkedin.com/company/data-consultant-ltd/" target="_blank" className="hover:text-white transition-colors">LinkedIn</a></li>
                            <li><a href="https://x.com/dataplusco" target="_blank" className="hover:text-white transition-colors">X (Twitter)</a></li>
                            <li><a href="https://www.instagram.com/dataplus_rwanda/" target="_blank" className="hover:text-white transition-colors">Instagram</a></li>
                            <li><a href="mailto:info@dataplusrwanda.com" className="hover:text-white transition-colors">info@dataplusrwanda.com</a></li>
                        </ul>
                    </div>

                    {/* Trust Seal — right column, zoomed with CSS scale */}
                    <div className="flex items-center justify-center overflow-visible">
                        <img
                            src="/images/seal.png"
                            alt="DBI Certified EdTech Trust Seal"
                            style={{ transform: "scale(2.5)", transformOrigin: "center center" }}
                            className="h-40 w-40 object-contain drop-shadow-[0_0_20px_rgba(255,200,50,0.35)]"
                        />
                    </div>
                </div>

                <div className="border-t border-gray-800 pt-5 flex flex-col md:flex-row justify-between gap-4">
                    <p>© 2026 DataPlus Labs. All rights reserved.</p>
                    <div className="flex gap-6">
                        <a href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</a>
                    </div>
                </div>
            </div>
        </footer>
    )
}
