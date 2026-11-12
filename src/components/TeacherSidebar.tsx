import { RoleSidebar } from "@/components/shell/RoleSidebar";
import { TeacherCourseList } from "@/components/shell/TeacherCourseList";

/** Kept for pages that still compose their own layout. New pages use AppShell. */
export function TeacherSidebar() {
  return (
    <RoleSidebar role="teacher">
      <TeacherCourseList />
    </RoleSidebar>
  );
}
