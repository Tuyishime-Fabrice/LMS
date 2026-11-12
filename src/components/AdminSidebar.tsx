import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Home,
  Users,
  GraduationCap,
  UserCheck,
  Bell,
  BookOpen,
  Settings,
  FileText,
  Shield,
  Award,
  Trophy,
  MessageSquare,
  Handshake,
  DollarSign,
  Package,
  Tag,
  Layers,
  ClipboardList
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps {
  pendingTeachers?: number;
  pendingCourses?: number;
  pendingCertificates?: number;
  pendingCourseUpdates?: number;
  flaggedContent?: number;
}

export function AdminSidebar({
  pendingTeachers = 0,
  pendingCourses = 0,
  pendingCourseUpdates = 0,
  flaggedContent = 0,
  pendingCertificates = 0
}: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const homeItems = [
    { title: "Dashboard", url: "/admin/dashboard", icon: Home },
  ];

  const userItems = [
    { title: "All Users", url: "/admin/users", icon: Users },
  ];

  const studentItems = [
    { title: "Student Progress", url: "/admin/student-progress", icon: GraduationCap },
    { title: "Grades", url: "/admin/grades", icon: ClipboardList },
    { title: "Certificates", url: "/admin/certificates", icon: Award, badge: pendingCertificates },
  ];

  const teacherItems = [
    { title: "Teacher Approvals", url: "/admin/teacher-approvals", icon: UserCheck, badge: pendingTeachers },
  ];

  const noticeItems = [
    { title: "Announcements", url: "/admin/announcements", icon: Bell },
  ];

  const contentItems = [
    { title: "Exhibition", url: "/admin/exhibition", icon: Trophy },
    { title: "Testimonials", url: "/admin/testimonials", icon: MessageSquare },
    { title: "Partner Requests", url: "/admin/partners", icon: Handshake },
  ];

  const courseItems = [
    { title: "All Courses", url: "/admin/courses", icon: BookOpen, badge: pendingCourses },
  ];

  const paymentItems = [
    { title: "Payments", url: "/admin/payments", icon: DollarSign },
    { title: "Bundles", url: "/admin/bundles", icon: Package },
    { title: "Coupons", url: "/admin/coupons", icon: Tag },
    { title: "Scholarships", url: "/admin/scholarships", icon: GraduationCap },
    { title: "Pricing Tiers", url: "/admin/pricing", icon: Layers },
  ];

  const systemItems = [
    { title: "Activity Logs", url: "/admin/logs", icon: FileText },
    { title: "Settings", url: "/admin/settings", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" className="m-4">
      <div className="h-full bg-[#133223] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <SidebarContent className="bg-transparent flex-1 overflow-y-auto scrollbar-hide">
          <div className="flex items-center gap-2 px-4 py-4">
            <Shield className="h-7 w-7 text-[#006d2c]" />
            {!collapsed && <span className="text-lg font-bold text-white">Admin Panel</span>}
          </div>

          {/* Home */}
          <SidebarGroup className="space-y-1">
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1">
                {homeItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          isActive
                            ? "bg-[#006d2c] text-white font-medium rounded-xl px-3 py-2.5 flex items-center gap-3"
                            : "text-gray-300 hover:bg-white/10 hover:text-white rounded-xl px-3 py-2.5 flex items-center gap-3"
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* All Users */}
          <SidebarGroup className="mt-4 space-y-1">
            <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              USERS
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1">
                {userItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          isActive
                            ? "bg-[#006d2c] text-white font-medium rounded-xl px-3 py-2.5 flex items-center gap-3"
                            : "text-gray-300 hover:bg-white/10 hover:text-white rounded-xl px-3 py-2.5 flex items-center gap-3"
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Students */}
          <SidebarGroup className="mt-4 space-y-1">
            <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              STUDENTS
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1">
                {studentItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          isActive
                            ? "bg-[#006d2c] text-white font-medium rounded-xl px-3 py-2.5 flex items-center gap-3"
                            : "text-gray-300 hover:bg-white/10 hover:text-white rounded-xl px-3 py-2.5 flex items-center gap-3"
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Teachers */}
          <SidebarGroup className="mt-4 space-y-1">
            <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              TEACHERS
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1">
                {teacherItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          isActive
                            ? "bg-[#006d2c] text-white font-medium rounded-xl px-3 py-2.5 flex items-center gap-3 relative"
                            : "text-gray-300 hover:bg-white/10 hover:text-white rounded-xl px-3 py-2.5 flex items-center gap-3 relative"
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="text-sm flex-1">{item.title}</span>
                            {item.badge && item.badge > 0 && (
                              <Badge
                                variant="destructive"
                                className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Notice */}
          <SidebarGroup className="mt-4 space-y-1">
            <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              NOTICE
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1">
                {noticeItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          isActive
                            ? "bg-[#006d2c] text-white font-medium rounded-xl px-3 py-2.5 flex items-center gap-3"
                            : "text-gray-300 hover:bg-white/10 hover:text-white rounded-xl px-3 py-2.5 flex items-center gap-3"
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Content */}
          <SidebarGroup className="mt-4 space-y-1">
            <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              CONTENT
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1">
                {contentItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          isActive
                            ? "bg-[#006d2c] text-white font-medium rounded-xl px-3 py-2.5 flex items-center gap-3"
                            : "text-gray-300 hover:bg-white/10 hover:text-white rounded-xl px-3 py-2.5 flex items-center gap-3"
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Courses */}
          <SidebarGroup className="mt-4 space-y-1">
            <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              COURSES
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1">
                {courseItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          isActive
                            ? "bg-[#006d2c] text-white font-medium rounded-xl px-3 py-2.5 flex items-center gap-3 relative"
                            : "text-gray-300 hover:bg-white/10 hover:text-white rounded-xl px-3 py-2.5 flex items-center gap-3 relative"
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && (
                          <>
                            <span className="text-sm flex-1">{item.title}</span>
                            {item.badge && item.badge > 0 && (
                              <Badge
                                variant="destructive"
                                className="h-5 w-5 flex items-center justify-center p-0 text-xs"
                              >
                                {item.badge}
                              </Badge>
                            )}
                          </>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Payments & Bundles */}
          <SidebarGroup className="mt-4 space-y-1">
            <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              COMMERCE
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1">
                {paymentItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          isActive
                            ? "bg-[#006d2c] text-white font-medium rounded-xl px-3 py-2.5 flex items-center gap-3"
                            : "text-gray-300 hover:bg-white/10 hover:text-white rounded-xl px-3 py-2.5 flex items-center gap-3"
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* System */}
          <SidebarGroup className="mt-4 space-y-1">
            <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              SYSTEM
            </SidebarGroupLabel>
            <SidebarGroupContent className="px-2">
              <SidebarMenu className="space-y-1">
                {systemItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className={({ isActive }) =>
                          isActive
                            ? "bg-[#006d2c] text-white font-medium rounded-xl px-3 py-2.5 flex items-center gap-3"
                            : "text-gray-300 hover:bg-white/10 hover:text-white rounded-xl px-3 py-2.5 flex items-center gap-3"
                        }
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        {!collapsed && <span className="text-sm">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {!collapsed && (
            <div className="mt-auto px-4 pb-6">
              <Card className="bg-[#006d2c] text-white border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                  <Shield className="h-12 w-12 mx-auto mb-3 text-white/90" />
                  <h3 className="font-semibold mb-2">Admin Control</h3>
                  <p className="text-sm mb-4 opacity-90">Full platform management</p>
                  <Button variant="secondary" size="sm" className="w-full bg-white text-[#006d2c] hover:bg-gray-100">
                    View Reports
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </SidebarContent>
      </div>
    </Sidebar>
  );
}
