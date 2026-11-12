import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/shell/AppShell";
import { PageHeader } from "@/components/shell/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Star, Upload, X, Trophy, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  created_at: string;
  // Capstone Framework Fields
  problem_definition: string | null;
  data_evidence: string | null;
  tools_methods: string | null;
  analysis: string | null;
  recommendations: string | null;
};

const AdminExhibition = () => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState<ExhibitionProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ExhibitionProject | null>(null);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    student_name: "",
    student_image_url: "",
    course_name: "",
    project_title: "",
    project_description: "",
    course_score: 0,
    achievements: [] as string[],
    technologies: [] as string[],
    project_link: "",
    is_featured: false,
    display_order: 0,
    // Capstone Framework Fields
    problem_definition: "",
    data_evidence: "",
    tools_methods: "",
    analysis: "",
    recommendations: "",
  });
  const [newAchievement, setNewAchievement] = useState("");
  const [newTechnology, setNewTechnology] = useState("");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("exhibition_projects")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error: any) {
      console.error("Error fetching projects:", error);
      toast.error(t("adminExhibition.failedToLoadExhibitionProjects", "Failed to load exhibition projects"));
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("adminExhibition.pleaseUploadAnImageFile", "Please upload an image file"));
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `student-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("exhibition-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("exhibition-images")
        .getPublicUrl(filePath);

      setFormData({ ...formData, student_image_url: publicUrl });
      toast.success(t("adminExhibition.imageUploadedSuccessfully", "Image uploaded successfully"));
    } catch (error: any) {
      console.error("Error uploading image:", error);
      toast.error(t("adminExhibition.failedToUploadImage", "Failed to upload image"));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.student_name || !formData.project_title || !formData.course_name) {
      toast.error(t("adminExhibition.pleaseFillInAllRequiredFields", "Please fill in all required fields"));
      return;
    }

    try {
      if (selectedProject) {
        const { error } = await supabase
          .from("exhibition_projects")
          .update({
            student_name: formData.student_name,
            student_image_url: formData.student_image_url || null,
            course_name: formData.course_name,
            project_title: formData.project_title,
            project_description: formData.project_description,
            course_score: formData.course_score,
            achievements: formData.achievements,
            technologies: formData.technologies,
            project_link: formData.project_link || null,
            is_featured: formData.is_featured,
            display_order: formData.display_order,
          })
          .eq("id", selectedProject.id);

        if (error) throw error;
        toast.success(t("adminExhibition.projectUpdatedSuccessfully", "Project updated successfully"));
      } else {
        const { error } = await supabase
          .from("exhibition_projects")
          .insert({
            student_name: formData.student_name,
            student_image_url: formData.student_image_url || null,
            course_name: formData.course_name,
            project_title: formData.project_title,
            project_description: formData.project_description,
            course_score: formData.course_score,
            achievements: formData.achievements,
            technologies: formData.technologies,
            project_link: formData.project_link || null,
            is_featured: formData.is_featured,
            display_order: formData.display_order,
            problem_definition: formData.problem_definition || null,
            data_evidence: formData.data_evidence || null,
            tools_methods: formData.tools_methods || null,
            analysis: formData.analysis || null,
            recommendations: formData.recommendations || null,
          });

        if (error) throw error;
        toast.success(t("adminExhibition.projectAddedSuccessfully", "Project added successfully"));
      }

      setDialogOpen(false);
      resetForm();
      fetchProjects();
    } catch (error: any) {
      console.error("Error saving project:", error);
      toast.error(t("adminExhibition.failedToSaveProject", "Failed to save project"));
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;

    try {
      const { error } = await supabase
        .from("exhibition_projects")
        .delete()
        .eq("id", selectedProject.id);

      if (error) throw error;
      toast.success(t("adminExhibition.projectDeletedSuccessfully", "Project deleted successfully"));
      setDeleteDialogOpen(false);
      setSelectedProject(null);
      fetchProjects();
    } catch (error: any) {
      console.error("Error deleting project:", error);
      toast.error(t("adminExhibition.failedToDeleteProject", "Failed to delete project"));
    }
  };

  const toggleFeatured = async (project: ExhibitionProject) => {
    try {
      const { error } = await supabase
        .from("exhibition_projects")
        .update({ is_featured: !project.is_featured })
        .eq("id", project.id);

      if (error) throw error;
      toast.success(project.is_featured ? "Removed from landing page" : "Added to landing page");
      fetchProjects();
    } catch (error: any) {
      toast.error(t("adminExhibition.failedToUpdateFeaturedStatus", "Failed to update featured status"));
    }
  };

  const resetForm = () => {
    setFormData({
      student_name: "",
      student_image_url: "",
      course_name: "",
      project_title: "",
      project_description: "",
      course_score: 0,
      achievements: [],
      technologies: [],
      project_link: "",
      is_featured: false,
      display_order: 0,
      problem_definition: "",
      data_evidence: "",
      tools_methods: "",
      analysis: "",
      recommendations: "",
    });
    setSelectedProject(null);
    setNewAchievement("");
    setNewTechnology("");
  };

  const openEditDialog = (project: ExhibitionProject) => {
    setSelectedProject(project);
    setFormData({
      student_name: project.student_name,
      student_image_url: project.student_image_url || "",
      course_name: project.course_name,
      project_title: project.project_title,
      project_description: project.project_description,
      course_score: project.course_score,
      achievements: project.achievements || [],
      technologies: project.technologies || [],
      project_link: project.project_link || "",
      is_featured: project.is_featured,
      display_order: project.display_order,
      problem_definition: project.problem_definition || "",
      data_evidence: project.data_evidence || "",
      tools_methods: project.tools_methods || "",
      analysis: project.analysis || "",
      recommendations: project.recommendations || "",
    });
    setDialogOpen(true);
  };

  const addAchievement = () => {
    if (newAchievement.trim()) {
      setFormData({
        ...formData,
        achievements: [...formData.achievements, newAchievement.trim()],
      });
      setNewAchievement("");
    }
  };

  const removeAchievement = (index: number) => {
    setFormData({
      ...formData,
      achievements: formData.achievements.filter((_, i) => i !== index),
    });
  };

  const addTechnology = () => {
    if (newTechnology.trim()) {
      setFormData({
        ...formData,
        technologies: [...formData.technologies, newTechnology.trim()],
      });
      setNewTechnology("");
    }
  };

  const removeTechnology = (index: number) => {
    setFormData({
      ...formData,
      technologies: formData.technologies.filter((_, i) => i !== index),
    });
  };


  return (
    <AppShell role="admin" width="wide">
      

          <div>
      <PageHeader
        title={t("adminExhibition.exhibitionManagement", "Exhibition Management")}
        description={t("adminExhibition.manageStudentProjectsDisplayedOnThe", "Manage student projects displayed on the landing page and exhibition")}
        actions={<>
          <Button
                onClick={() => {
                  resetForm();
                  setDialogOpen(true);
                }}
                className="bg-primary hover:bg-primary-hover"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("adminExhibition.addProject", "Add Project")}
              </Button>
        </>}
      />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-leaf rounded-xl">
                      <Trophy className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{projects.length}</p>
                      <p className="text-sm text-muted-foreground">{t("adminExhibition.totalProjects", "Total Projects")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-warning-surface rounded-xl">
                      <Star className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{projects.filter(p => p.is_featured).length}</p>
                      <p className="text-sm text-muted-foreground">{t("adminExhibition.featuredOnLanding", "Featured on Landing")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-info-surface rounded-xl">
                      <Image className="w-6 h-6 text-info" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{projects.filter(p => p.student_image_url).length}</p>
                      <p className="text-sm text-muted-foreground">{t("adminExhibition.withImages", "With Images")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Projects Table */}
            <Card>
              <CardHeader>
                <CardTitle>{t("adminExhibition.allExhibitionProjects", "All Exhibition Projects")}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-muted rounded-lg">
                        <div className="w-12 h-12 bg-border rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-border rounded w-1/4" />
                          <div className="h-3 bg-border rounded w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-forest mb-2">{t("adminExhibition.noProjectsYet", "No projects yet")}</h3>
                    <p className="text-muted-foreground mb-4">{t("adminExhibition.addYourFirstExhibitionProjectTo", "Add your first exhibition project to showcase on the landing page")}</p>
                    <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary-hover">
                      <Plus className="w-4 h-4 mr-2" />
                      {t("adminExhibition.addProject", "Add Project")}
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("adminExhibition.student", "Student")}</TableHead>
                        <TableHead>{t("adminExhibition.project", "Project")}</TableHead>
                        <TableHead>{t("adminExhibition.course", "Course")}</TableHead>
                        <TableHead>{t("adminExhibition.score", "Score")}</TableHead>
                        <TableHead>{t("adminExhibition.featured", "Featured")}</TableHead>
                        <TableHead className="text-right">{t("adminExhibition.actions", "Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {project.student_image_url ? (
                                <img
                                  src={project.student_image_url}
                                  alt={project.student_name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                                  {project.student_name.charAt(0)}
                                </div>
                              )}
                              <span className="font-medium">{project.student_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{project.project_title}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {project.project_description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{project.course_name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{project.course_score}%</Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={project.is_featured}
                              onCheckedChange={() => toggleFeatured(project)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(project)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setSelectedProject(project);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProject ? t("adminExhibition.editProject", "Edit Project") : t("adminExhibition.addNewProject", "Add New Project")}</DialogTitle>
            <DialogDescription>
              {selectedProject ? t("adminExhibition.updateTheExhibitionProjectDetails", "Update the exhibition project details") : t("adminExhibition.addANewStudentProjectTo", "Add a new student project to showcase")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Image Upload */}
            <div className="space-y-2">
              <Label>{t("adminExhibition.studentImage", "Student Image")}</Label>
              <div className="flex items-center gap-4">
                {formData.student_image_url ? (
                  <div className="relative">
                    <img
                      src={formData.student_image_url}
                      alt={t("adminExhibition.student", "Student")}
                      className="w-20 h-20 rounded-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, student_image_url: "" })}
                      className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-border flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground/60" />
                  </div>
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                    id="image-upload"
                  />
                  <Label
                    htmlFor="image-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted rounded-lg transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? t("adminExhibition.uploading", "Uploading...") : t("adminExhibition.uploadImage", "Upload Image")}
                  </Label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="student_name">{t("adminExhibition.studentName", "Student Name *")}</Label>
                <Input
                  id="student_name"
                  value={formData.student_name}
                  onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                  placeholder={t("adminExhibition.enterStudentName", "Enter student name")}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course_name">{t("adminExhibition.courseName", "Course Name *")}</Label>
                <Input
                  id="course_name"
                  value={formData.course_name}
                  onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                  placeholder={t("adminExhibition.enterCourseName", "Enter course name")}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_title">{t("adminExhibition.projectTitle", "Project Title *")}</Label>
              <Input
                id="project_title"
                value={formData.project_title}
                onChange={(e) => setFormData({ ...formData, project_title: e.target.value })}
                placeholder={t("adminExhibition.enterProjectTitle", "Enter project title")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project_description">{t("adminExhibition.projectDescription", "Project Description *")}</Label>
              <Textarea
                id="project_description"
                value={formData.project_description}
                onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
                placeholder={t("adminExhibition.describeTheProject", "Describe the project...")}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="course_score">{t("adminExhibition.courseScore", "Course Score (%)")}</Label>
                <Input
                  id="course_score"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.course_score}
                  onChange={(e) => setFormData({ ...formData, course_score: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project_link">{t("adminExhibition.projectLink", "Project Link")}</Label>
                <Input
                  id="project_link"
                  value={formData.project_link}
                  onChange={(e) => setFormData({ ...formData, project_link: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Technologies */}
            <div className="space-y-2">
              <Label>{t("adminExhibition.technologies", "Technologies")}</Label>
              <div className="flex gap-2">
                <Input
                  value={newTechnology}
                  onChange={(e) => setNewTechnology(e.target.value)}
                  placeholder={t("adminExhibition.addTechnology", "Add technology")}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTechnology())}
                />
                <Button type="button" onClick={addTechnology} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.technologies.map((tech, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {tech}
                    <button type="button" onClick={() => removeTechnology(index)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="space-y-2">
              <Label>{t("adminExhibition.achievements", "Achievements")}</Label>
              <div className="flex gap-2">
                <Input
                  value={newAchievement}
                  onChange={(e) => setNewAchievement(e.target.value)}
                  placeholder={t("adminExhibition.addAchievement", "Add achievement")}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAchievement())}
                />
                <Button type="button" onClick={addAchievement} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.achievements.map((achievement, index) => (
                  <Badge key={index} variant="outline" className="gap-1">
                    {achievement}
                    <button type="button" onClick={() => removeAchievement(index)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Capstone Framework Section */}
            <div className="border-t pt-6 space-y-4">
              <h3 className="text-lg font-semibold text-forest">{t("adminExhibition.capstoneProjectFramework", "Capstone Project Framework")}</h3>
              <p className="text-sm text-muted-foreground">{t("adminExhibition.structureTheProjectUsingThe5", "Structure the project using the 5-step framework methodology")}</p>

              <div className="space-y-2">
                <Label htmlFor="problem_definition">{t("adminExhibition.n1ProblemDefinition", "1. Problem Definition")}</Label>
                <Textarea
                  id="problem_definition"
                  value={formData.problem_definition}
                  onChange={(e) => setFormData({ ...formData, problem_definition: e.target.value })}
                  placeholder={t("adminExhibition.whatProblemDoesThisProjectAddress", "What problem does this project address?")}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data_evidence">{t("adminExhibition.n2DataEvidence", "2. Data / Evidence")}</Label>
                <Textarea
                  id="data_evidence"
                  value={formData.data_evidence}
                  onChange={(e) => setFormData({ ...formData, data_evidence: e.target.value })}
                  placeholder={t("adminExhibition.whatDataWasCollectedAndHow", "What data was collected and how?")}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tools_methods">{t("adminExhibition.n3ToolsMethods", "3. Tools & Methods")}</Label>
                <Textarea
                  id="tools_methods"
                  value={formData.tools_methods}
                  onChange={(e) => setFormData({ ...formData, tools_methods: e.target.value })}
                  placeholder={t("adminExhibition.whatToolsAndMethodologiesWereApplied", "What tools and methodologies were applied?")}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="analysis">{t("adminExhibition.n4Analysis", "4. Analysis")}</Label>
                <Textarea
                  id="analysis"
                  value={formData.analysis}
                  onChange={(e) => setFormData({ ...formData, analysis: e.target.value })}
                  placeholder={t("adminExhibition.whatInsightsWereDiscovered", "What insights were discovered?")}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recommendations">{t("adminExhibition.n5Recommendations", "5. Recommendations")}</Label>
                <Textarea
                  id="recommendations"
                  value={formData.recommendations}
                  onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
                  placeholder={t("adminExhibition.whatActionableRecommendationsWereMade", "What actionable recommendations were made?")}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                />
                <Label htmlFor="is_featured">{t("adminExhibition.featureOnLandingPage", "Feature on Landing Page")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="display_order">{t("adminExhibition.order", "Order:")}</Label>
                <Input
                  id="display_order"
                  type="number"
                  min="0"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                  className="w-20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("adminExhibition.cancel", "Cancel")}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover">
                {selectedProject ? t("adminExhibition.updateProject", "Update Project") : t("adminExhibition.addProject", "Add Project")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminExhibition.deleteProject", "Delete Project")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminExhibition.areYouSureYouWantTo", "Are you sure you want to delete \"{{projectTitle}}\"? This action cannot be undone.", { projectTitle: selectedProject?.project_title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("adminExhibition.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t("adminExhibition.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default AdminExhibition;
