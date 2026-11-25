import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle2, MessageSquare } from "lucide-react";
import { NON_MEDIA_FILE_HELP_TEXT, sanitizeFileName, validateSubmissionFile } from "@/lib/submissionFiles";

interface AssignmentUploadWidgetProps {
  studentId: string;
  capstoneProjectId: string;
  onUploaded?: () => void;
  submissionType?: 'assignment' | 'capstone'; // Type of submission
}

export default function AssignmentUploadWidget({ studentId, capstoneProjectId, onUploaded, submissionType = 'capstone' }: AssignmentUploadWidgetProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;

    const validation = selectedFile ? validateSubmissionFile(selectedFile) : { valid: true };
    if (!validation.valid) {
      toast({
        title: t("assignmentUploadWidget.fileCannotBeUploaded", "File cannot be uploaded"),
        description: validation.error,
        variant: "destructive",
      });
      event.target.value = "";
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: t("assignmentUploadWidget.noFileSelected", "No file selected"), variant: "destructive" });
      return;
    }

    const validation = validateSubmissionFile(file);
    if (!validation.valid) {
      toast({
        title: t("assignmentUploadWidget.fileCannotBeUploaded", "File cannot be uploaded"),
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({ title: t("assignmentUploadWidget.pleaseAddADescription", "Please add a description"), variant: "destructive" });
      return;
    }

    try {
      setUploading(true);
      
      // Debug logging
      console.log('=== ASSIGNMENT UPLOAD DEBUG ===');
      console.log('Submission Type:', submissionType);
      console.log('ID (lesson_id or capstone_id):', capstoneProjectId);
      console.log('Student ID:', studentId);
      console.log('Will insert into table:', submissionType === 'assignment' ? 'assignment_submissions' : 'capstone_submissions');
      
      const path = `capstone-submissions/${capstoneProjectId}/${studentId}/${Date.now()}-${sanitizeFileName(file.name)}`;

      const { data, error } = await supabase.storage
        .from("lesson-files")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;

      // Insert into appropriate table based on submission type
      if (submissionType === 'assignment') {
        const insert = await supabase
          .from("assignment_submissions")
          .upsert({
            lesson_id: capstoneProjectId, // For assignments, this is actually a lesson_id
            student_id: studentId,
            project_links: [data.path],
            description: description.trim(),
            submitted_at: new Date().toISOString(),
          }, { onConflict: "lesson_id,student_id" });
        if (insert.error) throw insert.error;
      } else {
        const insert = await supabase
          .from("capstone_submissions")
          .upsert({
            capstone_project_id: capstoneProjectId,
            student_id: studentId,
            project_links: [data.path],
            description: description.trim(),
            submitted_at: new Date().toISOString(),
          }, { onConflict: "capstone_project_id,student_id" });
        if (insert.error) throw insert.error;
      }

      toast({ 
        title: t("assignmentUploadWidget.success", "Success!"), 
        description: t("assignmentUploadWidget.yourAssignmentHasBeenSubmittedSuccessfully", "Your assignment has been submitted successfully."),
      });
      setFile(null);
      setDescription("");
      onUploaded?.();
    } catch (e: any) {
      console.error("Assignment upload failed", e);
      toast({ 
        title: t("assignmentUploadWidget.uploadFailed", "Upload failed"), 
        description: e.message || t("assignmentUploadWidget.failedToUploadAssignmentPleaseTry", "Failed to upload assignment. Please try again."), 
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* File Upload */}
      <div className="space-y-2">
        <Label htmlFor="file-upload" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {t("assignmentUploadWidget.uploadFile", "Upload File")}
        </Label>
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input 
              id="file-upload"
              type="file" 
              onChange={handleFileChange}
              className="cursor-pointer"
              disabled={uploading}
            />
            {file && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <FileText className="h-4 w-4 text-primary" />
              </div>
            )}
          </div>
        </div>
        {file && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-leaf border border-primary/30 rounded-md p-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="truncate">{file.name}</span>
            <span className="text-xs">{t("assignmentUploadWidget.mb", "({{toFixed}} MB)", { toFixed: (file.size / 1024 / 1024).toFixed(2) })}</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {NON_MEDIA_FILE_HELP_TEXT}
        </p>
      </div>

      {/* Description/Remarks */}
      <div className="space-y-2">
        <Label htmlFor="description" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {t("assignmentUploadWidget.descriptionRemarks", "Description / Remarks")}
        </Label>
        <Textarea
          id="description"
          placeholder={t("assignmentUploadWidget.explainYourSubmissionAddNotesOr", "Explain your submission, add notes, or provide context about your work...")}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={uploading}
          rows={4}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">
          {t("assignmentUploadWidget.n500Characters", "{{count}}/500 characters", { count: description.length })}
        </p>
      </div>

      {/* Submit Button */}
      <Button 
        onClick={handleUpload} 
        disabled={uploading || !file || !description.trim()} 
        className="w-full bg-action hover:bg-action-hover"
        size="lg"
      >
        {uploading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-card mr-2" />
            {t("assignmentUploadWidget.uploading", "Uploading...")}
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {t("assignmentUploadWidget.submitAssignment", "Submit Assignment")}
          </>
        )}
      </Button>
    </div>
  );
}
