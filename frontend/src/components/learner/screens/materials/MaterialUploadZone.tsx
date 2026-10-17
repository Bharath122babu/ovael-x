import React, { useRef } from "react";
import {
  ArrowRight,
  LoaderCircle,
  ScanText,
  Upload,
  X,
} from "lucide-react";
import type { Course, DocumentRecord, LearningLaunch, Subject } from "../../../../types";
import { launchFor } from "./materialsHelpers";

interface MaterialUploadZoneProps {
  uploading: boolean;
  isDragOver: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  subjectId: string;
  onSubjectIdChange: (val: string) => void;
  courseId: string;
  onCourseIdChange: (val: string) => void;
  subjects: Subject[];
  courses: Course[];
  onUploadFile: (file?: File) => void;
  ocrResult: { document: DocumentRecord; preview: string } | null;
  onDismissOcrResult: () => void;
  onLearn: (launch: LearningLaunch) => void;
}

export function MaterialUploadZone({
  uploading,
  isDragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  subjectId,
  onSubjectIdChange,
  courseId,
  onCourseIdChange,
  subjects,
  courses,
  onUploadFile,
  ocrResult,
  onDismissOcrResult,
  onLearn,
}: MaterialUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <section
        className={`materials-upload-card ${isDragOver ? "is-dragover" : ""}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        aria-label="Upload material zone"
      >
        <div className="upload-zone-layout">
          <div className="upload-drop-graphic">
            <div className="drop-icon-circle">
              {uploading ? (
                <LoaderCircle size={28} className="spin-icon" />
              ) : (
                <Upload size={28} />
              )}
            </div>
            <div>
              <h3>{uploading ? "Uploading & Analyzing Document…" : "Drop study files here or browse"}</h3>
              <p>Supports textbooks, lecture slides, scanned notes, voice recordings, and videos (up to 50 MB).</p>
            </div>
          </div>

          <div className="upload-scope-controls">
            <label className="scope-select-wrap">
              <span className="scope-label">Domain:</span>
              <select
                aria-label="Target subject domain"
                value={subjectId}
                onChange={(e) => onSubjectIdChange(e.target.value)}
                disabled={uploading || Boolean(courseId)}
                className="scope-dropdown"
              >
                <option value="auto">Auto-detect subject</option>
                {subjects.map((s) => (
                  <option key={s.subject_id} value={s.subject_id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            {courses.length > 0 && (
              <label className="scope-select-wrap">
                <span className="scope-label">Course:</span>
                <select
                  aria-label="Target course"
                  value={courseId}
                  onChange={(e) => onCourseIdChange(e.target.value)}
                  disabled={uploading}
                  className="scope-dropdown"
                >
                  <option value="">Attach to course (optional)</option>
                  {courses
                    .filter((c) => c.membership === "owner")
                    .map((c) => (
                      <option key={c.course_id} value={c.course_id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </label>
            )}

            <button
              type="button"
              className="btn btn-accent upload-trigger-btn"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <LoaderCircle className="spin-icon" size={15} />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <Upload size={15} />
                  <span>Select Files</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Accepted File Types Ribbon */}
        <div className="accepted-formats-ribbon">
          <span className="format-tag">PDF Textbooks</span>
          <span className="format-tag">DOCX & EPUB</span>
          <span className="format-tag">PPTX Slides</span>
          <span className="format-tag">Markdown & TXT</span>
          <span className="format-tag">Handwritten Notes (OCR)</span>
          <span className="format-tag">Audio Lectures (STT)</span>
          <span className="format-tag">Video Transcripts</span>
        </div>

        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept=".pdf,.docx,.pptx,.epub,.txt,.md,.png,.jpg,.jpeg,.webp,.wav,.mp3,.m4a,.mp4,.webm,.mov"
          disabled={uploading}
          onChange={(e) => {
            onUploadFile(e.target.files?.[0]);
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
      </section>

      {/* Upload / OCR Immediate Result Banner */}
      {ocrResult && (
        <aside className="ocr-feedback-banner" role="status">
          <div className="feedback-banner-content">
            <div className="feedback-icon-box">
              <ScanText size={20} />
            </div>
            <div className="feedback-text">
              <strong>
                {ocrResult.document.subject_name
                  ? `${ocrResult.document.subject_name} detected`
                  : ocrResult.document.status.replaceAll("_", " ")}{" "}
                · {ocrResult.document.filename}
              </strong>
              <p>
                {ocrResult.preview ||
                  (["ready", "ready_partial"].includes(ocrResult.document.status)
                    ? `Indexed material: ${ocrResult.document.focus_concept_name || "source reading"}. ${ocrResult.document.status === "ready_partial" ? "Some pages need review." : ""}`
                    : "Could not read this file. Check image or speech setup in Settings, then retry processing.")}
              </p>
            </div>
          </div>

          <div className="feedback-actions">
            {["ready", "ready_partial"].includes(ocrResult.document.status) &&
              ocrResult.document.subject_id && (
                <button
                  type="button"
                  className="btn btn-accent learn-now-btn"
                  onClick={() => onLearn(launchFor(ocrResult.document))}
                >
                  <span>Learn from this</span>
                  <ArrowRight size={14} />
                </button>
              )}
            <button
              type="button"
              className="close-inspector-btn close-banner-btn"
              onClick={onDismissOcrResult}
              aria-label="Dismiss upload result"
            >
              <X size={16} />
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
