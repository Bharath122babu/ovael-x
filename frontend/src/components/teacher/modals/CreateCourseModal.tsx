import { LoaderCircle, X } from "lucide-react";

export interface CreateCourseModalProps {
  isOpen: boolean;
  courseName: string;
  subjectName: string;
  busy: boolean;
  onCourseNameChange: (val: string) => void;
  onSubjectNameChange: (val: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function CreateCourseModal({
  isOpen,
  courseName,
  subjectName,
  busy,
  onCourseNameChange,
  onSubjectNameChange,
  onClose,
  onSubmit,
}: CreateCourseModalProps) {
  if (!isOpen) return null;

  return (
    <div className="teacher-modal-backdrop" role="dialog" aria-modal="true">
      <div className="teacher-modal">
        <div className="modal-header">
          <h3>Create New Class Course</h3>
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
              <label htmlFor="create-modal-name">Course Name</label>
              <input
                id="create-modal-name"
                value={courseName}
                onChange={(e) => onCourseNameChange(e.target.value)}
                placeholder="e.g. Distributed Systems · CS-401"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="create-modal-subject">Subject Domain</label>
              <input
                id="create-modal-subject"
                value={subjectName}
                onChange={(e) => onSubjectNameChange(e.target.value)}
                placeholder="e.g. Computer Science"
                required
              />
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
              disabled={busy || !courseName.trim() || !subjectName.trim()}
            >
              {busy && <LoaderCircle className="spin" size={16} />}
              Create Course
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
