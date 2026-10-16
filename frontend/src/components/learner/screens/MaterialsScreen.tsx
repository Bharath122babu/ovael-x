import { useState, useMemo } from "react";
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  FileText,
  Filter,
  LoaderCircle,
  Upload,
} from "lucide-react";
import { ovaelApi } from "../../../api/client";
import { useOvael } from "../../../context/OvaelContext";
import type { DocumentRecord, LearningLaunch } from "../../../types";

import { getFileCategory, launchFor } from "./materials/materialsHelpers";
import { MaterialUploadZone } from "./materials/MaterialUploadZone";
import { MaterialFilterBar } from "./materials/MaterialFilterBar";
import { MaterialCard } from "./materials/MaterialCard";
import { MaterialTableView } from "./materials/MaterialTableView";
import { MaterialInspectorModal } from "./materials/MaterialInspectorModal";

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
      <MaterialUploadZone
        uploading={uploading}
        isDragOver={isDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        subjectId={subjectId}
        onSubjectIdChange={setSubjectId}
        courseId={courseId}
        onCourseIdChange={setCourseId}
        subjects={subjects}
        courses={courses}
        onUploadFile={upload}
        ocrResult={ocrResult}
        onDismissOcrResult={() => setOcrResult(null)}
        onLearn={onLearn}
      />

      {/* Materials Toolbar: Search, Filters & View Mode */}
      <MaterialFilterBar
        query={query}
        onQueryChange={setQuery}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        readyCount={readyCount}
        reviewCount={reviewCount}
        courses={courses}
        selectedCourseFilter={selectedCourseFilter}
        onCourseFilterChange={setSelectedCourseFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Materials Cards / Table Display */}
      {viewMode === "grid" ? (
        <div className="materials-grid-layout" aria-live="polite">
          {filteredDocuments.map((doc) => (
            <MaterialCard
              key={doc.document_id}
              doc={doc}
              routingId={routingId}
              onLearn={onLearn}
              onDetectAndTeach={detectAndTeach}
              onOpenPreview={openPreview}
              onRemove={remove}
            />
          ))}
        </div>
      ) : (
        <MaterialTableView
          documents={filteredDocuments}
          routingId={routingId}
          onLearn={onLearn}
          onDetectAndTeach={detectAndTeach}
          onOpenPreview={openPreview}
          onRemove={remove}
        />
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
            onClick={() => {
              const fileInput = document.querySelector<HTMLInputElement>(
                ".materials-upload-card input[type='file']"
              );
              fileInput?.click();
            }}
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
      <MaterialInspectorModal
        inspectDoc={inspectDoc}
        inspectPageText={inspectPageText}
        inspectLoading={inspectLoading}
        onClose={() => setInspectDoc(null)}
        onLearn={onLearn}
      />
    </div>
  );
}
