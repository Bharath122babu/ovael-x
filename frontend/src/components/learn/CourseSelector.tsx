import React, { useState } from 'react';
import { Layers3, Check, Search, Plus, ArrowRight } from 'lucide-react';
import { Badge, EmptyState, Button, Input } from '../ui';

export interface Course {
  course_id: string;
  name: string;
  subject_id?: string;
  subject_name?: string;
  description?: string;
  course_kind?: string;
  created_at?: string;
  concept_count?: number;
}

export interface CourseSelectorProps {
  courses: Course[];
  selectedCourseId: string;
  onSelectCourse: (courseId: string) => void;
  onNavigateToCourses: () => void;
  activeConceptCount?: number;
}

export const CourseSelector: React.FC<CourseSelectorProps> = ({
  courses,
  selectedCourseId,
  onSelectCourse,
  onNavigateToCourses,
  activeConceptCount,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      (c.subject_name && c.subject_name.toLowerCase().includes(q))
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (filteredCourses.length === 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % filteredCourses.length;
      onSelectCourse(filteredCourses[nextIndex].course_id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + filteredCourses.length) % filteredCourses.length;
      onSelectCourse(filteredCourses[prevIndex].course_id);
    }
  };

  return (
    <div className="course-selector">
      <div className="course-selector__head">
        <div>
          <h3 className="course-selector__title">
            <span>1. Choose a Course</span>
            <Badge variant="primary" size="sm">
              {courses.length} {courses.length === 1 ? 'course' : 'courses'}
            </Badge>
          </h3>
          <p className="course-selector__desc">
            Select the structured knowledge workspace you want to learn in today.
          </p>
        </div>

        {courses.length > 3 && (
          <div className="course-selector__search">
            <Input
              inputSize="sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses..."
              leftElement={<Search size={14} />}
            />
          </div>
        )}
      </div>

      {courses.length === 0 ? (
        <EmptyState
          title="No courses created yet"
          description="Create your first learning workspace or course to define learning topics."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={onNavigateToCourses}
              leftIcon={<Plus size={16} />}
            >
              Create a course
            </Button>
          }
        />
      ) : filteredCourses.length === 0 ? (
        <EmptyState
          title="No matching courses"
          description={`No course matching "${searchQuery}".`}
          action={
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
              Clear search
            </Button>
          }
        />
      ) : (
        <div
          className="course-selector__grid"
          role="radiogroup"
          aria-label="Available courses"
        >
          {filteredCourses.map((c, idx) => {
            const isSelected = c.course_id === selectedCourseId;
            const topicCount =
              c.concept_count !== undefined
                ? c.concept_count
                : isSelected && activeConceptCount !== undefined
                ? activeConceptCount
                : undefined;

            return (
              <button
                type="button"
                key={c.course_id}
                role="radio"
                aria-checked={isSelected}
                tabIndex={isSelected || (!selectedCourseId && idx === 0) ? 0 : -1}
                className={`course-card ${isSelected ? 'course-card--selected' : ''}`}
                onClick={() => onSelectCourse(c.course_id)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
              >
                <div className="course-card__badge-row">
                  <div className="course-card__letter" aria-hidden="true">
                    {c.name[0]?.toUpperCase() || 'C'}
                  </div>
                  <div className="course-card__tags">
                    {c.course_kind && (
                      <Badge variant={c.course_kind === 'class' ? 'info' : 'neutral'} size="sm">
                        {c.course_kind}
                      </Badge>
                    )}
                    {isSelected && (
                      <span className="course-card__check" aria-hidden="true">
                        <Check size={14} /> Selected
                      </span>
                    )}
                  </div>
                </div>

                <div className="course-card__body">
                  <h4 className="course-card__name">{c.name}</h4>
                  <p className="course-card__desc">
                    {c.description || 'Personal structured learning workspace'}
                  </p>
                </div>

                <div className="course-card__footer">
                  <span className="course-card__meta">
                    {c.subject_name || c.subject_id || 'Adaptive Subject'}
                    {topicCount !== undefined && ` • ${topicCount} ${topicCount === 1 ? 'topic' : 'topics'}`}
                  </span>
                  <span className="course-card__action">
                    {isSelected ? 'Active choice' : 'Select course →'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
