import React, { useEffect, useState } from 'react';
import { Plus, X, BookOpen, School, User } from 'lucide-react';
import { Button, IconButton, Input, Textarea, Field, Alert } from '../ui';
import { Course } from './types';

export interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCourse: (data: {
    name: string;
    description?: string;
    course_kind: 'personal' | 'class';
  }) => Promise<void>;
  userRole?: string;
}

export const CreateCourseModal: React.FC<CreateCourseModalProps> = ({
  isOpen,
  onClose,
  onCreateCourse,
  userRole = 'learner',
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [courseKind, setCourseKind] = useState<'personal' | 'class'>('personal');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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

  if (!isOpen) return null;

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
      await onCreateCourse({
        name: trimmedName,
        description: description.trim() || undefined,
        course_kind: courseKind,
      });
      setName('');
      setDescription('');
      setCourseKind('personal');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create course. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="course-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-course-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="course-modal" role="document">
        <div className="course-modal__header">
          <div className="course-modal__title-wrap">
            <span className="course-modal__icon" aria-hidden="true">
              <Plus size={18} />
            </span>
            <div>
              <h2 id="create-course-title" className="course-modal__title">
                Create a New Course
              </h2>
              <span className="course-modal__subtitle">
                Establish an isolated subject namespace for structured knowledge and adaptive tutoring.
              </span>
            </div>
          </div>
          <IconButton
            label="Close dialog"
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
            id="course-name-input"
            label="Course title"
            required
            description="A clear, academic title for this learning space (1–200 characters)."
          >
            <Input
              id="course-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Cellular Biochemistry, Real Analysis, Microeconomics"
              disabled={busy}
              maxLength={200}
              required
              autoFocus
            />
          </Field>

          <Field
            id="course-desc-input"
            label="Course description"
            description="Optional summary of scope, learning objectives, or syllabus."
          >
            <Textarea
              id="course-desc-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Comprehensive study of metabolic pathways, enzyme kinetics, and bioenergetics..."
              disabled={busy}
              rows={3}
              maxLength={4000}
            />
          </Field>

          {userRole === 'teacher' && (
            <div className="course-modal__kind-section">
              <label className="course-modal__kind-label">
                Course Scope &amp; Authority
              </label>
              <div
                className="course-modal__kind-choices"
                role="radiogroup"
                aria-label="Course kind"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={courseKind === 'personal'}
                  className={`course-modal__kind-choice ${
                    courseKind === 'personal' ? 'selected' : ''
                  }`}
                  onClick={() => setCourseKind('personal')}
                  disabled={busy}
                >
                  <User size={18} aria-hidden="true" />
                  <div>
                    <strong>Personal Workspace</strong>
                    <span>Private self-study space with personalized learning model.</span>
                  </div>
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={courseKind === 'class'}
                  className={`course-modal__kind-choice ${
                    courseKind === 'class' ? 'selected' : ''
                  }`}
                  onClick={() => setCourseKind('class')}
                  disabled={busy}
                >
                  <School size={18} aria-hidden="true" />
                  <div>
                    <strong>Classroom Course</strong>
                    <span>Teacher-managed course with source governance and learner enrollment.</span>
                  </div>
                </button>
              </div>
            </div>
          )}

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
              disabled={busy || !name.trim()}
              leftIcon={<Plus size={16} />}
            >
              Create Course
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
