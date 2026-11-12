import { RoleSidebar } from "@/components/shell/RoleSidebar";

/** Kept for pages that still compose their own layout. New pages use AppShell. */
export function StudentSidebar() {
  return <RoleSidebar role="student" />;
}
