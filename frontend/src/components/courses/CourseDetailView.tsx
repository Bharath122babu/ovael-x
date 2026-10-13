import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ArrowRight,
  PenLine,
  Trash2,
  UploadCloud,
  FileText,
  Calendar,
  Layers3,
  ShieldCheck,
  School,
  User,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { Button, IconButton, Badge, Card } from '../ui';
import { TopicManager } from './TopicManager';
import { Course, Concept } from './types';
import { CourseMaterialLibrary, DocumentItem } from '../materials';

export interface CourseDetailViewProps {
  course: Course;
  concepts: Concept[];
  documents?: DocumentItem[];
  onBack: () => void;
  onEditCourse?: (course: Course) => void;
  onDeleteCourse?: (course: Course) => void;
  onAddConcept: (name: string) => Promise<void>;
  onSelectTopic?: (conceptId: string) => void;
  onStartLearningTopic?: (conceptId: string) => void;
  onStartLearningCourse: (course: Course) => void;
  onUploadMaterial: (file: File) => Promise<void>;
  onRetryDocument?: (documentId: string) => Promise<void>;
  onDeleteDocument?: (documentId: string) => Promise<void>;
  onRefreshDocuments?: () => void;
  busy?: boolean;
  isOwner: boolean;
}

export const CourseDetailView: React.FC<CourseDetailViewProps> = ({
  course,
  concepts,
  documents = [],
  onBack,
  onEditCourse,
  onDeleteCourse,
  onAddConcept,
  onSelectTopic,
  onStartLearningTopic,
  onStartLearningCourse,
  onUploadMaterial,
  onRetryDocument,
  onDeleteDocument,
  onRefreshDocuments,
  busy = false,
  isOwner,
}) => {
  const [activeTab, setActiveTab] = useState<'topics' | 'materials'>('topics');
  const isClass = course.course_kind === 'class';
  const dateStr = course.updated_at || course.created_at;
  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <div className="course-detail-view">
      {/* 1. Breadcrumb navigation */}
      <nav className="course-detail-view__nav" aria-label="Breadcrumb">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onBack}
          leftIcon={<ArrowLeft size={15} />}
        >
          Back to all courses
        </Button>
        <span className="course-detail-view__breadcrumb-sep">/</span>
        <span className="course-detail-view__breadcrumb-current">
          {course.name}
        </span>
      </nav>

      {/* 2. Course Header Hero Card */}
      <section
        className="course-detail-hero"
        aria-labelledby="course-detail-hero-title"
      >
        <div className="course-detail-hero__main">
          <div className="course-detail-hero__top">
            <div className="course-detail-hero__badges">
              <Badge variant={isClass ? 'info' : 'neutral'} size="sm">
                {isClass ? 'Classroom Course' : 'Personal Workspace'}
              </Badge>
              {isOwner ? (
                <Badge variant="primary" size="sm">
                  Owner
                </Badge>
              ) : (
                <Badge variant="neutral" size="sm">
                  Enrolled Learner
                </Badge>
              )}
            </div>

            {isOwner && (
              <div className="course-detail-hero__owner-actions">
                {onEditCourse && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onEditCourse(course)}
                    leftIcon={<PenLine size={14} />}
                  >
                    Edit Details
                  </Button>
                )}
                {onDeleteCourse && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => onDeleteCourse(course)}
                    leftIcon={<Trash2 size={14} />}
                  >
                    Delete Course
                  </Button>
                )}
              </div>
            )}
          </div>

          <h2 id="course-detail-hero-title" className="course-detail-hero__title">
            {course.name}
          </h2>

          <p className="course-detail-hero__desc">
            {course.description ||
              'Personal knowledge workspace with adaptive tutoring and assessment.'}
          </p>

          <div className="course-detail-hero__meta">
            {course.subject_id && (
              <div className="course-detail-hero__meta-item">
                <span className="meta-label">Subject ID</span>
                <code>{course.subject_id}</code>
              </div>
            )}
            {formattedDate && (
              <div className="course-detail-hero__meta-item">
                <span className="meta-label">Updated</span>
                <span>{formattedDate}</span>
              </div>
            )}
            <div className="course-detail-hero__meta-item">
              <span className="meta-label">Curriculum</span>
              <span>
                {concepts.length} {concepts.length === 1 ? 'topic' : 'topics'}
              </span>
            </div>
            <div className="course-detail-hero__meta-item">
              <span className="meta-label">Materials</span>
              <span>
                {documents.length} {documents.length === 1 ? 'document' : 'documents'}
              </span>
            </div>
          </div>
        </div>

        <div className="course-detail-hero__cta">
          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={() => onStartLearningCourse(course)}
            rightIcon={<ArrowRight size={18} />}
          >
            Study Course
          </Button>
        </div>
      </section>

      {/* 3. Section Switcher Tabs */}
      <div
        className="course-detail-tabs"
        role="tablist"
        aria-label="Course management views"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'topics'}
          className={`course-detail-tab ${
            activeTab === 'topics' ? 'active' : ''
          }`}
          onClick={() => setActiveTab('topics')}
        >
          <BookOpen size={16} aria-hidden="true" />
          <span>Curriculum &amp; Topics</span>
          <Badge
            variant={activeTab === 'topics' ? 'primary' : 'neutral'}
            size="sm"
          >
            {concepts.length}
          </Badge>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'materials'}
          className={`course-detail-tab ${
            activeTab === 'materials' ? 'active' : ''
          }`}
          onClick={() => setActiveTab('materials')}
        >
          <UploadCloud size={16} aria-hidden="true" />
          <span>Reference Materials</span>
          <Badge
            variant={activeTab === 'materials' ? 'primary' : 'neutral'}
            size="sm"
          >
            {documents.length}
          </Badge>
        </button>
      </div>

      {/* 4. Tab Content */}
      {activeTab === 'topics' ? (
        <div className="course-detail-view__grid">
          <main className="course-detail-view__main">
            <TopicManager
              course={course}
              concepts={concepts}
              onAddConcept={onAddConcept}
              onSelectTopic={onSelectTopic}
              onStartLearningTopic={onStartLearningTopic}
              busy={busy}
              isOwner={isOwner}
            />
          </main>

          <aside className="course-detail-view__aside">
            {/* Quick Reference Material Upload Card */}
            <section
              className="course-material-card"
              aria-labelledby="course-material-heading"
            >
              <div className="course-material-card__head">
                <span className="course-material-card__icon" aria-hidden="true">
                  <UploadCloud size={20} />
                </span>
                <div>
                  <h3
                    id="course-material-heading"
                    className="course-material-card__title"
                  >
                    Reference Materials
                  </h3>
                  <p className="course-material-card__desc">
                    {documents.length}{' '}
                    {documents.length === 1 ? 'document' : 'documents'} attached
                    to ground tutoring.
                  </p>
                </div>
              </div>

              <div className="course-material-card__body">
                <label className="course-material-upload-btn">
                  <span>
                    {busy ? 'Uploading material...' : 'Choose file to upload'}
                  </span>
                  <input
                    type="file"
                    hidden
                    disabled={busy}
                    accept=".pdf,.txt,.docx,.pptx,.png,.jpg,.jpeg,.md,.epub,.webp,.mp3,.mp4,.wav"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) onUploadMaterial(f);
                      e.currentTarget.value = '';
                    }}
                  />
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setActiveTab('materials')}
                  leftIcon={<FileText size={14} />}
                >
                  Manage &amp; Inspect All Documents
                </Button>
              </div>
            </section>

            {/* Course Metadata Card */}
            <section
              className="course-info-card"
              aria-labelledby="course-info-heading"
            >
              <h3 id="course-info-heading" className="course-info-card__title">
                Workspace Overview
              </h3>
              <dl className="course-info-list">
                <div>
                  <dt>Course ID</dt>
                  <dd>
                    <code>{course.course_id}</code>
                  </dd>
                </div>
                <div>
                  <dt>Namespace</dt>
                  <dd>
                    <code>{course.subject_id || 'System Default'}</code>
                  </dd>
                </div>
                <div>
                  <dt>Access Role</dt>
                  <dd>{isOwner ? 'Workspace Owner' : 'Enrolled Student'}</dd>
                </div>
                <div>
                  <dt>Governance</dt>
                  <dd>
                    {isClass
                      ? 'Classroom source policy'
                      : 'Personal adaptive model'}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      ) : (
        <div className="course-detail-view__materials-full">
          <CourseMaterialLibrary
            courseId={course.course_id}
            courseName={course.name}
            documents={documents}
            onUploadDocument={onUploadMaterial}
            onRetryDocument={onRetryDocument}
            onDeleteDocument={onDeleteDocument}
            onRefresh={onRefreshDocuments}
            busy={busy}
            isOwner={isOwner}
          />
        </div>
      )}
    </div>
  );
};
