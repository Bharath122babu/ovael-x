import React, { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button, IconButton, Alert } from '../ui';
import { Course } from './types';

export interface DeleteCourseModalProps {
  isOpen: boolean;
  course: Course | null;
  onClose: () => void;
  onDeleteCourse: (courseId: string) => Promise<void>;
}

export const DeleteCourseModal: React.FC<DeleteCourseModalProps> = ({
  isOpen,
  course,
  onClose,
  onDeleteCourse,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, busy, onClose]);

  if (!isOpen || !course) return null;

  const handleDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await onDeleteCourse(course.course_id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete course.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="course-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-course-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="course-modal course-modal--danger" role="document">
        <div className="course-modal__header">
          <div className="course-modal__title-wrap">
            <span
              className="course-modal__icon course-modal__icon--danger"
              aria-hidden="true"
            >
              <AlertTriangle size={18} />
            </span>
            <div>
              <h2 id="delete-course-title" className="course-modal__title">
                Delete Course
              </h2>
              <span className="course-modal__subtitle">
                Permanent deletion of course workspace.
              </span>
            </div>
          </div>
          <IconButton
            label="Close delete dialog"
            icon={<X size={18} />}
            onClick={onClose}
            disabled={busy}
          />
        </div>

        {error && (
          <div className="course-modal__alert">
            <Alert variant="error" onDismiss={() => setError('')}>
              {error}
            </Alert>
          </div>
        )}

        <div className="course-modal__danger-body">
          <p>
            Are you sure you want to delete <strong>{course.name}</strong>?
          </p>
          <div className="course-modal__warning-box">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              This operation cannot be undone. All topic associations will be detached. If this course has uploaded reference documents, the server requires deleting those documents first.
            </span>
          </div>
        </div>

        <div className="course-modal__footer">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={busy}
            disabled={busy}
            onClick={handleDelete}
            leftIcon={<Trash2 size={16} />}
          >
            Delete Course
          </Button>
        </div>
      </div>
    </div>
  );
};
