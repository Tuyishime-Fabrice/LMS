import { PageBand } from "@/features/site/PageBand";
import { ContentTodo } from "@/components/ContentTodo";
import { usePageMeta } from "@/lib/pageMeta";
import { SiteHeader } from "@/features/site/SiteHeader";
import { useTranslation } from "react-i18next";
import { SiteFooter } from "@/features/site/SiteFooter";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Users, Clock, GraduationCap, Award, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Course = {
  id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  teacher_id: string;
  price: number | null;
  requirements: string | null;
  created_at: string;
  profiles: {
    full_name: string;
  } | null;
};

type ExhibitionProject = {
  id: string;
  student_name: string;
  student_image_url: string | null;
  course_name: string;
  project_title: string;
  project_description: string;
  course_score: number;
  achievements: string[];
  technologies: string[];
  project_link: string | null;
  is_featured: boolean;
  /** Undefined before the 2026-11-27 migration: treated as not verified. */
  outcomes_verified?: boolean;
  display_order: number;
  // Capstone Framework Fields
  problem_definition: string | null;
  data_evidence: string | null;
  tools_methods: string | null;
  analysis: string | null;
  recommendations: string | null;
};

const Exhibition = () => {
  const { t } = useTranslation();
  usePageMeta({ title: t("meta.projects.title", "Student projects"), description: t("meta.projects.description", "Capstone projects by DATA+ Academy learners."), path: "/exhibition" });
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [studentProjects, setStudentProjects] = useState<ExhibitionProject[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCourses();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("exhibition_projects")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setStudentProjects(data || []);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from("courses")
        .select(`
          *,
          profiles (
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (coursesError) throw coursesError;

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: enrollmentsData } = await supabase
          .from("course_enrollments")
          .select("course_id")
          .eq("student_id", user.id);

        const enrolledIds = new Set(enrollmentsData?.map(e => e.course_id) || []);
        setEnrolledCourseIds(enrolledIds);
      }

      setCourses(coursesData || []);
    } catch (error: any) {
      console.error("Error fetching courses:", error);
      toast.error(t("exhibition.failedToLoadCourses", "Failed to load courses"));
    } finally {
      setLoading(false);
    }
  };

  const gradients = [
    ' ',
    ' ',
    ' ',
    ' to-rose-600',
    ' ',
    ' ',
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <PageBand eyebrow={t("exhibition.eyebrow", "Student projects")} title={t("exhibition.title", "Capstone exhibition")} body={t("exhibition.body", "Real problems, real data and the recommendations our graduates made. Every project follows the five-step capstone framework.")} />

      {/* Projects Gallery */}
      <section className="py-12 px-4">
        <div className="mx-auto max-w-site">
          {projectsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-card border-2 border-border overflow-hidden animate-pulse">
                  <CardContent className="p-0">
                    <div className="p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-20 h-20 rounded-full bg-muted-foreground" />
                        <div className="space-y-2">
                          <div className="h-6 bg-muted-foreground rounded w-32" />
                          <div className="h-4 bg-border rounded w-24" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-8 bg-border rounded-full w-36" />
                        <div className="w-8 h-8 bg-border rounded" />
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="h-6 bg-border rounded w-3/4" />
                      <div className="space-y-2">
                        <div className="h-4 bg-border rounded w-full" />
                        <div className="h-4 bg-border rounded w-5/6" />
                        <div className="h-4 bg-border rounded w-4/6" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-border rounded w-24" />
                        <div className="flex gap-2">
                          <div className="h-6 bg-border rounded-full w-16" />
                          <div className="h-6 bg-border rounded-full w-20" />
                          <div className="h-6 bg-border rounded-full w-14" />
                        </div>
                      </div>
                      <div className="h-10 bg-border rounded w-full mt-4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : studentProjects.length === 0 ? (
            <div className="text-center py-16">
              <GraduationCap className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">{t("exhibition.noProjectsYet", "No Projects Yet")}</h3>
              <p className="text-muted-foreground">{t("exhibition.checkBackSoonForAmazingStudent", "Check back soon for amazing student projects!")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {studentProjects.map((project) => (
                <Card
                  key={project.id}
                  className="bg-card border-2 border-border hover:border-primary transition-all duration-300 overflow-hidden"
                >
                  <CardContent className="p-0">
                    {/* Header with Profile */}
                    <div className="p-6 bg-forest">
                      <div className="flex items-center gap-4 mb-4">
                        {project.student_image_url ? (
                          <img
                            src={project.student_image_url}
                            alt={project.student_name}
                            className="w-20 h-20 rounded-full border-4 border-card object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full border-4 border-card bg-card flex items-center justify-center">
                            <span className="text-primary font-bold text-2xl">{project.student_name.charAt(0)}</span>
                          </div>
                        )}
                        <div>
                          <h3 className="text-2xl font-bold text-white">{project.student_name}</h3>
                          <p className="text-white/80 font-medium">{project.course_name}</p>
                        </div>
                      </div>

                      {/* Score: public only once an admin has verified the outcomes */}
                      <div className="flex items-center justify-between">
                        {project.outcomes_verified ? (
                          <div className="bg-card px-4 py-2 rounded-full">
                            <span className="text-forest font-bold">{t("exhibition.courseScore", "Course Score: {{courseScore}}%", { courseScore: project.course_score })}</span>
                          </div>
                        ) : <span />}
                        <GraduationCap className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    {/* Project Details */}
                    <div className="p-6">
                      <h4 className="text-xl font-bold text-forest mb-3">
                        {project.project_title}
                      </h4>

                      <p className="text-foreground text-sm mb-4 leading-relaxed">
                        {project.outcomes_verified ? project.project_description : null}
                      </p>

                      {/* Technologies */}
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">{t("exhibition.technologiesUsed", "TECHNOLOGIES USED")}</p>
                          <div className="flex flex-wrap gap-2">
                            {project.technologies.map((tech, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-leaf border border-primary/30 rounded-full text-xs text-forest font-medium"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Achievements */}
                      {!project.outcomes_verified && <ContentTodo className="mb-4" label="Outcomes for this project are hidden until an admin verifies them (Admin, Student projects)" />}
                      {project.outcomes_verified && project.achievements && project.achievements.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">{t("exhibition.achievements", "ACHIEVEMENTS")}</p>
                          <div className="space-y-2">
                            {project.achievements.map((achievement, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-primary" />
                                <span className="text-sm text-foreground">{achievement}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Capstone Framework */}
                      {(project.problem_definition || project.data_evidence || project.tools_methods || project.analysis || project.recommendations) && (
                        <div className="mb-4 space-y-3 border-t pt-4">
                          <p className="text-xs font-semibold text-muted-foreground mb-3">{t("exhibition.capstoneFramework", "CAPSTONE FRAMEWORK")}</p>

                          {project.problem_definition && (
                            <div>
                              <p className="text-xs font-bold text-primary mb-1">{t("exhibition.n1ProblemDefinition", "1. Problem Definition")}</p>
                              <p className="text-sm text-foreground">{project.problem_definition}</p>
                            </div>
                          )}

                          {project.outcomes_verified && project.data_evidence && (
                            <div>
                              <p className="text-xs font-bold text-info mb-1">{t("exhibition.n2DataEvidence", "2. Data / Evidence")}</p>
                              <p className="text-sm text-foreground">{project.data_evidence}</p>
                            </div>
                          )}

                          {project.tools_methods && (
                            <div>
                              <p className="text-xs font-bold text-forest mb-1">{t("exhibition.n3ToolsMethods", "3. Tools & Methods")}</p>
                              <p className="text-sm text-foreground">{project.tools_methods}</p>
                            </div>
                          )}

                          {project.outcomes_verified && project.analysis && (
                            <div>
                              <p className="text-xs font-bold text-warning mb-1">{t("exhibition.n4Analysis", "4. Analysis")}</p>
                              <p className="text-sm text-foreground">{project.analysis}</p>
                            </div>
                          )}

                          {project.outcomes_verified && project.recommendations && (
                            <div>
                              <p className="text-xs font-bold text-primary mb-1">{t("exhibition.n5Recommendations", "5. Recommendations")}</p>
                              <p className="text-sm text-foreground">{project.recommendations}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* View Project Link */}
                      <Button
                        onClick={() => project.project_link && window.open(project.project_link, '_blank')}
                        className="w-full bg-action hover:bg-action-hover text-white font-medium mt-4"
                        disabled={!project.project_link}
                      >
                        <span>{t("exhibition.viewFullProjectDetails", "View Full Project Details")}</span>
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="mx-auto max-w-site">
          <div className="rounded-xl p-12 md:p-16 text-center bg-forest">
            <h2 className="text-4xl md:text-5xl font-bold text-forest mb-6">
              {t("exhibition.readyToBuildYourCapstoneProject", "Ready to Build Your Capstone Project?")}
            </h2>
            <p className="text-xl text-black/80 mb-8 max-w-2xl mx-auto">
              {t("exhibition.joinOurCommunityAndCreateProjects", "Join our community and create projects that make a real difference")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/signup")}
                className="bg-action hover:bg-action-hover text-white px-8 py-4 text-lg font-medium"
              >
                {t("exhibition.enrollNow", "Enroll Now")}
              </Button>
              <Button
                size="lg"
                onClick={() => navigate("/")}
                variant="outline"
                className="bg-card border-2 border-black text-forest hover:bg-muted px-8 py-4 text-lg font-medium"
              >
                {t("exhibition.viewAllCourses", "View All Courses")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Exhibition;
