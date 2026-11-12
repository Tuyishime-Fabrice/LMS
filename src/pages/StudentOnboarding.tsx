import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Building2, BookOpen, ChevronLeft, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import { authContinuationUrl, postAuthDestination } from "@/lib/coursePaymentReturn";


const StudentOnboarding = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAppAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    telephone: "",
    avatar: "",
    organizationName: "",
    industry: "",
    role: "",
    interests: [] as string[],
  });

  const avatars = [
    "/images/avators/1.webp",
    "/images/avators/2.webp",
    "/images/avators/3.webp",
    "/images/avators/4 (1).webp",
    "/images/avators/5.webp",
    "/images/avators/6.webp",
    "/images/avators/7.webp",
    "/images/avators/8.webp",
    "/images/avators/9.webp",
    "/images/avators/10.webp",
    "/images/avators/woman.webp",
    "/images/avators/hacker.webp",
    "/images/avators/3d-rendering-zoom-call-avatar.webp",
    "/images/avators/androgynous-avatar-non-binary-queer-person.webp",
  ];

  useEffect(() => {
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate(authContinuationUrl("/auth"));
        return;
      }

      // Check if user role matches this onboarding type
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", user.id)
        .single();

      // If profile doesn't exist yet, wait and try again
      if (error || !profile) {
        console.log("Profile not found, waiting for creation...");
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const { data: retryProfile } = await supabase
          .from("profiles")
          .select("role, onboarding_completed")
          .eq("id", user.id)
          .single();

        if (!retryProfile) {
          console.log("Profile still not found, allowing onboarding to continue");
          return; // Allow onboarding to continue
        }

        // Use the retry profile for checks
        if (retryProfile.onboarding_completed) {
          navigate(postAuthDestination(retryProfile), { replace: true });
          return;
        }

        if (retryProfile.role === "teacher") {
          navigate(authContinuationUrl("/teacher/onboarding"), { replace: true });
          return;
        }
        return;
      }

      // If already completed onboarding, redirect to dashboard
      if (profile.onboarding_completed) {
        navigate(postAuthDestination(profile), { replace: true });
        return;
      }

      // If teacher trying to access student onboarding, redirect to teacher onboarding
      if (profile.role === "teacher") {
        navigate(authContinuationUrl("/teacher/onboarding"), { replace: true });
        return;
      }
    } catch (error) {
      console.error("Error checking user auth:", error);
      // Allow onboarding to continue even if there's an error
    }
  };

  const industries = [
    "Technology",
    "Healthcare",
    "Finance",
    "Education",
    "Manufacturing",
    "Retail",
    "Agriculture",
    "Government",
    "Non-profit",
    "Other",
  ];

  const interestOptions = [
    "Data Analyst",
    "AI",
    "Programming",
    "Marketing",
    "Accounting",
    "Startup Courses",
    "Tax",
    "Product Management",
    "Business Management",
  ];

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.firstName || !formData.lastName || !formData.telephone || !formData.avatar) {
        toast.error("Please fill in all fields and select an avatar");
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.organizationName || !formData.industry || !formData.role) {
        toast.error("Please fill in all fields");
        return;
      }
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    if (formData.interests.length === 0) {
      toast.error("Please select at least one interest");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("User not authenticated");
        navigate(authContinuationUrl("/auth"));
        return;
      }

      // Update user profile with onboarding data
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: `${formData.firstName} ${formData.lastName}`,
          avatar_url: formData.avatar,
          phone: formData.telephone,
          organization: formData.organizationName,
          industry: formData.industry,
          job_role: formData.role,
          interests: formData.interests,
          onboarding_completed: true,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      await refreshProfile();

      // Verify the update was successful
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("role, onboarding_completed")
        .eq("id", user.id)
        .single();

      if (fetchError) throw fetchError;

      if (!profile?.onboarding_completed) {
        throw new Error("Onboarding update failed");
      }

      toast.success("Onboarding completed successfully!");

      navigate(postAuthDestination(profile), { replace: true });
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      toast.error("Failed to complete onboarding. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Sidebar - Green */}
      <div className="w-80 bg-gradient-to-br from-[#006d2c] to-[#006d2c] p-8 flex flex-col">
        <div className="flex items-center gap-3 mb-12">
          <img
            src="/images/dataplus_logggg-removebg-preview.png"
            alt="DataPlus Logo"
            className="w-10 h-10 object-contain"
          />
          <span className="text-2xl font-bold text-white">DataPlus Labs</span>
        </div>

        {/* Steps */}
        <div className="flex-1 space-y-8">
          {/* Step 1 */}
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${currentStep >= 1 ? "bg-white text-[#006d2c]" : "bg-white/20 text-white"
                }`}
            >
              <Image className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-bold ${currentStep >= 1 ? "text-white" : "text-white/60"}`}>
                Profile & Avatar
              </h3>
              <p className={`text-sm ${currentStep >= 1 ? "text-white/90" : "text-white/50"}`}>
                Personal details and avatar
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${currentStep >= 2 ? "bg-white text-[#006d2c]" : "bg-white/20 text-white"
                }`}
            >
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-bold ${currentStep >= 2 ? "text-white" : "text-white/60"}`}>
                Organization
              </h3>
              <p className={`text-sm ${currentStep >= 2 ? "text-white/90" : "text-white/50"}`}>
                Organization information
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${currentStep >= 3 ? "bg-white text-[#006d2c]" : "bg-white/20 text-white"
                }`}
            >
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-bold ${currentStep >= 3 ? "text-white" : "text-white/60"}`}>
                Your Interests
              </h3>
              <p className={`text-sm ${currentStep >= 3 ? "text-white/90" : "text-white/50"}`}>
                Select your learning interests
              </p>
            </div>
          </div>
        </div>

        <div className="text-white/60 text-sm">
          All rights reserved @DataPlus Labs
        </div>
      </div>

      {/* Right Content Area - White */}
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-full max-w-2xl">
          {/* Step 1: Profile & Avatar */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-500 mb-2">Step 1/3</p>
                <h1 className="text-4xl font-bold text-black mb-3">Profile & Avatar</h1>
                <p className="text-gray-600">
                  Tell us a bit about yourself and choose your avatar.
                </p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                      First name
                    </Label>
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="h-12 border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-gray-700">
                      Last name
                    </Label>
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="h-12 border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telephone" className="text-sm font-medium text-gray-700">
                    Telephone number
                  </Label>
                  <Input
                    id="telephone"
                    type="tel"
                    placeholder="+250 788 123 456"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="h-12 border-gray-300 rounded-lg"
                  />
                </div>

                {/* Avatar Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Choose your avatar
                  </Label>
                  <div className="grid grid-cols-7 gap-3 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                    {avatars.map((avatar, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar })}
                        className={`relative rounded-full overflow-hidden border-4 transition-all hover:scale-110 ${formData.avatar === avatar
                          ? "border-[#006d2c] ring-4 ring-[#006d2c]/30"
                          : "border-gray-200 hover:border-[#006d2c]/50"
                          }`}
                      >
                        <img
                          src={avatar}
                          alt={`Avatar ${index + 1}`}
                          className="w-full h-full object-cover aspect-square"
                        />
                        {formData.avatar === avatar && (
                          <div className="absolute inset-0 bg-[#006d2c]/20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {formData.avatar && (
                    <p className="text-sm text-[#006d2c] font-medium">✓ Avatar selected</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleNext}
                  className="bg-[#006d2c] hover:bg-[#006d2c] text-black font-medium h-12 px-8"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Organization */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-500 mb-2">Step 2/3</p>
                <h1 className="text-4xl font-bold text-black mb-3">Organization</h1>
                <p className="text-gray-600">
                  Tell us about your organization. It helps us tailor your learning experience.
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="text-sm font-medium text-gray-700">
                    Organization name
                  </Label>
                  <Input
                    id="organizationName"
                    placeholder="Enter organization name"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    className="h-12 border-gray-300 rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-sm font-medium text-gray-700">
                    Industry
                  </Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => setFormData({ ...formData, industry: value })}
                  >
                    <SelectTrigger className="h-12 border-gray-300 rounded-lg">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                    Your role
                  </Label>
                  <Input
                    id="role"
                    placeholder="e.g., Student, Professional, Manager"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="h-12 border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="h-12 px-6 border-gray-300"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-[#006d2c] hover:bg-[#006d2c] text-black font-medium h-12 px-8"
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Interests */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-gray-500 mb-2">Step 3/3</p>
                <h1 className="text-4xl font-bold text-black mb-3">Your Interests</h1>
                <p className="text-gray-600">
                  Select the topics you're interested in learning. You can choose multiple options.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {interestOptions.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${formData.interests.includes(interest)
                      ? "border-[#006d2c] bg-[#006d2c]/10"
                      : "border-gray-200 hover:border-[#006d2c]/50"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${formData.interests.includes(interest)
                          ? "border-[#006d2c] bg-[#006d2c]"
                          : "border-gray-300"
                          }`}
                      >
                        {formData.interests.includes(interest) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-gray-900">{interest}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="h-12 px-6 border-gray-300"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={loading}
                  className="bg-[#006d2c] hover:bg-[#006d2c] text-black font-medium h-12 px-8"
                >
                  {loading ? "Saving..." : "Complete"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentOnboarding;
