import { RoleSidebar } from "@/components/shell/RoleSidebar";

interface AdminSidebarProps {
  pendingTeachers?: number;
  pendingCourses?: number;
  pendingCertificates?: number;
  /** Accepted for compatibility with existing pages; no longer shown. */
  pendingCourseUpdates?: number;
  flaggedContent?: number;
}

/** Kept for pages that still compose their own layout. New pages use AppShell. */
export function AdminSidebar({ pendingTeachers = 0, pendingCourses = 0, pendingCertificates = 0 }: AdminSidebarProps) {
  return <RoleSidebar role="admin" badges={{ pendingTeachers, pendingCourses, pendingCertificates }} />;
}
