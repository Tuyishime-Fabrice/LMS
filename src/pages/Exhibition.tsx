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
  display_order: number;
  // Capstone Framework Fields
  problem_definition: string | null;
  data_evidence: string | null;
  tools_methods: string | null;
  analysis: string | null;
  recommendations: string | null;
};

const Exhibition = () => {
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
      toast.error("Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  const gradients = [
    'from-blue-500 to-purple-600',
    'from-green-500 to-teal-600',
    'from-orange-500 to-red-600',
    'from-pink-500 to-rose-600',
    'from-indigo-500 to-blue-600',
    'from-yellow-500 to-orange-600',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-4 pt-4 pb-2">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/images/dataplus_logggg-removebg-preview.png"
                alt="DataPlus Logo"
                className="w-8 h-8 object-contain"
              />
              <span className="text-xl font-bold text-black">Exhibition Room</span>
            </div>
            <Button
              onClick={() => navigate("/")}
              className="bg-[#006d2c] hover:bg-[#006d2c] text-black font-medium"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-black mb-4">
            Browse Our Courses
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover courses designed to help you master data skills and advance your career
          </p>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-12">
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <BookOpen className="w-8 h-8 text-[#006d2c] mx-auto mb-2" />
              <div className="text-3xl font-bold text-black mb-1">{courses.length}</div>
              <div className="text-sm text-gray-600">Available Courses</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <Users className="w-8 h-8 text-[#006d2c] mx-auto mb-2" />
              <div className="text-3xl font-bold text-black mb-1">500+</div>
              <div className="text-sm text-gray-600">Active Students</div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md border border-gray-200">
              <Clock className="w-8 h-8 text-[#006d2c] mx-auto mb-2" />
              <div className="text-3xl font-bold text-black mb-1">24/7</div>
              <div className="text-sm text-gray-600">Learning Access</div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects Gallery */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
          {projectsLoading ? (
            <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-white border-2 border-gray-200 overflow-hidden animate-pulse">
                  <CardContent className="p-0">
                    <div className="bg-gradient-to-r from-gray-300 to-gray-200 p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-20 h-20 rounded-full bg-gray-400" />
                        <div className="space-y-2">
                          <div className="h-6 bg-gray-400 rounded w-32" />
                          <div className="h-4 bg-gray-300 rounded w-24" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="h-8 bg-gray-200 rounded-full w-36" />
                        <div className="w-8 h-8 bg-gray-300 rounded" />
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="h-6 bg-gray-300 rounded w-3/4" />
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-full" />
                        <div className="h-4 bg-gray-200 rounded w-5/6" />
                        <div className="h-4 bg-gray-200 rounded w-4/6" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-300 rounded w-24" />
                        <div className="flex gap-2">
                          <div className="h-6 bg-gray-200 rounded-full w-16" />
                          <div className="h-6 bg-gray-200 rounded-full w-20" />
                          <div className="h-6 bg-gray-200 rounded-full w-14" />
                        </div>
                      </div>
                      <div className="h-10 bg-gray-300 rounded w-full mt-4" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : studentProjects.length === 0 ? (
            <div className="text-center py-16">
              <GraduationCap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Projects Yet</h3>
              <p className="text-gray-500">Check back soon for amazing student projects!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 max-w-7xl mx-auto">
              {studentProjects.map((project) => (
                <Card
                  key={project.id}
                  className="bg-white border-2 border-gray-200 hover:border-[#006d2c] transition-all duration-300 hover:shadow-xl overflow-hidden"
                >
                  <CardContent className="p-0">
                    {/* Header with Profile */}
                    <div className="bg-gradient-to-r from-[#006d2c] to-[#006d2c] p-6">
                      <div className="flex items-center gap-4 mb-4">
                        {project.student_image_url ? (
                          <img
                            src={project.student_image_url}
                            alt={project.student_name}
                            className="w-20 h-20 rounded-full border-4 border-white object-cover"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-full border-4 border-white bg-white flex items-center justify-center">
                            <span className="text-[#006d2c] font-bold text-2xl">{project.student_name.charAt(0)}</span>
                          </div>
                        )}
                        <div>
                          <h3 className="text-2xl font-bold text-white">{project.student_name}</h3>
                          <p className="text-white/80 font-medium">{project.course_name}</p>
                        </div>
                      </div>

                      {/* Score Badge */}
                      <div className="flex items-center justify-between">
                        <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full">
                          <span className="text-black font-bold">Course Score: {project.course_score}%</span>
                        </div>
                        <GraduationCap className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    {/* Project Details */}
                    <div className="p-6">
                      <h4 className="text-xl font-bold text-black mb-3">
                        {project.project_title}
                      </h4>

                      <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                        {project.project_description}
                      </p>

                      {/* Technologies */}
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-500 mb-2">TECHNOLOGIES USED</p>
                          <div className="flex flex-wrap gap-2">
                            {project.technologies.map((tech, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1 bg-green-50 border border-[#006d2c]/30 rounded-full text-xs text-black font-medium"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Achievements */}
                      {project.achievements && project.achievements.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-500 mb-2">ACHIEVEMENTS</p>
                          <div className="space-y-2">
                            {project.achievements.map((achievement, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-[#006d2c]" />
                                <span className="text-sm text-gray-700">{achievement}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Capstone Framework */}
                      {(project.problem_definition || project.data_evidence || project.tools_methods || project.analysis || project.recommendations) && (
                        <div className="mb-4 space-y-3 border-t pt-4">
                          <p className="text-xs font-semibold text-gray-500 mb-3">CAPSTONE FRAMEWORK</p>

                          {project.problem_definition && (
                            <div>
                              <p className="text-xs font-bold text-[#006d2c] mb-1">1. Problem Definition</p>
                              <p className="text-sm text-gray-700">{project.problem_definition}</p>
                            </div>
                          )}

                          {project.data_evidence && (
                            <div>
                              <p className="text-xs font-bold text-blue-600 mb-1">2. Data / Evidence</p>
                              <p className="text-sm text-gray-700">{project.data_evidence}</p>
                            </div>
                          )}

                          {project.tools_methods && (
                            <div>
                              <p className="text-xs font-bold text-purple-600 mb-1">3. Tools & Methods</p>
                              <p className="text-sm text-gray-700">{project.tools_methods}</p>
                            </div>
                          )}

                          {project.analysis && (
                            <div>
                              <p className="text-xs font-bold text-orange-600 mb-1">4. Analysis</p>
                              <p className="text-sm text-gray-700">{project.analysis}</p>
                            </div>
                          )}

                          {project.recommendations && (
                            <div>
                              <p className="text-xs font-bold text-green-700 mb-1">5. Recommendations</p>
                              <p className="text-sm text-gray-700">{project.recommendations}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* View Project Link */}
                      <Button
                        onClick={() => project.project_link && window.open(project.project_link, '_blank')}
                        className="w-full bg-[#006d2c] hover:bg-[#005523] text-white font-medium mt-4"
                        disabled={!project.project_link}
                      >
                        <span>View Full Project Details</span>
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
        <div className="container mx-auto">
          <div className="bg-gradient-to-r from-[#006d2c] to-[#006d2c] rounded-3xl p-12 md:p-16 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-black mb-6">
              Ready to Build Your Capstone Project?
            </h2>
            <p className="text-xl text-black/80 mb-8 max-w-2xl mx-auto">
              Join our community and create projects that make a real difference
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/signup")}
                className="bg-black hover:bg-black/90 text-white px-8 py-4 text-lg font-medium"
              >
                Enroll Now
              </Button>
              <Button
                size="lg"
                onClick={() => navigate("/")}
                variant="outline"
                className="bg-white border-2 border-black text-black hover:bg-gray-50 px-8 py-4 text-lg font-medium"
              >
                View All Courses
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-white border-t border-gray-200">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="/images/dataplus_logggg-removebg-preview.png"
              alt="DataPlus Logo"
              className="w-8 h-8 object-contain"
            />
            <span className="text-xl font-bold text-black">DataPlus Labs</span>
          </div>
          <p className="text-gray-600 text-sm">
            © 2025 DataPlus Labs. Empowering the next generation of data professionals.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Exhibition;
