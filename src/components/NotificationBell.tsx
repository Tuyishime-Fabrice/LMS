import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  Check, 
  CheckCheck,
  GraduationCap,
  Users,
  Shield,
  Megaphone,
  Clock,
  ChevronRight
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Announcement {
  id: string;
  title: string;
  message: string;
  target_audience: string;
  announcement_type?: string;
  created_at: string;
  is_read?: boolean;
}

type CategoryFilter = "all" | "teacher" | "cohort" | "admin";

export function NotificationBell() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchAnnouncements(user.id);
      }
    };
    init();

    const channel = supabase.channel("announcements").on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => {
      if (userId) fetchAnnouncements(userId);
    }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const fetchAnnouncements = async (uid: string) => {
    try {
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", uid).single();
      const role = profile?.role;

      const { data: announcementsData, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_active", true)
        .or(`target_audience.eq.all,target_audience.eq.${role === "student" ? "students" : role === "teacher" ? "teachers" : "all"}`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const { data: reads } = await supabase.from("announcement_reads").select("announcement_id").eq("user_id", uid);
      const readIds = new Set(reads?.map(r => r.announcement_id) || []);

      const withReadStatus = (announcementsData || []).map(a => ({ ...a, is_read: readIds.has(a.id) }));
      setAnnouncements(withReadStatus);
      setUnreadCount(withReadStatus.filter(a => !a.is_read).length);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    }
  };

  const markAsRead = async (announcementId: string) => {
    if (!userId) return;
    try {
      await supabase.from("announcement_reads").upsert({ announcement_id: announcementId, user_id: userId }, { onConflict: "announcement_id,user_id" });
      setAnnouncements(prev => prev.map(a => a.id === announcementId ? { ...a, is_read: true } : a));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    try {
      const unread = announcements.filter(a => !a.is_read);
      await Promise.all(unread.map(a => supabase.from("announcement_reads").upsert({ announcement_id: a.id, user_id: userId }, { onConflict: "announcement_id,user_id" })));
      setAnnouncements(prev => prev.map(a => ({ ...a, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getAnnouncementType = (announcement: Announcement): CategoryFilter => {
    const type = announcement.announcement_type?.toLowerCase() || "";
    if (type.includes("teacher") || type.includes("course")) return "teacher";
    if (type.includes("cohort") || type.includes("group")) return "cohort";
    if (type.includes("admin") || type.includes("system")) return "admin";
    return "admin";
  };

  const getCategoryIcon = (category: CategoryFilter) => {
    switch (category) {
      case "teacher": return GraduationCap;
      case "cohort": return Users;
      case "admin": return Shield;
      default: return Megaphone;
    }
  };

  const getCategoryColor = (category: CategoryFilter) => {
    switch (category) {
      case "teacher": return { bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-200" };
      case "cohort": return { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-200" };
      case "admin": return { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" };
      default: return { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" };
    }
  };

  const getCategoryLabel = (category: CategoryFilter) => {
    switch (category) {
      case "teacher": return "Teacher";
      case "cohort": return "Cohort";
      case "admin": return "Admin";
      default: return "All";
    }
  };

  const filteredAnnouncements = activeCategory === "all" 
    ? announcements 
    : announcements.filter(a => getAnnouncementType(a) === activeCategory);

  const getCategoryCount = (category: CategoryFilter) => {
    if (category === "all") return announcements.filter(a => !a.is_read).length;
    return announcements.filter(a => getAnnouncementType(a) === category && !a.is_read).length;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative h-10 w-10 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Bell className="h-5 w-5 text-gray-600" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 flex items-center justify-center px-1 text-[10px] font-bold bg-red-500 text-white rounded-full shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0 shadow-xl rounded-2xl border-0" align="end" sideOffset={8}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <Badge className="bg-red-100 text-red-600 hover:bg-red-100 px-2 py-0.5 text-xs font-medium">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead} 
                className="text-xs h-8 text-[#0A400C] hover:text-[#0A400C] hover:bg-[#0A400C]/10 font-medium"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as CategoryFilter)} className="w-full">
          <div className="px-3 pt-3 pb-2 border-b border-gray-100 bg-gray-50/50">
            <TabsList className="w-full h-auto p-1 bg-white rounded-xl shadow-sm border border-gray-100 grid grid-cols-4 gap-1">
              {(["all", "teacher", "cohort", "admin"] as CategoryFilter[]).map((category) => {
                const Icon = getCategoryIcon(category);
                const count = getCategoryCount(category);
                return (
                  <TabsTrigger 
                    key={category}
                    value={category}
                    className="relative flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-xs font-medium data-[state=active]:bg-[#0A400C] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.5} />
                    <span className="capitalize">{getCategoryLabel(category)}</span>
                    {count > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center px-1 text-[9px] font-bold bg-red-500 text-white rounded-full">
                        {count}
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value={activeCategory} className="m-0">
            <ScrollArea className="h-[340px]">
              {filteredAnnouncements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Bell className="h-8 w-8 text-gray-300" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-medium text-gray-900 mb-1">No notifications</p>
                  <p className="text-xs text-gray-500 text-center">
                    {activeCategory === "all" 
                      ? "You're all caught up!" 
                      : `No ${getCategoryLabel(activeCategory).toLowerCase()} announcements yet`}
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {filteredAnnouncements.map((announcement) => {
                    const category = getAnnouncementType(announcement);
                    const Icon = getCategoryIcon(category);
                    const colors = getCategoryColor(category);
                    
                    return (
                      <div 
                        key={announcement.id} 
                        className={`group px-4 py-3 mx-2 my-1 rounded-xl cursor-pointer transition-all hover:bg-gray-50 ${
                          !announcement.is_read ? "bg-[#0A400C]/5" : ""
                        }`}
                        onClick={() => !announcement.is_read && markAsRead(announcement.id)}
                      >
                        <div className="flex gap-3">
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                            <Icon className={`h-5 w-5 ${colors.text}`} strokeWidth={1.5} />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <Badge 
                                    variant="outline" 
                                    className={`${colors.bg} ${colors.text} ${colors.border} text-[10px] px-1.5 py-0 font-medium`}
                                  >
                                    {getCategoryLabel(category)}
                                  </Badge>
                                  {!announcement.is_read && (
                                    <span className="w-2 h-2 rounded-full bg-[#0A400C] animate-pulse" />
                                  )}
                                </div>
                                <p className={`text-sm font-medium line-clamp-1 ${
                                  !announcement.is_read ? "text-gray-900" : "text-gray-700"
                                }`}>
                                  {announcement.title}
                                </p>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                                  {announcement.message}
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-400 flex-shrink-0 mt-1 transition-colors" />
                            </div>
                            
                            {/* Footer */}
                            <div className="flex items-center gap-2 mt-2">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <span className="text-[11px] text-gray-400">{formatDate(announcement.created_at)}</span>
                              {announcement.is_read && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <div className="flex items-center gap-1 text-[11px] text-gray-400">
                                    <Check className="h-3 w-3" />
                                    Read
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
