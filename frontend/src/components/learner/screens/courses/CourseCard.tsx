import { Layers3, FileText, CheckCircle2, ArrowRight, ChevronRight } from "lucide-react";
import type { Course, LearningLaunch } from "../../../../types";

export interface CourseCardProps {
  course: Course;
  subjectName?: string;
  courseTopicsCount: number;
  courseDocsCount: number;
  stableTopicsCount?: number;
  isSelected: boolean;
  busy: boolean;
  onLearn: (launch: LearningLaunch) => void;
  onToggleSelect: (courseId: string) => void;
}

export function CourseCard({
  course: c,
  subjectName,
  courseTopicsCount,
  courseDocsCount,
  stableTopicsCount = 0,
  isSelected,
  busy,
  onLearn,
  onToggleSelect,
}: CourseCardProps) {
  const resolvedSubject = subjectName || c.subject_name || "General Subject";

  return (
    <article
      className={`course-card-tile ${isSelected ? "is-selected-course" : ""}`}
    >
      <div className="course-tile-top">
        <div className="course-badges-row">
          <span
            className={`course-kind-badge ${c.course_kind === "class" ? "is-class" : "is-personal"}`}
          >
            {c.course_kind === "class" ? "Class" : "Personal"}
          </span>

          <span className="course-subject-badge" title={resolvedSubject}>
            {resolvedSubject}
          </span>

          {c.membership && (
            <span className="membership-tag">
              {c.membership === "owner" ? "Author" : "Learner"}
            </span>
          )}
        </div>

        <h3 className="course-card-title">{c.name}</h3>

        {c.description ? (
          <p className="course-card-desc">
            {c.description.split("\n")[0]}
          </p>
        ) : null}
      </div>

      <div className="course-tile-stats">
        <div className="tile-stat-item" title={`${courseTopicsCount} mapped concepts`}>
          <Layers3 size={14} className="stat-icon teal" />
          <span>
            <strong>{courseTopicsCount}</strong> {courseTopicsCount === 1 ? "concept" : "concepts"}
          </span>
        </div>

        <div className="tile-stat-item" title={`${courseDocsCount} attached study materials`}>
          <FileText size={14} className="stat-icon cobalt" />
          <span>
            <strong>{courseDocsCount}</strong> {courseDocsCount === 1 ? "material" : "materials"}
          </span>
        </div>

        {stableTopicsCount > 0 ? (
          <div className="tile-stat-item verified" title={`${stableTopicsCount} verified stable concepts`}>
            <CheckCircle2 size={14} className="stat-icon jade" />
            <span>
              <strong>{stableTopicsCount}</strong> verified
            </span>
          </div>
        ) : null}
      </div>

      <div className="course-tile-actions">
        <button
          type="button"
          className="continue-learning-btn"
          disabled={busy}
          onClick={() =>
            onLearn({
              courseId: c.course_id,
              subjectId: c.subject_id,
              mode: "study",
            })
          }
          title={`Start learning in ${c.name}`}
        >
          <span>Continue</span>
          <ArrowRight size={15} />
        </button>

        <button
          type="button"
          className={`btn btn-secondary view-topics-btn ${isSelected ? "active" : ""}`}
          disabled={busy}
          onClick={() => onToggleSelect(c.course_id)}
          aria-expanded={isSelected}
          title={isSelected ? "Close course syllabus" : "Inspect course syllabus"}
        >
          <span>{isSelected ? "Hide Syllabus" : "Syllabus"}</span>
          <ChevronRight
            size={14}
            className={`chevron-icon ${isSelected ? "rotated" : ""}`}
          />
        </button>
      </div>
    </article>
  );
}
