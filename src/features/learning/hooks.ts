import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { enUS, fr } from "date-fns/locale";
import { useAppAuth } from "@/contexts/AuthContext";
import { fetchCalendarEvents } from "@/features/calendar/events";
import type { AppRole } from "@/components/shell/navigation";
import { fetchCourseAnnouncements, fetchCourseOutline, fetchEnrolledCourses } from "./api";

export function useDateLocale() {
  const { i18n } = useTranslation();
  return i18n.language?.startsWith("fr") ? fr : enUS;
}

export function useEnrolledCourses() {
  const { user } = useAppAuth();
  return useQuery({
    queryKey: ["enrolled-courses", user?.id],
    queryFn: () => fetchEnrolledCourses(user!.id),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });
}

export function useCourseOutline(courseId: string | undefined) {
  const { user } = useAppAuth();
  return useQuery({
    queryKey: ["course-outline", courseId, user?.id],
    queryFn: () => fetchCourseOutline(courseId!, user!.id),
    enabled: Boolean(courseId && user?.id),
    staleTime: 30_000,
  });
}

export function useCalendarEvents(from: Date, to: Date, roleOverride?: AppRole) {
  const { user, profile } = useAppAuth();
  const role = (roleOverride || profile?.role || "student") as AppRole;
  return useQuery({
    queryKey: ["calendar-events", role, user?.id, from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)],
    queryFn: () => fetchCalendarEvents({ role, userId: user!.id }, from, to),
    enabled: Boolean(user?.id && profile),
    staleTime: 60_000,
  });
}

export function useCourseAnnouncements(limit = 4) {
  const { user } = useAppAuth();
  return useQuery({
    queryKey: ["course-announcements", user?.id, limit],
    queryFn: () => fetchCourseAnnouncements(limit),
    enabled: Boolean(user?.id),
    staleTime: 2 * 60_000,
  });
}
