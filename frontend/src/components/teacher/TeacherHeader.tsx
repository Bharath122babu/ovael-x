import {
  BookOpen,
  CheckCircle2,
  Edit3,
  GitBranch,
  Layers3,
  Plus,
  ShieldCheck,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import type { Course } from "../../types";
import type { TeacherTab } from "./types";

export interface TeacherHeaderProps {
  course: Course;
  classCourses: Course[];
  tab: TeacherTab;
  busy: boolean;
  successMsg: string;
  totalLearners: number;
  materialsCount: number;
  proposalsCount: number;
  isProposalPending: boolean;
  gapCountsCount: number;
  onCourseSelect: (courseId: string) => void;
  onTabChange: (tab: TeacherTab) => void;
  onEditCourseClick: () => void;
  onCreateCourseClick: () => void;
  onCloseToast: () => void;
}

export function TeacherHeader({
  course,
  classCourses,
  tab,
  busy,
  successMsg,
  totalLearners,
  materialsCount,
  proposalsCount,
  isProposalPending,
  gapCountsCount,
  onCourseSelect,
  onTabChange,
  onEditCourseClick,
  onCreateCourseClick,
  onCloseToast,
}: TeacherHeaderProps) {
  const tabs: Array<{
    id: TeacherTab;
    label: string;
    icon: typeof BookOpen;
    count?: number;
    badgeVariant?: "coral" | "amber" | "navy";
  }> = [
    { id: "overview", label: "Executive Overview", icon: Layers3 },
    {
      id: "roster",
      label: "Enrolled Cohort",
      icon: Users,
      count: totalLearners,
      badgeVariant: "navy",
    },
    {
      id: "materials",
      label: "Course Materials",
      icon: BookOpen,
      count: materialsCount,
      badgeVariant: "navy",
    },
    {
      id: "graph",
      label: "Knowledge Graph",
      icon: GitBranch,
      count: proposalsCount,
      badgeVariant: isProposalPending ? "amber" : "navy",
    },
    {
      id: "gaps",
      label: "Gap Forensics & Interventions",
      icon: TrendingUp,
      count: gapCountsCount,
      badgeVariant: gapCountsCount > 0 ? "coral" : "navy",
    },
  ];

  return (
    <>
      {/* Toast Notification */}
      {successMsg && (
        <div className="teacher-toast-success" role="status">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
          <button
            type="button"
            className="toast-close"
            onClick={onCloseToast}
            aria-label="Close notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Main Workspace Header */}
      <header className="teacher-header-executive">
        <div className="teacher-header-meta">
          <div className="header-eyebrow-row">
            <span className="badge-role-tag">
              <ShieldCheck size={14} /> Teacher Workspace
            </span>
            <span className="badge-kind-tag">Class Cohort</span>
            <span className="course-code-tag">ID: {course.course_id.slice(0, 10)}</span>
          </div>

          <div className="header-title-row">
            <h1>{course.name}</h1>
            <div className="header-course-selector-wrap">
              <select
                id="teacher-course-select"
                aria-label="Select active course"
                disabled={busy}
                value={course.course_id}
                onChange={(event) => onCourseSelect(event.target.value)}
                className="teacher-course-select"
              >
                {classCourses.map((item) => (
                  <option key={item.course_id} value={item.course_id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="icon-button-subtle"
                title="Edit course details"
                onClick={onEditCourseClick}
              >
                <Edit3 size={16} />
              </button>
              <button
                type="button"
                className="icon-button-subtle"
                title="Create another course"
                onClick={onCreateCourseClick}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <p className="header-description">
            {course.description || "Class course managed by instructor."} ·{" "}
            <strong>{course.subject_name || course.subject_id}</strong>
          </p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="teacher-nav-tabs" aria-label="Course management sections">
        {tabs.map((item) => {
          const Icon = item.icon;
          const isActive = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`teacher-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => onTabChange(item.id)}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon size={16} className="tab-icon" />
              <span>{item.label}</span>
              {typeof item.count === "number" && (
                <span className={`tab-counter ${item.badgeVariant || "navy"}`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
}
