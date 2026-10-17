import { useEffect, useState, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Layers3,
  Lightbulb,
  Network,
  Paperclip,
  Play,
  Plus,
  Target,
} from "lucide-react";
import { useOvael } from "../../../../context/OvaelContext";
import { ovaelApi } from "../../../../api/client";
import { KnowledgeNetworkGraphic } from "../../../content/KnowledgeNetworkGraphic";
import type {
  AuthUser,
  UserProfile,
  Course,
  ConceptNode,
  LearnerScreen,
  CausalGapCase,
  CausalGapReport,
} from "../../../../types";
import type { Concept } from "./types";

export interface LearnerDashboardProps {
  user: AuthUser | null;
  profile: UserProfile | null;
  courses: Course[];
  mapNodes: ConceptNode[];
  courseId: string;
  conceptId: string;
  concepts: Concept[];
  topicsLoading: boolean;
  disabled: boolean;
  label: string;
  onCourseChange: (id: string) => void;
  onConceptChange: (id: string) => void;
  onStart: (mode: "study" | "practice" | "review") => void;
  onNavigate?: (screen: LearnerScreen) => void;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "Recently";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Recently";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatCauseType(causeType?: string): string {
  if (!causeType) return "Conceptual gap";
  return causeType
    .replace(/^causal_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function LearnerDashboard({
  user,
  profile,
  courses,
  mapNodes,
  courseId,
  conceptId,
  concepts,
  topicsLoading,
  disabled,
  label,
  onCourseChange,
  onConceptChange,
  onStart,
  onNavigate,
}: LearnerDashboardProps) {
  const { documents, sessions } = useOvael();

  // Gap Forensics State from IRIS
  const [gapReport, setGapReport] = useState<CausalGapReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    ovaelApi
      .causalGaps()
      .then((report) => {
        if (!cancelled) setGapReport(report);
      })
      .catch(() => {
        if (!cancelled) setGapReport(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = profile?.display_name || user?.username || "Learner";

  // Active or selected course & concept
  const activeCourse = useMemo(() => {
    return courses.find((c) => c.course_id === courseId) || courses[0];
  }, [courses, courseId]);

  const activeConcept = useMemo(() => {
    return concepts.find((c) => c.concept_id === conceptId) || concepts[0];
  }, [concepts, conceptId]);

  // Most recent session
  const mostRecentSession = useMemo(() => {
    if (!sessions || !sessions.length) return null;
    return [...sessions].sort((a, b) => {
      const tA = new Date(a.updated_at || a.created_at || 0).getTime();
      const tB = new Date(b.updated_at || b.created_at || 0).getTime();
      return tB - tA;
    })[0];
  }, [sessions]);

  const recentCourseName = useMemo(() => {
    if (!mostRecentSession) return activeCourse?.name;
    const found = courses.find(
      (c) =>
        c.course_id === mostRecentSession.course_id ||
        c.subject_id === mostRecentSession.subject_id,
    );
    return found?.name || activeCourse?.name || "General Curriculum";
  }, [mostRecentSession, courses, activeCourse]);

  const recentConceptName = useMemo(() => {
    if (!mostRecentSession) return activeConcept?.name || label;
    const found = mapNodes.find((n) => n.id === mostRecentSession.concept_id);
    if (found) return found.label;
    if (mostRecentSession.goal) {
      return mostRecentSession.goal.replace(/^Understand /, "");
    }
    return activeConcept?.name || label;
  }, [mostRecentSession, mapNodes, activeConcept, label]);

  // Detected gaps from IRIS and mapped review nodes
  const detectedGaps: CausalGapCase[] = gapReport?.cases || [];
  const mapReviewNodes = useMemo(() => {
    return mapNodes.filter(
      (n) => n.status === "review" || n.status === "uncertain",
    );
  }, [mapNodes]);

  const totalGapsCount = detectedGaps.length || mapReviewNodes.length;

  // Recent 4 sessions sorted by date
  const recentSessionsList = useMemo(() => {
    if (!sessions || !sessions.length) return [];
    return [...sessions]
      .sort((a, b) => {
        const tA = new Date(a.updated_at || a.created_at || 0).getTime();
        const tB = new Date(b.updated_at || b.created_at || 0).getTime();
        return tB - tA;
      })
      .slice(0, 4);
  }, [sessions]);

  // Top 3 courses
  const displayCourses = useMemo(() => courses.slice(0, 3), [courses]);

  // Top 3 documents
  const displayDocuments = useMemo(() => documents.slice(0, 3), [documents]);

  const handleContinueLearning = () => {
    if (
      mostRecentSession?.course_id &&
      onCourseChange &&
      mostRecentSession.course_id !== courseId
    ) {
      onCourseChange(mostRecentSession.course_id);
    }
    if (
      mostRecentSession?.concept_id &&
      onConceptChange &&
      mostRecentSession.concept_id !== conceptId
    ) {
      onConceptChange(mostRecentSession.concept_id);
    }
    const resumeMode: "study" | "practice" | "review" =
      mostRecentSession?.mode === "practice"
        ? "practice"
        : mostRecentSession?.mode === "review"
          ? "review"
          : "study";
    void onStart(resumeMode);
  };

  return (
    <section className="learner-dashboard" aria-label="Learner Workspace Dashboard">
      {/* 1. Page Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-main">
          <div className="dashboard-eyebrow-row">
            <span className="dashboard-eyebrow">Learner Intelligence Dashboard</span>
            {activeCourse && (
              <span className="dashboard-focus-tag">
                Focus: {activeCourse.name}
              </span>
            )}
          </div>
          <h1 className="dashboard-title">
            Welcome back, {displayName}
          </h1>
          <p className="dashboard-focus-lead">
            {activeCourse && activeConcept
              ? `Currently studying ${activeConcept.name} in ${activeCourse.name}. Resume your Socratic dialogue or inspect conceptual gaps.`
              : "Review your knowledge graph, resume active lessons, and explore evidence-grounded course materials."}
          </p>
        </div>

        <div className="dashboard-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigate?.("history")}
          >
            <Compass size={14} />
            <span>Learning Map</span>
          </button>
          <button
            type="button"
            className="btn btn-accent btn-sm"
            onClick={handleContinueLearning}
            disabled={disabled}
          >
            <Play size={14} />
            <span>{mostRecentSession ? "Resume Learning" : "Start Session"}</span>
          </button>
        </div>
      </header>

      {/* 2. Learning Overview (Metrics Grid) */}
      <div className="dashboard-metrics-grid" aria-label="Learning metrics overview">
        <div
          className="dashboard-metric-card"
          tabIndex={0}
          role="button"
          onClick={() => onNavigate?.("courses")}
          onKeyDown={(e) => e.key === "Enter" && onNavigate?.("courses")}
        >
          <div className="metric-header">
            <span className="metric-label">Active Courses</span>
            <span className="metric-icon-wrap cobalt">
              <Layers3 size={16} />
            </span>
          </div>
          <div className="metric-value">{courses.length}</div>
          <div className="metric-sub">
            {courses.filter((c) => c.membership === "owner").length} authored ·{" "}
            {courses.filter((c) => c.membership !== "owner").length} enrolled
          </div>
        </div>

        <div
          className="dashboard-metric-card"
          tabIndex={0}
          role="button"
          onClick={() => onNavigate?.("history")}
          onKeyDown={(e) => e.key === "Enter" && onNavigate?.("history")}
        >
          <div className="metric-header">
            <span className="metric-label">Mapped Concepts</span>
            <span className="metric-icon-wrap teal">
              <Network size={16} />
            </span>
          </div>
          <div className="metric-value">{mapNodes.length}</div>
          <div className="metric-sub">
            {
              mapNodes.filter(
                (n) => n.status === "stable" || n.status === "mastered",
              ).length
            }{" "}
            verified stable
          </div>
        </div>

        <div
          className="dashboard-metric-card"
          tabIndex={0}
          role="button"
          onClick={() => onNavigate?.("history")}
          onKeyDown={(e) => e.key === "Enter" && onNavigate?.("history")}
        >
          <div className="metric-header">
            <span className="metric-label">Learning Sessions</span>
            <span className="metric-icon-wrap cobalt">
              <Activity size={16} />
            </span>
          </div>
          <div className="metric-value">{sessions.length}</div>
          <div className="metric-sub">
            {sessions.filter((s) => s.status === "completed").length} completed
            records
          </div>
        </div>

        <div
          className="dashboard-metric-card"
          tabIndex={0}
          role="button"
          onClick={() => onNavigate?.("history")}
          onKeyDown={(e) => e.key === "Enter" && onNavigate?.("history")}
        >
          <div className="metric-header">
            <span className="metric-label">Identified Gaps</span>
            <span className={`metric-icon-wrap ${totalGapsCount > 0 ? "coral" : "jade"}`}>
              <AlertTriangle size={16} />
            </span>
          </div>
          <div className="metric-value">{totalGapsCount}</div>
          <div className="metric-sub">
            {totalGapsCount > 0 ? (
              <span className="metric-pill coral">Targeted review needed</span>
            ) : (
              <span className="metric-pill jade">All concepts stable</span>
            )}
          </div>
        </div>

        <div
          className="dashboard-metric-card"
          tabIndex={0}
          role="button"
          onClick={() => onNavigate?.("materials")}
          onKeyDown={(e) => e.key === "Enter" && onNavigate?.("materials")}
        >
          <div className="metric-header">
            <span className="metric-label">Curated Materials</span>
            <span className="metric-icon-wrap teal">
              <BookOpen size={16} />
            </span>
          </div>
          <div className="metric-value">{documents.length}</div>
          <div className="metric-sub">
            {documents.filter((d) => d.status === "ready").length} indexed documents
          </div>
        </div>
      </div>

      {/* 3. Continue Learning — Primary Module with Signature Visualization */}
      <div className="dashboard-hero-section">
        <div className="continue-learning-panel">
          <div className="continue-learning-content">
            <div className="continue-learning-badge-row">
              <span className="eyebrow cobalt">Resume Learning Activity</span>
              {mostRecentSession?.mode && (
                <span className="mode-pill">
                  {mostRecentSession.mode.toUpperCase()}
                </span>
              )}
            </div>

            <h2 className="continue-learning-title">
              {recentConceptName}
            </h2>

            <div className="continue-learning-meta">
              <span className="meta-item">
                <Layers3 size={13} />
                <span>{recentCourseName}</span>
              </span>
              <span className="meta-bullet">•</span>
              <span className="meta-item">
                <Clock size={13} />
                <span>
                  {mostRecentSession
                    ? formatRelativeTime(
                        mostRecentSession.updated_at ||
                          mostRecentSession.created_at,
                      )
                    : "Ready to start"}
                </span>
              </span>
              {mostRecentSession?.turn_count ? (
                <>
                  <span className="meta-bullet">•</span>
                  <span className="meta-item">
                    <Activity size={13} />
                    <span>{mostRecentSession.turn_count} dialogue turns</span>
                  </span>
                </>
              ) : null}
            </div>

            <p className="continue-learning-desc">
              {mostRecentSession
                ? "Continue your grounded Socratic exploration with verified citations, causal explanations, and guided practice questions."
                : "Select a topic below to begin your grounded learning session with step-by-step causal reasoning and interactive practice."}
            </p>

            <div className="continue-learning-actions">
              <button
                type="button"
                className="btn btn-accent btn-md continue-primary-btn"
                disabled={disabled || topicsLoading}
                onClick={handleContinueLearning}
              >
                <span>{mostRecentSession ? "Resume Dialogue" : "Start Study"}</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-md"
                disabled={disabled || topicsLoading}
                onClick={() => void onStart("practice")}
              >
                <Lightbulb size={15} />
                <span>Practice Questions</span>
              </button>
            </div>
          </div>

          <div className="continue-learning-visual" aria-hidden="true">
            <KnowledgeNetworkGraphic size={240} />
            <div className="visual-caption">
              <span>Causal Map · Foundation to Mastery</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Split Grid: Knowledge-Gap Insights & Resources */}
      <div className="dashboard-split-grid">
        {/* Left Column: Knowledge-Gap Insights */}
        <div className="dashboard-card-panel gap-insights-panel">
          <div className="panel-header-row">
            <div className="panel-title-wrap">
              <span className="panel-dot coral" />
              <h3 className="panel-title">Knowledge-Gap Forensics</h3>
              {totalGapsCount > 0 && (
                <span className="panel-count-badge coral">{totalGapsCount}</span>
              )}
            </div>
            <button
              type="button"
              className="panel-action-link"
              onClick={() => onNavigate?.("history")}
            >
              Full analysis →
            </button>
          </div>

          <p className="panel-description">
            Causal diagnosis of prerequisite deficits and conflations identified by IRIS.
          </p>

          <div className="gap-items-list">
            {detectedGaps.length > 0 ? (
              detectedGaps.slice(0, 3).map((gap) => (
                <div key={gap.case_id} className="gap-insight-row">
                  <div className="gap-insight-info">
                    <div className="gap-insight-top">
                      <strong className="gap-concept-name">
                        {gap.concept_name}
                      </strong>
                      <span className="gap-cause-pill">
                        {formatCauseType(gap.cause_type)}
                      </span>
                    </div>
                    <div className="gap-insight-meta">
                      <span>{gap.evidence_count} evidence records</span>
                      <span className="meta-bullet">•</span>
                      <span>
                        {Math.round((gap.mastery_belief || 0) * 100)}% mastery belief
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs gap-action-btn"
                    disabled={disabled || topicsLoading}
                    onClick={() => {
                      if (gap.target_concept_id && onConceptChange) {
                        onConceptChange(gap.target_concept_id);
                      }
                      void onStart("practice");
                    }}
                    title={`Practice ${gap.concept_name}`}
                  >
                    <Target size={12} />
                    <span>Practice</span>
                  </button>
                </div>
              ))
            ) : mapReviewNodes.length > 0 ? (
              mapReviewNodes.slice(0, 3).map((node) => (
                <div key={node.id} className="gap-insight-row">
                  <div className="gap-insight-info">
                    <div className="gap-insight-top">
                      <strong className="gap-concept-name">{node.label}</strong>
                      <span className="gap-cause-pill">Review Recommended</span>
                    </div>
                    <div className="gap-insight-meta">
                      <span>Status: {node.status}</span>
                      <span className="meta-bullet">•</span>
                      <span>Knowledge node</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs gap-action-btn"
                    disabled={disabled || topicsLoading}
                    onClick={() => {
                      onConceptChange(node.id);
                      void onStart("practice");
                    }}
                  >
                    <Target size={12} />
                    <span>Practice</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-insights-state">
                <CheckCircle2 size={24} className="empty-check-icon" />
                <div className="empty-text">
                  <strong>All concept nodes are stable</strong>
                  <p>No critical prerequisite gaps or conflations detected across your courses.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Active Courses & Learning Resources */}
        <div className="dashboard-card-panel resources-panel">
          <div className="panel-header-row">
            <div className="panel-title-wrap">
              <span className="panel-dot cobalt" />
              <h3 className="panel-title">Curated Resources</h3>
              <span className="panel-count-badge cobalt">{courses.length}</span>
            </div>
            <button
              type="button"
              className="panel-action-link"
              onClick={() => onNavigate?.("courses")}
            >
              All courses →
            </button>
          </div>

          <p className="panel-description">
            Enrolled curriculum courses and indexed study materials available for synthesis.
          </p>

          <div className="resources-list">
            {displayCourses.length > 0 ? (
              displayCourses.map((c) => (
                <div key={c.course_id} className="resource-row">
                  <div className="resource-icon-wrap">
                    <Layers3 size={15} />
                  </div>
                  <div className="resource-info">
                    <strong className="resource-name">{c.name}</strong>
                    <div className="resource-meta">
                      <span>{c.subject_name || "General Subject"}</span>
                      <span className="meta-bullet">•</span>
                      <span className="membership-tag">
                        {c.membership === "owner" ? "Author" : "Learner"}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => onNavigate?.("courses")}
                  >
                    Open
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-resource-notice">
                <span>No courses enrolled yet.</span>
                <button
                  type="button"
                  className="btn btn-secondary btn-xs"
                  onClick={() => onNavigate?.("courses")}
                >
                  <Plus size={12} />
                  <span>Create course</span>
                </button>
              </div>
            )}

            {displayDocuments.length > 0 && (
              <div className="materials-sublist">
                <div className="materials-sublist-header">
                  <span>Recent Materials</span>
                  <button
                    type="button"
                    className="sublist-link"
                    onClick={() => onNavigate?.("materials")}
                  >
                    View library ({documents.length})
                  </button>
                </div>
                {displayDocuments.map((doc) => (
                  <div key={doc.document_id} className="resource-row compact">
                    <div className="resource-icon-wrap teal">
                      <FileText size={13} />
                    </div>
                    <div className="resource-info">
                      <span className="resource-filename">{doc.filename}</span>
                      <div className="resource-meta">
                        <span>{formatFileSize(doc.size_bytes)}</span>
                        <span className="meta-bullet">•</span>
                        <span className="status-badge-text">{doc.status}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-xs"
                      onClick={() => onNavigate?.("materials")}
                    >
                      Inspect
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. Recent Activity Section */}
      <div className="dashboard-card-panel history-panel">
        <div className="panel-header-row">
          <div className="panel-title-wrap">
            <span className="panel-dot teal" />
            <h3 className="panel-title">Recent Learning Sessions</h3>
            <span className="panel-count-badge teal">{sessions.length}</span>
          </div>
          <button
            type="button"
            className="panel-action-link"
            onClick={() => onNavigate?.("history")}
          >
            Complete history →
          </button>
        </div>

        <div className="recent-sessions-list">
          {recentSessionsList.length > 0 ? (
            recentSessionsList.map((s) => {
              const sessionConcept =
                mapNodes.find((n) => n.id === s.concept_id)?.label ||
                s.goal?.replace(/^Understand /, "") ||
                s.concept_id;
              const sessionCourse =
                courses.find((c) => c.course_id === s.course_id)?.name ||
                courses.find((c) => c.subject_id === s.subject_id)?.name ||
                "Course";

              return (
                <div key={s.teaching_session_id} className="recent-session-row">
                  <div className="session-mode-badge-wrap">
                    <span className={`session-mode-pill ${s.mode || "study"}`}>
                      {s.mode || "study"}
                    </span>
                  </div>

                  <div className="session-info">
                    <strong className="session-title">{sessionConcept}</strong>
                    <div className="session-meta">
                      <span>{sessionCourse}</span>
                      <span className="meta-bullet">•</span>
                      <span>
                        {formatRelativeTime(s.updated_at || s.created_at)}
                      </span>
                      {s.turn_count ? (
                        <>
                          <span className="meta-bullet">•</span>
                          <span>{s.turn_count} turns</span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="session-status-wrap">
                    <span className={`status-pill ${s.status === "completed" ? "stable" : "uncertain"}`}>
                      <span className="status-dot" aria-hidden="true" />
                      <span>{s.status === "completed" ? "Completed" : "Active"}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-xs"
                    onClick={() => onNavigate?.("history")}
                  >
                    Review
                  </button>
                </div>
              );
            })
          ) : (
            <div className="empty-history-notice">
              <Clock size={20} className="empty-icon" />
              <span>No recorded learning sessions yet. Launch your first study or practice session above.</span>
            </div>
          )}
        </div>
      </div>

      {/* 6. Course & Topic Selection Module */}
      <div className="dashboard-card-panel selectors-section">
        <div className="panel-header-row">
          <div className="panel-title-wrap">
            <span className="panel-dot cobalt" />
            <h3 className="panel-title">Explore Topic & Fast Socratic Launch</h3>
          </div>
        </div>

        <div className="chat-selectors-card" role="group" aria-label="Course and Topic Selection">
          <div className="chat-selector-field">
            <label htmlFor="dashboard-course-select" className="selector-label">
              <Layers3 size={15} className="selector-icon" />
              <span>Course</span>
            </label>
            <select
              id="dashboard-course-select"
              aria-label="Select course"
              value={courseId}
              disabled={topicsLoading || disabled}
              onChange={(e) => onCourseChange(e.target.value)}
              className="styled-select"
            >
              <option value="">Choose a course</option>
              {courses.map((c) => (
                <option key={c.course_id} value={c.course_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="chat-selector-field">
            <label htmlFor="dashboard-topic-select" className="selector-label">
              <BookOpen size={15} className="selector-icon" />
              <span>Learning Topic</span>
              {concepts.length > 0 && (
                <span className="concept-count-pill">{concepts.length}</span>
              )}
            </label>
            <select
              id="dashboard-topic-select"
              aria-label="Select topic"
              value={conceptId}
              disabled={topicsLoading || disabled}
              onChange={(e) => onConceptChange(e.target.value)}
              className="styled-select"
            >
              <option value="">
                {topicsLoading ? "Loading topics…" : "Choose a topic"}
              </option>
              {concepts.map((c) => (
                <option key={c.concept_id} value={c.concept_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Suggestions Grid */}
        <div className="chat-suggestions">
          <button
            type="button"
            className="suggestion-card"
            disabled={!conceptId || disabled || topicsLoading}
            onClick={() => void onStart("study")}
          >
            <div className="suggestion-icon-wrap study-icon">
              <BookOpen size={18} />
            </div>
            <div className="suggestion-text">
              <strong>Explain a concept</strong>
              <span>Grounded breakdown of {label}</span>
            </div>
            <span className="suggestion-action-arrow">
              <ArrowRight size={14} />
            </span>
          </button>

          <button
            type="button"
            className="suggestion-card"
            disabled={!conceptId || disabled || topicsLoading}
            onClick={() => void onStart("practice")}
          >
            <div className="suggestion-icon-wrap practice-icon">
              <Lightbulb size={18} />
            </div>
            <div className="suggestion-text">
              <strong>Practice with me</strong>
              <span>Solve a question to check your understanding</span>
            </div>
            <span className="suggestion-action-arrow">
              <ArrowRight size={14} />
            </span>
          </button>

          <button
            type="button"
            className="suggestion-card"
            onClick={() => onNavigate?.("materials")}
          >
            <div className="suggestion-icon-wrap material-icon">
              <Paperclip size={18} />
            </div>
            <div className="suggestion-text">
              <strong>Use my materials</strong>
              <span>Synthesize notes, textbooks, slides, audio</span>
            </div>
            <span className="suggestion-action-arrow">
              <ArrowRight size={14} />
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
