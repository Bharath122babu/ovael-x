import { GitBranch, LoaderCircle, X } from "lucide-react";

export interface ProposeGraphModalProps {
  isOpen: boolean;
  courseDocumentsCount: number;
  courseName: string;
  proposalObjective: string;
  busy: boolean;
  onObjectiveChange: (val: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function ProposeGraphModal({
  isOpen,
  courseDocumentsCount,
  courseName,
  proposalObjective,
  busy,
  onObjectiveChange,
  onClose,
  onSubmit,
}: ProposeGraphModalProps) {
  if (!isOpen) return null;

  return (
    <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
      <div className="teacher-modal">
        <div className="modal-header">
          <h3>Propose Knowledge Graph</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="modal-body">
            <p>
              OVAEL-X will analyze {courseDocumentsCount} syllabus sources to
              infer concept dependencies, learning milestones, and prerequisite
              scaffolding.
            </p>
            <div className="form-group">
              <label htmlFor="propose-objective-input">
                Pedagogical Objective (Optional)
              </label>
              <input
                id="propose-objective-input"
                value={proposalObjective}
                onChange={(e) => onObjectiveChange(e.target.value)}
                placeholder={`e.g. Build an introductory concept graph for ${courseName}`}
              />
              <span className="input-hint">
                Guides the concept clustering and prerequisite depth.
              </span>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? <LoaderCircle className="spin" size={16} /> : <GitBranch size={16} />}
              Generate Proposal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
