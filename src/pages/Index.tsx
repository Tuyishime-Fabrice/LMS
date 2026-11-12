import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Import new modular components
import { HeroSection } from "@/components/landing/HeroSection";
import { PartnersSection } from "@/components/landing/PartnersSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { CoursesPreviewSection } from "@/components/landing/CoursesPreviewSection";
import { LearningModelSection } from "@/components/landing/LearningModelSection";
import { CapstoneFrameworkSection } from "@/components/landing/CapstoneFrameworkSection";
import { TargetAudienceSection } from "@/components/landing/TargetAudienceSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { B2BSection, FinalCTASection, Footer } from "@/components/landing/FooterInfo";

const Index = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
  const [partnerSubmitting, setPartnerSubmitting] = useState(false);
  const [partnerSuccess, setPartnerSuccess] = useState(false);
  const [partnerFormData, setPartnerFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    message: "",
  });

  const handlePartnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerFormData.name || !partnerFormData.email || !partnerFormData.phone || !partnerFormData.organization) {
      toast.error("Please fill in all required fields");
      return;
    }

    setPartnerSubmitting(true);
    try {
      const { error } = await supabase
        .from("partner_requests")
        .insert({
          name: partnerFormData.name,
          email: partnerFormData.email,
          phone: partnerFormData.phone,
          organization: partnerFormData.organization,
          message: partnerFormData.message || null,
        });

      if (error) throw error;
      setPartnerSuccess(true);
      setPartnerFormData({ name: "", email: "", phone: "", organization: "", message: "" });
    } catch (error) {
      console.error("Error submitting partner request:", error);
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setPartnerSubmitting(false);
    }
  };

  const closePartnerDialog = () => {
    setPartnerDialogOpen(false);
    setPartnerSuccess(false);
  };

  return (
    <div className="min-h-screen relative">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="bg-black/20 backdrop-blur-xl border-b border-white/10">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <img
                src="/images/dataplus_logggg-removebg-preview.png"
                alt="Logo"
                className="w-10 h-10 object-contain brightness-200"
              />
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#home" className="text-sm font-medium text-white/80 hover:text-white transition-colors">Home</a>
              <button onClick={() => navigate("/courses")} className="text-sm font-medium text-white/80 hover:text-white transition-colors">Courses</button>
              <button onClick={() => navigate("/about")} className="text-sm font-medium text-white/80 hover:text-white transition-colors">About</button>
              <button onClick={() => navigate("/contact")} className="text-sm font-medium text-white/80 hover:text-white transition-colors">Contact</button>
              <button onClick={() => navigate("/exhibition")} className="text-sm font-medium text-white/80 hover:text-white transition-colors">Exhibition</button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="hidden md:flex text-white/80 hover:text-white hover:bg-white/10"
              >
                Login
              </Button>
              <Button
                onClick={() => navigate("/signup")}
                className="bg-[#006d2c] hover:bg-[#005523] text-white font-medium rounded-full px-6 shadow-lg shadow-green-900/20"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden fixed top-5 right-6 z-[60] text-gray-900 p-2 bg-white rounded-lg shadow-md"
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white p-8 pt-24 animate-in slide-in-from-right">
          <div className="flex flex-col gap-6 text-xl font-medium">
            <a href="#home" onClick={() => setMobileMenuOpen(false)}>Home</a>
            <button onClick={() => { navigate("/courses"); setMobileMenuOpen(false); }} className="text-left">Courses</button>
            <button onClick={() => { navigate("/about"); setMobileMenuOpen(false); }} className="text-left">About</button>
            <button onClick={() => { navigate("/exhibition"); setMobileMenuOpen(false); }} className="text-left">Exhibition</button>
            <hr className="border-gray-100" />
            <button onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }} className="text-left text-[#006d2c]">Login</button>
            <Button onClick={() => { navigate("/signup"); setMobileMenuOpen(false); }} className="bg-[#006d2c] text-white">Sign Up</Button>
          </div>
        </div>
      )}

      {/* Main Content Sections */}
      <HeroSection />
      <PartnersSection />
      <FeaturesSection />
      <CoursesPreviewSection />
      <LearningModelSection />
      <CapstoneFrameworkSection />
      <TargetAudienceSection />
      <TestimonialsSection />
      <B2BSection />
      <FinalCTASection />
      <Footer />

      {/* Partner Request Dialog - Hidden trigger utilized by Hero Section */}
      <button id="partner-dialog" className="hidden" onClick={() => setPartnerDialogOpen(true)} />

      <Dialog open={partnerDialogOpen} onOpenChange={closePartnerDialog}>
        <DialogContent className="sm:max-w-[500px]">
          {partnerSuccess ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Request Submitted!</h3>
              <p className="text-gray-600 mb-6">We'll get back to you within 24 hours.</p>
              <Button onClick={closePartnerDialog} className="w-full bg-[#006d2c]">Close</Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-[#006d2c]">Partner With Us</DialogTitle>
                <DialogDescription>
                  Join our network of organizations transforming Africa's data landscape.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handlePartnerSubmit} className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" required value={partnerFormData.name} onChange={(e) => setPartnerFormData({ ...partnerFormData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Work Email</Label>
                    <Input id="email" type="email" required value={partnerFormData.email} onChange={(e) => setPartnerFormData({ ...partnerFormData, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" required value={partnerFormData.phone} onChange={(e) => setPartnerFormData({ ...partnerFormData, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="org">Organization</Label>
                    <Input id="org" required value={partnerFormData.organization} onChange={(e) => setPartnerFormData({ ...partnerFormData, organization: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">How can we help?</Label>
                    <Textarea id="message" value={partnerFormData.message} onChange={(e) => setPartnerFormData({ ...partnerFormData, message: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={closePartnerDialog}>Cancel</Button>
                  <Button type="submit" className="bg-[#006d2c] text-white" disabled={partnerSubmitting}>
                    {partnerSubmitting ? "Sending..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Index;
