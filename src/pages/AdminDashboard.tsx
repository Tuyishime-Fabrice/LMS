import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell/page";
import { AppShell } from "@/components/shell/AppShell";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, BookOpen, TrendingUp, UserCheck, AlertCircle, Activity, Pencil, ClipboardList, Award, ArrowRight } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type TimePeriod = "week" | "month" | "year";

interface Stats {
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  pendingTeachers: number;
  totalCourses: number;
  pendingCourses: number;
  activeUsers: number;
  suspendedUsers: number;
  onlineStudents: number;
  onlineTeachers: number;
  onlineUsers: number;
  activeThisWeek: number;
}

const AdminDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    pendingTeachers: 0,
    totalCourses: 0,
    pendingCourses: 0,
    activeUsers: 0,
    suspendedUsers: 0,
    onlineStudents: 0,
    onlineTeachers: 0,
    onlineUsers: 0,
    activeThisWeek: 0,
  });
  const [userGrowth, setUserGrowth] = useState<any[]>([]);
  const [courseStats, setCourseStats] = useState<any[]>([]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("week");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (!loading) {
      fetchUserGrowth();
    }
  }, [timePeriod, loading]);

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        toast.error(t("adminDashboard.accessDeniedAdminPrivilegesRequired", "Access denied. Admin privileges required."));
        navigate("/");
        return;
      }

      await fetchStats();
    } catch (error: any) {
      console.error("Error checking admin access:", error);
      toast.error(t("adminDashboard.failedToVerifyAdminAccess", "Failed to verify admin access"));
      navigate("/");
    }
  };

  const fetchStats = async () => {
    try {
      // Try to use the new RPC function first
      const { data: dashboardStats, error: rpcError } = await supabase.rpc("get_admin_dashboard_stats");

      if (!rpcError && dashboardStats && typeof dashboardStats === "object" && !Array.isArray(dashboardStats)) {
        setStats({
          totalUsers: Number(dashboardStats.totalUsers) || 0,
          totalStudents: Number(dashboardStats.totalStudents) || 0,
          totalTeachers: Number(dashboardStats.totalTeachers) || 0,
          pendingTeachers: Number(dashboardStats.pendingTeachers) || 0,
          totalCourses: Number(dashboardStats.totalCourses) || 0,
          pendingCourses: Number(dashboardStats.pendingCourses) || 0,
          activeUsers: Number(dashboardStats.activeThisWeek) || 0,
          suspendedUsers: Number(dashboardStats.suspendedUsers) || 0,
          onlineStudents: Number(dashboardStats.onlineStudents) || 0,
          onlineTeachers: Number(dashboardStats.onlineTeachers) || 0,
          onlineUsers: Number(dashboardStats.onlineUsers) || 0,
          activeThisWeek: Number(dashboardStats.activeThisWeek) || 0,
        });
      } else {
        // Fallback to manual queries if RPC not available
        const { data: allProfiles, error: profilesError } = await supabase.rpc("get_all_profiles");

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          throw profilesError;
        }

        const totalUsers = allProfiles?.length || 0;
        const totalStudents = allProfiles?.filter((p: any) => p.role === "student").length || 0;
        const totalTeachers = allProfiles?.filter((p: any) => p.role === "teacher").length || 0;
        const pendingTeachers = allProfiles?.filter(
          (p: any) => p.role === "teacher" && p.teacher_approval_status === "pending"
        ).length || 0;
        const suspendedUsers = allProfiles?.filter((p: any) => p.is_suspended === true).length || 0;

        // Active users (active in last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const activeUsers = allProfiles?.filter((p: any) => {
          const lastActivity = p.last_activity || p.last_login || p.updated_at;
          if (!lastActivity) return false;
          return new Date(lastActivity) >= sevenDaysAgo;
        }).length || 0;

        // Online users (active in last 5 minutes)
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
        
        const onlineStudents = allProfiles?.filter((p: any) => {
          if (p.role !== "student") return false;
          const lastActivity = p.last_activity || p.last_login || p.updated_at;
          if (!lastActivity) return false;
          return new Date(lastActivity) >= fiveMinutesAgo;
        }).length || 0;

        const onlineTeachers = allProfiles?.filter((p: any) => {
          if (p.role !== "teacher") return false;
          const lastActivity = p.last_activity || p.last_login || p.updated_at;
          if (!lastActivity) return false;
          return new Date(lastActivity) >= fiveMinutesAgo;
        }).length || 0;

        const { data: courses } = await supabase
          .from("courses")
          .select("id, approval_status");

        const totalCourses = courses?.length || 0;
        const pendingCourses = courses?.filter((c: any) => c.approval_status === "pending").length || 0;

        setStats({
          totalUsers,
          totalStudents,
          totalTeachers,
          pendingTeachers,
          totalCourses,
          pendingCourses,
          activeUsers,
          suspendedUsers,
          onlineStudents,
          onlineTeachers,
          onlineUsers: onlineStudents + onlineTeachers,
          activeThisWeek: activeUsers,
        });
      }

      await fetchUserGrowth();
      await fetchCourseStats();
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      toast.error(t("adminDashboard.failedToLoadDashboardStats", "Failed to load dashboard stats"));
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGrowth = async () => {
    try {
      const now = new Date();
      let startDate = new Date();

      // Calculate date range based on time period
      if (timePeriod === "week") {
        startDate.setDate(now.getDate() - 6);
      } else if (timePeriod === "month") {
        startDate.setDate(now.getDate() - 29);
      } else if (timePeriod === "year") {
        startDate.setMonth(now.getMonth() - 11);
        startDate.setDate(1);
      }

      // Use RPC function to bypass RLS and get all profiles
      const { data: allUsers, error } = await supabase.rpc("get_all_profiles");

      if (error) throw error;

      // Generate all dates/periods in the range
      const periods: string[] = [];
      const periodKeys: string[] = [];
      const tempDate = new Date(startDate);

      if (timePeriod === "year") {
        // Generate 12 months
        for (let i = 0; i < 12; i++) {
          const d = new Date(startDate);
          d.setMonth(startDate.getMonth() + i);
          periods.push(d.toLocaleDateString("en-US", { month: "short", year: "2-digit" }));
          periodKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }
      } else {
        // Generate days
        const days = timePeriod === "week" ? 7 : 30;
        for (let i = 0; i < days; i++) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          if (timePeriod === "week") {
            periods.push(d.toLocaleDateString("en-US", { weekday: "short" }));
          } else {
            periods.push(d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit" }));
          }
          periodKeys.push(d.toISOString().split('T')[0]);
        }
      }

      // Calculate cumulative counts for each period
      const chartData = periods.map((label, index) => {
        const periodKey = periodKeys[index];
        let studentCount = 0;
        let teacherCount = 0;

        allUsers?.forEach((user) => {
          const userDate = new Date(user.created_at);
          let userKey: string;

          if (timePeriod === "year") {
            userKey = `${userDate.getFullYear()}-${String(userDate.getMonth() + 1).padStart(2, '0')}`;
            // Count users created up to and including this month
            if (userKey <= periodKey) {
              if (user.role === "student") studentCount++;
              else if (user.role === "teacher") teacherCount++;
            }
          } else {
            userKey = userDate.toISOString().split('T')[0];
            // Count users created up to and including this day
            if (userKey <= periodKey) {
              if (user.role === "student") studentCount++;
              else if (user.role === "teacher") teacherCount++;
            }
          }
        });

        return {
          date: label,
          students: studentCount,
          teachers: teacherCount,
        };
      });

      setUserGrowth(chartData);
    } catch (error: any) {
      console.error("Error fetching user growth:", error);
    }
  };

  const fetchCourseStats = async () => {
    // Mock data for now
    const mockData = [
      { name: "Active", value: stats.totalCourses - stats.pendingCourses },
      { name: "Pending", value: stats.pendingCourses },
    ];
    setCourseStats(mockData);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <AppShell role="admin" width="wide" badges={{ pendingTeachers: stats.pendingTeachers, pendingCourses: stats.pendingCourses }}>
      <PageHeader
        title={t("adminDashboard.adminDashboard", "Admin Dashboard")}
        description={t("adminDashboard.platformOverviewManagement", "Platform Overview & Management")}
      />

            <div className="space-y-6">
              {/* Stats Grid - Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-info/30">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{t("adminDashboard.totalUsers", "Total Users")}</CardTitle>
                    <Users className="h-4 w-4 text-info" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      {t("adminDashboard.activeThisWeek", "{{activeThisWeek}} active this week", { activeThisWeek: stats.activeThisWeek })}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-primary/30">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{t("adminDashboard.students", "Students")}</CardTitle>
                    <GraduationCap className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalStudents}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      {stats.onlineStudents}{" "}{t("adminDashboard.onlineNow", "online now")}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{t("adminDashboard.teachers", "Teachers")}</CardTitle>
                    <UserCheck className="h-4 w-4 text-forest" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalTeachers}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-forest animate-pulse" />
                      {stats.onlineTeachers}{" "}{t("adminDashboard.onlineNow", "online now")}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-warning/30">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">{t("adminDashboard.courses", "Courses")}</CardTitle>
                    <BookOpen className="h-4 w-4 text-warning" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalCourses}</div>
                    <p className="text-xs text-muted-foreground">
                      {t("adminDashboard.pendingReview", "{{pendingCourses}} pending review", { pendingCourses: stats.pendingCourses })}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Online Status Card */}
              <Card className="border-primary/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    {t("adminDashboard.currentlyOnline", "Currently Online")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-card rounded-lg">
                      <div className="text-2xl font-bold text-primary">{stats.onlineUsers}</div>
                      <p className="text-xs text-muted-foreground">{t("adminDashboard.totalOnline", "Total Online")}</p>
                    </div>
                    <div className="text-center p-3 bg-card rounded-lg">
                      <div className="text-2xl font-bold text-primary">{stats.onlineStudents}</div>
                      <p className="text-xs text-muted-foreground">{t("adminDashboard.students", "Students")}</p>
                    </div>
                    <div className="text-center p-3 bg-card rounded-lg">
                      <div className="text-2xl font-bold text-forest">{stats.onlineTeachers}</div>
                      <p className="text-xs text-muted-foreground">{t("adminDashboard.teachers", "Teachers")}</p>
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    {t("adminDashboard.activeInTheLast15Minutes", "Active in the last 15 minutes")}
                  </p>
                </CardContent>
              </Card>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth Chart */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{t("adminDashboard.userGrowth", "User Growth")}</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={timePeriod === "week" ? "default" : "outline"}
                          onClick={() => setTimePeriod("week")}
                          className={timePeriod === "week" ? "bg-primary hover:bg-primary-hover" : ""}
                        >
                          {t("adminDashboard.week", "Week")}
                        </Button>
                        <Button
                          size="sm"
                          variant={timePeriod === "month" ? "default" : "outline"}
                          onClick={() => setTimePeriod("month")}
                          className={timePeriod === "month" ? "bg-primary hover:bg-primary-hover" : ""}
                        >
                          {t("adminDashboard.month", "Month")}
                        </Button>
                        <Button
                          size="sm"
                          variant={timePeriod === "year" ? "default" : "outline"}
                          onClick={() => setTimePeriod("year")}
                          className={timePeriod === "year" ? "bg-primary hover:bg-primary-hover" : ""}
                        >
                          {t("adminDashboard.year", "Year")}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={userGrowth}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="students" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          name="Students"
                        />
                        <Line 
                          type="monotone" 
                          dataKey="teachers" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          name="Teachers"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>{t("adminDashboard.quickActions", "Quick Actions")}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats.pendingTeachers > 0 && (
                      <div 
                        className="flex items-center justify-between p-4 bg-leaf border border-border rounded-lg cursor-pointer hover:bg-leaf transition-colors"
                        onClick={() => navigate("/admin/teacher-approvals")}
                      >
                        <div className="flex items-center gap-3">
                          <UserCheck className="h-5 w-5 text-forest" />
                          <div>
                            <p className="font-semibold text-sm">{t("adminDashboard.pendingTeacherApprovals", "Pending Teacher Approvals")}</p>
                            <p className="text-xs text-muted-foreground">{t("adminDashboard.waitingForReview", "{{pendingTeachers}} waiting for review", { pendingTeachers: stats.pendingTeachers })}</p>
                          </div>
                        </div>
                        <AlertCircle className="h-5 w-5 text-forest" />
                      </div>
                    )}

                    {stats.pendingCourses > 0 && (
                      <div 
                        className="flex items-center justify-between p-4 bg-warning-surface border border-warning/30 rounded-lg cursor-pointer hover:bg-warning-surface transition-colors"
                        onClick={() => navigate("/admin/courses")}
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-5 w-5 text-warning" />
                          <div>
                            <p className="font-semibold text-sm">{t("adminDashboard.pendingCourseReviews", "Pending Course Reviews")}</p>
                            <p className="text-xs text-muted-foreground">{t("adminDashboard.coursesToReview", "{{pendingCourses}} courses to review", { pendingCourses: stats.pendingCourses })}</p>
                          </div>
                        </div>
                        <AlertCircle className="h-5 w-5 text-warning" />
                      </div>
                    )}

                    {stats.suspendedUsers > 0 && (
                      <div 
                        className="flex items-center justify-between p-4 bg-destructive-surface border border-destructive/30 rounded-lg cursor-pointer hover:bg-destructive-surface transition-colors"
                        onClick={() => navigate("/admin/users")}
                      >
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-destructive" />
                          <div>
                            <p className="font-semibold text-sm">{t("adminDashboard.suspendedUsers", "Suspended Users")}</p>
                            <p className="text-xs text-muted-foreground">{t("adminDashboard.accountsSuspended", "{{suspendedUsers}} accounts suspended", { suspendedUsers: stats.suspendedUsers })}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {stats.pendingTeachers === 0 && stats.pendingCourses === 0 && stats.suspendedUsers === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Activity className="h-12 w-12 mx-auto mb-2 text-muted-foreground/60" />
                        <p className="text-sm">{t("adminDashboard.noPendingActions", "No pending actions")}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Course Management */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("adminDashboard.courseManagement", "Course Management")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div
                      onClick={() => navigate("/admin/courses")}
                      className="group cursor-pointer p-4 rounded-lg border border-border hover:border-primary hover:bg-leaf transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-leaf flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-[#006d2c] group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="font-semibold text-sm text-forest">{t("adminDashboard.allCourses", "All Courses")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("adminDashboard.viewApproveManage", "View, approve, manage")}</p>
                    </div>

                    <div
                      onClick={() => navigate("/create-course")}
                      className="group cursor-pointer p-4 rounded-lg border border-border hover:border-info/30 hover:bg-info-surface transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-info-surface flex items-center justify-center">
                          <Pencil className="h-5 w-5 text-info" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-info group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="font-semibold text-sm text-forest">{t("adminDashboard.createEditCourse", "Create / Edit Course")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("adminDashboard.buildOrUpdateContent", "Build or update content")}</p>
                    </div>

                    <div
                      onClick={() => navigate("/admin/grades")}
                      className="group cursor-pointer p-4 rounded-lg border border-border hover:border-border hover:bg-leaf transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-leaf flex items-center justify-center">
                          <ClipboardList className="h-5 w-5 text-forest" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-forest group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="font-semibold text-sm text-forest">{t("adminDashboard.gradesQuizzes", "Grades & Quizzes")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("adminDashboard.quizAssignmentCapstone", "Quiz, assignment, capstone")}</p>
                    </div>

                    <div
                      onClick={() => navigate("/admin/certificates")}
                      className="group cursor-pointer p-4 rounded-lg border border-border hover:border-warning/30 hover:bg-warning-surface transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-warning-surface flex items-center justify-center">
                          <Award className="h-5 w-5 text-warning" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/60 group-hover:text-warning group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="font-semibold text-sm text-forest">{t("adminDashboard.certificates", "Certificates")}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t("adminDashboard.issueManage", "Issue & manage")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("adminDashboard.systemHealth", "System Health")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-leaf rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <div>
                        <p className="text-sm font-semibold">{t("adminDashboard.systemStatus", "System Status")}</p>
                        <p className="text-xs text-muted-foreground">{t("adminDashboard.allSystemsOperational", "All systems operational")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-info-surface rounded-lg">
                      <TrendingUp className="h-5 w-5 text-info" />
                      <div>
                        <p className="text-sm font-semibold">{t("adminDashboard.activeThisWeek2", "Active This Week")}</p>
                        <p className="text-xs text-muted-foreground">{t("adminDashboard.users", "{{activeThisWeek}} users", { activeThisWeek: stats.activeThisWeek })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-leaf rounded-lg">
                      <Activity className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold">{t("adminDashboard.onlineNow2", "Online Now")}</p>
                        <p className="text-xs text-muted-foreground">{t("adminDashboard.users2", "{{onlineUsers}} users", { onlineUsers: stats.onlineUsers })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-destructive-surface rounded-lg">
                      <AlertCircle className="h-5 w-5 text-destructive" />
                      <div>
                        <p className="text-sm font-semibold">{t("adminDashboard.suspended", "Suspended")}</p>
                        <p className="text-xs text-muted-foreground">{t("adminDashboard.accounts", "{{suspendedUsers}} accounts", { suspendedUsers: stats.suspendedUsers })}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
      {/* Header */}
    </AppShell>
  );
};

export default AdminDashboard;
