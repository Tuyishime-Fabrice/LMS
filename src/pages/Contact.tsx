import { PageBand } from "@/features/site/PageBand";
import { SiteHeader } from "@/features/site/SiteHeader";
import { useTranslation } from "react-i18next";
import { SiteFooter } from "@/features/site/SiteFooter";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Clock } from "lucide-react";

const Contact = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <PageBand eyebrow={t("contact.eyebrow", "Contact")} title={t("contact.title", "Talk to us")} body={t("contact.body", "Questions about a course, payment or training for your team? We reply within one working day.")} />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Side - Contact Information */}
            <div className="bg-card rounded-xl p-8 md:p-10 border border-border">
              <h2 className="text-3xl font-bold mb-8 text-forest">
                {t("contact.mainOffice", "Main office")}
              </h2>

              <div className="space-y-6">
                {/* Address */}
                <div className="flex items-start gap-4 p-4 rounded-xl">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-forest mb-1">{t("contact.address", "Address")}</h3>
                    <p className="text-foreground">
                      KG 5 Kimihurura, Kigali
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start gap-4 p-4 rounded-xl">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-forest mb-1">{t("contact.phone", "Phone")}</h3>
                    <a 
                      href="tel:+250784857317" 
                      className="text-foreground hover:text-primary transition-colors"
                    >
                      +250 784 857 317
                    </a>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="flex items-start gap-4 p-4 rounded-xl">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-forest mb-2">{t("contact.workingHours", "Working Hours")}</h3>
                    <div className="space-y-1 text-foreground">
                      <p><span className="font-semibold">{t("contact.monFri", "Mon-Fri:")}</span>{" "}{t("contact.n830am530pm", "8:30AM - 5:30PM")}</p>
                      <p><span className="font-semibold">{t("contact.sat", "Sat:")}</span>{" "}{t("contact.n900am100pm", "9:00AM - 1:00PM")}</p>
                      <p><span className="font-semibold text-destructive">{t("contact.sun", "Sun:")}</span>{" "}{t("contact.closed", "Closed")}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="mt-8">
                <Button
                  size="lg"
                  onClick={() => navigate("/signup")}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-6 text-lg font-medium transition-colors duration-300"
                >
                  {t("contact.getStartedToday", "Get Started Today")}
                </Button>
              </div>
            </div>

            {/* Right Side - Google Map */}
            <div className="bg-card rounded-xl overflow-hidden border border-border">
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
          <div className="mt-12 bg-card rounded-xl p-8 border border-border">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-forest mb-4">
                {t("contact.haveQuestions", "Have Questions?")}
              </h3>
              <p className="text-lg text-muted-foreground mb-6">
                {t("contact.weReHereToHelpReach", "We're here to help! Reach out to us during our working hours or schedule a visit to our office.")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => window.location.href = 'tel:+250784857317'}
                  className="border-primary text-primary hover:bg-primary-hover hover:text-white transition-colors duration-300"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  {t("contact.callUsNow", "Call Us Now")}
                </Button>
                <Button
                  size="lg"
                  onClick={() => navigate("/about")}
                  className="bg-primary hover:bg-primary-hover text-white transition-colors duration-300"
                >
                  {t("contact.learnMoreAboutUs", "Learn More About Us")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Contact;
