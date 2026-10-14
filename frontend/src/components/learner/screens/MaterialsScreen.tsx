import { useRef, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  FileText,
  LoaderCircle,
  RefreshCw,
  ScanText,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { ovaelApi } from "../../../api/client";
import { useOvael } from "../../../context/OvaelContext";
import type { DocumentRecord, LearningLaunch } from "../../../types";
function bytes(value: number) {
  return value < 1024 * 1024
    ? `${Math.max(1, Math.round(value / 1024))} KB`
    : `${(value / 1024 / 1024).toFixed(1)} MB`;
}
function launchFor(document: DocumentRecord): LearningLaunch {
  return {
    documentId: document.document_id,
    documentName: document.filename,
    courseId: document.course_id || undefined,
    subjectId: document.subject_id || undefined,
    conceptId: document.focus_concept_id || undefined,
    conceptName: document.focus_concept_name || undefined,
  };
}
export function MaterialsScreen({
  onLearn,
}: {
  onLearn: (launch: LearningLaunch) => void;
}) {
  const { documents, courses, subjects, refresh, setError } =
    useOvael();
  const [query, setQuery] = useState("");
  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("auto");
  const [uploading, setUploading] = useState(false);
  const [routingId, setRoutingId] = useState("");
  const [ocrResult, setOcrResult] = useState<{
    document: DocumentRecord;
    preview: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const visible = documents.filter((document) =>
    document.filename.toLowerCase().includes(query.toLowerCase()),
  );
  const upload = async (file?: File) => {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError("Choose a material of 50 MB or smaller.");
      return;
    }
    setUploading(true);
    setOcrResult(null);
    setError("");
    try {
      const autoRoute = !courseId && subjectId === "auto";
      let teachingCourseId = courseId;
      if (!teachingCourseId && !autoRoute) {
        const subject = subjects.find((item) => item.subject_id === subjectId);
        if (!subject)
          throw new Error(
            "Choose a teaching subject before uploading this material.",
          );
        const existing = courses.find(
          (course) =>
            course.course_kind === "personal" &&
            course.subject_id === subjectId,
        );
        teachingCourseId =
          existing?.course_id ||
          (
            await ovaelApi.createCourse({
              name: `Personal ${subject.name}`,
              subject_id: subjectId,
              description: "Learner-owned material scope",
              course_kind: "personal",
            })
          ).course_id;
      }
      const uploaded = await ovaelApi.uploadDocument(
        file,
        teachingCourseId || undefined,
        autoRoute,
      );
      let preview = "";
      if (
        file.type.startsWith("image/") &&
        ["ready", "ready_partial"].includes(uploaded.status)
      ) {
        const page = await ovaelApi.documentPage(uploaded.document_id, 1);
        preview = page.text.slice(0, 260);
      }
      setOcrResult({ document: uploaded, preview });
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };
  const detectAndTeach = async (document: DocumentRecord, openLesson = true) => {
    setRoutingId(document.document_id);
    setError("");
    try {
      const routed =
        document.status.includes("fail") || document.status === "ready_partial"
          ? await ovaelApi.retryDocument(document.document_id)
          : await ovaelApi.routeDocument(document.document_id);
      await refresh();
      if (openLesson && ["ready", "ready_partial"].includes(routed.status))
        onLearn(launchFor(routed));
      else setOcrResult({ document: routed, preview: "" });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "OVAEL-X could not detect this material's subject.",
      );
    } finally {
      setRoutingId("");
    }
  };
  const remove = async (id: string) => {
    if (
      !window.confirm("Remove this material and its indexed teaching content?")
    )
      return;
    try {
      await ovaelApi.deleteDocument(id);
      await refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Material removal failed.",
      );
    }
  };
  return (
    <div className="page">
      <header className="page-heading materials-heading">
        <div>
          <p className="eyebrow blue">Your library</p>
          <h1>Materials</h1>
          <p>
            Add books, notes, images, audio or video. Up to 50 MB per file;
            books are read page by page.
          </p>
        </div>
        <div className="upload-controls">
          <select
            aria-label="Subject"
            value={subjectId}
            onChange={(event) => {
              setSubjectId(event.target.value);
              setCourseId("");
            }}
            disabled={Boolean(courseId)}
          >
            <option value="auto">Choose automatically</option>
            {subjects.map((subject) => (
              <option key={subject.subject_id} value={subject.subject_id}>
                {subject.name}
              </option>
            ))}
          </select>
          {courses.length > 0 && (
            <select
              aria-label="Course"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
            >
              <option value="">Choose a course (optional)</option>
              {courses
                .filter((course) => course.membership === "owner")
                .map((course) => (
                  <option key={course.course_id} value={course.course_id}>
                    {course.name}
                  </option>
                ))}
            </select>
          )}
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".pdf,.docx,.pptx,.epub,.txt,.md,.png,.jpg,.jpeg,.webp,.wav,.mp3,.m4a,.mp4,.webm,.mov"
            onChange={(event) =>
              void upload(event.target.files?.[0])
            }
          />
          <div className="upload-buttons">
            <button
              className="primary-button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Upload size={16} />
              )}{" "}
              Add material
            </button>
          </div>
        </div>
      </header>
      {ocrResult && (
        <section className="ocr-result" role="status">
          <ScanText size={20} />
          <div>
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
          {["ready", "ready_partial"].includes(ocrResult.document.status) &&
            ocrResult.document.subject_id && (
              <button
                className="text-button"
                onClick={() => onLearn(launchFor(ocrResult.document))}
              >
                Learn from this <ArrowRight size={14} />
              </button>
            )}
          <button
            aria-label="Dismiss upload result"
            onClick={() => setOcrResult(null)}
          >
            ×
          </button>
        </section>
      )}
      <section className="material-toolbar">
        <label>
          <Search size={17} />
          <input
            aria-label="Search your materials"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your materials"
          />
        </label>
        <span>
          {documents.length} source{documents.length === 1 ? "" : "s"}
        </span>
      </section>
      <section className="material-list" aria-live="polite">
        {visible.map((document) => {
          const image = document.content_type.startsWith("image/");
          const readyToTeach =
            ["ready", "ready_partial"].includes(document.status) &&
            document.subject_id &&
            document.focus_concept_id;
          return (
            <article key={document.document_id}>
              <span className="file-icon">
                {image ? <ScanText size={21} /> : <FileText size={21} />}
              </span>
              <div className="material-title">
                <strong>{document.filename}</strong>
                <small>
                  {document.page_count ? `${document.available_pages || 0} of ${document.page_count} pages available · ` : ""}
                  {document.content_type} · {bytes(document.size_bytes)}
                </small>
                {image && (
                  <span
                    className={`ocr-badge ${["ready", "ready_partial"].includes(document.status) ? "ready" : ""}`}
                  >
                    {["ready", "ready_partial"].includes(document.status)
                      ? "Text ready"
                      : "Reading image"}
                  </span>
                )}
              </div>
              <div>
                <span
                  className={`material-status ${document.status.includes("fail") ? "review" : ["ready", "ready_partial"].includes(document.status) ? "ready" : "processing"}`}
                >
                  {document.status.includes("fail")
                    ? "Needs setup"
                    : document.status === "ready_partial"
                      ? "Partly ready"
                      : document.status.replaceAll("_", " ")}
                </span>
                <small>
                  {document.subject_name
                    ? `${document.subject_name} · ${document.focus_concept_name || "Notes"}`
                    : "Topic not assigned"}
                </small>
              </div>
              <div className="material-actions">
                {document.status === "ready_partial" && (
                  <button
                    className="text-button"
                    disabled={routingId === document.document_id}
                    onClick={() => void detectAndTeach(document,false)}
                  >
                    {routingId === document.document_id
                      ? "Reading…"
                      : "Continue reading (up to 30 pages)"}
                  </button>
                )}
                {readyToTeach ? (
                  <button
                    className="text-button"
                    onClick={() => onLearn(launchFor(document))}
                  >
                    Learn from this <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    className="text-button"
                    disabled={
                      !["ready", "ready_partial", "failed_retryable"].includes(
                        document.status,
                      ) || routingId === document.document_id
                    }
                    onClick={() => void detectAndTeach(document)}
                  >
                    {routingId === document.document_id ? (
                      <LoaderCircle className="spin" size={14} />
                    ) : (
                      <RefreshCw size={14} />
                    )}{" "}
                    {document.status.includes("fail")
                      ? "Retry processing"
                      : "Find topic"}
                  </button>
                )}
                <button
                  className="icon-button"
                  aria-label={`Delete ${document.filename}`}
                  onClick={() => void remove(document.document_id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          );
        })}
        {visible.length === 0 && (
          <div className="empty-library">
            <BookOpenCheck size={30} />
            <h2>
              {query ? "No matching material" : "Add your first material"}
            </h2>
            <p>Documents, photos, recordings and videos belong here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
