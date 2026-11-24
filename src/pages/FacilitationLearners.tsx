import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { CheckCircle2, Users } from "lucide-react";
import { EmptyState, PageHeader, ProgressBar, SkeletonBlock, StatusPill } from "@/components/shell/page";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FacilitationGate } from "@/features/facilitation/Gate";
import { useRoster, type Assignment } from "@/features/facilitation/api";
import { useDateLocale } from "@/features/learning/hooks";

function Learners({ assignments }: { assignments: Assignment[] }) {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const [params, setParams] = useSearchParams();
  const roster = useRoster();
  const courses = Array.from(new Map(assignments.map((item) => [item.courseId, item.courseTitle])).entries());
  const course = params.get("course") || "all";
  const rows = (roster.data || []).filter((row) => course === "all" || row.courseId === course);
  const title = (id: string) => courses.find(([courseId]) => courseId === id)?.[1] || "";

  return (
    <>
      <PageHeader
        title={t("facilitation.learnersTitle", "Learners")}
        description={t("facilitation.learnersBody", "Progress of the learners you facilitate. Contact details are not shown; reach learners through the cohort Discord.")}
        actions={courses.length > 1 && (
          <Select value={course} onValueChange={(value) => setParams(value === "all" ? {} : { course: value }, { replace: true })}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("facilitation.allCourses", "All my courses")}</SelectItem>
              {courses.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      />
      {roster.isLoading ? <SkeletonBlock className="h-64" /> : rows.length === 0 ? (
        <EmptyState icon={Users} title={t("facilitation.noLearners", "No learners yet")} description={t("facilitation.noLearnersBody", "Learners appear here once they are enrolled in your course or cohort.")} />
      ) : (
        <div className="surface overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="border-b text-left text-eyebrow">
              <tr>
                <th className="px-4 py-3">{t("facilitation.col.learner", "Learner")}</th>
                <th className="px-4 py-3">{t("facilitation.col.course", "Course and cohort")}</th>
                <th className="w-48 px-4 py-3">{t("facilitation.col.progress", "Progress")}</th>
                <th className="px-4 py-3">{t("facilitation.col.active", "Last active")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={`${row.courseId}-${row.studentId}`}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8">{row.avatarUrl && <AvatarImage src={row.avatarUrl} alt="" />}<AvatarFallback className="bg-leaf text-xs text-leaf-foreground">{(row.fullName || "?").charAt(0)}</AvatarFallback></Avatar>
                      <span className="font-medium text-forest">{row.fullName || t("facilitation.unnamed", "Learner")}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3"><span className="block">{title(row.courseId)}</span><span className="text-meta">{row.cohortName || t("facilitation.noCohort", "No cohort")}</span></td>
                  <td className="px-4 py-3">
                    {row.completed
                      ? <StatusPill tone="green" icon={CheckCircle2}>{t("tracks.completed", "Completed")}</StatusPill>
                      : <span className="flex items-center gap-2"><ProgressBar value={row.progress} size="sm" label={row.fullName} /><span className="tabular w-9 text-right text-xs">{Math.round(row.progress)}%</span></span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{row.lastActivityAt ? format(new Date(row.lastActivityAt), "d MMM", { locale }) : t("facilitation.never", "Not started")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function FacilitationLearners() {
  return <FacilitationGate>{(assignments) => <Learners assignments={assignments} />}</FacilitationGate>;
}
