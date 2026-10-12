import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  SlidersHorizontal,
  Layers3,
  BookOpen,
  ArrowUpDown,
} from 'lucide-react';
import { Button, Input, Badge, EmptyState } from '../ui';
import { PageHeader } from '../layout';
import { CourseCard } from './CourseCard';
import { CourseDetailView } from './CourseDetailView';
import { CreateCourseModal } from './CreateCourseModal';
import { EditCourseModal } from './EditCourseModal';
import { DeleteCourseModal } from './DeleteCourseModal';
import { Course, Concept, CourseFilter, CourseSort } from './types';
import { DocumentItem } from '../materials';
import { api } from '../../api';

export interface CourseLibraryProps {
  courses: Course[];
  activeCourseId: string;
  onSelectCourse: (courseId: string) => void;
  concepts: Concept[];
  activeConceptId: string;
  onSelectConcept: (conceptId: string) => void;
  user: {
    user_id: string;
    username: string;
    role: string;
  };
  onCreateCourse: (data: {
    name: string;
    description?: string;
    course_kind: 'personal' | 'class';
  }) => Promise<void>;
  onUpdateCourse: (
    courseId: string,
    data: { name: string; description?: string }
  ) => Promise<void>;
  onDeleteCourse: (courseId: string) => Promise<void>;
  onAddConcept: (name: string) => Promise<void>;
  onNavigateToLearn: (courseId: string, conceptId?: string) => void;
  onUploadMaterial: (file: File) => Promise<void>;
  busy?: boolean;
}

