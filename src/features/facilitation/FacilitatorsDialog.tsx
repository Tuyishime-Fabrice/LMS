import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { HeartHandshake, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { isMissingSchema } from "@/features/community/api";

/**
 * The course instructor (or an admin) assigns facilitators by exact email,
 * to the whole course or one cohort. The database checks who may assign,
 * that the cohort belongs to the course, and that admins and the instructor
 * are never assigned.
 */
export function FacilitatorsDialog({ courseId, courseTitle }: { courseId: string; courseTitle: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState("course");
  const [busy, setBusy] = useState(false);

  const data = useQuery({
    queryKey: ["course-staff", courseId],
    enabled: open,
    queryFn: async () => {
      const [staff, cohorts] = await Promise.all([
        supabase.rpc("get_course_staff", { p_course_id: courseId }),
        supabase.from("cohorts").select("id, name").eq("course_id", courseId).order("start_date", { ascending: false }),
      ]);
      if (staff.error && (isMissingSchema(staff.error) || staff.error.code === "PGRST202")) return { available: false, staff: [], cohorts: [] };
      if (staff.error) throw staff.error;
      return { available: true, staff: staff.data || [], cohorts: cohorts.data || [] };
    },
  });
  const cohortName = (id: string | null) => (id ? data.data?.cohorts.find((item) => item.id === id)?.name || "" : t("facilitation.allCohorts", "All cohorts"));
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["course-staff", courseId] });

  const add = async () => {
    setBusy(true);
    try {
      const found = await supabase.rpc("find_staffing_candidate", { p_email: email });
      if (found.error) throw found.error;
      const person = found.data?.[0];
      if (!person) { toast.error(t("facilitation.notFound", "No account with that email. They need to sign up first.")); return; }
      const { error } = await supabase.from("course_staff").insert({ course_id: courseId, cohort_id: scope === "course" ? null : scope, user_id: person.id });
      if (error) {
        toast.error(error.code === "23505" ? t("facilitation.already", "Already assigned with this scope.")
          : error.code === "23514" ? t("facilitation.notAllowed", "This account cannot facilitate this course.")
          : t("facilitation.assignError", "The facilitator could not be assigned."));
        return;
      }
      toast.success(t("facilitation.assigned", "{{name}} can now facilitate", { name: person.full_name || email }));
      setEmail("");
      await refresh();
    } catch {
      toast.error(t("facilitation.assignError", "The facilitator could not be assigned."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string, name: string | null) => {
    if (!window.confirm(t("facilitation.confirmRemove", "Remove {{name}}? Their provisional reviews stay with the submissions but they lose access.", { name: name || "" }))) return;
    const { error } = await supabase.from("course_staff").delete().eq("id", id);
    if (error) { toast.error(t("facilitation.removeError", "Could not remove the facilitator.")); return; }
    await refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label={t("facilitation.manage", "Facilitators")} title={t("facilitation.manage", "Facilitators")}><HeartHandshake className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("facilitation.dialogTitle", "Facilitators for {{course}}", { course: courseTitle })}</DialogTitle>
          <DialogDescription>{t("facilitation.dialogBody", "Facilitators see the progress and work of the learners they are assigned to, suggest marks with notes, and look after the cohort Discord. You publish final marks and feedback.")}</DialogDescription>
        </DialogHeader>
        {data.data && !data.data.available ? (
          <p className="text-sm text-muted-foreground">{t("facilitation.notReady", "Facilitators need the latest database update (20261125000000_facilitators.sql).")}</p>
        ) : (
          <>
            <ul className="divide-y rounded-lg border">
              {(data.data?.staff || []).length === 0 && <li className="p-3 text-sm text-muted-foreground">{t("facilitation.noStaff", "No facilitators yet.")}</li>}
              {(data.data?.staff || []).map((row) => (
                <li key={row.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">{row.full_name || row.email}</span><span className="text-meta">{row.email} · {cohortName(row.cohort_id)}</span></span>
                  <Button size="icon" variant="ghost" className="text-destructive" aria-label={t("common.remove", "Remove")} onClick={() => void remove(row.id, row.full_name)}><Trash2 /></Button>
                </li>
              ))}
            </ul>
            <form className="grid gap-3 sm:grid-cols-[1fr_10rem]" onSubmit={(event) => { event.preventDefault(); void add(); }}>
              <div className="space-y-1.5 sm:col-span-2"><Label htmlFor={`fac-email-${courseId}`}>{t("facilitation.email", "Their account email")}</Label>
                <Input id={`fac-email-${courseId}`} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></div>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger aria-label={t("facilitation.scope", "Scope")}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">{t("facilitation.allCohorts", "All cohorts")}</SelectItem>
                  {(data.data?.cohorts || []).map((cohort) => <SelectItem key={cohort.id} value={cohort.id}>{cohort.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="submit" disabled={busy || !email.trim()}><UserPlus />{t("facilitation.assign", "Assign")}</Button>
            </form>
          </>
        )}
        <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>{t("common.close", "Close")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
