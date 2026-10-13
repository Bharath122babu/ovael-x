import React, { useEffect, useState } from 'react';
import { PenLine, X, Check, Save } from 'lucide-react';
import { Button, IconButton, Input, Textarea, Field, Alert } from '../ui';
import { Course } from './types';

export interface EditCourseModalProps {
  isOpen: boolean;
  course: Course | null;
  onClose: () => void;
  onUpdateCourse: (
    courseId: string,
    data: { name: string; description?: string }
  ) => Promise<void>;
}

export const EditCourseModal: React.FC<EditCourseModalProps> = ({
  isOpen,
  course,
  onClose,
  onUpdateCourse,
}) => {
  const [name, setName] = useState(course?.name || '');
  const [description, setDescription] = useState(course?.description || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (course) {
      setName(course.name || '');
      setDescription(course.description || '');
      setError('');
    }
  }, [course]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Course name is required.');
      return;
    }
    if (trimmedName.length > 200) {
      setError('Course name must be 200 characters or fewer.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onUpdateCourse(course.course_id, {
        name: trimmedName,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update course details.');
    } finally {
      setBusy(false);
    }
  };

  const hasChanges =
    name.trim() !== (course.name || '') ||
    (description.trim() || undefined) !== (course.description || undefined);

  return (
    <div
      className="course-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-course-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="course-modal" role="document">
        <div className="course-modal__header">
          <div className="course-modal__title-wrap">
            <span className="course-modal__icon" aria-hidden="true">
              <PenLine size={18} />
            </span>
            <div>
              <h2 id="edit-course-title" className="course-modal__title">
                Edit Course Details
              </h2>
              <span className="course-modal__subtitle">
                Update title and description for {course.name}.
              </span>
            </div>
          </div>
          <IconButton
            label="Close edit dialog"
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

        <form onSubmit={handleSubmit} className="course-modal__form">
          <Field
            id="edit-course-name-input"
            label="Course title"
            required
            description="Academic title for this course (1–200 characters)."
          >
            <Input
              id="edit-course-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              maxLength={200}
              required
              autoFocus
            />
          </Field>

          <Field
            id="edit-course-desc-input"
            label="Course description"
            description="Optional summary of scope, syllabus, or learning targets."
          >
            <Textarea
              id="edit-course-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
              rows={3}
              maxLength={4000}
            />
          </Field>

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
              type="submit"
              variant="primary"
              loading={busy}
              disabled={busy || !name.trim() || !hasChanges}
              leftIcon={<Save size={16} />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