export const CourseLibrary: React.FC<CourseLibraryProps> = ({
  courses,
  activeCourseId,
  onSelectCourse,
  concepts,
  activeConceptId,
  onSelectConcept,
  user,
  onCreateCourse,
  onUpdateCourse,
  onDeleteCourse,
  onAddConcept,
  onNavigateToLearn,
  onUploadMaterial,
  busy = false,
}) => {
  // Navigation inside course management: drilldown course
  const [detailCourseId, setDetailCourseId] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [deleteCourse, setDeleteCourse] = useState<Course | null>(null);

  // Search, filter, and sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<CourseFilter>('all');
  const [sortBy, setSortBy] = useState<CourseSort>('updated');

  // Course documents state
  const [courseDocuments, setCourseDocuments] = useState<DocumentItem[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // Find currently detailed course if any
  const currentDetailCourse = useMemo(() => {
    if (!detailCourseId) return null;
    return courses.find((c) => c.course_id === detailCourseId) || null;
  }, [detailCourseId, courses]);

  // Document management callbacks
  const loadDocuments = useCallback(async (courseId: string) => {
    try {
      setDocumentsLoading(true);
      const res = await api(`/v1/documents?course_id=${encodeURIComponent(courseId)}`);
      if (Array.isArray(res)) {
        setCourseDocuments(res);
      }
    } catch (err) {
      console.error('Failed to load documents for course:', err);
    } finally {
      setDocumentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (detailCourseId) {
      loadDocuments(detailCourseId);
    } else {
      setCourseDocuments([]);
    }
  }, [detailCourseId, loadDocuments]);

  const handleRetryDocument = useCallback(
    async (docId: string) => {
      await api(`/v1/documents/${encodeURIComponent(docId)}/route`, 'POST');
      if (detailCourseId) {
        await loadDocuments(detailCourseId);
      }
    },
    [detailCourseId, loadDocuments]
  );

  const handleDeleteDocument = useCallback(
    async (docId: string) => {
      await api(`/v1/documents/${encodeURIComponent(docId)}`, 'DELETE');
      if (detailCourseId) {
        await loadDocuments(detailCourseId);
      }
    },
    [detailCourseId, loadDocuments]
  );

  const handleUploadWithRefresh = useCallback(
    async (file: File) => {
      await onUploadMaterial(file);
      if (detailCourseId) {
        await loadDocuments(detailCourseId);
      }
    },
    [onUploadMaterial, detailCourseId, loadDocuments]
  );

  // Counts for filters
  const personalCount = useMemo(
    () => courses.filter((c) => c.course_kind !== 'class').length,
    [courses]
  );
  const classCount = useMemo(
    () => courses.filter((c) => c.course_kind === 'class').length,
    [courses]
  );

  // Filtered and sorted courses
  const displayedCourses = useMemo(() => {
    return courses
      .filter((c) => {
        // 1. Kind filter
        if (filterKind === 'personal' && c.course_kind === 'class') return false;
        if (filterKind === 'class' && c.course_kind !== 'class') return false;

        // 2. Search query filter
        const q = searchQuery.toLowerCase().trim();
        if (!q) return true;

        const nameMatch = c.name.toLowerCase().includes(q);
        const descMatch = c.description?.toLowerCase().includes(q);
        const subjMatch = c.subject_id?.toLowerCase().includes(q);
        return Boolean(nameMatch || descMatch || subjMatch);
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        // Default: updated date descending
        const dateA = a.updated_at || a.created_at || '';
        const dateB = b.updated_at || b.created_at || '';
        return dateB.localeCompare(dateA);
      });
  }, [courses, filterKind, searchQuery, sortBy]);

  // Handle opening details
  const handleOpenDetails = (course: Course) => {
    setDetailCourseId(course.course_id);
    onSelectCourse(course.course_id);
  };

  // Handle starting learning for a course
  const handleStartLearningCourse = (course: Course) => {
    onSelectCourse(course.course_id);
    onNavigateToLearn(course.course_id);
  };

  // Handle starting learning for a specific topic
  const handleStartLearningTopic = (conceptId: string) => {
    if (currentDetailCourse) {
      onSelectCourse(currentDetailCourse.course_id);
      onSelectConcept(conceptId);
      onNavigateToLearn(currentDetailCourse.course_id, conceptId);
    }
  };

  // If viewing details of a course, show CourseDetailView
  if (currentDetailCourse) {
    const isOwner =
      currentDetailCourse.membership === 'owner' ||
      currentDetailCourse.owner_user_id === user.user_id;

    return (
      <div className="course-library-container">
        <CourseDetailView
          course={currentDetailCourse}
          concepts={concepts}
          documents={courseDocuments}
          onBack={() => setDetailCourseId(null)}
          onEditCourse={(c) => setEditCourse(c)}
          onDeleteCourse={(c) => setDeleteCourse(c)}
          onAddConcept={onAddConcept}
          onSelectTopic={onSelectConcept}
          onStartLearningTopic={handleStartLearningTopic}
          onStartLearningCourse={handleStartLearningCourse}
          onUploadMaterial={handleUploadWithRefresh}
          onRetryDocument={handleRetryDocument}
          onDeleteDocument={handleDeleteDocument}
          onRefreshDocuments={() => detailCourseId && loadDocuments(detailCourseId)}
          busy={busy || documentsLoading}
          isOwner={isOwner}
        />

        {/* Edit Modal */}
        <EditCourseModal
          isOpen={Boolean(editCourse)}
          course={editCourse}
          onClose={() => setEditCourse(null)}
          onUpdateCourse={onUpdateCourse}
        />

        {/* Delete Modal */}
        <DeleteCourseModal
          isOpen={Boolean(deleteCourse)}
          course={deleteCourse}
          onClose={() => setDeleteCourse(null)}
          onDeleteCourse={async (id) => {
            await onDeleteCourse(id);
            setDetailCourseId(null);
          }}
        />
      </div>
    );
  }

  // Main Course Library view
  return (
    <div className="course-library-container">
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="KNOWLEDGE REPOSITORY"
        title="My Courses"
        description="Organize your subjects, manage topics, and continue learning."
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsCreateOpen(true)}
            leftIcon={<Plus size={16} />}
          >
            Create Course
          </Button>
        }
      />

      {/* 2. Toolbar: Search, Filters & Sorting */}
      <section
        className="course-library-toolbar"
        aria-label="Course filtering and sorting controls"
      >
        <div className="course-library-toolbar__search">
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search courses by name or subject..."
            className="course-library-toolbar__search-input"
            aria-label="Search courses"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear course search"
            >
              Clear
            </button>
          )}
        </div>

        <div className="course-library-toolbar__controls">
          {/* Filter Pills */}
          <div
            className="course-library-toolbar__filters"
            role="group"
            aria-label="Course kind filter"
          >
            <button
              type="button"
              className={`filter-pill ${filterKind === 'all' ? 'active' : ''}`}
              onClick={() => setFilterKind('all')}
              aria-pressed={filterKind === 'all'}
            >
              All ({courses.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${filterKind === 'personal' ? 'active' : ''}`}
              onClick={() => setFilterKind('personal')}
              aria-pressed={filterKind === 'personal'}
            >
              Personal ({personalCount})
            </button>
            {classCount > 0 && (
              <button
                type="button"
                className={`filter-pill ${filterKind === 'class' ? 'active' : ''}`}
                onClick={() => setFilterKind('class')}
                aria-pressed={filterKind === 'class'}
              >
                Classroom ({classCount})
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="course-library-toolbar__sort">
            <ArrowUpDown size={14} aria-hidden="true" />
            <label htmlFor="course-sort-select" className="visually-hidden">
              Sort courses
            </label>
            <select
              id="course-sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as CourseSort)}
              className="course-library-toolbar__sort-select"
            >
              <option value="updated">Recently updated</option>
              <option value="name">Alphabetical (A–Z)</option>
            </select>
          </div>
        </div>
      </section>

      {/* 3. Course Grid */}
      <main className="course-library-main" aria-label="Course list">
        {courses.length === 0 ? (
          <EmptyState
            title="No courses created yet"
            description="Create your first personal learning space to organize topics and start adaptive tutoring."
            action={
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsCreateOpen(true)}
                leftIcon={<Plus size={16} />}
              >
                Create a course
              </Button>
            }
          />
        ) : displayedCourses.length === 0 ? (
          <div className="course-library__empty-search">
            <p>
              No courses matched &ldquo;<strong>{searchQuery}</strong>&rdquo;
              {filterKind !== 'all' && ` with filter "${filterKind}"`}.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilterKind('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="course-grid-premium">
            {displayedCourses.map((course) => {
              const isOwner =
                course.membership === 'owner' ||
                course.owner_user_id === user.user_id;
              return (
                <CourseCard
                  key={course.course_id}
                  course={course}
                  isOwner={isOwner}
                  onOpenDetails={handleOpenDetails}
                  onStartLearning={handleStartLearningCourse}
                  onEditCourse={isOwner ? (c) => setEditCourse(c) : undefined}
                  onDeleteCourse={isOwner ? (c) => setDeleteCourse(c) : undefined}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* 4. Modals */}
      <CreateCourseModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateCourse={onCreateCourse}
        userRole={user.role}
      />

      <EditCourseModal
        isOpen={Boolean(editCourse)}
        course={editCourse}
        onClose={() => setEditCourse(null)}
        onUpdateCourse={onUpdateCourse}
      />

      <DeleteCourseModal
        isOpen={Boolean(deleteCourse)}
        course={deleteCourse}
        onClose={() => setDeleteCourse(null)}
        onDeleteCourse={onDeleteCourse}
      />
    </div>
  );
};
