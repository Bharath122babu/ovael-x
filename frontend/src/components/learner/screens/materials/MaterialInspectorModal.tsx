import { useEffect } from "react";
import { ArrowRight, LoaderCircle, ScanText, X } from "lucide-react";
import type { DocumentRecord, LearningLaunch } from "../../../../types";
import { bytes, launchFor } from "./materialsHelpers";

interface MaterialInspectorModalProps {
  inspectDoc: DocumentRecord | null;
  inspectPageText: string;
  inspectLoading: boolean;
  onClose: () => void;
  onLearn: (launch: LearningLaunch) => void;
}

export function MaterialInspectorModal({
  inspectDoc,
  inspectPageText,
  inspectLoading,
  onClose,
  onLearn,
}: MaterialInspectorModalProps) {
  useEffect(() => {
    if (!inspectDoc) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inspectDoc, onClose]);

  if (!inspectDoc) return null;

  return (
    <div
      className="document-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="document-preview-modal">
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="eyebrow cobalt">Material Inspection</span>
            <h3>{inspectDoc.filename}</h3>
            <span className="modal-meta">
              {bytes(inspectDoc.size_bytes)} · {inspectDoc.content_type} · {inspectDoc.status}
            </span>
          </div>
          <button
            type="button"
            className="close-inspector-btn close-modal-btn"
            onClick={onClose}
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
            className="btn btn-secondary"
            onClick={onClose}
          >
            <span>Close</span>
          </button>

          {["ready", "ready_partial"].includes(inspectDoc.status) &&
            inspectDoc.subject_id && (
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => {
                  const doc = inspectDoc;
                  onClose();
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
  );
}
