import { LoaderCircle, X } from "lucide-react";

export interface DeleteCourseModalProps {
  isOpen: boolean;
  courseName: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function DeleteCourseModal({
  isOpen,
  courseName,
  busy,
  onClose,
  onConfirm,
}: DeleteCourseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
      <div className="teacher-modal danger-dialog">
        <div className="modal-header">
          <h3>Delete Course Confirmation</h3>
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
            Are you sure you want to delete <strong>{courseName}</strong>?
            This action cannot be undone. All course-specific syllabus links
            and cohort enrollment records will be permanently removed.
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
            Confirm Delete
          </button>
        </div>
      </div>
    </div>
  );
}
