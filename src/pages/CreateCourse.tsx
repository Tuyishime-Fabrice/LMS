import { z } from "zod";
import { parseQuizOptions, lessonContentTypeSchema } from "@/lib/quizData";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, ChevronDown, ChevronRight, ArrowLeft,
  BookOpen, Layers, Award, Save, Video, FileText,
  Link2, HelpCircle, ClipboardList, GripVertical, Check,
  Eye, X, Play, Clock, Globe, Users, Target, Upload, ImageIcon, Loader2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileUploadField } from "@/components/FileUploadField";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface QuizQuestion {
  id: string;
  question_text: string;
  options: { id: string; text: string }[];
  correct_answer: string;
  explanation: string;
  points: number;
}

interface Lesson {
  id?: string;
  title: string;
  description: string;
  content_type: "video" | "pdf" | "document" | "url" | "quiz" | "assignment";
  content_url: string;
  file_url?: string;
  duration?: number;
  order_index: number;
  is_mandatory?: boolean;
  quiz_questions?: QuizQuestion[];
}

interface Chapter {
  id?: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

interface CapstoneProjectForm {
  id?: string;
  title: string;
  description: string;
  instructions: string;
  requirements: string[];
  due_date: string;
  file_url?: string;
}

const contentTypeIcons: Record<string, any> = {
  video: Video,
  pdf: FileText,
  document: FileText,
  url: Link2,
  quiz: HelpCircle,
  assignment: ClipboardList,
};


export default function CreateCourse() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const [courseData, setCourseData] = useState({
    title: "",
    description: "",
    requirements: "",
    thumbnail_url: "",
    welcome_video_url: "",
    level: "beginner",
    language: "",
  });

  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Thumbnail upload handler
  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file (JPG, PNG, WebP).", variant: "destructive" });
      return;
    }

    const MAX_SIZE = 1 * 1024 * 1024; // 1MB
    if (file.size > MAX_SIZE) {
      toast({
        title: "File too large",
        description: "Image must be under 1MB. Please compress your image using a tool like TinyPNG (tinypng.com) or Squoosh (squoosh.app) before uploading.",
        variant: "destructive",
      });
      e.currentTarget.value = "";
      return;
    }

    setUploadingThumbnail(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `thumbnails/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("course-thumbnails")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("course-thumbnails")
        .getPublicUrl(filePath);

      setCourseData({ ...courseData, thumbnail_url: publicUrl });
      toast({ title: "Thumbnail uploaded", description: "Course thumbnail has been uploaded successfully." });
    } catch (error) {
      console.error("Thumbnail upload error:", error);
      toast({ title: "Upload failed", description: "Failed to upload thumbnail. Please try again.", variant: "destructive" });
    } finally {
      setUploadingThumbnail(false);
    }
  };
  const [openChapters, setOpenChapters] = useState<Set<number>>(new Set([0]));
  const [capstoneProjects, setCapstoneProjects] = useState<CapstoneProjectForm[]>([{
    title: "",
    description: "",
    instructions: "",
    requirements: [""],
    due_date: "",
    file_url: "",
  }]);

  const updateCapstoneProject = (index: number, updates: Partial<CapstoneProjectForm>) => {
    setCapstoneProjects(prev => prev.map((cp, i) => i === index ? { ...cp, ...updates } : cp));
  };

  const addCapstoneProject = () => {
    setCapstoneProjects(prev => [...prev, { title: "", description: "", instructions: "", requirements: [""], due_date: "", file_url: "" }]);
  };

  const removeCapstoneProject = (index: number) => {
    setCapstoneProjects(prev => prev.filter((_, i) => i !== index));
  };
  const [includeCapstone, setIncludeCapstone] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const steps = [
    { title: "Course Info", icon: BookOpen },
    { title: "Content", icon: Layers },
    { title: "Capstone", icon: Award },
  ];

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId) {
      setIsEditMode(true);
      setCourseId(editId);
      fetchCourseData(editId);
    }
  }, [searchParams]);

  const fetchCourseData = async (id: string) => {
    try {
      setInitialLoading(true);

      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .eq("id", id)
        .single();

      if (courseError) throw courseError;

      setCourseData({
        title: course.title || "",
        description: course.description || "",
        requirements: course.requirements || "",
        thumbnail_url: course.thumbnail_url || "",
        welcome_video_url: course.welcome_video_url || "",
        level: course.level || "beginner",
        language: course.language || "",
      });

      const { data: chaptersData, error: chaptersError } = await supabase
        .from("course_chapters")
        .select("*")
        .eq("course_id", id)
        .order("order_index");

      if (chaptersError) throw chaptersError;

      const chaptersWithLessons = await Promise.all(
        (chaptersData || []).map(async (chapter) => {
          const { data: lessonsData, error: lessonsError } = await supabase
            .from("course_lessons")
            .select("*")
            .eq("chapter_id", chapter.id)
            .order("order_index");

          if (lessonsError) throw lessonsError;

          const lessonsWithQuiz = await Promise.all(
            (lessonsData || []).map(async (lesson) => {
              if (lesson.content_type === "quiz") {
                const { data: questionsData } = await supabase
                  .from("lesson_quiz_questions")
                  .select("*")
                  .eq("lesson_id", lesson.id)
                  .order("order_index");

                if (questionsData) {
                  return {
                    id: lesson.id,
                    title: lesson.title,
                    description: lesson.description,
                    content_type: lessonContentTypeSchema.parse(lesson.content_type),
                    content_url: lesson.content_url || "",
                    duration: lesson.duration,
                    order_index: lesson.order_index,
                    is_mandatory: lesson.is_mandatory,
                    quiz_questions: questionsData.map(q => ({
                      id: q.id,
                      question_text: q.question_text,
                      options: parseQuizOptions(q.options),
                      correct_answer: q.correct_answer,
                      explanation: q.explanation,
                      points: q.points,
                    })),
                  };
                }
              }
              return {
                id: lesson.id,
                title: lesson.title,
                description: lesson.description,
                content_type: lessonContentTypeSchema.parse(lesson.content_type),
                content_url: lesson.content_url || "",
                file_url: lesson.file_url || "",
                duration: lesson.duration,
                order_index: lesson.order_index,
                is_mandatory: lesson.is_mandatory,
                quiz_questions: [],
              };
            })
          );
          return { id: chapter.id, title: chapter.title, order_index: chapter.order_index, lessons: lessonsWithQuiz };
        })
      );

      setChapters(chaptersWithLessons);
      setOpenChapters(new Set(chaptersWithLessons.map((_, idx) => idx)));

      const { data: capstoneData } = await supabase
        .from("capstone_projects")
        .select("*")
        .eq("course_id", id);

      if (capstoneData && capstoneData.length > 0) {
        setIncludeCapstone(true);
        setCapstoneProjects(capstoneData.map((cp: any) => ({
          id: cp.id,
          title: cp.title || "",
          description: cp.description || "",
          instructions: cp.instructions || "",
          requirements: cp.requirements || [""],
          due_date: cp.due_date || "",
          file_url: cp.file_url || "",
        })));
      }
    } catch (error) {
      console.error("Error fetching course:", error);
      toast({ title: "Error", description: "Failed to load course data", variant: "destructive" });
    } finally {
      setInitialLoading(false);
    }
  };

  const normalizeChapterOrder = (chapterList: Chapter[]) =>
    chapterList.map((chapter, chapterIndex) => ({
      ...chapter,
      order_index: chapterIndex,
      lessons: chapter.lessons.map((lesson, lessonIndex) => ({
        ...lesson,
        order_index: lessonIndex,
      })),
    }));


  // Chapter & Lesson handlers
  const addChapter = () => {
    setChapters(normalizeChapterOrder([...chapters, { title: "", order_index: chapters.length, lessons: [] }]));
    setOpenChapters(new Set([...openChapters, chapters.length]));
  };

  const removeChapter = (chapterIndex: number) => {
    setChapters(normalizeChapterOrder(chapters.filter((_, i) => i !== chapterIndex)));
  };

  const addLesson = (chapterIndex: number) => {
    const newChapters = [...chapters];
    newChapters[chapterIndex].lessons.push({
      title: "",
      description: "",
      content_type: "video",
      content_url: "",
      file_url: "",
      order_index: newChapters[chapterIndex].lessons.length,
      is_mandatory: false,
      quiz_questions: [],
    });
    setChapters(normalizeChapterOrder(newChapters));
  };

  const removeLesson = (chapterIndex: number, lessonIndex: number) => {
    const newChapters = [...chapters];
    newChapters[chapterIndex].lessons = newChapters[chapterIndex].lessons.filter((_, i) => i !== lessonIndex);
    setChapters(normalizeChapterOrder(newChapters));
  };

  const updateChapter = (chapterIndex: number, field: string, value: string) => {
    const newChapters = [...chapters];
    newChapters[chapterIndex] = { ...newChapters[chapterIndex], [field]: value };
    setChapters(newChapters);
  };

  const updateLesson = (chapterIndex: number, lessonIndex: number, field: string, value: any) => {
    const newChapters = [...chapters];
    newChapters[chapterIndex].lessons[lessonIndex] = {
      ...newChapters[chapterIndex].lessons[lessonIndex],
      [field]: value
    };
    setChapters(newChapters);
  };

  const toggleChapter = (index: number) => {
    const newOpen = new Set(openChapters);
    if (newOpen.has(index)) newOpen.delete(index);
    else newOpen.add(index);
    setOpenChapters(newOpen);
  };

  // Quiz handlers
  const addQuizQuestion = (chapterIndex: number, lessonIndex: number) => {
    const newChapters = [...chapters];
    const lesson = newChapters[chapterIndex].lessons[lessonIndex];
    if (!lesson.quiz_questions) lesson.quiz_questions = [];
    lesson.quiz_questions.push({
      id: crypto.randomUUID(),
      question_text: "",
      options: [{ id: "a", text: "" }, { id: "b", text: "" }, { id: "c", text: "" }, { id: "d", text: "" }],
      correct_answer: "a",
      explanation: "",
      points: 1,
    });
    setChapters(newChapters);
  };

  const updateQuizQuestion = (chapterIndex: number, lessonIndex: number, questionIndex: number, field: string, value: any) => {
    const newChapters = [...chapters];
    const question = newChapters[chapterIndex].lessons[lessonIndex].quiz_questions![questionIndex];
    if (field === "option") {
      const optionIndex = question.options.findIndex(o => o.id === value.id);
      if (optionIndex !== -1) question.options[optionIndex].text = value.text;
    } else {
      newChapters[chapterIndex].lessons[lessonIndex].quiz_questions![questionIndex] = { ...question, [field]: value };
    }
    setChapters(newChapters);
  };

  const removeQuizQuestion = (chapterIndex: number, lessonIndex: number, questionIndex: number) => {
    const newChapters = [...chapters];
    newChapters[chapterIndex].lessons[lessonIndex].quiz_questions!.splice(questionIndex, 1);
    setChapters(newChapters);
  };

  // Capstone handlers
  const addCapstoneRequirement = (cpIndex: number) => {
    updateCapstoneProject(cpIndex, { requirements: [...capstoneProjects[cpIndex].requirements, ""] });
  };

  const updateCapstoneRequirement = (cpIndex: number, reqIndex: number, value: string) => {
    const newReqs = [...capstoneProjects[cpIndex].requirements];
    newReqs[reqIndex] = value;
    updateCapstoneProject(cpIndex, { requirements: newReqs });
  };

  const removeCapstoneRequirement = (cpIndex: number, reqIndex: number) => {
    updateCapstoneProject(cpIndex, { requirements: capstoneProjects[cpIndex].requirements.filter((_, i) => i !== reqIndex) });
  };

  const syncCourseStructure = async (targetCourseId: string) => {
    const { data: existingChapters, error: existingChaptersError } = await supabase
      .from("course_chapters")
      .select("id, course_lessons(id, content_type, lesson_quiz_questions(id))")
      .eq("course_id", targetCourseId);

    if (existingChaptersError) {
      throw existingChaptersError;
    }

    const existingChapterIds = new Set((existingChapters || []).map((chapter) => chapter.id));
    const existingLessonIds = new Set(
      (existingChapters || []).flatMap((chapter: any) => (chapter.course_lessons || []).map((lesson: any) => lesson.id))
    );
    const existingQuizQuestionIds = new Set(
      (existingChapters || []).flatMap((chapter: any) =>
        (chapter.course_lessons || []).flatMap((lesson: any) =>
          (lesson.lesson_quiz_questions || []).map((question: any) => question.id)
        )
      )
    );

    const retainedChapterIds = new Set<string>();
    const retainedLessonIds = new Set<string>();
    const retainedQuizQuestionIds = new Set<string>();

    for (const chapter of normalizeChapterOrder(chapters)) {
      let chapterRecordId = chapter.id;

      if (chapterRecordId) {
        const { error } = await supabase
          .from("course_chapters")
          .update({
            title: chapter.title,
            order_index: chapter.order_index,
          })
          .eq("id", chapterRecordId);

        if (error) throw error;
      } else {
        const { data: insertedChapter, error } = await supabase
          .from("course_chapters")
          .insert({
            course_id: targetCourseId,
            title: chapter.title,
            order_index: chapter.order_index,
          })
          .select("id")
          .single();

        if (error) throw error;
        chapterRecordId = insertedChapter.id;
      }

      retainedChapterIds.add(chapterRecordId);

      for (const lesson of chapter.lessons) {
        let lessonRecordId = lesson.id;
        const lessonPayload = {
          chapter_id: chapterRecordId,
          title: lesson.title,
          description: lesson.description,
          content_type: lessonContentTypeSchema.parse(lesson.content_type),
          content_url: lesson.content_type === "quiz" ? "" : lesson.content_url,
          file_url: lesson.file_url || null,
          duration: lesson.duration,
          order_index: lesson.order_index,
          is_mandatory: lesson.is_mandatory || false,
        };

        if (lessonRecordId) {
          const { error } = await supabase
            .from("course_lessons")
            .update(lessonPayload)
            .eq("id", lessonRecordId);

          if (error) throw error;
        } else {
          const { data: insertedLesson, error } = await supabase
            .from("course_lessons")
            .insert(lessonPayload)
            .select("id")
            .single();

          if (error) throw error;
          lessonRecordId = insertedLesson.id;
        }

        retainedLessonIds.add(lessonRecordId);

        if (lesson.content_type === "quiz" && lesson.quiz_questions?.length) {
          for (const [questionIndex, question] of lesson.quiz_questions.entries()) {
            const questionPayload = {
              lesson_id: lessonRecordId,
              question_text: question.question_text,
              options: question.options,
              correct_answer: question.correct_answer,
              explanation: question.explanation,
              order_index: questionIndex,
              points: question.points,
            };

            if (existingQuizQuestionIds.has(question.id)) {
              const { error } = await supabase
                .from("lesson_quiz_questions")
                .update(questionPayload)
                .eq("id", question.id);

              if (error) throw error;
            } else {
              const { error } = await supabase
                .from("lesson_quiz_questions")
                .insert({
                  id: question.id,
                  ...questionPayload,
                });

              if (error) throw error;
            }

            retainedQuizQuestionIds.add(question.id);
          }
        } else if (existingLessonIds.has(lessonRecordId)) {
          const { error } = await supabase
            .from("lesson_quiz_questions")
            .delete()
            .eq("lesson_id", lessonRecordId);

          if (error) throw error;
        }
      }
    }

    const chapterIdsToDelete = [...existingChapterIds].filter((id) => !retainedChapterIds.has(id));
    const lessonIdsToDelete = [...existingLessonIds].filter((id) => !retainedLessonIds.has(id));
    const quizQuestionIdsToDelete = [...existingQuizQuestionIds].filter((id) => !retainedQuizQuestionIds.has(id));

    if (quizQuestionIdsToDelete.length > 0) {
      const { error } = await supabase
        .from("lesson_quiz_questions")
        .delete()
        .in("id", quizQuestionIdsToDelete);

      if (error) throw error;
    }

    if (lessonIdsToDelete.length > 0) {
      const { error } = await supabase
        .from("course_lessons")
        .delete()
        .in("id", lessonIdsToDelete);

      if (error) throw error;
    }

    if (chapterIdsToDelete.length > 0) {
      const { error } = await supabase
        .from("course_chapters")
        .delete()
        .in("id", chapterIdsToDelete);

      if (error) throw error;
    }
  };

  const syncCapstoneProject = async (targetCourseId: string) => {
    const validProjects = includeCapstone ? capstoneProjects.filter(cp => cp.title.trim()) : [];

    if (validProjects.length === 0) {
      const { error } = await supabase
        .from("capstone_projects")
        .delete()
        .eq("course_id", targetCourseId);
      if (error) throw error;
      return;
    }

    // Get existing capstone IDs for this course
    const { data: existingCapstones } = await supabase
      .from("capstone_projects")
      .select("id")
      .eq("course_id", targetCourseId);

    const existingIds = new Set((existingCapstones || []).map((c: any) => c.id));
    const keepIds = new Set(validProjects.filter(cp => cp.id).map(cp => cp.id!));

    // Delete removed capstones
    for (const existingId of existingIds) {
      if (!keepIds.has(existingId)) {
        await supabase.from("capstone_projects").delete().eq("id", existingId);
      }
    }

    // Upsert each capstone
    for (const cp of validProjects) {
      const payload = {
        course_id: targetCourseId,
        title: cp.title,
        description: cp.description,
        instructions: cp.instructions,
        requirements: cp.requirements.filter(r => r.trim()),
        due_date: cp.due_date || null,
        file_url: cp.file_url || null,
      };

      if (cp.id) {
        await supabase.from("capstone_projects").update(payload).eq("id", cp.id);
      } else {
        await supabase.from("capstone_projects").insert(payload);
      }
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let course: any;

      if (isEditMode && courseId) {
        const { data: updatedCourse, error: courseError } = await supabase
          .from("courses")
          .update({
            title: courseData.title,
            description: courseData.description,
            requirements: courseData.requirements,
            thumbnail_url: courseData.thumbnail_url,
            welcome_video_url: courseData.welcome_video_url,
            level: z.enum(["beginner", "intermediate", "advanced"]).parse(courseData.level),
            language: courseData.language,
          })
          .eq("id", courseId)
          .select()
          .single();

        if (courseError) throw courseError;
        course = updatedCourse;
      } else {
        const { data: newCourse, error: courseError } = await supabase
          .from("courses")
          .insert({
            title: courseData.title,
            description: courseData.description,
            requirements: courseData.requirements,
            thumbnail_url: courseData.thumbnail_url,
            welcome_video_url: courseData.welcome_video_url,
            level: z.enum(["beginner", "intermediate", "advanced"]).parse(courseData.level),
            language: courseData.language,
            teacher_id: user.id,
          })
          .select()
          .single();

        if (courseError) throw courseError;
        course = newCourse;
      }

      await syncCourseStructure(course.id);
      await syncCapstoneProject(course.id);

      toast({ title: "Success!", description: isEditMode ? "Course updated" : "Course created" });

      // Redirect admins back to admin courses, teachers to their dashboard
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      navigate(profile?.role === "admin" ? "/admin/courses" : "/teacher/dashboard");
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", description: "Failed to save course", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };


  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-6 py-4">
          <div className="max-w-5xl mx-auto flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded" />
            <Skeleton className="h-6 w-48" />
          </div>
        </div>
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  const canProceed = () => {
    if (activeStep === 0) return courseData.title && courseData.description && courseData.language;
    if (activeStep === 1) return chapters.length > 0 && chapters.every(c => c.title && c.lessons.length > 0);
    return true;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/teacher/dashboard")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {isEditMode ? "Edit Course" : "Create Course"}
                </h1>
                <p className="text-sm text-gray-500">
                  {courseData.title || "Untitled course"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowPreview(true)} disabled={!courseData.title}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button onClick={handleSubmit} disabled={loading} className="bg-[#006d2c] hover:bg-[#005523]">
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save Course"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = activeStep === index;
              const isCompleted = activeStep > index;
              return (
                <button
                  key={step.title}
                  onClick={() => setActiveStep(index)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${isActive
                    ? "border-[#006d2c] text-[#006d2c]"
                    : isCompleted
                      ? "border-transparent text-gray-600 hover:text-gray-900"
                      : "border-transparent text-gray-400"
                    }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${isActive ? "bg-[#006d2c] text-white" : isCompleted ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}>
                    {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                  </div>
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto p-6">
        <form onSubmit={(e) => e.preventDefault()}>
          {/* Step 1: Course Info */}
          {activeStep === 0 && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6 space-y-5">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Course Title</Label>
                    <Input
                      value={courseData.title}
                      onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
                      placeholder="e.g., Complete Web Development Bootcamp"
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Description</Label>
                    <Textarea
                      value={courseData.description}
                      onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
                      placeholder="What will students learn?"
                      rows={4}
                      className="mt-1.5"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Level</Label>
                      <Select value={courseData.level} onValueChange={(v) => setCourseData({ ...courseData, level: v })}>
                        <SelectTrigger className="mt-1.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Language</Label>
                      <Input
                        value={courseData.language}
                        onChange={(e) => setCourseData({ ...courseData, language: e.target.value })}
                        placeholder="e.g., English"
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Welcome Video URL</Label>
                    <Input
                      value={courseData.welcome_video_url}
                      onChange={(e) => setCourseData({ ...courseData, welcome_video_url: e.target.value })}
                      placeholder="https://youtube.com/watch?v=..."
                      className="mt-1.5"
                    />
                    <p className="text-xs text-gray-500 mt-1">Optional intro video for your course</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Course Thumbnail</Label>
                    <div className="mt-1.5">
                      {courseData.thumbnail_url ? (
                        <div className="relative group">
                          <img
                            src={courseData.thumbnail_url}
                            alt="Thumbnail preview"
                            className="w-full aspect-video object-cover rounded-lg border border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => setCourseData({ ...courseData, thumbnail_url: "" })}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex flex-col items-center justify-center py-4">
                            {uploadingThumbnail ? (
                              <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
                            ) : (
                              <Upload className="w-8 h-8 text-gray-400 mb-2" />
                            )}
                            <p className="text-sm font-medium text-gray-600">
                              {uploadingThumbnail ? "Uploading..." : "Click to upload thumbnail"}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">JPG, PNG or WebP — Max 1MB</p>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleThumbnailUpload}
                            disabled={uploadingThumbnail}
                            className="hidden"
                          />
                        </label>
                      )}
                      <p className="text-xs text-amber-600 mt-1.5">⚠️ Max file size: 1MB. Use <a href="https://tinypng.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">TinyPNG</a> or <a href="https://squoosh.app" target="_blank" rel="noopener noreferrer" className="underline font-medium">Squoosh</a> to compress your image.</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-gray-700">Requirements</Label>
                    <Textarea
                      value={courseData.requirements}
                      onChange={(e) => setCourseData({ ...courseData, requirements: e.target.value })}
                      placeholder="Prerequisites for this course (one per line)"
                      rows={3}
                      className="mt-1.5"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={() => setActiveStep(1)} disabled={!canProceed()} className="bg-[#006d2c] hover:bg-[#005523]">
                  Continue to Content
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}


          {/* Step 2: Course Content */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Course Content</h2>
                  <p className="text-sm text-gray-500">Organize your course into chapters and lessons</p>
                </div>
                <Button onClick={addChapter} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Chapter
                </Button>
              </div>

              {chapters.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Layers className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="font-medium text-gray-900 mb-1">No chapters yet</h3>
                    <p className="text-sm text-gray-500 mb-4">Start building your course structure</p>
                    <Button onClick={addChapter} className="bg-[#006d2c] hover:bg-[#005523]">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Chapter
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {chapters.map((chapter, chapterIndex) => (
                    <Collapsible
                      key={chapterIndex}
                      open={openChapters.has(chapterIndex)}
                      onOpenChange={() => toggleChapter(chapterIndex)}
                    >
                      <Card>
                        <CollapsibleTrigger asChild>
                          <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
                            <GripVertical className="h-4 w-4 text-gray-400" />
                            <div className="w-8 h-8 rounded-lg bg-[#006d2c]/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-[#006d2c]">{chapterIndex + 1}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {chapter.title || `Chapter ${chapterIndex + 1}`}
                              </p>
                              <p className="text-xs text-gray-500">{chapter.lessons.length} lessons</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); removeChapter(chapterIndex); }}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {openChapters.has(chapterIndex) ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="px-4 pb-4 space-y-4 border-t">
                            <div className="pt-4">
                              <Label className="text-sm text-gray-600">Chapter Title</Label>
                              <Input
                                value={chapter.title}
                                onChange={(e) => updateChapter(chapterIndex, "title", e.target.value)}
                                placeholder="e.g., Introduction to React"
                                className="mt-1"
                              />
                            </div>

                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm text-gray-600">Lessons</Label>
                                <Button type="button" size="sm" variant="outline" onClick={() => addLesson(chapterIndex)}>
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Lesson
                                </Button>
                              </div>

                              {chapter.lessons.length === 0 ? (
                                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed">
                                  <p className="text-sm text-gray-500">No lessons yet</p>
                                </div>
                              ) : (
                                chapter.lessons.map((lesson, lessonIndex) => {
                                  const ContentIcon = contentTypeIcons[lesson.content_type] || FileText;
                                  return (
                                    <Card key={lessonIndex} className="bg-gray-50 border-gray-200">
                                      <CardContent className="p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <ContentIcon className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">
                                              Lesson {lessonIndex + 1}
                                            </span>
                                          </div>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeLesson(chapterIndex, lessonIndex)}
                                            className="h-7 w-7 text-gray-400 hover:text-red-500"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>

                                        <Input
                                          value={lesson.title}
                                          onChange={(e) => updateLesson(chapterIndex, lessonIndex, "title", e.target.value)}
                                          placeholder="Lesson title"
                                          className="bg-white"
                                        />

                                        <div className="grid grid-cols-2 gap-3">
                                          <Select
                                            value={lesson.content_type}
                                            onValueChange={(v) => updateLesson(chapterIndex, lessonIndex, "content_type", v)}
                                          >
                                            <SelectTrigger className="bg-white">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="video">Video</SelectItem>
                                              <SelectItem value="pdf">PDF</SelectItem>
                                              <SelectItem value="document">Document</SelectItem>
                                              <SelectItem value="url">External URL</SelectItem>
                                              <SelectItem value="quiz">Quiz</SelectItem>
                                              <SelectItem value="assignment">Assignment</SelectItem>
                                            </SelectContent>
                                          </Select>

                                          {lesson.content_type === "video" && (
                                            <Input
                                              type="number"
                                              value={lesson.duration || ""}
                                              onChange={(e) => updateLesson(chapterIndex, lessonIndex, "duration", parseInt(e.target.value) || 0)}
                                              placeholder="Duration (min)"
                                              className="bg-white"
                                            />
                                          )}
                                        </div>

                                        {lesson.content_type !== "quiz" && (
                                          <>
                                            {["pdf", "document", "assignment"].includes(lesson.content_type) ? (
                                              <FileUploadField
                                                label=""
                                                value={lesson.file_url || lesson.content_url}
                                                onChange={(url, isUpload) => {
                                                  if (isUpload) {
                                                    updateLesson(chapterIndex, lessonIndex, "file_url", url);
                                                    updateLesson(chapterIndex, lessonIndex, "content_url", "");
                                                  } else {
                                                    updateLesson(chapterIndex, lessonIndex, "content_url", url);
                                                    updateLesson(chapterIndex, lessonIndex, "file_url", "");
                                                  }
                                                }}
                                                accept=".pdf"
                                                placeholder="Upload or paste URL"
                                                courseId={courseId || undefined}
                                                lessonId={`temp-${chapterIndex}-${lessonIndex}`}
                                              />
                                            ) : (
                                              <Input
                                                value={lesson.content_url}
                                                onChange={(e) => updateLesson(chapterIndex, lessonIndex, "content_url", e.target.value)}
                                                placeholder={lesson.content_type === "video" ? "YouTube URL" : "URL"}
                                                className="bg-white"
                                              />
                                            )}
                                          </>
                                        )}

                                        {/* Optional PDF upload for video lessons */}
                                        {lesson.content_type === "video" && (
                                          <div className="space-y-1.5">
                                            <Label className="text-xs text-gray-500 flex items-center gap-1.5">
                                              <FileText className="h-3.5 w-3.5" />
                                              Accompanying PDF (Optional)
                                            </Label>
                                            <FileUploadField
                                              label=""
                                              value={lesson.file_url || ""}
                                              onChange={(url, isUpload) => {
                                                updateLesson(chapterIndex, lessonIndex, "file_url", url);
                                              }}
                                              accept=".pdf"
                                              placeholder="Upload or paste PDF URL"
                                              courseId={courseId || undefined}
                                              lessonId={`temp-${chapterIndex}-${lessonIndex}`}
                                            />
                                          </div>
                                        )}

                                        <Textarea
                                          value={lesson.description}
                                          onChange={(e) => updateLesson(chapterIndex, lessonIndex, "description", e.target.value)}
                                          placeholder="Brief description (optional)"
                                          rows={2}
                                          className="bg-white"
                                        />


                                        {/* Quiz Section */}
                                        {lesson.content_type === "quiz" && (
                                          <div className="space-y-3 pt-2 border-t">
                                            <div className="flex items-center gap-2">
                                              <input
                                                type="checkbox"
                                                id={`mandatory-${chapterIndex}-${lessonIndex}`}
                                                checked={lesson.is_mandatory || false}
                                                onChange={(e) => updateLesson(chapterIndex, lessonIndex, "is_mandatory", e.target.checked)}
                                                className="rounded"
                                              />
                                              <Label htmlFor={`mandatory-${chapterIndex}-${lessonIndex}`} className="text-xs text-gray-600">
                                                Required to pass
                                              </Label>
                                            </div>

                                            <div className="flex items-center justify-between">
                                              <span className="text-sm font-medium text-gray-700">Questions</span>
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => addQuizQuestion(chapterIndex, lessonIndex)}
                                                className="h-7 text-xs"
                                              >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Add Question
                                              </Button>
                                            </div>

                                            {lesson.quiz_questions?.map((q, qIndex) => (
                                              <Card key={q.id} className="bg-white p-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-xs font-medium text-gray-500">Q{qIndex + 1}</span>
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeQuizQuestion(chapterIndex, lessonIndex, qIndex)}
                                                    className="h-6 w-6"
                                                  >
                                                    <Trash2 className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                                <Input
                                                  value={q.question_text}
                                                  onChange={(e) => updateQuizQuestion(chapterIndex, lessonIndex, qIndex, "question_text", e.target.value)}
                                                  placeholder="Question"
                                                  className="text-sm"
                                                />
                                                <div className="grid grid-cols-2 gap-2">
                                                  {q.options.map((opt) => (
                                                    <div key={opt.id} className="flex items-center gap-1.5">
                                                      <input
                                                        type="radio"
                                                        name={`correct-${chapterIndex}-${lessonIndex}-${qIndex}`}
                                                        checked={q.correct_answer === opt.id}
                                                        onChange={() => updateQuizQuestion(chapterIndex, lessonIndex, qIndex, "correct_answer", opt.id)}
                                                        className="flex-shrink-0"
                                                      />
                                                      <Input
                                                        value={opt.text}
                                                        onChange={(e) => updateQuizQuestion(chapterIndex, lessonIndex, qIndex, "option", { id: opt.id, text: e.target.value })}
                                                        placeholder={opt.id.toUpperCase()}
                                                        className="text-xs h-8"
                                                      />
                                                    </div>
                                                  ))}
                                                </div>
                                                <div className="flex gap-2">
                                                  <Input
                                                    type="number"
                                                    value={q.points}
                                                    onChange={(e) => updateQuizQuestion(chapterIndex, lessonIndex, qIndex, "points", parseInt(e.target.value) || 1)}
                                                    className="w-20 text-xs h-8"
                                                    min="1"
                                                    placeholder="Points"
                                                  />
                                                  <Input
                                                    value={q.explanation}
                                                    onChange={(e) => updateQuizQuestion(chapterIndex, lessonIndex, qIndex, "explanation", e.target.value)}
                                                    placeholder="Explanation (optional)"
                                                    className="flex-1 text-xs h-8"
                                                  />
                                                </div>
                                              </Card>
                                            ))}

                                            {(!lesson.quiz_questions || lesson.quiz_questions.length === 0) && (
                                              <p className="text-xs text-gray-400 text-center py-3">No questions added</p>
                                            )}
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveStep(0)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={() => setActiveStep(2)} className="bg-[#006d2c] hover:bg-[#005523]">
                  Continue to Capstone
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}


          {/* Step 3: Capstone Project */}
          {activeStep === 2 && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Award className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900">Capstone Project</h2>
                        <p className="text-sm text-gray-500">Final project for course completion</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeCapstone}
                        onChange={(e) => setIncludeCapstone(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600">Include capstone</span>
                    </label>
                  </div>

                  {includeCapstone ? (
                    <div className="space-y-6">
                      {capstoneProjects.map((cp, cpIndex) => (
                        <Card key={cpIndex} className="border-purple-100 bg-purple-50/30">
                          <CardContent className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-semibold text-gray-800">
                                Capstone Project {capstoneProjects.length > 1 ? `#${cpIndex + 1}` : ""}
                              </h3>
                              {capstoneProjects.length > 1 && (
                                <Button type="button" size="sm" variant="ghost" onClick={() => removeCapstoneProject(cpIndex)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8">
                                  <Trash2 className="h-4 w-4 mr-1" /> Remove
                                </Button>
                              )}
                            </div>

                            <div>
                              <Label className="text-sm text-gray-600">Project Title</Label>
                              <Input
                                value={cp.title}
                                onChange={(e) => updateCapstoneProject(cpIndex, { title: e.target.value })}
                                placeholder="e.g., Build a Full-Stack Application"
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label className="text-sm text-gray-600">Description</Label>
                              <Textarea
                                value={cp.description}
                                onChange={(e) => updateCapstoneProject(cpIndex, { description: e.target.value })}
                                placeholder="Overview of the project"
                                rows={3}
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <Label className="text-sm text-gray-600">Instructions</Label>
                              <Textarea
                                value={cp.instructions}
                                onChange={(e) => updateCapstoneProject(cpIndex, { instructions: e.target.value })}
                                placeholder="Step-by-step instructions"
                                rows={5}
                                className="mt-1"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-sm text-gray-600">Requirements</Label>
                                <Button type="button" size="sm" variant="outline" onClick={() => addCapstoneRequirement(cpIndex)} className="h-7 text-xs">
                                  <Plus className="h-3 w-3 mr-1" /> Add
                                </Button>
                              </div>
                              <div className="space-y-2">
                                {cp.requirements.map((req, reqIndex) => (
                                  <div key={reqIndex} className="flex gap-2">
                                    <Input
                                      value={req}
                                      onChange={(e) => updateCapstoneRequirement(cpIndex, reqIndex, e.target.value)}
                                      placeholder={`Requirement ${reqIndex + 1}`}
                                    />
                                    {cp.requirements.length > 1 && (
                                      <Button type="button" size="icon" variant="ghost" onClick={() => removeCapstoneRequirement(cpIndex, reqIndex)} className="text-gray-400 hover:text-red-500">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div>
                              <Label className="text-sm text-gray-600">Due Date (Optional)</Label>
                              <Input
                                type="date"
                                value={cp.due_date}
                                onChange={(e) => updateCapstoneProject(cpIndex, { due_date: e.target.value })}
                                className="mt-1 w-48"
                              />
                            </div>

                            <div>
                              <Label className="text-sm text-gray-600">Upload Capstone Brief PDF (Optional)</Label>
                              <FileUploadField
                                label=""
                                value={cp.file_url || ""}
                                onChange={(url) => updateCapstoneProject(cpIndex, { file_url: url })}
                                accept=".pdf"
                                placeholder="Upload or paste PDF URL"
                                courseId={courseId || undefined}
                                lessonId={`capstone-${cp.id || `new-${cpIndex}`}`}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={addCapstoneProject}
                        className="w-full border-dashed border-2 border-purple-300 text-purple-600 hover:bg-purple-50 hover:border-purple-400 h-12"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Add Another Capstone Project
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Award className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No capstone project</p>
                      <p className="text-sm text-gray-400">Enable to add a final project</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveStep(1)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button onClick={handleSubmit} disabled={loading} className="bg-[#006d2c] hover:bg-[#005523]">
                  <Save className="h-4 w-4 mr-2" />
                  {loading ? "Saving..." : (isEditMode ? "Update Course" : "Create Course")}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <div className="flex flex-col h-[85vh]">
            {/* Preview Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-gray-500" />
                <div>
                  <h2 className="font-semibold text-gray-900">Course Preview</h2>
                  <p className="text-xs text-gray-500">How students will see your course</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Course Header */}
              <div className="bg-gradient-to-r from-[#006d2c] to-[#008d3c] text-white p-8">
                <div className="max-w-3xl">
                  <Badge className="bg-white/20 text-white mb-3 capitalize">{courseData.level}</Badge>
                  <h1 className="text-2xl font-bold mb-3">{courseData.title || "Course Title"}</h1>
                  <p className="text-white/90 mb-4 line-clamp-2">{courseData.description || "Course description will appear here"}</p>
                  <div className="flex items-center gap-4 text-sm text-white/80">
                    <div className="flex items-center gap-1">
                      <Layers className="h-4 w-4" />
                      <span>{chapters.length} chapters</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{chapters.reduce((sum, c) => sum + c.lessons.length, 0)} lessons</span>
                    </div>
                    {courseData.language && (
                      <div className="flex items-center gap-1">
                        <Globe className="h-4 w-4" />
                        <span>{courseData.language}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="col-span-2 space-y-6">
                  {/* Welcome Video Preview */}
                  {courseData.welcome_video_url && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
                          <div className="text-center text-white">
                            <Play className="h-12 w-12 mx-auto mb-2 opacity-80" />
                            <p className="text-sm opacity-60">Welcome Video</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Course Curriculum */}
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-4">Course Curriculum</h3>
                      {chapters.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-6">No chapters added yet</p>
                      ) : (
                        <div className="space-y-3">
                          {chapters.map((chapter, idx) => {
                            const totalDuration = chapter.lessons.reduce((sum, l) => sum + (l.duration || 0), 0);
                            return (
                              <div key={idx} className="border rounded-lg">
                                <div className="p-3 bg-gray-50 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-[#006d2c]/10 flex items-center justify-center">
                                      <span className="text-xs font-semibold text-[#006d2c]">{idx + 1}</span>
                                    </div>
                                    <span className="font-medium text-sm">{chapter.title || `Chapter ${idx + 1}`}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span>{chapter.lessons.length} lessons</span>
                                    {totalDuration > 0 && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {totalDuration} min
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="divide-y">
                                  {chapter.lessons.map((lesson, lIdx) => {
                                    const Icon = contentTypeIcons[lesson.content_type] || FileText;
                                    return (
                                      <div key={lIdx} className="p-3 flex items-center gap-3 hover:bg-gray-50">
                                        <Icon className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm text-gray-700 flex-1">{lesson.title || `Lesson ${lIdx + 1}`}</span>
                                        {lesson.duration && (
                                          <span className="text-xs text-gray-400">{lesson.duration} min</span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Capstone Preview */}
                  {includeCapstone && capstoneProjects.filter(cp => cp.title).length > 0 && (
                    <Card className="border-purple-200">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Award className="h-5 w-5 text-purple-600" />
                          <h3 className="font-semibold text-gray-900">Capstone Projects ({capstoneProjects.filter(cp => cp.title).length})</h3>
                        </div>
                        {capstoneProjects.filter(cp => cp.title).map((cp, idx) => (
                          <div key={idx} className={idx > 0 ? "mt-3 pt-3 border-t" : ""}>
                            <h4 className="font-medium text-gray-800 mb-1">{cp.title}</h4>
                            <p className="text-sm text-gray-600">{cp.description}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* Thumbnail */}
                  <Card>
                    <CardContent className="p-0">
                      {courseData.thumbnail_url ? (
                        <img
                          src={courseData.thumbnail_url}
                          alt="Course thumbnail"
                          className="w-full aspect-video object-cover rounded-t-lg"
                        />
                      ) : (
                        <div className="w-full aspect-video bg-gradient-to-br from-[#006d2c] to-[#008d3c] rounded-t-lg flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-white/50" />
                        </div>
                      )}
                      <div className="p-4">
                        <Button className="w-full bg-[#006d2c] hover:bg-[#005523]">
                          Enroll Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Course Info */}
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <h4 className="font-medium text-gray-900">This course includes</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Layers className="h-4 w-4" />
                          <span>{chapters.length} chapters</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <BookOpen className="h-4 w-4" />
                          <span>{chapters.reduce((sum, c) => sum + c.lessons.length, 0)} lessons</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="h-4 w-4" />
                          <span>{chapters.reduce((sum, c) => sum + c.lessons.reduce((s, l) => s + (l.duration || 0), 0), 0)} min total</span>
                        </div>
                        {includeCapstone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Award className="h-4 w-4" />
                            <span>Capstone project</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Requirements */}
                  {courseData.requirements && (
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Requirements</h4>
                        <div className="text-sm text-gray-600 space-y-1">
                          {courseData.requirements.split('\n').filter(r => r.trim()).map((req, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Target className="h-3 w-3 mt-1 text-gray-400" />
                              <span>{req}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
