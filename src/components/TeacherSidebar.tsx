import { useEffect, useState } from "react";
import { Home, Calendar, MessageSquare, BookOpen, GraduationCap, Users, FileText, Award, Settings, Megaphone, UsersRound, Pencil } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from 'react-i18next';

const mainMenuItems = [
  { titleKey: "nav.dashboard", url: "/teacher/dashboard", icon: Home },
  { titleKey: "nav.students", url: "/teacher/students", icon: Users },
  { titleKey: "nav.cohorts", url: "/teacher/cohorts", icon: UsersRound },
  { titleKey: "nav.assignments", url: "/teacher/assignments", icon: FileText },
  { titleKey: "nav.grades", url: "/teacher/grades", icon: Award },
  { titleKey: "nav.schedule", url: "/teacher/schedule", icon: Calendar },
  { titleKey: "nav.chatGroup", url: "/teacher/chat", icon: MessageSquare },
  { titleKey: "dashboard.announcements", url: "/teacher/announcements", icon: Megaphone },
  { titleKey: "nav.settings", url: "/teacher/settings", icon: Settings },
];

export function TeacherSidebar() {
  const { state } = useSidebar();
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchTeacherCourses();
    }
  }, [user]);

  const fetchTeacherCourses = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("courses")
      .select("id, title")
      .eq("teacher_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error fetching courses:", error);
    } else {
      setCourses(data || []);
    }
  };

  return (
    <Sidebar collapsible="icon" className="m-4">
      <div className="h-full bg-[#133223] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <SidebarContent className="bg-transparent flex-1">
          <SidebarGroup className="space-y-1">
            <div className="flex items-center gap-2 px-4 py-4">
              <GraduationCap className="h-7 w-7 text-[#006d2c]" />
              {!collapsed && <span className="text-lg font-bold text-white">DataPlus Learning</span>}
            </div>
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1">
                {mainMenuItems.map((item) => (
                  <SidebarMenuItem key={item.titleKey}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className={({ isActive }) =>
                          isActive
                            ? "bg-[#006d2c] text-white font-medium rounded-xl px-3 py-2.5 flex items-center gap-3"
                            : "text-gray-300 hover:bg-white/10 hover:text-white rounded-xl px-3 py-2.5 flex items-center gap-3"
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{t(item.titleKey)}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* My Courses Section */}
          {!collapsed && (
            <SidebarGroup className="mt-4 space-y-1">
              <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t('nav.myCourses').toUpperCase()}
              </SidebarGroupLabel>
              <SidebarGroupContent className="px-2">
                {courses.length > 0 ? (
                  <SidebarMenu className="space-y-1">
                    {courses.map((course) => (
                      <SidebarMenuItem key={course.id}>
                        <div className="flex items-center group/course">
                          <SidebarMenuButton asChild className="flex-1 min-w-0">
                            <NavLink
                              to={`/course/${course.id}`}
                              className={({ isActive }) =>
                                isActive
                                  ? "bg-[#006d2c] text-white font-medium rounded-xl px-3 py-2 flex items-center gap-3"
                                  : "text-gray-300 hover:bg-white/10 hover:text-white rounded-xl px-3 py-2 flex items-center gap-3"
                              }
                            >
                              <BookOpen className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate text-sm">{course.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                          <button
                            onClick={() => navigate(`/create-course?edit=${course.id}`)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 opacity-0 group-hover/course:opacity-100 transition-opacity flex-shrink-0"
                            title="Edit course"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                ) : (
                  <div className="px-3 py-4 text-center">
                    <BookOpen className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">{t('teacher.dashboard.noCourses')}</p>
                    <p className="text-xs text-gray-500 mt-1">{t('teacher.dashboard.createFirst')}</p>
                  </div>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>
      </div>
    </Sidebar>
  );
}
