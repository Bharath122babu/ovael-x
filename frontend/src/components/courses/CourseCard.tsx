import React from 'react';
import {
  BookOpen,
  ArrowRight,
  PenLine,
  Trash2,
  Layers3,
  Calendar,
  School,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Badge, Button, IconButton } from '../ui';
import { Course } from './types';

export interface CourseCardProps {
  course: Course;
  onOpenDetails: (course: Course) => void;
  onStartLearning: (course: Course) => void;
  onEditCourse?: (course: Course) => void;
  onDeleteCourse?: (course: Course) => void;
  isOwner: boolean;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  onOpenDetails,
  onStartLearning,
  onEditCourse,
  onDeleteCourse,
  isOwner,
}) => {
  const initial = (course.name[0] || 'C').toUpperCase();
  const isClass = course.course_kind === 'class';

  // Format date if available
  const dateStr = course.updated_at || course.created_at;
  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <article className="course-card-premium" aria-labelledby={`course-card-${course.course_id}`}>
      <div className="course-card-premium__header">
        <div className="course-card-premium__avatar" aria-hidden="true">
          {initial}
        </div>
        <div className="course-card-premium__badges">
          <Badge variant={isClass ? 'info' : 'neutral'} size="sm">
            {isClass ? 'Classroom' : 'Personal'}
          </Badge>
          {isOwner ? (
            <Badge variant="primary" size="sm">
              Owner
            </Badge>
          ) : (
            <Badge variant="neutral" size="sm">
              Enrolled
            </Badge>
          )}
        </div>

        {isOwner && (
          <div className="course-card-premium__quick-actions">
            {onEditCourse && (
              <IconButton
                size="sm"
                label={`Edit ${course.name}`}
                icon={<PenLine size={14} />}
                onClick={() => onEditCourse(course)}
              />
            )}
            {onDeleteCourse && (
              <IconButton
                size="sm"
                label={`Delete ${course.name}`}
                icon={<Trash2 size={14} />}
                onClick={() => onDeleteCourse(course)}
              />
            )}
          </div>
        )}
      </div>

      <div className="course-card-premium__body">
        <h3
          id={`course-card-${course.course_id}`}
          className="course-card-premium__title"
        >
          <button
            type="button"
            className="course-card-premium__title-btn"
            onClick={() => onOpenDetails(course)}
          >
            {course.name}
          </button>
        </h3>

        {course.description ? (
          <p className="course-card-premium__desc">{course.description}</p>
        ) : (
          <p className="course-card-premium__desc course-card-premium__desc--placeholder">
            Personal knowledge workspace with adaptive tutoring and assessment.
          </p>
        )}

        <div className="course-card-premium__meta">
          {course.subject_id && (
            <span className="course-card-premium__subject">
              <code>{course.subject_id}</code>
            </span>
          )}
          {formattedDate && (
            <span className="course-card-premium__date">
              <Calendar size={13} aria-hidden="true" />
              <span>{formattedDate}</span>
            </span>
          )}
        </div>
      </div>

      <div className="course-card-premium__footer">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onOpenDetails(course)}
          leftIcon={<BookOpen size={14} />}
        >
          Manage Topics
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => onStartLearning(course)}
          rightIcon={<ArrowRight size={14} />}
        >
          Start Learning
        </Button>
      </div>
    </article>
  );
};
