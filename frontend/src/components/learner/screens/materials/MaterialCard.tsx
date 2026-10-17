import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  File,
  FileText,
  LoaderCircle,
  Music,
  RefreshCw,
  ScanText,
  Trash2,
  Video,
} from "lucide-react";
import type { DocumentRecord, LearningLaunch } from "../../../../types";
import { bytes, getFileCategory, launchFor } from "./materialsHelpers";

interface MaterialCardProps {
  doc: DocumentRecord;
  routingId: string;
  onLearn: (launch: LearningLaunch) => void;
  onDetectAndTeach: (doc: DocumentRecord) => Promise<void>;
  onOpenPreview: (doc: DocumentRecord) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export function MaterialCard({
  doc,
  routingId,
  onLearn,
  onDetectAndTeach,
  onOpenPreview,
  onRemove,
}: MaterialCardProps) {
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
    <article className="material-card-tile">
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
            className="continue-learning-btn learn-btn"
            onClick={() => onLearn(launchFor(doc))}
            title="Launch interactive tutoring session"
          >
            <span>Learn</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-secondary route-btn"
            disabled={
              !["ready", "ready_partial", "failed_retryable"].includes(doc.status) ||
              routingId === doc.document_id
            }
            onClick={() => void onDetectAndTeach(doc)}
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
          onClick={() => void onOpenPreview(doc)}
          title="Inspect document & preview page"
          aria-label={`Inspect ${doc.filename}`}
        >
          <Eye size={15} />
        </button>

        <button
          type="button"
          className="icon-button delete-btn"
          onClick={() => void onRemove(doc.document_id)}
          title="Remove material from repository"
          aria-label={`Delete ${doc.filename}`}
        >
          <Trash2 size={15} />
        </button>
      </div>
    </article>
  );
}
