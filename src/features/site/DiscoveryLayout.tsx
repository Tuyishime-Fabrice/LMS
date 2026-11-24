import { type ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { useAppAuth } from "@/contexts/AuthContext";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

/**
 * Public discovery pages (tracks, competitions) are open to everyone.
 * A signed-in learner stays inside the app shell instead of being thrown
 * out to the public header.
 */
export function DiscoveryLayout({ children }: { children: ReactNode }) {
  const { profile, loading } = useAppAuth();
  if (!loading && profile?.role === "student") return <AppShell role="student">{children}</AppShell>;
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
