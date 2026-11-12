import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/page";
import { CalendarView } from "@/features/calendar/CalendarView";

/** Every cohort and course on one timetable, with overlapping sessions flagged. */
const AdminCalendar = () => {
  const { t } = useTranslation();
  return (
    <AppShell role="admin" width="wide">
      <PageHeader
        title={t("calendar2.adminTitle", "Academy calendar")}
        description={t("calendar2.adminDescription", "All sessions, deadlines and cohort dates across the Academy. Sessions that overlap for the same teacher or room are flagged.")}
      />
      <CalendarView role="admin" />
    </AppShell>
  );
};

export default AdminCalendar;
