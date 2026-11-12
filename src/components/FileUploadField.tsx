import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, Link as LinkIcon, Loader2, FileCheck, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadFieldProps {
  label: string;
  value: string;
  onChange: (url: string, isUpload: boolean) => void;
  accept?: string;
  placeholder?: string;
  courseId?: string;
  lessonId?: string;
}

export function FileUploadField({
  label,
  value,
  onChange,
  accept = ".pdf",
  placeholder = "https://example.com/file.pdf",
  courseId,
  lessonId,
}: FileUploadFieldProps) {
  const [uploadMethod, setUploadMethod] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Enforce PDF only
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isPdf = file.type === "application/pdf" || ext === "pdf";
    if (!isPdf) {
      toast({
        title: "Invalid file type",
        description: "Only PDF files are allowed.",
        variant: "destructive",
      });
      event.currentTarget.value = "";
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      setFileName(file.name);

      // Generate unique file path
      const fileExt = "pdf";
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = courseId && lessonId 
        ? `${courseId}/${lessonId}/${fileName}`
        : `uploads/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("lesson-files")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      setUploadProgress(100);
      // Store the storage path; viewer will resolve to signed/public URL
      onChange(data.path, true);

      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUrlChange = (url: string) => {
    onChange(url, false);
  };

  const clearFile = () => {
    onChange("", false);
    setFileName("");
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      <RadioGroup
        value={uploadMethod}
        onValueChange={(value) => setUploadMethod(value as "upload" | "url")}
        className="flex gap-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="upload" id="upload-option" />
          <Label htmlFor="upload-option" className="font-normal cursor-pointer">
            Upload File
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="url" id="url-option" />
          <Label htmlFor="url-option" className="font-normal cursor-pointer">
            Provide URL
          </Label>
        </div>
      </RadioGroup>

      {uploadMethod === "upload" ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="file"
              accept={accept}
              onChange={handleFileUpload}
              disabled={uploading}
              className="flex-1"
            />
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearFile}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {uploading && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading {fileName}...</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {value && !uploading && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <FileCheck className="h-4 w-4" />
              <span>File uploaded successfully</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="url"
              value={value}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder={placeholder}
              className="pl-9"
            />
          </div>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearFile}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
