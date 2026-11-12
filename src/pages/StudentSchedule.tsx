import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  ChevronLeft, 
  ChevronRight,
  BookOpen,
  Users,
  Play,
  Bell,
  CalendarDays,
  Sun,
  CalendarRange,
  Radio
} from "lucide-react";
import { toast } from "sonner";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/StudentSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from "@/components/LanguageSelector";

const StudentSchedule = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [scheduledClasses, setScheduledClasses] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (profile) {
      fetchScheduledClasses();
    }
  }, [profile]);

  const fetchScheduledClasses = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: enrollments, error } = await supabase
      .from("course_enrollments")
      .select("course_id, courses(id, title)")
      .eq("student_id", user.id);
    if (error) {
      console.error("Error fetching enrolled courses:", error);
      return;
    }
    const courseIds = (enrollments || []).map(e => e.course_id);
    if (!courseIds.length) { setScheduledClasses([]); return; }
    const now = new Date().toISOString();
    const { data: classes, error: classesError } = await supabase
      .from("scheduled_classes").select("*")
      .in("course_id", courseIds).gte("scheduled_time", now)
      .order("scheduled_time", { ascending: true });
    if (classesError) { console.error("Error fetching scheduled classes:", classesError); return; }
    const courseTitles = new Map((enrollments || []).map(e => [e.course_id, e.courses?.title || ""]));
    const allClasses = (classes || []).map(sc => ({ ...sc, courses: { title: courseTitles.get(sc.course_id) || "" } }));

    const filteredClasses = allClasses
      .filter(c => c.scheduled_time >= now)
      .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());
    
    setScheduledClasses(filteredClasses);
  };

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (profileData.role !== "student") {
        navigate("/teacher/dashboard");
        return;
      }

      setProfile(profileData);
    } catch (error: any) {
      toast.error(error.message);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  // Get stats
  const todayClasses = scheduledClasses.filter(sc => {
    const classDate = new Date(sc.scheduled_time);
    return classDate.toDateString() === new Date().toDateString();
  }).length;

  const thisWeekClasses = scheduledClasses.filter(sc => {
    const classDate = new Date(sc.scheduled_time);
    const today = new Date();
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    return classDate >= today && classDate <= weekEnd;
  }).length;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <StudentSidebar />
        
        <div className="flex-1 flex flex-col p-4 gap-6">
          {/* Header */}
          <header className="bg-gradient-to-r from-[#0A400C] via-[#0d5210] to-[#116315] rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-white hover:bg-white/10" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarIcon className="h-5 w-5 text-white/80" />
                    <span className="text-white/80 text-sm font-medium">{t('schedule.classSchedule')}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    {t('schedule.viewManageClasses')}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <LanguageSelector />
                <Avatar className="h-11 w-11 ring-2 ring-white/30 ring-offset-2 ring-offset-[#0A400C]">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name} className="object-cover" />
                  ) : (
                    <AvatarFallback className="bg-white text-[#0A400C] font-bold">
                      {profile?.full_name?.charAt(0) || 'S'}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
            </div>
          </header>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-0 shadow-md rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-blue-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{scheduledClasses.length}</p>
                  <p className="text-xs text-gray-500">{t('schedule.upcomingClasses')}</p>
                </div>
              </div>
            </Card>
            <Card className="border-0 shadow-md rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-green-50 flex items-center justify-center">
                  <Sun className="h-5 w-5 text-green-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{todayClasses}</p>
                  <p className="text-xs text-gray-500">{t('schedule.today')}</p>
                </div>
              </div>
            </Card>
            <Card className="border-0 shadow-md rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-purple-50 flex items-center justify-center">
                  <CalendarRange className="h-5 w-5 text-purple-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{thisWeekClasses}</p>
                  <p className="text-xs text-gray-500">This Week</p>
                </div>
              </div>
            </Card>
            <Card className="border-0 shadow-md rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Radio className="h-5 w-5 text-orange-600" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">Live</p>
                  <p className="text-xs text-gray-500">Class Type</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            {/* Classes List - 2 columns */}
            <div className="lg:col-span-2 space-y-4">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0A400C] flex items-center justify-center">
                    <Video className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{t('schedule.upcomingClasses')}</h2>
                    <p className="text-sm text-gray-500">Your scheduled live sessions</p>
                  </div>
                </div>
                {scheduledClasses.length > 0 && (
                  <Badge className="bg-[#0A400C]/10 text-[#0A400C] hover:bg-[#0A400C]/20 px-3 py-1">
                    {scheduledClasses.length} {scheduledClasses.length === 1 ? t('schedule.class') : t('schedule.classes')}
                  </Badge>
                )}
              </div>

              {/* Classes Cards */}
              <div className="space-y-4">
                {scheduledClasses.length > 0 ? (
                  scheduledClasses.map((scheduledClass) => {
                    const classDate = new Date(scheduledClass.scheduled_time);
                    const now = new Date();
                    const isToday = classDate.toDateString() === now.toDateString();
                    const isTomorrow = classDate.toDateString() === new Date(now.getTime() + 86400000).toDateString();
                    const dayName = classDate.toLocaleDateString('en-US', { weekday: 'short' });
                    const monthName = classDate.toLocaleDateString('en-US', { month: 'short' });
                    const dayNumber = classDate.getDate();
                    const timeString = classDate.toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit',
                      hour12: true 
                    });

                    const timeUntil = classDate.getTime() - now.getTime();
                    const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
                    const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
                    const isStartingSoon = hoursUntil === 0 && minutesUntil <= 30 && minutesUntil > 0;
                    const isLive = hoursUntil === 0 && minutesUntil <= 0 && minutesUntil > -90;

                    return (
                      <Card 
                        key={scheduledClass.id}
                        className={`group border-0 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden rounded-2xl ${
                          isLive ? 'ring-2 ring-red-500 ring-offset-2' : 
                          isStartingSoon ? 'ring-2 ring-orange-400 ring-offset-2' : ''
                        }`}
                      >
                        <CardContent className="p-0">
                          <div className="flex">
                            {/* Date Column */}
                            <div className={`w-24 sm:w-28 flex-shrink-0 p-4 flex flex-col items-center justify-center text-white ${
                              isLive ? 'bg-gradient-to-br from-red-500 to-red-600' :
                              isStartingSoon ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                              isToday ? 'bg-gradient-to-br from-[#0A400C] to-[#116315]' :
                              'bg-gradient-to-br from-gray-700 to-gray-800'
                            }`}>
                              {isLive && (
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                  <span className="text-xs font-bold">LIVE</span>
                                </div>
                              )}
                              <span className="text-xs font-medium opacity-80">{monthName}</span>
                              <span className="text-4xl font-bold leading-none my-1">{dayNumber}</span>
                              <span className="text-xs font-medium opacity-80">{dayName}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-5 bg-white">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  {/* Status Badge */}
                                  <div className="flex items-center gap-2 mb-2">
                                    {isLive ? (
                                      <Badge className="bg-red-500 text-white animate-pulse">
                                        <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-ping" />
                                        Live Now
                                      </Badge>
                                    ) : isStartingSoon ? (
                                      <Badge className="bg-orange-500 text-white">
                                        <Bell className="h-3 w-3 mr-1" />
                                        {t('schedule.startingSoon')}
                                      </Badge>
                                    ) : isToday ? (
                                      <Badge className="bg-[#0A400C] text-white">{t('schedule.today')}</Badge>
                                    ) : isTomorrow ? (
                                      <Badge variant="outline" className="border-[#0A400C] text-[#0A400C]">{t('schedule.tomorrow')}</Badge>
                                    ) : null}
                                    <Badge variant="outline" className="text-gray-500">
                                      <Video className="h-3 w-3 mr-1" />
                                      Live Session
                                    </Badge>
                                  </div>

                                  {/* Title */}
                                  <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1 group-hover:text-[#0A400C] transition-colors">
                                    {scheduledClass.title}
                                  </h3>
                                  
                                  {/* Course Name */}
                                  <p className="text-sm text-gray-500 mb-3 flex items-center gap-1.5">
                                    <BookOpen className="h-4 w-4" />
                                    {scheduledClass.courses?.title}
                                  </p>

                                  {/* Time Info */}
                                  <div className="flex flex-wrap items-center gap-4 text-sm">
                                    <div className="flex items-center gap-1.5 text-gray-700">
                                      <Clock className="h-4 w-4 text-[#0A400C]" />
                                      <span className="font-semibold">{timeString}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-gray-500">
                                      <Users className="h-4 w-4" />
                                      <span>90 {t('schedule.min')}</span>
                                    </div>
                                    {hoursUntil >= 0 && !isLive && (
                                      <div className={`text-xs px-2 py-1 rounded-full ${
                                        isStartingSoon ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                                      }`}>
                                        {isStartingSoon ? (
                                          <span className="font-semibold">{t('schedule.startsIn')} {minutesUntil}m</span>
                                        ) : hoursUntil === 0 ? (
                                          <span>{t('schedule.startsIn')} {minutesUntil}m</span>
                                        ) : hoursUntil < 24 ? (
                                          <span>{t('schedule.startsIn')} {hoursUntil}h {minutesUntil}m</span>
                                        ) : (
                                          <span>{Math.floor(hoursUntil / 24)} {t('schedule.days')} left</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Join Button */}
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (scheduledClass.meet_link) {
                                      window.open(scheduledClass.meet_link, '_blank');
                                    } else {
                                      toast.error("Meeting link not available");
                                    }
                                  }}
                                  className={`flex-shrink-0 rounded-xl px-5 h-11 font-semibold shadow-lg transition-all hover:scale-105 ${
                                    isLive ? 'bg-red-500 hover:bg-red-600' :
                                    isStartingSoon ? 'bg-orange-500 hover:bg-orange-600' :
                                    'bg-[#0A400C] hover:bg-[#083308]'
                                  }`}
                                >
                                  <Play className="h-4 w-4 mr-2" fill="currentColor" />
                                  {isLive ? 'Join Now' : t('schedule.join')}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                    <CardContent className="p-0">
                      <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-12 text-center">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white shadow-lg flex items-center justify-center">
                          <CalendarIcon className="h-10 w-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{t('schedule.noUpcomingClasses')}</h3>
                        <p className="text-gray-500 mb-6 max-w-sm mx-auto">{t('schedule.scheduleIsClear')}</p>
                        <Button 
                          onClick={() => navigate('/courses')}
                          className="bg-[#0A400C] hover:bg-[#083308] rounded-xl px-6"
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          Browse Courses
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Calendar Sidebar - 1 column */}
            <div className="space-y-4">
              {/* Calendar Card */}
              <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-[#0A400C] to-[#116315] p-4">
                  <div className="flex items-center justify-between">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        const newDate = new Date(currentMonth);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setCurrentMonth(newDate);
                      }}
                      className="text-white hover:bg-white/10 h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="font-bold text-white">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        const newDate = new Date(currentMonth);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setCurrentMonth(newDate);
                      }}
                      className="text-white hover:bg-white/10 h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    className="rounded-md border-0 w-full"
                    modifiers={{
                      scheduled: scheduledClasses.map((sc: any) => new Date(sc.scheduled_time))
                    }}
                    modifiersStyles={{
                      scheduled: {
                        backgroundColor: '#0A400C',
                        color: 'white',
                        borderRadius: '8px',
                        fontWeight: 'bold'
                      }
                    }}
                  />
                </CardContent>
              </Card>

            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default StudentSchedule;
