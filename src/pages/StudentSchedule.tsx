import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/page";
import { CalendarView } from "@/features/calendar/CalendarView";

const StudentSchedule = () => {
  const { t } = useTranslation();
  return (
    <AppShell role="student" width="wide">
      <PageHeader
        title={t("calendar2.title", "Calendar")}
        description={t("calendar2.studentDescription", "Live sessions, deadlines and cohort dates for the courses you are enrolled in.")}
      />
      <CalendarView role="student" />
    </AppShell>
  );
};

export default StudentSchedule;
