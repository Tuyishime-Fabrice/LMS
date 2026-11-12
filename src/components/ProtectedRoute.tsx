import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";

type ProtectedRouteProps = {
  children: ReactNode;
  roles?: string[];
  requireOnboarding?: boolean;
};

export function ProtectedRoute({
  children,
  roles,
  requireOnboarding = true,
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAppAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      navigate("/auth", { replace: true, state: { from: location.pathname } });
      return;
    }

    if (!profile) return; // profile fetch in progress

    if (requireOnboarding && !profile.onboarding_completed) {
      navigate(
        profile.role === "teacher" ? "/teacher/onboarding" : "/onboarding",
        { replace: true },
      );
      return;
    }

    if (roles && !roles.includes(profile.role as string)) {
      const dest =
        profile.role === "admin"
          ? "/admin/dashboard"
          : profile.role === "teacher"
          ? "/teacher/dashboard"
          : "/student/dashboard";
      navigate(dest, { replace: true });
    }
  }, [loading, user, profile, navigate, location.pathname, roles, requireOnboarding]);

  // Show spinner while resolving or while a redirect is pending.
  if (loading || !user || !profile) return <LoadingSpinner />;

  if (requireOnboarding && !profile.onboarding_completed) return <LoadingSpinner />;
  if (roles && !roles.includes(profile.role as string)) return <LoadingSpinner />;

  return <>{children}</>;
}
