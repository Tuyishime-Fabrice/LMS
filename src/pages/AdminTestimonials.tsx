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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Star, Upload, X, MessageSquare, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Testimonial = {
  id: string;
  student_name: string;
  student_image_url: string | null;
  testimonial_text: string;
  rating: number;
  course_name: string | null;
  profession: string | null;
  programs_participated: string | null;
  career_impact: string | null;
  is_featured: boolean;
  display_order: number;
  created_at: string;
};

const AdminTestimonials = () => {
  const { t } = useTranslation();
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    student_name: "",
    student_image_url: "",
    testimonial_text: "",
    rating: 5,
    course_name: "",
    profession: "",
    programs_participated: "",
    career_impact: "",
    is_featured: true,
    display_order: 0,
  });

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const fetchTestimonials = async () => {
    try {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .order("display_order", { ascending: true });

      if (error) throw error;
      setTestimonials(data || []);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      toast.error(t("adminTestimonials.failedToLoadTestimonials", "Failed to load testimonials"));
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t("adminTestimonials.pleaseUploadAnImageFile", "Please upload an image file"));
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `student-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("testimonial-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("testimonial-images")
        .getPublicUrl(filePath);

      setFormData({ ...formData, student_image_url: publicUrl });
      toast.success(t("adminTestimonials.imageUploadedSuccessfully", "Image uploaded successfully"));
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(t("adminTestimonials.failedToUploadImage", "Failed to upload image"));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.student_name || !formData.testimonial_text) {
      toast.error(t("adminTestimonials.pleaseFillInAllRequiredFields", "Please fill in all required fields"));
      return;
    }

    try {
      if (selectedTestimonial) {
        const { error } = await supabase
          .from("testimonials")
          .update({
            student_name: formData.student_name,
            student_image_url: formData.student_image_url || null,
            testimonial_text: formData.testimonial_text,
            rating: formData.rating,
            course_name: formData.course_name || null,
            profession: formData.profession || null,
            programs_participated: formData.programs_participated || null,
            career_impact: formData.career_impact || null,
            is_featured: formData.is_featured,
            display_order: formData.display_order,
          })
          .eq("id", selectedTestimonial.id);

        if (error) throw error;
        toast.success(t("adminTestimonials.testimonialUpdatedSuccessfully", "Testimonial updated successfully"));
      } else {
        const { error } = await supabase
          .from("testimonials")
          .insert({
            student_name: formData.student_name,
            student_image_url: formData.student_image_url || null,
            testimonial_text: formData.testimonial_text,
            rating: formData.rating,
            course_name: formData.course_name || null,
            profession: formData.profession || null,
            programs_participated: formData.programs_participated || null,
            career_impact: formData.career_impact || null,
            is_featured: formData.is_featured,
            display_order: formData.display_order,
          });

        if (error) throw error;
        toast.success(t("adminTestimonials.testimonialAddedSuccessfully", "Testimonial added successfully"));
      }

      setDialogOpen(false);
      resetForm();
      fetchTestimonials();
    } catch (error) {
      console.error("Error saving testimonial:", error);
      toast.error(t("adminTestimonials.failedToSaveTestimonial", "Failed to save testimonial"));
    }
  };

  const handleDelete = async () => {
    if (!selectedTestimonial) return;

    try {
      const { error } = await supabase
        .from("testimonials")
        .delete()
        .eq("id", selectedTestimonial.id);

      if (error) throw error;
      toast.success(t("adminTestimonials.testimonialDeletedSuccessfully", "Testimonial deleted successfully"));
      setDeleteDialogOpen(false);
      setSelectedTestimonial(null);
      fetchTestimonials();
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      toast.error(t("adminTestimonials.failedToDeleteTestimonial", "Failed to delete testimonial"));
    }
  };

  const toggleFeatured = async (testimonial: Testimonial) => {
    try {
      const { error } = await supabase
        .from("testimonials")
        .update({ is_featured: !testimonial.is_featured })
        .eq("id", testimonial.id);

      if (error) throw error;
      toast.success(testimonial.is_featured ? "Hidden from landing page" : "Shown on landing page");
      fetchTestimonials();
    } catch (error) {
      toast.error(t("adminTestimonials.failedToUpdateStatus", "Failed to update status"));
    }
  };

  const resetForm = () => {
    setFormData({
      student_name: "",
      student_image_url: "",
      testimonial_text: "",
      rating: 5,
      course_name: "",
      profession: "",
      programs_participated: "",
      career_impact: "",
      is_featured: true,
      display_order: 0,
    });
    setSelectedTestimonial(null);
  };

  const openEditDialog = (testimonial: Testimonial) => {
    setSelectedTestimonial(testimonial);
    setFormData({
      student_name: testimonial.student_name,
      student_image_url: testimonial.student_image_url || "",
      testimonial_text: testimonial.testimonial_text,
      rating: testimonial.rating,
      course_name: testimonial.course_name || "",
      profession: testimonial.profession || "",
      programs_participated: testimonial.programs_participated || "",
      career_impact: testimonial.career_impact || "",
      is_featured: testimonial.is_featured,
      display_order: testimonial.display_order,
    });
    setDialogOpen(true);
  };


  return (
    <AppShell role="admin" width="wide">
      

          <div>
      <PageHeader
        title={t("adminTestimonials.testimonialsManagement", "Testimonials Management")}
        description={t("adminTestimonials.manageStudentTestimonialsDisplayedOnThe", "Manage student testimonials displayed on the landing page")}
        actions={<>
          <Button
                onClick={() => {
                  resetForm();
                  setDialogOpen(true);
                }}
                className="bg-primary hover:bg-primary-hover"
              >
                <Plus className="w-4 h-4 mr-2" />
                {t("adminTestimonials.addTestimonial", "Add Testimonial")}
              </Button>
        </>}
      />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-leaf rounded-xl">
                      <MessageSquare className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{testimonials.length}</p>
                      <p className="text-sm text-muted-foreground">{t("adminTestimonials.totalTestimonials", "Total Testimonials")}</p>
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
                      <p className="text-2xl font-bold">{testimonials.filter(t => t.is_featured).length}</p>
                      <p className="text-sm text-muted-foreground">{t("adminTestimonials.featuredOnLanding", "Featured on Landing")}</p>
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
                      <p className="text-2xl font-bold">{testimonials.filter(t => t.student_image_url).length}</p>
                      <p className="text-sm text-muted-foreground">{t("adminTestimonials.withPhotos", "With Photos")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Testimonials Table */}
            <Card>
              <CardHeader>
                <CardTitle>{t("adminTestimonials.allTestimonials", "All Testimonials")}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-muted rounded-lg">
                        <div className="w-12 h-12 bg-border rounded-full" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-border rounded w-1/4" />
                          <div className="h-3 bg-border rounded w-3/4" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : testimonials.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-muted-foreground/60 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-forest mb-2">{t("adminTestimonials.noTestimonialsYet", "No testimonials yet")}</h3>
                    <p className="text-muted-foreground mb-4">{t("adminTestimonials.addYourFirstTestimonialToShowcase", "Add your first testimonial to showcase on the landing page")}</p>
                    <Button onClick={() => setDialogOpen(true)} className="bg-primary hover:bg-primary-hover">
                      <Plus className="w-4 h-4 mr-2" />
                      {t("adminTestimonials.addTestimonial", "Add Testimonial")}
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("adminTestimonials.student", "Student")}</TableHead>
                        <TableHead>{t("adminTestimonials.profession", "Profession")}</TableHead>
                        <TableHead>{t("adminTestimonials.programs", "Programs")}</TableHead>
                        <TableHead>{t("adminTestimonials.rating", "Rating")}</TableHead>
                        <TableHead>{t("adminTestimonials.featured", "Featured")}</TableHead>
                        <TableHead className="text-right">{t("adminTestimonials.actions", "Actions")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {testimonials.map((testimonial) => (
                        <TableRow key={testimonial.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {testimonial.student_image_url ? (
                                <img
                                  src={testimonial.student_image_url}
                                  alt={testimonial.student_name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                                  {testimonial.student_name.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="font-medium">{testimonial.student_name}</p>
                                {testimonial.course_name && (
                                  <p className="text-xs text-muted-foreground">{testimonial.course_name}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                              {testimonial.profession || "—"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                              {testimonial.programs_participated || "—"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${i < testimonial.rating ? 'fill-yellow-400 text-warning' : 'text-muted-foreground/60'}`}
                                />
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={testimonial.is_featured}
                              onCheckedChange={() => toggleFeatured(testimonial)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(testimonial)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setSelectedTestimonial(testimonial);
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTestimonial ? t("adminTestimonials.editTestimonial", "Edit Testimonial") : t("adminTestimonials.addNewTestimonial", "Add New Testimonial")}</DialogTitle>
            <DialogDescription>
              {selectedTestimonial ? t("adminTestimonials.updateTheTestimonialDetails", "Update the testimonial details") : t("adminTestimonials.addANewStudentTestimonial", "Add a new student testimonial")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Student Image Upload */}
            <div className="space-y-2">
              <Label>{t("adminTestimonials.studentPhoto", "Student Photo")}</Label>
              <div className="flex items-center gap-4">
                {formData.student_image_url ? (
                  <div className="relative">
                    <img
                      src={formData.student_image_url}
                      alt={t("adminTestimonials.student", "Student")}
                      className="w-16 h-16 rounded-full object-cover"
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
                  <div className="w-16 h-16 rounded-full bg-border flex items-center justify-center">
                    <Image className="w-6 h-6 text-muted-foreground/60" />
                  </div>
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                    id="testimonial-image-upload"
                  />
                  <Label
                    htmlFor="testimonial-image-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted rounded-lg text-sm transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? t("adminTestimonials.uploading", "Uploading...") : t("adminTestimonials.upload", "Upload")}
                  </Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student_name">{t("adminTestimonials.studentName", "Student Name *")}</Label>
              <Input
                id="student_name"
                value={formData.student_name}
                onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                placeholder={t("adminTestimonials.enterStudentName", "Enter student name")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="course_name">{t("adminTestimonials.courseNameOptional", "Course Name (Optional)")}</Label>
              <Input
                id="course_name"
                value={formData.course_name}
                onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                placeholder={t("adminTestimonials.eGDataAnalytics", "e.g., Data Analytics")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profession">{t("adminTestimonials.professionPosition", "Profession & Position")}</Label>
              <Input
                id="profession"
                value={formData.profession}
                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
                placeholder={t("adminTestimonials.eGDataAnalystAtBank", "e.g., Data Analyst at Bank of Kigali")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="programs_participated">{t("adminTestimonials.programsParticipatedIn", "Programs Participated In")}</Label>
              <Input
                id="programs_participated"
                value={formData.programs_participated}
                onChange={(e) => setFormData({ ...formData, programs_participated: e.target.value })}
                placeholder={t("adminTestimonials.eGDataAnalyticsCohort3", "e.g., Data Analytics Cohort 3, AI Bootcamp")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="career_impact">{t("adminTestimonials.careerImpact", "Career Impact *")}</Label>
              <Textarea
                id="career_impact"
                value={formData.career_impact}
                onChange={(e) => setFormData({ ...formData, career_impact: e.target.value })}
                placeholder={t("adminTestimonials.howDidTheProgramImpactTheir", "How did the program impact their career or profession?")}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial_text">{t("adminTestimonials.testimonialQuote", "Testimonial Quote *")}</Label>
              <Textarea
                id="testimonial_text"
                value={formData.testimonial_text}
                onChange={(e) => setFormData({ ...formData, testimonial_text: e.target.value })}
                placeholder={t("adminTestimonials.whatDidTheStudentSayAbout", "What did the student say about their experience?")}
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t("adminTestimonials.rating", "Rating")}</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: star })}
                    className="p-1"
                  >
                    <Star
                      className={`w-6 h-6 transition-colors ${star <= formData.rating ? 'fill-yellow-400 text-warning' : 'text-muted-foreground/60 hover:text-warning'
                        }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
                />
                <Label htmlFor="is_featured">{t("adminTestimonials.showOnLandingPage", "Show on Landing Page")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="display_order">{t("adminTestimonials.order", "Order:")}</Label>
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
                {t("adminTestimonials.cancel", "Cancel")}
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary-hover">
                {selectedTestimonial ? t("adminTestimonials.update", "Update") : t("adminTestimonials.add", "Add")}{" "}{t("adminTestimonials.testimonial", "Testimonial")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminTestimonials.deleteTestimonial", "Delete Testimonial")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminTestimonials.areYouSureYouWantTo", "Are you sure you want to delete this testimonial from {{studentName}}? This action cannot be undone.", { studentName: selectedTestimonial?.student_name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("adminTestimonials.cancel", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              {t("adminTestimonials.delete", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default AdminTestimonials;
