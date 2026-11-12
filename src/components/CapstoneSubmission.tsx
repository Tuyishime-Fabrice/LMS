import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Award, Plus, Trash2, CheckCircle, Clock, FileText, Download, Upload, Eye, ExternalLink, AlertTriangle, RotateCcw } from "lucide-react";
import PdfJsInlineViewer from "@/components/PdfJsInlineViewer";
import {
  NON_MEDIA_FILE_HELP_TEXT,
  isViewableSubmissionFile,
  sanitizeFileName,
  validateSubmissionFile,
} from "@/lib/submissionFiles";

interface CapstoneProject {
  id: string;
  title: string;
  description: string;
  instructions: string;
  requirements: string[];
  due_date: string | null;
  file_url?: string | null;
}

interface CapstoneSubmissionProps {
  capstoneProject: CapstoneProject;
  studentId: string;
}

export function CapstoneSubmission({ capstoneProject, studentId }: CapstoneSubmissionProps) {
  const [projectLinks, setProjectLinks] = useState<string[]>([""]);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdfResolvedUrl, setPdfResolvedUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [submissionFileUrl, setSubmissionFileUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    fetchSubmission();
  }, [capstoneProject.id, studentId]);

  // Resolve teacher PDF URL
  useEffect(() => {
    if (!capstoneProject.file_url) {
      setPdfResolvedUrl(null);
      return;
    }
    const resolve = async () => {
      const url = capstoneProject.file_url!;
      if (/^https?:\/\//i.test(url)) {
        setPdfResolvedUrl(url);
        return;
      }
      try {
        const cleaned = url.replace(/^\/+/, "");
        const path = cleaned.replace(/^lesson-files\//, "");
        const { data: signed, error } = await supabase.storage.from("lesson-files").createSignedUrl(path, 3600);
        if (!error && signed?.signedUrl) {
          setPdfResolvedUrl(signed.signedUrl);
        } else {
          const { data: pub } = supabase.storage.from("lesson-files").getPublicUrl(path);
          setPdfResolvedUrl(pub?.publicUrl || url);
        }
      } catch {
        setPdfResolvedUrl(url);
      }
    };
    resolve();
  }, [capstoneProject.file_url]);

  const fetchSubmission = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("capstone_submissions")
        .select("*")
        .eq("capstone_project_id", capstoneProject.id)
        .eq("student_id", studentId)
        .single();

      if (data) {
        setSubmission(data);
        setProjectLinks(data.project_links || [""]);
        setDescription(data.description || "");
        setSubmissionFileUrl(data.file_url || null);
      }
    } catch (error) {
      // No submission yet
    } finally {
      setLoading(false);
    }
  };

  const addLink = () => {
    setProjectLinks([...projectLinks, ""]);
  };

  const updateLink = (index: number, value: string) => {
    const newLinks = [...projectLinks];
    newLinks[index] = value;
    setProjectLinks(newLinks);
  };

  const removeLink = (index: number) => {
    setProjectLinks(projectLinks.filter((_, i) => i !== index));
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateSubmissionFile(file);
    if (!validation.valid) {
      toast.error(validation.error || "This file cannot be uploaded.");
      event.target.value = "";
      return;
    }

    setUploadingDoc(true);
    try {
      const fileName = `${Date.now()}-${sanitizeFileName(file.name)}`;
      const filePath = `capstone-submissions/${studentId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from("lesson-files")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      setSubmissionFileUrl(data.path);
      toast.success(`File "${file.name}" uploaded successfully`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async () => {
    const validLinks = projectLinks.filter(link => link.trim() !== "");
    
    if (validLinks.length === 0 && !submissionFileUrl) {
      toast.error("Please add at least one project link or upload a document");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("capstone_submissions")
        .upsert({
          capstone_project_id: capstoneProject.id,
          student_id: studentId,
          project_links: validLinks,
          description: description,
          file_url: submissionFileUrl || null,
          submitted_at: new Date().toISOString(),
        }, {
          onConflict: "capstone_project_id,student_id",
        });

      if (error) throw error;

      toast.success("Capstone project submitted successfully!");
      fetchSubmission();
    } catch (error) {
      console.error("Error submitting capstone:", error);
      toast.error("Failed to submit project");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmission = async () => {
    if (!submission) return;
    setDeleting(true);
    try {
      // Delete the file from storage if it exists
      if (submission.file_url && !submission.file_url.startsWith('http')) {
        const path = submission.file_url.replace(/^\/+/, '').replace(/^lesson-files\//, '');
        await supabase.storage.from('lesson-files').remove([path]);
      }

      const { error } = await supabase
        .from('capstone_submissions')
        .delete()
        .eq('id', submission.id);

      if (error) throw error;

      // Reset form state
      setSubmission(null);
      setProjectLinks([""]);
      setDescription("");
      setSubmissionFileUrl(null);
      setConfirmDelete(false);
      toast.success('Submission deleted. You can now submit a new project.');
    } catch (error) {
      console.error('Error deleting submission:', error);
      toast.error('Failed to delete submission');
    } finally {
      setDeleting(false);
    }
  };

  const resolveFileUrl = async (fileUrl: string): Promise<string> => {
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    try {
      const cleaned = fileUrl.replace(/^\/+/, '');
      const path = cleaned.replace(/^lesson-files\//, '');
      const { data: signed, error } = await supabase.storage.from('lesson-files').createSignedUrl(path, 3600);
      if (!error && signed?.signedUrl) return signed.signedUrl;
      const { data: pub } = supabase.storage.from('lesson-files').getPublicUrl(path);
      return pub?.publicUrl || fileUrl;
    } catch {
      return fileUrl;
    }
  };

  const handleDownloadSubmittedFile = async () => {
    if (!submission?.file_url) return;
    const url = await resolveFileUrl(submission.file_url);
    window.open(url, '_blank');
  };

  const handlePreviewSubmittedFile = async () => {
    if (!submission?.file_url) return;
    const url = await resolveFileUrl(submission.file_url);
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
    window.open(googleViewerUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-700"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Details */}
      <Card className="border-gray-200 bg-gray-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Award className="h-8 w-8 text-gray-700" />
            <div>
              <CardTitle className="text-2xl text-gray-900">{capstoneProject.title}</CardTitle>
              {capstoneProject.due_date && (
                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <Clock className="h-4 w-4" />
                  Due: {new Date(capstoneProject.due_date).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
            <p className="text-gray-700">{capstoneProject.description}</p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Instructions</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{capstoneProject.instructions}</p>
          </div>

          {capstoneProject.requirements.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Requirements</h3>
              <ul className="list-disc list-inside space-y-1">
                {capstoneProject.requirements.map((req, i) => (
                  <li key={i} className="text-gray-700">{req}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Teacher's uploaded PDF - shown inline */}
          {pdfResolvedUrl && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Capstone Brief (PDF)</h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => window.open(pdfResolvedUrl, "_blank")}
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download
                </Button>
              </div>
              <div className="rounded-xl overflow-hidden border border-gray-200" style={{ minHeight: "50vh" }}>
                {!pdfError ? (
                  <PdfJsInlineViewer src={pdfResolvedUrl} onError={() => setPdfError(true)} />
                ) : (
                  <iframe
                    src={`${pdfResolvedUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                    title="Capstone Brief PDF"
                    className="w-full h-[50vh]"
                  />
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submitted Project Details */}
      {submission && (
        <Card className="border-green-200 bg-gradient-to-br from-green-50/80 to-emerald-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-green-100">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg text-green-900">Project Submitted</CardTitle>
                  <p className="text-sm text-green-700">
                    Submitted on {new Date(submission.submitted_at).toLocaleDateString()} at {new Date(submission.submitted_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
              {submission.grade !== null ? (
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-600 text-white text-sm font-bold">
                    Grade: {submission.grade}/100
                  </span>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-medium border border-orange-200">
                  <Clock className="h-3 w-3" />
                  Pending Review
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Teacher Feedback */}
            {submission.feedback && (
              <div className="p-4 bg-white rounded-xl border border-green-200 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <Award className="h-4 w-4 text-green-600" />
                  Teacher Feedback
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.feedback}</p>
              </div>
            )}

            {/* Submitted Links */}
            {submission.project_links && submission.project_links.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-blue-600" />
                  Your Submitted Links
                </h4>
                <div className="space-y-2">
                  {submission.project_links.map((link: string, index: number) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 shadow-sm hover:border-blue-200 transition-colors">
                      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <a
                        href={link.startsWith('http') ? link : `https://${link}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate flex-1"
                      >
                        {link}
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-blue-600 hover:bg-blue-50 flex-shrink-0"
                        onClick={() => window.open(link.startsWith('http') ? link : `https://${link}`, '_blank')}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submitted Document */}
            {submission.file_url && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  Your Uploaded Document
                </h4>
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-purple-200 shadow-sm">
                  <div className="p-2 rounded-lg bg-purple-50">
                    <FileText className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {submission.file_url.split('/').pop() || 'Uploaded document'}
                    </p>
                    <p className="text-xs text-gray-500">Attached to your submission</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs hover:bg-purple-50 border-purple-200"
                      onClick={handleDownloadSubmittedFile}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs hover:bg-blue-50 border-blue-200"
                      onClick={handlePreviewSubmittedFile}
                      disabled={!isViewableSubmissionFile(submission.file_url)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Submitted Description */}
            {submission.description && (
              <div>
                <h4 className="text-sm font-semibold text-gray-800 mb-2">Your Description</h4>
                <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.description}</p>
                </div>
              </div>
            )}

            {/* Delete / Undo Submission */}
            <div className="pt-2 border-t border-green-200">
              {!confirmDelete ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                  onClick={() => setConfirmDelete(true)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Delete Submission & Start Over
                </Button>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                  <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">Are you sure?</p>
                    <p className="text-xs text-red-600">This will permanently delete your submission, uploaded files, and any grades/feedback.</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 text-xs"
                      onClick={handleDeleteSubmission}
                      disabled={deleting}
                    >
                      {deleting ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent mr-1.5" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          Yes, Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Form */}
      <Card>
        <CardHeader>
          <CardTitle>{submission ? "Update Your Submission" : "Submit Your Project"}</CardTitle>
          {submission && (
            <p className="text-sm text-muted-foreground">You can update your links, document, or description below and resubmit.</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Project Links</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addLink}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Link
              </Button>
            </div>
            <div className="space-y-2">
              {projectLinks.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={link}
                    onChange={(e) => updateLink(index, e.target.value)}
                    placeholder="https://github.com/username/project or https://demo-site.com"
                  />
                  {projectLinks.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      onClick={() => removeLink(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Add links to your GitHub repository, live demo, documentation, etc.
            </p>
          </div>

          {/* Document Upload */}
          <div>
            <Label>Upload Document (Optional)</Label>
            <p className="text-xs text-muted-foreground mb-2">
              {NON_MEDIA_FILE_HELP_TEXT}
            </p>
            <div className="flex gap-2 items-center">
              <Input
                type="file"
                onChange={handleFileUpload}
                disabled={uploadingDoc}
                className="flex-1"
              />
              {uploadingDoc && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600" />
                  Uploading...
                </div>
              )}
            </div>
            {submissionFileUrl && !uploadingDoc && (
              <div className="flex items-center gap-2 text-sm text-green-600 mt-1">
                <CheckCircle className="h-4 w-4" />
                <span>Document attached</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-red-500 hover:text-red-700"
                  onClick={() => setSubmissionFileUrl(null)}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="description">Project Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your project, what you built, challenges faced, and what you learned..."
              rows={6}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-[#0A400C] hover:bg-[#0d5210]"
          >
            {isSubmitting ? "Submitting..." : submission ? "Update Submission" : "Submit Project"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
