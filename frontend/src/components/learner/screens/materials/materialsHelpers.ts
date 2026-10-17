import type { DocumentRecord, LearningLaunch } from "../../../../types";

export function bytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export function launchFor(document: DocumentRecord): LearningLaunch {
  return {
    documentId: document.document_id,
    documentName: document.filename,
    courseId: document.course_id || undefined,
    subjectId: document.subject_id || undefined,
    conceptId: document.focus_concept_id || undefined,
    conceptName: document.focus_concept_name || undefined,
  };
}

export function getFileCategory(
  contentType: string,
  filename: string,
): "pdf" | "doc" | "image" | "audio" | "video" | "other" {
  const mime = contentType.toLowerCase();
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (mime.includes("pdf") || ext === "pdf") return "pdf";
  if (
    mime.includes("word") ||
    mime.includes("document") ||
    mime.includes("text") ||
    ["doc", "docx", "txt", "md", "epub", "pptx"].includes(ext)
  )
    return "doc";
  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) return "image";
  if (mime.startsWith("audio/") || ["mp3", "wav", "m4a", "ogg"].includes(ext)) return "audio";
  if (mime.startsWith("video/") || ["mp4", "webm", "mov", "mkv"].includes(ext)) return "video";
  return "other";
}
