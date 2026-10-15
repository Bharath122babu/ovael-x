import { useRef, useState, useMemo } from "react";
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
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  File,
  Music,
  Video,
  Eye,
  X,
  Filter,
  LayoutGrid,
  List,
  BookOpen,
} from "lucide-react";
import { ovaelApi } from "../../../api/client";
import { useOvael } from "../../../context/OvaelContext";
import type { DocumentRecord, LearningLaunch } from "../../../types";

function bytes(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
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

function getFileCategory(contentType: string, filename: string): "pdf" | "doc" | "image" | "audio" | "video" | "other" {
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

export function MaterialsScreen({
  onLearn,
}: {
  onLearn: (launch: LearningLaunch) => void;
}) {
  const { documents, courses, subjects, refresh, setError } = useOvael();

  // Search & Filter State
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "doc" | "image" | "media">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "review">("all");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Upload configuration
  const [courseId, setCourseId] = useState("");
  const [subjectId, setSubjectId] = useState("auto");
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [routingId, setRoutingId] = useState("");

  // Result & Preview States
  const [ocrResult, setOcrResult] = useState<{
    document: DocumentRecord;
    preview: string;
  } | null>(null);

  const [inspectDoc, setInspectDoc] = useState<DocumentRecord | null>(null);
  const [inspectPageText, setInspectPageText] = useState<string>("");
  const [inspectLoading, setInspectLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      void upload(droppedFiles[0]);
    }
  };

  // Upload handler preserving API contract
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
        if (!subject) {
          throw new Error("Choose a teaching subject before uploading this material.");
        }
        const existing = courses.find(
          (course) => course.course_kind === "personal" && course.subject_id === subjectId
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
        autoRoute
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
      setError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // Route / retry document handler
  const detectAndTeach = async (document: DocumentRecord, openLesson = true) => {
    setRoutingId(document.document_id);
    setError("");
    try {
      const routed =
        document.status.includes("fail") || document.status === "ready_partial"
          ? await ovaelApi.retryDocument(document.document_id)
          : await ovaelApi.routeDocument(document.document_id);
      await refresh();
      if (openLesson && ["ready", "ready_partial"].includes(routed.status)) {
        onLearn(launchFor(routed));
      } else {
        setOcrResult({ document: routed, preview: "" });
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "OVAEL-X could not detect this material's subject."
      );
    } finally {
      setRoutingId("");
    }
  };

  // Remove document with confirmation
  const remove = async (id: string) => {
    if (!window.confirm("Remove this material and its indexed teaching content?")) return;
    try {
      await ovaelApi.deleteDocument(id);
      if (inspectDoc?.document_id === id) {
        setInspectDoc(null);
      }
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Material removal failed.");
    }
  };

  // Open Document Details / Preview Modal
  const openPreview = async (doc: DocumentRecord) => {
    setInspectDoc(doc);
    setInspectPageText("");
    setInspectLoading(true);
    try {
      const page = await ovaelApi.documentPage(doc.document_id, 1);
      setInspectPageText(page.text || "No text could be extracted from page 1.");
    } catch {
      setInspectPageText("Preview text unavailable or document has not yet completed page indexing.");
    } finally {
      setInspectLoading(false);
    }
  };

  // Filtered documents list
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Query filter
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesName = doc.filename.toLowerCase().includes(q);
        const matchesSub = doc.subject_name?.toLowerCase().includes(q) || false;
        const matchesConc = doc.focus_concept_name?.toLowerCase().includes(q) || false;
        if (!matchesName && !matchesSub && !matchesConc) return false;
      }

      // Course filter
      if (selectedCourseFilter !== "all" && doc.course_id !== selectedCourseFilter) {
        return false;
      }

      // Type filter
      if (typeFilter !== "all") {
        const cat = getFileCategory(doc.content_type, doc.filename);
        if (typeFilter === "doc" && !["pdf", "doc"].includes(cat)) return false;
        if (typeFilter === "image" && cat !== "image") return false;
        if (typeFilter === "media" && !["audio", "video"].includes(cat)) return false;
      }

      // Status filter
      if (statusFilter === "ready" && !["ready", "ready_partial"].includes(doc.status)) return false;
      if (statusFilter === "review" && !doc.status.includes("fail") && doc.status !== "ready_partial") return false;

      return true;
    });
  }, [documents, query, selectedCourseFilter, typeFilter, statusFilter]);

  // Library summary statistics
  const readyCount = documents.filter((d) => ["ready", "ready_partial"].includes(d.status)).length;
  const reviewCount = documents.filter((d) => d.status.includes("fail") || d.status === "ready_partial").length;
  const processingCount = documents.filter((d) => !["ready", "ready_partial"].includes(d.status) && !d.status.includes("fail")).length;

  return (
    <div className="page materials-page">
      {/* Page Heading */}
      <header className="page-heading materials-header">
        <div className="materials-header-info">
          <p className="eyebrow blue">Knowledge Repository</p>
          <h1>Materials</h1>
          <p className="page-lead">
            Upload textbooks, notes, slides, images, and audio. Documents are indexed page-by-page
            for adaptive reference and context-grounded tutoring.
          </p>
        </div>

        {/* Quick Summary Badges */}
        <div className="materials-stats-strip" aria-label="Library metrics">
          <span className="stat-pill" title={`${documents.length} total files`}>
            <FileText size={14} />
            <strong>{documents.length}</strong> sources
          </span>
          <span className="stat-pill is-ready-pill" title={`${readyCount} files ready for tutoring`}>
            <CheckCircle2 size={14} />
            <strong>{readyCount}</strong> ready
          </span>
          {processingCount > 0 && (
            <span className="stat-pill is-proc-pill" title={`${processingCount} files being indexed`}>
              <LoaderCircle size={14} className="spin-icon" />
              <strong>{processingCount}</strong> indexing
            </span>
          )}
          {reviewCount > 0 && (
            <span className="stat-pill is-alert-pill" title={`${reviewCount} files requiring review`}>
              <AlertTriangle size={14} />
              <strong>{reviewCount}</strong> review
            </span>
          )}
        </div>
      </header>

      {/* Modern Drag-and-Drop Upload Section */}
      <section
        className={`materials-upload-card ${isDragOver ? "is-dragover" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
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
                onChange={(e) => {
                  setSubjectId(e.target.value);
                  setCourseId("");
                }}
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
                  onChange={(e) => setCourseId(e.target.value)}
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
              className="primary-button upload-trigger-btn"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <LoaderCircle className="spin-icon" size={16} />
                  <span>Processing…</span>
                </>
              ) : (
                <>
                  <Upload size={16} />
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
          onChange={(e) => void upload(e.target.files?.[0])}
        />
      </section>

      {/* Upload / OCR Immediate Result Banner */}
      {ocrResult && (
        <aside className="ocr-feedback-banner" role="status">
          <div className="feedback-banner-content">
            <div className="feedback-icon-box">
              <ScanText size={22} />
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
                  className="primary-button learn-now-btn"
                  onClick={() => onLearn(launchFor(ocrResult.document))}
                >
                  <span>Learn from this</span>
                  <ArrowRight size={14} />
                </button>
              )}
            <button
              type="button"
              className="icon-button close-banner-btn"
              onClick={() => setOcrResult(null)}
              aria-label="Dismiss upload result"
            >
              <X size={16} />
            </button>
          </div>
        </aside>
      )}

      {/* Materials Toolbar: Search, Filters & View Mode */}
      <section className="materials-toolbar-bar" aria-label="Library filters">
        <div className="toolbar-search-box">
          <Search size={16} className="search-icon" />
          <input
            type="search"
            aria-label="Search your materials"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files by title, subject domain, or topic concept…"
            className="search-input"
          />
          {query && (
            <button
              type="button"
              className="icon-button clear-btn"
              onClick={() => setQuery("")}
              aria-label="Clear search query"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="toolbar-filters-row">
          {/* File Type Filter */}
          <div className="filter-pill-group" role="radiogroup" aria-label="File format filter">
            <button
              type="button"
              className={`filter-pill-btn ${typeFilter === "all" ? "active" : ""}`}
              onClick={() => setTypeFilter("all")}
            >
              All Types
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${typeFilter === "doc" ? "active" : ""}`}
              onClick={() => setTypeFilter("doc")}
            >
              Documents
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${typeFilter === "image" ? "active" : ""}`}
              onClick={() => setTypeFilter("image")}
            >
              Images (OCR)
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${typeFilter === "media" ? "active" : ""}`}
              onClick={() => setTypeFilter("media")}
            >
              Audio & Video
            </button>
          </div>

          {/* Status Filter */}
          <div className="filter-pill-group" role="radiogroup" aria-label="Status filter">
            <button
              type="button"
              className={`filter-pill-btn ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All Status
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${statusFilter === "ready" ? "active" : ""}`}
              onClick={() => setStatusFilter("ready")}
            >
              Ready ({readyCount})
            </button>
            <button
              type="button"
              className={`filter-pill-btn ${statusFilter === "review" ? "active" : ""}`}
              onClick={() => setStatusFilter("review")}
            >
              Review ({reviewCount})
            </button>
          </div>

          {/* Course Scope Filter */}
          {courses.length > 0 && (
            <select
              aria-label="Filter by course"
              value={selectedCourseFilter}
              onChange={(e) => setSelectedCourseFilter(e.target.value)}
              className="course-filter-dropdown"
            >
              <option value="all">All Courses</option>
              {courses.map((c) => (
                <option key={c.course_id} value={c.course_id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* View Mode Toggle */}
          <div className="view-mode-toggle" role="group" aria-label="View layout mode">
            <button
              type="button"
              className={`view-mode-btn ${viewMode === "grid" ? "active" : ""}`}
              onClick={() => setViewMode("grid")}
              aria-label="Grid view"
              title="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={`view-mode-btn ${viewMode === "list" ? "active" : ""}`}
              onClick={() => setViewMode("list")}
              aria-label="List view"
              title="List view"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* Materials Cards / Table Display */}
      {viewMode === "grid" ? (
        <div className="materials-grid-layout" aria-live="polite">
          {filteredDocuments.map((doc) => {
            const category = getFileCategory(doc.content_type, doc.filename);
            const isImage = category === "image";
            const isAudio = category === "audio";
            const isVideo = category === "video";
            const isPdf = category === "pdf";

            const isReady = ["ready", "ready_partial"].includes(doc.status);
            const isPartial = doc.status === "ready_partial";
            const isFailed = doc.status.includes("fail");
            const readyToTeach = isReady && doc.subject_id && doc.focus_concept_id;

            return (
              <article key={doc.document_id} className="material-card-tile">
                <div className="material-card-header">
                  <div className={`file-type-icon-box is-${category}`}>
                    {isPdf && <FileText size={22} />}
                    {category === "doc" && <BookOpen size={22} />}
                    {isImage && <ScanText size={22} />}
                    {isAudio && <Music size={22} />}
                    {isVideo && <Video size={22} />}
                    {category === "other" && <File size={22} />}
                  </div>

                  <div className="material-status-tag-wrap">
                    <span
                      className={`material-status-pill ${
                        isFailed ? "is-failed" : isPartial ? "is-partial" : isReady ? "is-ready" : "is-processing"
                      }`}
                    >
                      {isReady && !isPartial && <CheckCircle2 size={12} />}
                      {isPartial && <AlertTriangle size={12} />}
                      {isFailed && <AlertCircle size={12} />}
                      {!isReady && !isFailed && <LoaderCircle size={12} className="spin-icon" />}
                      <span>
                        {isFailed
                          ? "Needs setup"
                          : isPartial
                            ? "Partly ready"
                            : isReady
                              ? "Ready to teach"
                              : doc.status.replaceAll("_", " ")}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="material-card-body">
                  <h4 className="material-doc-title" title={doc.filename}>
                    {doc.filename}
                  </h4>

                  <div className="material-meta-row">
                    <span className="meta-item">{bytes(doc.size_bytes)}</span>
                    {doc.page_count ? (
                      <span className="meta-item">
                        {doc.available_pages || 0} / {doc.page_count} pages
                      </span>
                    ) : null}
                    <span className="meta-item content-type-pill">{category.toUpperCase()}</span>
                  </div>

                  <div className="material-scope-row">
                    <span className="scope-chip">
                      {doc.subject_name ? (
                        <strong>{doc.subject_name}</strong>
                      ) : (
                        <em className="unassigned">Domain unassigned</em>
                      )}
                    </span>
                    {doc.focus_concept_name && (
                      <span className="concept-chip" title={doc.focus_concept_name}>
                        {doc.focus_concept_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="material-card-actions">
                  {readyToTeach ? (
                    <button
                      type="button"
                      className="primary-button learn-btn"
                      onClick={() => onLearn(launchFor(doc))}
                      title="Launch interactive tutoring session"
                    >
                      <span>Learn</span>
                      <ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="quiet-button route-btn"
                      disabled={
                        !["ready", "ready_partial", "failed_retryable"].includes(doc.status) ||
                        routingId === doc.document_id
                      }
                      onClick={() => void detectAndTeach(doc)}
                      title={doc.status.includes("fail") ? "Retry indexing" : "Find topic domain"}
                    >
                      {routingId === doc.document_id ? (
                        <LoaderCircle className="spin-icon" size={14} />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      <span>{doc.status.includes("fail") ? "Retry" : "Find Topic"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="icon-button preview-btn"
                    onClick={() => void openPreview(doc)}
                    title="Inspect document & preview page"
                    aria-label={`Inspect ${doc.filename}`}
                  >
                    <Eye size={15} />
                  </button>

                  <button
                    type="button"
                    className="icon-button delete-btn"
                    onClick={() => void remove(doc.document_id)}
                    title="Remove material from repository"
                    aria-label={`Delete ${doc.filename}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* List / Table Layout */
        <div className="materials-table-wrap" aria-live="polite">
          <table className="materials-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Domain & Topic</th>
                <th>Size / Pages</th>
                <th>Status</th>
                <th className="actions-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocuments.map((doc) => {
                const category = getFileCategory(doc.content_type, doc.filename);
                const isReady = ["ready", "ready_partial"].includes(doc.status);
                const isPartial = doc.status === "ready_partial";
                const isFailed = doc.status.includes("fail");
                const readyToTeach = isReady && doc.subject_id && doc.focus_concept_id;

                return (
                  <tr key={doc.document_id} className="material-table-row">
                    <td>
                      <div className="doc-cell-group">
                        <span className={`file-type-icon-box is-${category} sm`}>
                          {category === "pdf" && <FileText size={16} />}
                          {category === "doc" && <BookOpen size={16} />}
                          {category === "image" && <ScanText size={16} />}
                          {category === "audio" && <Music size={16} />}
                          {category === "video" && <Video size={16} />}
                          {category === "other" && <File size={16} />}
                        </span>
                        <div>
                          <strong className="table-filename">{doc.filename}</strong>
                          <small className="table-subinfo">{doc.content_type}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="table-domain-group">
                        <span>{doc.subject_name || "Unassigned"}</span>
                        {doc.focus_concept_name && (
                          <small className="table-concept">{doc.focus_concept_name}</small>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="table-size-group">
                        <span>{bytes(doc.size_bytes)}</span>
                        {doc.page_count ? (
                          <small>{doc.available_pages || 0} / {doc.page_count} pgs</small>
                        ) : null}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`material-status-pill sm ${
                          isFailed ? "is-failed" : isPartial ? "is-partial" : isReady ? "is-ready" : "is-processing"
                        }`}
                      >
                        {isReady && !isPartial && <CheckCircle2 size={12} />}
                        {isPartial && <AlertTriangle size={12} />}
                        {isFailed && <AlertCircle size={12} />}
                        <span>
                          {isFailed
                            ? "Needs setup"
                            : isPartial
                              ? "Partly ready"
                              : isReady
                                ? "Ready"
                                : doc.status.replaceAll("_", " ")}
                        </span>
                      </span>
                    </td>

                    <td className="table-actions-cell">
                      <div className="table-actions-group">
                        {readyToTeach ? (
                          <button
                            type="button"
                            className="primary-button sm learn-btn"
                            onClick={() => onLearn(launchFor(doc))}
                          >
                            <span>Learn</span>
                            <ArrowRight size={13} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="quiet-button sm"
                            disabled={
                              !["ready", "ready_partial", "failed_retryable"].includes(doc.status) ||
                              routingId === doc.document_id
                            }
                            onClick={() => void detectAndTeach(doc)}
                          >
                            {routingId === doc.document_id ? (
                              <LoaderCircle className="spin-icon" size={13} />
                            ) : (
                              <RefreshCw size={13} />
                            )}
                            <span>{doc.status.includes("fail") ? "Retry" : "Route"}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="icon-button sm"
                          onClick={() => void openPreview(doc)}
                          aria-label={`Preview ${doc.filename}`}
                        >
                          <Eye size={14} />
                        </button>

                        <button
                          type="button"
                          className="icon-button sm"
                          onClick={() => void remove(doc.document_id)}
                          aria-label={`Delete ${doc.filename}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty States */}
      {documents.length === 0 && (
        <section className="materials-empty-state" aria-label="No materials in library">
          <div className="empty-icon-circle">
            <BookOpenCheck size={38} />
          </div>
          <h2>Your Study Library is Empty</h2>
          <p>
            Upload textbooks, lecture notes, diagrams, or recorded lectures.
            OVAEL-X indexes your content page-by-page so the AI tutor can cite exact sources and generate targeted practice.
          </p>
          <button
            type="button"
            className="primary-button"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={16} />
            Add Your First Material
          </button>
        </section>
      )}

      {documents.length > 0 && filteredDocuments.length === 0 && (
        <section className="materials-empty-state" aria-label="No matching materials">
          <div className="empty-icon-circle">
            <Filter size={32} />
          </div>
          <h2>No matching materials found</h2>
          <p>
            No materials matched your search for "<strong>{query}</strong>" with the selected filters.
          </p>
          <button
            type="button"
            className="quiet-button"
            onClick={() => {
              setQuery("");
              setTypeFilter("all");
              setStatusFilter("all");
              setSelectedCourseFilter("all");
            }}
          >
            Reset Filters
          </button>
        </section>
      )}

      {/* Document Inspection & Preview Modal */}
      {inspectDoc && (
        <div className="document-modal-backdrop" role="dialog" aria-modal="true">
          <div className="document-preview-modal">
            <div className="modal-header">
              <div className="modal-title-group">
                <span className="eyebrow blue">Material Inspection</span>
                <h3>{inspectDoc.filename}</h3>
                <span className="modal-meta">
                  {bytes(inspectDoc.size_bytes)} · {inspectDoc.content_type} · {inspectDoc.status}
                </span>
              </div>
              <button
                type="button"
                className="icon-button close-modal-btn"
                onClick={() => setInspectDoc(null)}
                aria-label="Close document inspection"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Properties Grid */}
              <div className="modal-props-grid">
                <div className="prop-box">
                  <span className="prop-label">Domain Subject</span>
                  <strong>{inspectDoc.subject_name || "Unassigned"}</strong>
                </div>
                <div className="prop-box">
                  <span className="prop-label">Focus Concept</span>
                  <strong>{inspectDoc.focus_concept_name || "General Notes"}</strong>
                </div>
                <div className="prop-box">
                  <span className="prop-label">Pages Indexed</span>
                  <strong>
                    {inspectDoc.page_count
                      ? `${inspectDoc.available_pages || 0} of ${inspectDoc.page_count} pages`
                      : "Single document"}
                  </strong>
                </div>
                <div className="prop-box">
                  <span className="prop-label">Creation Timestamp</span>
                  <strong>{new Date(inspectDoc.created_at).toLocaleDateString()}</strong>
                </div>
              </div>

              {/* Text Extract Preview */}
              <div className="modal-preview-box">
                <div className="preview-box-header">
                  <ScanText size={16} />
                  <strong>Page 1 Extracted Content Preview</strong>
                </div>

                <div className="preview-text-content">
                  {inspectLoading ? (
                    <div className="preview-loading">
                      <LoaderCircle size={20} className="spin-icon" />
                      <span>Reading indexed page data…</span>
                    </div>
                  ) : (
                    <pre className="extracted-text-view">{inspectPageText}</pre>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="quiet-button"
                onClick={() => setInspectDoc(null)}
              >
                Close
              </button>

              {["ready", "ready_partial"].includes(inspectDoc.status) &&
                inspectDoc.subject_id && (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => {
                      const doc = inspectDoc;
                      setInspectDoc(null);
                      onLearn(launchFor(doc));
                    }}
                  >
                    <span>Start Practice Session</span>
                    <ArrowRight size={14} />
                  </button>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
