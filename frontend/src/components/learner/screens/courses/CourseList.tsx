import { BookOpen, Plus, Filter } from "lucide-react";
import { CourseCard } from "./CourseCard";
import type { Course, Subject, DocumentRecord, ConceptNode, LearningLaunch } from "../../../../types";

export interface CourseListProps {
  courses: Course[];
  filteredCourses: Course[];
  subjects: Subject[];
  mapNodes: ConceptNode[];
  documents: DocumentRecord[];
  selectedCourseId: string;
  busy: boolean;
  searchQuery: string;
  onLearn: (launch: LearningLaunch) => void;
  onToggleSelect: (courseId: string) => void;
  onCreateCourseClick: () => void;
  onResetFilters: () => void;
}

export function CourseList({
  courses,
  filteredCourses,
  subjects,
  mapNodes,
  documents,
  selectedCourseId,
  busy,
  searchQuery,
  onLearn,
  onToggleSelect,
  onCreateCourseClick,
  onResetFilters,
}: CourseListProps) {
  return (
    <>
      <div className="courses-grid-layout">
        {filteredCourses.map((c) => {
          const subjectObj = subjects.find((s) => s.subject_id === c.subject_id);
          const courseTopics = mapNodes.filter((n) => n.subject_id === c.subject_id);
          const stableTopicsCount = courseTopics.filter(
            (n) => n.status === "stable" || n.status === "mastered",
          ).length;
          const courseDocs = documents.filter((d) => d.course_id === c.course_id);
          const isSelected = selectedCourseId === c.course_id;

          return (
            <CourseCard
              key={c.course_id}
              course={c}
              subjectName={subjectObj?.name}
              courseTopicsCount={courseTopics.length}
              courseDocsCount={courseDocs.length}
              stableTopicsCount={stableTopicsCount}
              isSelected={isSelected}
              busy={busy}
              onLearn={onLearn}
              onToggleSelect={onToggleSelect}
            />
          );
        })}
      </div>

      {/* Empty State: No courses at all */}
      {courses.length === 0 && (
        <section className="courses-empty-state" aria-label="No courses available">
          <div className="empty-icon-circle">
            <BookOpen size={32} />
          </div>
          <h2>Begin Your Learning Journey</h2>
          <p>
            Create your first personal course, specify learning goals, and attach textbooks or notes.
            OVAEL-X will adaptively structure concepts into interactive practice sessions.
          </p>
          <button
            type="button"
            className="btn btn-accent"
            onClick={onCreateCourseClick}
          >
            <Plus size={16} />
            <span>Create Your First Course</span>
          </button>
        </section>
      )}

      {/* Empty State: No courses matching filters */}
      {courses.length > 0 && filteredCourses.length === 0 && (
        <section className="courses-empty-state" aria-label="No matching courses">
          <div className="empty-icon-circle">
            <Filter size={28} />
          </div>
          <h2>No matching courses found</h2>
          <p>
            {searchQuery.trim() ? (
              <>
                We couldn&apos;t find any courses matching &ldquo;<strong>{searchQuery.trim()}</strong>&rdquo;. Try searching with different keywords or reset the filter.
              </>
            ) : (
              <>
                No courses found under the selected category. Try selecting another filter or reset to view all courses.
              </>
            )}
          </p>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onResetFilters}
          >
            <span>Reset Filters</span>
          </button>
        </section>
      )}
    </>
  );
}
