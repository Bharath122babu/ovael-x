import { Layers3, LoaderCircle, Plus, ShieldCheck } from "lucide-react";

export interface TeacherOnboardingProps {
  courseName: string;
  subjectName: string;
  busy: boolean;
  onCourseNameChange: (val: string) => void;
  onSubjectNameChange: (val: string) => void;
  onCreateCourse: () => void;
}

export function TeacherOnboarding({
  courseName,
  subjectName,
  busy,
  onCourseNameChange,
  onSubjectNameChange,
  onCreateCourse,
}: TeacherOnboardingProps) {
  return (
    <div className="page teacher-page">
      <header className="teacher-header-executive">
        <div className="teacher-header-meta">
          <span className="badge-role-tag">
            <ShieldCheck size={14} /> Teacher Workspace
          </span>
          <h1>Educator Course Management</h1>
          <p>
            Create your first class cohort to organize learning materials,
            manage enrolled students, infer concept graphs, and inspect
            privacy-minimized gap forensics.
          </p>
        </div>
      </header>

      <section className="teacher-card-elevated create-course-hero">
        <div className="hero-create-intro">
          <Layers3 size={32} className="hero-icon" />
          <div>
            <h2>Create a New Class Cohort</h2>
            <p>
              A class course provides dedicated syllabus routing, multi-student
              enrollment, human-approved concept dependency graphs, and
              aggregated diagnostic telemetry.
            </p>
          </div>
        </div>

        <form
          className="teacher-form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            onCreateCourse();
          }}
        >
          <div className="form-group">
            <label htmlFor="course-name-input">Course Title</label>
            <input
              id="course-name-input"
              value={courseName}
              onChange={(event) => onCourseNameChange(event.target.value)}
              placeholder="e.g. Data Structures & Algorithms · CS-201"
              required
            />
            <span className="input-hint">The public title shown to enrolled learners.</span>
          </div>

          <div className="form-group">
            <label htmlFor="subject-name-input">Academic Subject</label>
            <input
              id="subject-name-input"
              value={subjectName}
              onChange={(event) => onSubjectNameChange(event.target.value)}
              placeholder="e.g. Computer Science"
              required
            />
            <span className="input-hint">Used by OVAEL-X to load domain ontological models.</span>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-button"
              disabled={busy || !courseName.trim() || !subjectName.trim()}
            >
              {busy ? <LoaderCircle className="spin" size={16} /> : <Plus size={16} />}
              Create Class Course
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
