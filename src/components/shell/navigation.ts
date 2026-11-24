import type { LucideIcon } from "lucide-react";
import {
  Award, BadgeCheck, BarChart3, BookOpen, CalendarDays, ClipboardCheck, ClipboardList, Compass,
  CreditCard, FileClock, FilePlus2, GraduationCap, HandCoins, Handshake, Home, Layers, LayoutDashboard, Megaphone,
  MessagesSquare, Package, PieChart, Presentation, Route, Settings, Tag, Trophy, UserCheck, Users, UsersRound,
} from "lucide-react";

export type AppRole = "student" | "teacher" | "admin";
/** Shells. "facilitator" is not an account role: it is the workspace of anyone assigned to facilitate. */
export type ShellRole = AppRole | "facilitator";

export type NavItem = {
  /** i18n key; `label` is the English fallback. */
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Extra paths that should also highlight this item. */
  match?: string[];
  /** Highlight only on this exact path (for a section root such as /facilitate). */
  exact?: boolean;
  badge?: "pendingTeachers" | "pendingCourses" | "pendingCertificates";
};

export type NavGroup = { key: string; label?: string; items: NavItem[] };

export const navigation: Record<ShellRole, NavGroup[]> = {
  student: [
    {
      key: "learn",
      items: [
        { key: "shell.nav.home", label: "Home", to: "/student/dashboard", icon: Home },
        { key: "shell.nav.myLearning", label: "My learning", to: "/student/my-courses", icon: BookOpen, match: ["/learn"] },
        { key: "shell.nav.assignments", label: "Assignments", to: "/student/assignments", icon: ClipboardList },
        { key: "shell.nav.grades", label: "Grades", to: "/student/scores", icon: BarChart3 },
        { key: "shell.nav.calendar", label: "Calendar", to: "/student/schedule", icon: CalendarDays },
        { key: "shell.nav.certificates", label: "Certificates", to: "/student/certificates", icon: Award },
      ],
    },
    {
      key: "explore",
      label: "Explore",
      items: [
        { key: "shell.nav.courses", label: "Courses", to: "/courses", icon: Compass, match: ["/course/"] },
        { key: "shell.nav.tracks", label: "Skill & career tracks", to: "/tracks", icon: Route },
        { key: "shell.nav.competitions", label: "Competitions", to: "/competitions", icon: Trophy },
      ],
    },
    {
      key: "community",
      label: "Community",
      items: [{ key: "shell.nav.community", label: "Cohort community", to: "/student/community", icon: MessagesSquare }],
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
        { key: "shell.nav.submissions", label: "Grading queue", to: "/teacher/assignments", icon: ClipboardCheck },
        { key: "shell.nav.grades", label: "Grades", to: "/teacher/grades", icon: BarChart3 },
        { key: "shell.nav.students", label: "Learners", to: "/teacher/students", icon: Users },
      ],
    },
    {
      key: "communicate",
      label: "Communicate",
      items: [{ key: "shell.nav.announcements", label: "Announcements", to: "/teacher/announcements", icon: Megaphone }],
    },
    {
      key: "account",
      label: "Account",
      items: [{ key: "shell.nav.settings", label: "Settings", to: "/teacher/settings", icon: Settings }],
    },
  ],
  facilitator: [
    {
      key: "facilitate",
      items: [
        { key: "shell.nav.facilitationOverview", label: "Overview", to: "/facilitate", icon: LayoutDashboard, exact: true },
        { key: "shell.nav.review", label: "Review work", to: "/facilitate/review", icon: ClipboardCheck },
        { key: "shell.nav.learners", label: "Learners", to: "/facilitate/learners", icon: Users },
        { key: "shell.nav.drafts", label: "Assignment drafts", to: "/facilitate/assignments", icon: FilePlus2 },
      ],
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
        { key: "shell.nav.users", label: "Users and roles", to: "/admin/users", icon: Users },
        { key: "shell.nav.teacherApprovals", label: "Instructor approvals", to: "/admin/teacher-approvals", icon: UserCheck, badge: "pendingTeachers" },
        { key: "shell.nav.orgRequests", label: "Organisation requests", to: "/admin/partners", icon: Handshake },
        { key: "shell.nav.insights", label: "Onboarding insights", to: "/admin/insights", icon: PieChart },
      ],
    },
    {
      key: "academics",
      label: "Academics",
      items: [
        { key: "shell.nav.courses", label: "Courses", to: "/admin/courses", icon: BookOpen, badge: "pendingCourses" },
        { key: "shell.nav.tracks", label: "Skill & career tracks", to: "/admin/tracks", icon: Route },
        { key: "shell.nav.competitions", label: "Competitions", to: "/admin/competitions", icon: Trophy },
        { key: "shell.nav.calendar", label: "Calendar", to: "/admin/calendar", icon: CalendarDays },
        { key: "shell.nav.progress", label: "Learner progress", to: "/admin/student-progress", icon: GraduationCap },
        { key: "shell.nav.grades", label: "Grades", to: "/admin/grades", icon: BarChart3 },
        { key: "shell.nav.certificates", label: "Certificates", to: "/admin/certificates", icon: BadgeCheck, badge: "pendingCertificates" },
        { key: "shell.nav.exhibition", label: "Student projects", to: "/admin/exhibition", icon: Presentation },
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
        { key: "shell.nav.scholarships", label: "Scholarships", to: "/admin/scholarships", icon: HandCoins },
      ],
    },
    {
      key: "system",
      label: "System",
      items: [
        { key: "shell.nav.announcements", label: "Announcements", to: "/admin/announcements", icon: Megaphone },
        { key: "shell.nav.logs", label: "Activity logs", to: "/admin/logs", icon: FileClock },
        { key: "shell.nav.settings", label: "Settings", to: "/admin/settings", icon: Settings },
      ],
    },
  ],
};

/** The four destinations a learner reaches with a thumb. */
export const studentTabBar: NavItem[] = [
  navigation.student[0].items[0],
  navigation.student[0].items[1],
  navigation.student[0].items[2],
  navigation.student[1].items[0],
];

export const settingsPath: Record<AppRole, string> = {
  student: "/student/settings",
  teacher: "/teacher/settings",
  admin: "/admin/settings",
};

export const homePath: Record<ShellRole, string> = {
  facilitator: "/facilitate",
  student: "/student/dashboard",
  teacher: "/teacher/dashboard",
  admin: "/admin/dashboard",
};
