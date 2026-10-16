import { LoaderCircle, X } from "lucide-react";
import type { UnenrollTarget } from "../types";

export interface UnenrollModalProps {
  target: UnenrollTarget | null;
  courseName: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function UnenrollModal({
  target,
  courseName,
  busy,
  onClose,
  onConfirm,
}: UnenrollModalProps) {
  if (!target) return null;

  return (
    <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
      <div className="teacher-modal danger-dialog">
        <div className="modal-header">
          <h3>Remove Student from Cohort</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p>
            Remove <strong>{target.username}</strong> from <strong>{courseName}</strong>?
          </p>
          <p className="muted-dialog-note">
            The student will no longer see this class course in their course
            list or receive teacher-managed learning updates.
          </p>
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
          <button
            type="button"
            className="danger-button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <LoaderCircle className="spin" size={16} />}
            Remove Student
          </button>
        </div>
      </div>
    </div>
  );
}
