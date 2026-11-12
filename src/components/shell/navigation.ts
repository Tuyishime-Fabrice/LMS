import type { LucideIcon } from "lucide-react";
import {
  Award, BadgeCheck, BarChart3, BookOpen, CalendarDays, ClipboardCheck, ClipboardList, Compass,
  CreditCard, FileClock, GraduationCap, Handshake, Home, Layers, LayoutDashboard, Megaphone,
  MessageSquare, MessagesSquare, Package, Quote, Settings, Tag, Trophy, UserCheck, Users, UsersRound,
} from "lucide-react";

export type AppRole = "student" | "teacher" | "admin";

export type NavItem = {
  /** i18n key; `label` is the English fallback. */
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Extra paths that should also highlight this item. */
  match?: string[];
  badge?: "pendingTeachers" | "pendingCourses" | "pendingCertificates";
};

export type NavGroup = { key: string; label?: string; items: NavItem[] };

export const navigation: Record<AppRole, NavGroup[]> = {
  student: [
    {
      key: "learn",
      items: [
        { key: "shell.nav.home", label: "Home", to: "/student/dashboard", icon: Home },
        { key: "shell.nav.myCourses", label: "My courses", to: "/student/my-courses", icon: BookOpen, match: ["/learn"] },
        { key: "shell.nav.calendar", label: "Calendar", to: "/student/schedule", icon: CalendarDays },
        { key: "shell.nav.assignments", label: "Assignments", to: "/student/assignments", icon: ClipboardList },
        { key: "shell.nav.grades", label: "Grades", to: "/student/scores", icon: BarChart3 },
        { key: "shell.nav.messages", label: "Messages", to: "/student/chat", icon: MessagesSquare },
        { key: "shell.nav.certificates", label: "Certificates", to: "/student/certificates", icon: Award },
      ],
    },
    {
      key: "discover",
      label: "Discover",
      items: [{ key: "shell.nav.explore", label: "Explore courses", to: "/courses", icon: Compass }],
    },
    {
      key: "account",
      label: "Account",
      items: [
        { key: "shell.nav.payments", label: "Payments", to: "/student/payments", icon: CreditCard },
        { key: "shell.nav.settings", label: "Settings", to: "/student/settings", icon: Settings },
      ],
    },
  ],
  teacher: [
    {
      key: "teach",
      items: [
        { key: "shell.nav.overview", label: "Overview", to: "/teacher/dashboard", icon: LayoutDashboard },
        { key: "shell.nav.cohorts", label: "Cohorts", to: "/teacher/cohorts", icon: UsersRound },
        { key: "shell.nav.calendar", label: "Calendar", to: "/teacher/schedule", icon: CalendarDays },
      ],
    },
    {
      key: "review",
      label: "Review",
      items: [
        { key: "shell.nav.submissions", label: "Submissions", to: "/teacher/assignments", icon: ClipboardCheck },
        { key: "shell.nav.grades", label: "Grades", to: "/teacher/grades", icon: BarChart3 },
        { key: "shell.nav.students", label: "Students", to: "/teacher/students", icon: Users },
      ],
    },
    {
      key: "communicate",
      label: "Communicate",
      items: [
        { key: "shell.nav.messages", label: "Messages", to: "/teacher/chat", icon: MessageSquare },
        { key: "shell.nav.announcements", label: "Announcements", to: "/teacher/announcements", icon: Megaphone },
      ],
    },
    {
      key: "account",
      label: "Account",
      items: [{ key: "shell.nav.settings", label: "Settings", to: "/teacher/settings", icon: Settings }],
    },
  ],
  admin: [
    {
      key: "overview",
      items: [{ key: "shell.nav.overview", label: "Overview", to: "/admin/dashboard", icon: LayoutDashboard }],
    },
    {
      key: "people",
      label: "People",
      items: [
        { key: "shell.nav.users", label: "Users", to: "/admin/users", icon: Users },
        { key: "shell.nav.teacherApprovals", label: "Teacher approvals", to: "/admin/teacher-approvals", icon: UserCheck, badge: "pendingTeachers" },
      ],
    },
    {
      key: "academics",
      label: "Academics",
      items: [
        { key: "shell.nav.courses", label: "Courses", to: "/admin/courses", icon: BookOpen, badge: "pendingCourses" },
        { key: "shell.nav.calendar", label: "Calendar", to: "/admin/calendar", icon: CalendarDays },
        { key: "shell.nav.progress", label: "Student progress", to: "/admin/student-progress", icon: GraduationCap },
        { key: "shell.nav.grades", label: "Grades", to: "/admin/grades", icon: BarChart3 },
        { key: "shell.nav.certificates", label: "Certificates", to: "/admin/certificates", icon: BadgeCheck, badge: "pendingCertificates" },
      ],
    },
    {
      key: "finance",
      label: "Finance",
      items: [
        { key: "shell.nav.payments", label: "Payments", to: "/admin/payments", icon: CreditCard },
        { key: "shell.nav.pricing", label: "Pricing tiers", to: "/admin/pricing", icon: Layers },
        { key: "shell.nav.coupons", label: "Coupons", to: "/admin/coupons", icon: Tag },
        { key: "shell.nav.bundles", label: "Bundles", to: "/admin/bundles", icon: Package },
        { key: "shell.nav.scholarships", label: "Scholarships", to: "/admin/scholarships", icon: Trophy },
      ],
    },
    {
      key: "communication",
      label: "Communication",
      items: [{ key: "shell.nav.announcements", label: "Announcements", to: "/admin/announcements", icon: Megaphone }],
    },
    {
      key: "website",
      label: "Website",
      items: [
        { key: "shell.nav.exhibition", label: "Exhibition", to: "/admin/exhibition", icon: Trophy },
        { key: "shell.nav.testimonials", label: "Testimonials", to: "/admin/testimonials", icon: Quote },
        { key: "shell.nav.partners", label: "Partner requests", to: "/admin/partners", icon: Handshake },
      ],
    },
    {
      key: "system",
      label: "System",
      items: [
        { key: "shell.nav.logs", label: "Activity logs", to: "/admin/logs", icon: FileClock },
        { key: "shell.nav.settings", label: "Settings", to: "/admin/settings", icon: Settings },
      ],
    },
  ],
};

/** The five destinations a learner reaches with a thumb. */
export const studentTabBar: NavItem[] = [
  navigation.student[0].items[0],
  navigation.student[0].items[1],
  navigation.student[0].items[2],
  navigation.student[0].items[5],
];

export const settingsPath: Record<AppRole, string> = {
  student: "/student/settings",
  teacher: "/teacher/settings",
  admin: "/admin/settings",
};

export const homePath: Record<AppRole, string> = {
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  admin: "/admin/dashboard",
};
