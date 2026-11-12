import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { AccountMenu } from "@/components/AccountMenu";

interface TeacherHeaderProps {
  title: string;
  subtitle?: string;
  loading?: boolean;
  children?: React.ReactNode;
}

export function TeacherHeader({ title, subtitle, loading, children }: TeacherHeaderProps) {
  const { profile } = useAuth();

  return (
    <header className="m-4 mb-0">
      <div className="bg-white rounded-2xl shadow-sm border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="rounded-xl hover:bg-gray-100" />
            <div>
              {loading ? (
                <>
                  <Skeleton className="h-6 w-48 mb-1" />
                  <Skeleton className="h-4 w-32" />
                </>
              ) : (
                <>
                  <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
                  {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {children}
            <LanguageSelector />
            <NotificationBell />
            <AccountMenu profile={profile} fallback="TC" className="h-9 w-9 ring-2 ring-gray-100" />
          </div>
        </div>
      </div>
    </header>
  );
}
