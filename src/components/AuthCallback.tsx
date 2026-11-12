import { readBrowserStorage, writeBrowserStorage, removeBrowserStorage } from "@/lib/browserStorage";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { authContinuationUrl, postAuthDestination } from "@/lib/coursePaymentReturn";
import { useAppAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshProfile } = useAppAuth();

  useEffect(() => {
    let active = true;
    const completeAuthentication = async () => {
      try {
        // getSession waits for Supabase to process the verification/OAuth URL.
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError) throw authError;
        if (!session) {
          if (active) navigate(authContinuationUrl("/auth"), { replace: true });
          return;
        }
        const user = session.user;
        const { data: existing, error: fetchError } = await supabase
          .from("profiles").select("*").eq("id", user.id).maybeSingle();
        if (fetchError) throw fetchError;

        // URL parameters and editable metadata can select student/teacher only.
        const requestedRole = searchParams.get("role") || user.user_metadata?.role;
        const role = requestedRole === "teacher" ? "teacher" : "student";
        let profile = existing;
        if (!profile) {
          const { data, error } = await supabase.from("profiles").insert({
            id: user.id,
            email: user.email || "",
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || "",
            role,
            avatar_url: user.user_metadata?.avatar_url || null,
            onboarding_completed: false,
          }).select("*").single();
          if (error?.code === "23505") {
            // The database signup trigger may have created it concurrently.
            const retry = await supabase.from("profiles").select("*").eq("id", user.id).single();
            if (retry.error) throw retry.error;
            profile = retry.data;
          } else {
            if (error) throw error;
            profile = data;
          }
        }
        if (profile && !profile.onboarding_completed && profile.role !== "admin" &&
            (requestedRole === "student" || requestedRole === "teacher") && profile.role !== role) {
          const { data, error } = await supabase.from("profiles").update({ role })
            .eq("id", user.id).select("*").single();
          if (error) throw error;
          profile = data;
        }
        if (!profile || !active) return;
        await refreshProfile();
        removeBrowserStorage("session", "pendingVerificationEmail");
        if (active) navigate(postAuthDestination(profile), { replace: true });
      } catch (error) {
        if (!active) return;
        console.error("Authentication callback failed", error);
        toast.error("Could not complete sign in. Please try again.");
        navigate(authContinuationUrl("/auth"), { replace: true });
      }
    };
    void completeAuthentication();
    return () => { active = false; };
  }, [navigate, searchParams, refreshProfile]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 text-lg">Completing authentication...</p>
        <p className="text-gray-400 text-sm mt-2">Please wait while we set up your account</p>
      </div>
    </div>
  );
};

export default AuthCallback;
