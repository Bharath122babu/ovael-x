import { LoaderCircle, X } from "lucide-react";

export interface EditCourseModalProps {
  isOpen: boolean;
  editName: string;
  editDescription: string;
  busy: boolean;
  onEditNameChange: (val: string) => void;
  onEditDescriptionChange: (val: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onDeleteClick: () => void;
}

export function EditCourseModal({
  isOpen,
  editName,
  editDescription,
  busy,
  onEditNameChange,
  onEditDescriptionChange,
  onClose,
  onSubmit,
  onDeleteClick,
}: EditCourseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
      <div className="teacher-modal">
        <div className="modal-header">
          <h3>Edit Course Details</h3>
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
            <div className="form-group">
              <label htmlFor="edit-modal-name">Course Name</label>
              <input
                id="edit-modal-name"
                value={editName}
                onChange={(e) => onEditNameChange(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="edit-modal-desc">Description</label>
              <textarea
                id="edit-modal-desc"
                value={editDescription}
                onChange={(e) => onEditDescriptionChange(e.target.value)}
                rows={3}
                placeholder="Provide overview information for students..."
              />
            </div>

            <div className="danger-zone-strip">
              <div>
                <strong>Danger Zone</strong>
                <p>Permanently remove this course and its enrolled cohort associations.</p>
              </div>
              <button
                type="button"
                className="danger-button compact"
                onClick={onDeleteClick}
              >
                Delete Course
              </button>
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
            <button
              type="submit"
              className="primary-button"
              disabled={busy || !editName.trim()}
            >
              {busy && <LoaderCircle className="spin" size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
