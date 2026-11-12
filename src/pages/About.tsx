import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/images/dataplus_logggg-removebg-preview.png"
              alt="DataPlus Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-bold text-[#006d2c]">Labs</span>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-gray-900">
              Our <span className="text-[#006d2c]">Story</span>
            </h1>
            <div className="w-24 h-1 bg-[#006d2c] mx-auto rounded-full"></div>
          </div>

          {/* White Card with Story */}
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-gray-100">
            <div className="space-y-8">
              {/* Paragraph 1 */}
              <div className="space-y-4">
                <p className="text-xl leading-relaxed text-gray-700">
                  Founded in <span className="font-bold text-[#006d2c] text-2xl">2021</span>, Data + Rwanda was established to bridge the growing gap in data and digital skills across Rwanda and the East African region.
                </p>
              </div>

              {/* Divider */}
              <div className="border-t-2 border-[#006d2c]/20"></div>

              {/* Paragraph 2 */}
              <div className="space-y-4">
                <p className="text-xl leading-relaxed text-gray-700">
                  Through tailored training, research consultancy, and tech-driven solutions, we've empowered nearly <span className="font-bold text-[#006d2c] text-2xl">1,000 individuals</span> including over <span className="font-bold text-[#006d2c] text-2xl">500 professionals</span> across sectors like health, agriculture, education, and business with practical skills in data analytics and emerging technologies.
                </p>
              </div>

              {/* Divider */}
              <div className="border-t-2 border-[#006d2c]/20"></div>

              {/* Paragraph 3 */}
              <div className="space-y-4">
                <p className="text-xl leading-relaxed text-gray-700">
                  Today, our alumni work with leading national and international institutions, driving data-informed decisions and supporting Rwanda's vision of becoming a <span className="font-bold text-[#006d2c]">knowledge-based and innovation-led economy</span>.
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 pt-8 border-t-2 border-gray-100">
                {/* Stat 1 */}
                <div className="text-center p-6 bg-gradient-to-br from-[#006d2c]/5 to-green-50 rounded-2xl">
                  <p className="text-5xl font-bold text-[#006d2c] mb-2">1,000+</p>
                  <p className="text-gray-700 font-medium">Individuals Empowered</p>
                </div>

                {/* Stat 2 */}
                <div className="text-center p-6 bg-gradient-to-br from-[#006d2c]/5 to-green-50 rounded-2xl">
                  <p className="text-5xl font-bold text-[#006d2c] mb-2">500+</p>
                  <p className="text-gray-700 font-medium">Professionals Trained</p>
                </div>

                {/* Stat 3 */}
                <div className="text-center p-6 bg-gradient-to-br from-[#006d2c]/5 to-green-50 rounded-2xl">
                  <p className="text-5xl font-bold text-[#006d2c] mb-2">2021</p>
                  <p className="text-gray-700 font-medium">Year Founded</p>
                </div>
              </div>

              {/* Bottom CTA */}
              <div className="mt-12 text-center">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-[#006d2c] to-[#005523] text-white px-8 py-4 rounded-full shadow-lg">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-lg font-semibold">Empowering Rwanda's Digital Future</span>
                </div>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-12 text-center">
            <Button
              size="lg"
              onClick={() => navigate("/signup")}
              className="bg-[#006d2c] hover:bg-[#005523] text-white px-8 py-3 text-lg font-medium transition-colors duration-300"
            >
              Join Our Community
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default About;
