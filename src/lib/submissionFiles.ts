const MEDIA_MIME_PREFIXES = ["image/", "audio/", "video/"];

const MEDIA_EXTENSIONS = new Set([
  "3g2",
  "3gp",
  "aac",
  "aif",
  "aiff",
  "apng",
  "avi",
  "avif",
  "bmp",
  "flac",
  "gif",
  "heic",
  "heif",
  "ico",
  "jpeg",
  "jpg",
  "m4a",
  "m4v",
  "mkv",
  "mov",
  "mp3",
  "mp4",
  "mpeg",
  "mpg",
  "ogg",
  "ogv",
  "opus",
  "png",
  "svg",
  "tif",
  "tiff",
  "wav",
  "webm",
  "webp",
  "wma",
  "wmv",
]);

const VIEWABLE_DOCUMENT_EXTENSIONS = new Set([
  "csv",
  "doc",
  "docx",
  "ods",
  "pdf",
  "ppt",
  "pptx",
  "rtf",
  "txt",
  "xls",
  "xlsm",
  "xlsx",
]);

const BLOCKED_EXTENSIONS = new Set([
  "app",
  "bat",
  "cmd",
  "com",
  "deb",
  "dmg",
  "exe",
  "gadget",
  "jar",
  "msi",
  "pif",
  "ps1",
  "rpm",
  "scr",
  "sh",
  "vbs",
  "workflow",
]);

export const MAX_SUBMISSION_FILE_SIZE_MB = 10;
const MAX_SUBMISSION_FILE_SIZE_BYTES = MAX_SUBMISSION_FILE_SIZE_MB * 1024 * 1024;

export const NON_MEDIA_FILE_HELP_TEXT =
  `Any non-media file up to ${MAX_SUBMISSION_FILE_SIZE_MB} MB is accepted. PDF, Word, PowerPoint, and Excel files can be previewed.`;

export const getFileExtension = (fileNameOrPath: string) => {
  const withoutQuery = fileNameOrPath.split("?")[0]?.split("#")[0] || "";
  const fileName = withoutQuery.split("/").pop() || withoutQuery;
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
};

export const isMediaFile = (file: File) => {
  const mimeType = file.type.toLowerCase();
  const extension = getFileExtension(file.name);

  return (
    MEDIA_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix)) ||
    MEDIA_EXTENSIONS.has(extension)
  );
};

export const validateSubmissionFile = (file: File): { valid: boolean; error?: string } => {
  if (isMediaFile(file)) {
    return { valid: false, error: "Media files are not allowed." };
  }

  const extension = getFileExtension(file.name);
  if (BLOCKED_EXTENSIONS.has(extension)) {
    return {
      valid: false,
      error: "Executable and script files are not allowed for security reasons.",
    };
  }

  if (file.size > MAX_SUBMISSION_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size must not exceed ${MAX_SUBMISSION_FILE_SIZE_MB} MB.`,
    };
  }

  return { valid: true };
};

export const isAllowedSubmissionFile = (file: File) => validateSubmissionFile(file).valid;

export const isViewableSubmissionFile = (fileNameOrPath: string) => {
  const extension = getFileExtension(fileNameOrPath);
  return VIEWABLE_DOCUMENT_EXTENSIONS.has(extension);
};

export const sanitizeFileName = (fileName: string) => {
  const cleaned = fileName
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "submission-file";
};
