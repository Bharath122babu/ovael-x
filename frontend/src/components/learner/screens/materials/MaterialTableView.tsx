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

interface MaterialTableViewProps {
  documents: DocumentRecord[];
  routingId: string;
  onLearn: (launch: LearningLaunch) => void;
  onDetectAndTeach: (doc: DocumentRecord) => Promise<void>;
  onOpenPreview: (doc: DocumentRecord) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

export function MaterialTableView({
  documents,
  routingId,
  onLearn,
  onDetectAndTeach,
  onOpenPreview,
  onRemove,
}: MaterialTableViewProps) {
  return (
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
          {documents.map((doc) => {
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
                        className="continue-learning-btn sm learn-btn"
                        onClick={() => onLearn(launchFor(doc))}
                      >
                        <span>Learn</span>
                        <ArrowRight size={13} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-secondary sm"
                        disabled={
                          !["ready", "ready_partial", "failed_retryable"].includes(doc.status) ||
                          routingId === doc.document_id
                        }
                        onClick={() => void onDetectAndTeach(doc)}
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
                      onClick={() => void onOpenPreview(doc)}
                      aria-label={`Preview ${doc.filename}`}
                    >
                      <Eye size={14} />
                    </button>

                    <button
                      type="button"
                      className="icon-button sm"
                      onClick={() => void onRemove(doc.document_id)}
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
  );
}
