import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
        toast.error(t("studentOnboarding.pleaseFillInAllFieldsAnd", "Please fill in all fields and select an avatar"));
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.organizationName || !formData.industry || !formData.role) {
        toast.error(t("studentOnboarding.pleaseFillInAllFields", "Please fill in all fields"));
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
      toast.error(t("studentOnboarding.pleaseSelectAtLeastOneInterest", "Please select at least one interest"));
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error(t("studentOnboarding.userNotAuthenticated", "User not authenticated"));
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

      toast.success(t("studentOnboarding.onboardingCompletedSuccessfully", "Onboarding completed successfully!"));

      navigate(postAuthDestination(profile), { replace: true });
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      toast.error(t("studentOnboarding.failedToCompleteOnboardingPleaseTry", "Failed to complete onboarding. Please try again."));
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
    <div className="min-h-screen flex bg-muted/50">
      {/* Left Sidebar - Green */}
      <div className="w-80 p-8 flex flex-col bg-forest">
        <div className="flex items-center gap-3 mb-12">
          <img
            src="/images/dataplus_logggg-removebg-preview.png"
            alt="DataPlus Academy"
            className="w-10 h-10 object-contain"
          />
          <span className="text-2xl font-bold text-white">{t("studentOnboarding.dataplusLabs", "DataPlus Labs")}</span>
        </div>

        {/* Steps */}
        <div className="flex-1 space-y-8">
          {/* Step 1 */}
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${currentStep >= 1 ? "bg-card text-primary" : "bg-white/20 text-white"
                }`}
            >
              <Image className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-bold ${currentStep >= 1 ? "text-white" : "text-white/60"}`}>
                {t("studentOnboarding.profileAvatar", "Profile & Avatar")}
              </h3>
              <p className={`text-sm ${currentStep >= 1 ? "text-white/90" : "text-white/50"}`}>
                {t("studentOnboarding.personalDetailsAndAvatar", "Personal details and avatar")}
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${currentStep >= 2 ? "bg-card text-primary" : "bg-white/20 text-white"
                }`}
            >
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-bold ${currentStep >= 2 ? "text-white" : "text-white/60"}`}>
                {t("studentOnboarding.organization", "Organization")}
              </h3>
              <p className={`text-sm ${currentStep >= 2 ? "text-white/90" : "text-white/50"}`}>
                {t("studentOnboarding.organizationInformation", "Organization information")}
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${currentStep >= 3 ? "bg-card text-primary" : "bg-white/20 text-white"
                }`}
            >
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-bold ${currentStep >= 3 ? "text-white" : "text-white/60"}`}>
                {t("studentOnboarding.yourInterests", "Your Interests")}
              </h3>
              <p className={`text-sm ${currentStep >= 3 ? "text-white/90" : "text-white/50"}`}>
                {t("studentOnboarding.selectYourLearningInterests", "Select your learning interests")}
              </p>
            </div>
          </div>
        </div>

        <div className="text-white/60 text-sm">
          {t("studentOnboarding.allRightsReservedDataplusLabs", "All rights reserved @DataPlus Labs")}
        </div>
      </div>

      {/* Right Content Area - White */}
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="w-full max-w-2xl">
          {/* Step 1: Profile & Avatar */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t("studentOnboarding.step13", "Step 1/3")}</p>
                <h1 className="text-4xl font-bold text-forest mb-3">{t("studentOnboarding.profileAvatar", "Profile & Avatar")}</h1>
                <p className="text-muted-foreground">
                  {t("studentOnboarding.tellUsABitAboutYourself", "Tell us a bit about yourself and choose your avatar.")}
                </p>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                      {t("studentOnboarding.firstName", "First name")}
                    </Label>
                    <Input
                      id="firstName"
                      placeholder={t("studentOnboarding.john", "John")}
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      className="h-12 border-border rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                      {t("studentOnboarding.lastName", "Last name")}
                    </Label>
                    <Input
                      id="lastName"
                      placeholder={t("studentOnboarding.doe", "Doe")}
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="h-12 border-border rounded-lg"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telephone" className="text-sm font-medium text-foreground">
                    {t("studentOnboarding.telephoneNumber", "Telephone number")}
                  </Label>
                  <Input
                    id="telephone"
                    type="tel"
                    placeholder="+250 788 123 456"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="h-12 border-border rounded-lg"
                  />
                </div>

                {/* Avatar Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-foreground">
                    {t("studentOnboarding.chooseYourAvatar", "Choose your avatar")}
                  </Label>
                  <div className="grid grid-cols-7 gap-3 max-h-64 overflow-y-auto p-2 border border-border rounded-lg">
                    {avatars.map((avatar, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setFormData({ ...formData, avatar })}
                        className={`relative rounded-full overflow-hidden border-4 transition-all hover:scale-110 ${formData.avatar === avatar
                          ? "border-primary ring-4 ring-primary/30"
                          : "border-border hover:border-primary/50"
                          }`}
                      >
                        <img
                          src={avatar}
                          alt={`Avatar ${index + 1}`}
                          className="w-full h-full object-cover aspect-square"
                        />
                        {formData.avatar === avatar && (
                          <div className="absolute inset-0 bg-leaf flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {formData.avatar && (
                    <p className="text-sm text-primary font-medium">{t("studentOnboarding.avatarSelected", "✓ Avatar selected")}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleNext}
                  className="bg-primary hover:bg-primary-hover text-forest font-medium h-12 px-8"
                >
                  {t("studentOnboarding.next", "Next")}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Organization */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t("studentOnboarding.step23", "Step 2/3")}</p>
                <h1 className="text-4xl font-bold text-forest mb-3">{t("studentOnboarding.organization", "Organization")}</h1>
                <p className="text-muted-foreground">
                  {t("studentOnboarding.tellUsAboutYourOrganizationIt", "Tell us about your organization. It helps us tailor your learning experience.")}
                </p>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="text-sm font-medium text-foreground">
                    {t("studentOnboarding.organizationName", "Organization name")}
                  </Label>
                  <Input
                    id="organizationName"
                    placeholder={t("studentOnboarding.enterOrganizationName", "Enter organization name")}
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    className="h-12 border-border rounded-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry" className="text-sm font-medium text-foreground">
                    {t("studentOnboarding.industry", "Industry")}
                  </Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => setFormData({ ...formData, industry: value })}
                  >
                    <SelectTrigger className="h-12 border-border rounded-lg">
                      <SelectValue placeholder={t("studentOnboarding.selectIndustry", "Select industry")} />
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
                  <Label htmlFor="role" className="text-sm font-medium text-foreground">
                    {t("studentOnboarding.yourRole", "Your role")}
                  </Label>
                  <Input
                    id="role"
                    placeholder={t("studentOnboarding.eGStudentProfessionalManager", "e.g., Student, Professional, Manager")}
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="h-12 border-border rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="h-12 px-6 border-border"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {t("studentOnboarding.back", "Back")}
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-primary hover:bg-primary-hover text-forest font-medium h-12 px-8"
                >
                  {t("studentOnboarding.next", "Next")}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Interests */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t("studentOnboarding.step33", "Step 3/3")}</p>
                <h1 className="text-4xl font-bold text-forest mb-3">{t("studentOnboarding.yourInterests", "Your Interests")}</h1>
                <p className="text-muted-foreground">
                  {t("studentOnboarding.selectTheTopicsYouReInterested", "Select the topics you're interested in learning. You can choose multiple options.")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {interestOptions.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${formData.interests.includes(interest)
                      ? "border-primary bg-leaf"
                      : "border-border hover:border-primary/50"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${formData.interests.includes(interest)
                          ? "border-primary bg-primary"
                          : "border-border"
                          }`}
                      >
                        {formData.interests.includes(interest) && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="font-medium text-forest">{interest}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleBack}
                  variant="outline"
                  className="h-12 px-6 border-border"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  {t("studentOnboarding.back", "Back")}
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={loading}
                  className="bg-primary hover:bg-primary-hover text-forest font-medium h-12 px-8"
                >
                  {loading ? t("studentOnboarding.saving", "Saving...") : t("studentOnboarding.complete", "Complete")}
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
