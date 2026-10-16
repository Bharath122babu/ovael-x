import { GraduationCap, Compass, Layers, FileText, ArrowRight, ChevronRight } from "lucide-react";
import { AnimatedProgressBar } from "../../../content/MotionPrimitives";
import type { Course, LearningLaunch } from "../../../../types";

export interface CourseCardProps {
  course: Course;
  subjectName?: string;
  courseTopicsCount: number;
  courseDocsCount: number;
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
  isSelected,
  busy,
  onLearn,
  onToggleSelect,
}: CourseCardProps) {
  return (
    <article
      className={`course-card-tile ${isSelected ? "is-selected-course" : ""}`}
    >
      <div className="course-tile-top">
        <div className="course-badges-row">
          <span
            className={`course-kind-badge ${c.course_kind === "class" ? "is-class" : "is-personal"}`}
          >
            {c.course_kind === "class" ? (
              <>
                <GraduationCap size={12} /> Class
              </>
            ) : (
              <>
                <Compass size={12} /> Personal
              </>
            )}
          </span>

          <span className="course-subject-badge" title={subjectName || c.subject_id}>
            {subjectName || "Subject"}
          </span>

          {c.membership && (
            <span className="membership-tag">
              {c.membership === "owner" ? "Owner" : "Enrolled"}
            </span>
          )}
        </div>

        <h3 className="course-card-title">{c.name}</h3>

        <p className="course-card-desc">
          {c.description
            ? c.description.split("\n")[0]
            : "Interactive workspace for adaptive learning, practice problems, and concept proofs."}
        </p>
      </div>

      <div className="course-tile-stats">
        <div className="tile-stat-item" title={`${courseTopicsCount} total concepts mapped`}>
          <Layers size={15} />
          <span>
            <strong>{courseTopicsCount}</strong> topics
          </span>
        </div>

        <div className="tile-stat-item" title={`${courseDocsCount} textbooks & resources`}>
          <FileText size={15} />
          <span>
            <strong>{courseDocsCount}</strong> materials
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="course-tile-progress">
        <div className="progress-label-row">
          <small>Topic Coverage</small>
          <small>
            {courseTopicsCount > 0 ? `${courseTopicsCount} mapped` : "Initial"}
          </small>
        </div>
        <AnimatedProgressBar
          value={courseTopicsCount}
          max={Math.max(10, courseTopicsCount)}
          variant="coral"
        />
      </div>

      {/* Action Buttons */}
      <div className="course-tile-actions">
        <button
          type="button"
          className="primary-button continue-learning-btn"
          onClick={() =>
            onLearn({
              courseId: c.course_id,
              subjectId: c.subject_id,
            })
          }
          title="Launch active tutoring session"
        >
          <span>Continue</span>
          <ArrowRight size={15} />
        </button>

        <button
          type="button"
          className={`quiet-button view-topics-btn ${isSelected ? "active" : ""}`}
          disabled={busy}
          onClick={() => onToggleSelect(c.course_id)}
          aria-expanded={isSelected}
          title="Inspect topics and syllabus"
        >
          <span>{isSelected ? "Hide Topics" : "Syllabus"}</span>
          <ChevronRight
            size={14}
            style={{
              transform: isSelected ? "rotate(90deg)" : "none",
              transition: "transform 0.2s ease",
            }}
          />
        </button>
      </div>
    </article>
  );
}
