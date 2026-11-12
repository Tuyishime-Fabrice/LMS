import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAppAuth } from "@/contexts/AuthContext";
import { authContinuationUrl, getPaymentReturnUrl, postAuthDestination } from "@/lib/coursePaymentReturn";

const TeacherOnboarding = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAppAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    telephone: "",
    avatar: "",
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
          // Pre-fill email if available
          if (user.email) {
            setFormData(prev => ({ ...prev, email: user.email! }));
          }
          return; // Allow onboarding to continue
        }

        // Use the retry profile for checks
        if (retryProfile.onboarding_completed) {
          if (retryProfile.role === "teacher") {
            navigate(getPaymentReturnUrl() || "/teacher/pending-approval", { replace: true });
          } else {
            navigate(postAuthDestination({ role: "student", onboarding_completed: true }), { replace: true });
          }
          return;
        }

        if (retryProfile.role === "student") {
          navigate(authContinuationUrl("/onboarding"), { replace: true });
          return;
        }

        // Pre-fill email if available
        if (user.email) {
          setFormData(prev => ({ ...prev, email: user.email! }));
        }
        return;
      }

      // If already completed onboarding, redirect appropriately
      if (profile.onboarding_completed) {
        if (profile.role === "teacher") {
          navigate(getPaymentReturnUrl() || "/teacher/pending-approval", { replace: true });
        } else {
          navigate(postAuthDestination({ role: "student", onboarding_completed: true }), { replace: true });
        }
        return;
      }

      // If student trying to access teacher onboarding, redirect to student onboarding
      if (profile.role === "student") {
        navigate(authContinuationUrl("/onboarding"), { replace: true });
        return;
      }
    } catch (error) {
      console.error("Error checking user auth:", error);
      // Allow onboarding to continue even if there's an error
    }

    // Pre-fill email if available
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      setFormData(prev => ({ ...prev, email: user.email! }));
    }

    // Pre-fill name if available from metadata
    if (user?.user_metadata?.full_name) {
      const nameParts = user.user_metadata.full_name.split(' ');
      setFormData(prev => ({
        ...prev,
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(' ') || "",
      }));
    }
  };

  const handleComplete = async () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.telephone || !formData.avatar) {
      toast.error("Please fill in all fields and select an avatar");
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
          email: formData.email,
          avatar_url: formData.avatar,
          phone: formData.telephone,
          onboarding_completed: true,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      await refreshProfile();

      // Verify the update was successful
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      if (fetchError) throw fetchError;

      if (!profile?.onboarding_completed) {
        throw new Error("Onboarding update failed");
      }

      toast.success("Profile setup completed! Your account is pending admin approval.");
      navigate(getPaymentReturnUrl() || "/teacher/pending-approval", { replace: true });
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      toast.error("Failed to complete profile setup. Please try again.");
    } finally {
      setLoading(false);
    }
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

        {/* Step Indicator */}
        <div className="flex-1 space-y-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-white text-[#006d2c]">
              <Image className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white">Teacher Profile</h3>
              <p className="text-sm text-white/90">Complete your profile to get started</p>
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
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold text-black mb-3">Welcome, Teacher!</h1>
              <p className="text-gray-600">
                Let's set up your profile so you can start creating amazing courses.
              </p>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium text-gray-700">
                    First name *
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
                    Last name *
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
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-12 border-gray-300 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telephone" className="text-sm font-medium text-gray-700">
                  Telephone number *
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
                  Choose your avatar *
                </Label>
                <div className="grid grid-cols-7 gap-3 max-h-64 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                  {avatars.map((avatar, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setFormData({ ...formData, avatar })}
                      className={`relative rounded-full overflow-hidden border-4 transition-all hover:scale-110 ${
                        formData.avatar === avatar
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
                onClick={handleComplete}
                disabled={loading}
                className="bg-[#006d2c] hover:bg-[#006d2c] text-black font-medium h-12 px-8"
              >
                {loading ? "Saving..." : "Complete Setup"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherOnboarding;
