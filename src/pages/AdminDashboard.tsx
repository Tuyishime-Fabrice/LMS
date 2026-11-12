import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import {
  Users,
  GraduationCap,
  BookOpen,
  TrendingUp,
  UserCheck,
  AlertCircle,
  Activity,
  DollarSign,
  Pencil,
  ClipboardList,
  Award,
  ArrowRight
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

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
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      await fetchStats();
    } catch (error: any) {
      console.error("Error checking admin access:", error);
      toast.error("Failed to verify admin access");
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
      toast.error("Failed to load dashboard stats");
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
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <AdminSidebar 
          pendingTeachers={stats.pendingTeachers}
          pendingCourses={stats.pendingCourses}
        />

        <div className="flex-1 flex flex-col overflow-hidden p-4">
          {/* Header */}
          <header className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100 mb-6 overflow-hidden">
            <div className="bg-gradient-to-r from-[#006d2c] to-[#008000] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="text-white" />
                  <div className="text-white">
                    <h1 className="text-3xl font-bold mb-1">Admin Dashboard</h1>
                    <p className="text-white/90 text-sm">Platform Overview & Management</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-2">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Stats Grid - Row 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.activeThisWeek} active this week
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Students</CardTitle>
                    <GraduationCap className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalStudents}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      {stats.onlineStudents} online now
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Teachers</CardTitle>
                    <UserCheck className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalTeachers}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                      {stats.onlineTeachers} online now
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Courses</CardTitle>
                    <BookOpen className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalCourses}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.pendingCourses} pending review
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Online Status Card */}
              <Card className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border-emerald-500/20">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="h-4 w-4 text-emerald-500" />
                    Currently Online
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-white/50 rounded-lg">
                      <div className="text-2xl font-bold text-emerald-600">{stats.onlineUsers}</div>
                      <p className="text-xs text-muted-foreground">Total Online</p>
                    </div>
                    <div className="text-center p-3 bg-white/50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{stats.onlineStudents}</div>
                      <p className="text-xs text-muted-foreground">Students</p>
                    </div>
                    <div className="text-center p-3 bg-white/50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{stats.onlineTeachers}</div>
                      <p className="text-xs text-muted-foreground">Teachers</p>
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-3">
                    Active in the last 15 minutes
                  </p>
                </CardContent>
              </Card>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Growth Chart */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>User Growth</CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={timePeriod === "week" ? "default" : "outline"}
                          onClick={() => setTimePeriod("week")}
                          className={timePeriod === "week" ? "bg-[#006d2c] hover:bg-[#005a24]" : ""}
                        >
                          Week
                        </Button>
                        <Button
                          size="sm"
                          variant={timePeriod === "month" ? "default" : "outline"}
                          onClick={() => setTimePeriod("month")}
                          className={timePeriod === "month" ? "bg-[#006d2c] hover:bg-[#005a24]" : ""}
                        >
                          Month
                        </Button>
                        <Button
                          size="sm"
                          variant={timePeriod === "year" ? "default" : "outline"}
                          onClick={() => setTimePeriod("year")}
                          className={timePeriod === "year" ? "bg-[#006d2c] hover:bg-[#005a24]" : ""}
                        >
                          Year
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
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats.pendingTeachers > 0 && (
                      <div 
                        className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                        onClick={() => navigate("/admin/teacher-approvals")}
                      >
                        <div className="flex items-center gap-3">
                          <UserCheck className="h-5 w-5 text-purple-600" />
                          <div>
                            <p className="font-semibold text-sm">Pending Teacher Approvals</p>
                            <p className="text-xs text-gray-600">{stats.pendingTeachers} waiting for review</p>
                          </div>
                        </div>
                        <AlertCircle className="h-5 w-5 text-purple-600" />
                      </div>
                    )}

                    {stats.pendingCourses > 0 && (
                      <div 
                        className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                        onClick={() => navigate("/admin/courses")}
                      >
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-5 w-5 text-orange-600" />
                          <div>
                            <p className="font-semibold text-sm">Pending Course Reviews</p>
                            <p className="text-xs text-gray-600">{stats.pendingCourses} courses to review</p>
                          </div>
                        </div>
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                      </div>
                    )}

                    {stats.suspendedUsers > 0 && (
                      <div 
                        className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                        onClick={() => navigate("/admin/users")}
                      >
                        <div className="flex items-center gap-3">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <div>
                            <p className="font-semibold text-sm">Suspended Users</p>
                            <p className="text-xs text-gray-600">{stats.suspendedUsers} accounts suspended</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {stats.pendingTeachers === 0 && stats.pendingCourses === 0 && stats.suspendedUsers === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No pending actions</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Course Management */}
              <Card>
                <CardHeader>
                  <CardTitle>Course Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div
                      onClick={() => navigate("/admin/courses")}
                      className="group cursor-pointer p-4 rounded-lg border border-gray-200 hover:border-[#006d2c] hover:bg-green-50/50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-[#006d2c]/10 flex items-center justify-center">
                          <BookOpen className="h-5 w-5 text-[#006d2c]" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-[#006d2c] group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="font-semibold text-sm text-gray-900">All Courses</p>
                      <p className="text-xs text-gray-600 mt-0.5">View, approve, manage</p>
                    </div>

                    <div
                      onClick={() => navigate("/create-course")}
                      className="group cursor-pointer p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50/50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Pencil className="h-5 w-5 text-blue-600" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="font-semibold text-sm text-gray-900">Create / Edit Course</p>
                      <p className="text-xs text-gray-600 mt-0.5">Build or update content</p>
                    </div>

                    <div
                      onClick={() => navigate("/admin/grades")}
                      className="group cursor-pointer p-4 rounded-lg border border-gray-200 hover:border-purple-500 hover:bg-purple-50/50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <ClipboardList className="h-5 w-5 text-purple-600" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="font-semibold text-sm text-gray-900">Grades & Quizzes</p>
                      <p className="text-xs text-gray-600 mt-0.5">Quiz, assignment, capstone</p>
                    </div>

                    <div
                      onClick={() => navigate("/admin/certificates")}
                      className="group cursor-pointer p-4 rounded-lg border border-gray-200 hover:border-orange-500 hover:bg-orange-50/50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                          <Award className="h-5 w-5 text-orange-600" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-orange-600 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="font-semibold text-sm text-gray-900">Certificates</p>
                      <p className="text-xs text-gray-600 mt-0.5">Issue & manage</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Health */}
              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <div>
                        <p className="text-sm font-semibold">System Status</p>
                        <p className="text-xs text-gray-600">All systems operational</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="text-sm font-semibold">Active This Week</p>
                        <p className="text-xs text-gray-600">{stats.activeThisWeek} users</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-lg">
                      <Activity className="h-5 w-5 text-emerald-600" />
                      <div>
                        <p className="text-sm font-semibold">Online Now</p>
                        <p className="text-xs text-gray-600">{stats.onlineUsers} users</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="text-sm font-semibold">Suspended</p>
                        <p className="text-xs text-gray-600">{stats.suspendedUsers} accounts</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
