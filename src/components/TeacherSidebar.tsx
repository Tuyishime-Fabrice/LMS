import { NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BookOpen, Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { RoleSidebar } from "@/components/shell/RoleSidebar";
import { SidebarGroup, SidebarGroupContent, SidebarGroupLabel } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

/** A teacher's own courses, each one click from its page and its editor. */
function TeacherCourseList() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: courses = [] } = useQuery({
    queryKey: ["teacher-sidebar-courses", user?.id],
    enabled: Boolean(user?.id),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses").select("id, title").eq("teacher_id", user!.id)
        .order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <SidebarGroup className="py-1.5">
      <SidebarGroupLabel className="h-7 justify-between px-3 text-xs font-medium text-muted-foreground">
        {t("shell.group.myCourses", "My courses")}
        <button
          type="button"
          onClick={() => navigate("/create-course")}
          className="rounded-md p-1 text-muted-foreground hover:bg-forest/[0.06] hover:text-forest"
          aria-label={t("shell.newCourse", "Create a course")}
          title={t("shell.newCourse", "Create a course")}
        >
          <Plus className="h-4 w-4" />
        </button>
      </SidebarGroupLabel>
      <SidebarGroupContent>
        {courses.length === 0 ? (
          <p className="px-3 py-2 text-xs leading-5 text-muted-foreground">
            {t("teacher.dashboard.noCourses", "No courses yet")}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {courses.map((course) => (
              <li key={course.id} className="group/course flex items-center">
                <NavLink
                  to={`/course/${course.id}`}
                  className={({ isActive }) => cn(
                    "flex h-9 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-3 text-sm text-sidebar-foreground transition-colors hover:bg-forest/[0.06] hover:text-forest",
                    isActive && "bg-card font-semibold text-forest shadow-[0_0_0_1px_hsl(var(--border))]",
                  )}
                >
                  <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{course.title}</span>
                </NavLink>
                <button
                  type="button"
                  onClick={() => navigate(`/create-course?edit=${course.id}`)}
                  className="ml-0.5 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-forest/[0.06] hover:text-forest focus-visible:opacity-100 group-hover/course:opacity-100"
                  aria-label={t("shell.editCourse", "Edit {{title}}", { title: course.title })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/** Kept for pages that still compose their own layout. New pages use AppShell. */
export function TeacherSidebar() {
  return (
    <RoleSidebar role="teacher">
      <TeacherCourseList />
    </RoleSidebar>
  );
}
