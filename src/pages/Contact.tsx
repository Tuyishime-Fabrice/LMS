import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Phone, Clock } from "lucide-react";

const Contact = () => {
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
        <div className="max-w-6xl mx-auto">
          {/* Page Title */}
          <div className="text-center mb-12">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 text-gray-900">
              Contact <span className="text-[#006d2c]">Us</span>
            </h1>
            <div className="w-24 h-1 bg-[#006d2c] mx-auto rounded-full"></div>
            <p className="mt-4 text-xl text-gray-600">Get in touch with us</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Left Side - Contact Information */}
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 border border-gray-100">
              <h2 className="text-3xl font-bold mb-8 text-gray-900">
                Main <span className="text-[#006d2c]">Office</span>
              </h2>

              <div className="space-y-6">
                {/* Address */}
                <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-[#006d2c]/5 to-green-50 rounded-2xl">
                  <div className="w-12 h-12 bg-[#006d2c] rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">Address</h3>
                    <p className="text-gray-700">
                      KG 5 Kimihurura, Kigali
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-[#006d2c]/5 to-green-50 rounded-2xl">
                  <div className="w-12 h-12 bg-[#006d2c] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-1">Phone</h3>
                    <a 
                      href="tel:+250784857317" 
                      className="text-gray-700 hover:text-[#006d2c] transition-colors"
                    >
                      +250 784 857 317
                    </a>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="flex items-start gap-4 p-4 bg-gradient-to-br from-[#006d2c]/5 to-green-50 rounded-2xl">
                  <div className="w-12 h-12 bg-[#006d2c] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 mb-2">Working Hours</h3>
                    <div className="space-y-1 text-gray-700">
                      <p><span className="font-semibold">Mon-Fri:</span> 8:30AM - 5:30PM</p>
                      <p><span className="font-semibold">Sat:</span> 9:00AM - 1:00PM</p>
                      <p><span className="font-semibold text-red-600">Sun:</span> Closed</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="mt-8">
                <Button
                  size="lg"
                  onClick={() => navigate("/signup")}
                  className="w-full bg-[#006d2c] hover:bg-[#005523] text-white py-6 text-lg font-medium transition-colors duration-300"
                >
                  Get Started Today
                </Button>
              </div>
            </div>

            {/* Right Side - Google Map */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
              <div className="h-full min-h-[600px]">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3987.4876449891844!2d30.089999!3d-1.9536111!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x19dca425d3ddc5b1%3A0x8e8e8e8e8e8e8e8e!2sKimihurura%2C%20Kigali%2C%20Rwanda!5e0!3m2!1sen!2sus!4v1234567890123!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="DataPlus Labs Location"
                  className="w-full h-full"
                ></iframe>
              </div>
            </div>
          </div>

          {/* Bottom Section - Additional Info */}
          <div className="mt-12 bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Have Questions?
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                We're here to help! Reach out to us during our working hours or schedule a visit to our office.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => window.location.href = 'tel:+250784857317'}
                  className="border-[#006d2c] text-[#006d2c] hover:bg-[#006d2c] hover:text-white transition-colors duration-300"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Call Us Now
                </Button>
                <Button
                  size="lg"
                  onClick={() => navigate("/about")}
                  className="bg-[#006d2c] hover:bg-[#005523] text-white transition-colors duration-300"
                >
                  Learn More About Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Contact;
