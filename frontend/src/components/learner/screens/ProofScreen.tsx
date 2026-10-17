import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Search,
  X,
  Activity,
  Layers,
  BookOpen,
} from "lucide-react";
import { api } from "../../../api";
import { useOvael } from "../../../context/OvaelContext";
import { AnimatedProgressBar } from "../../content/MotionPrimitives";
import type { LearningLaunch } from "../../../types";

type State = {
  concept_id: string;
  concept_name: string;
  status: string;
  acquisition: number;
  independent: number;
  transfer: number;
  retention: number;
  retention_due: boolean;
  evidence_mass: Record<string, number>;
};

const DIMENSION_CONFIG = {
  acquisition: {
    label: "Conceptual Understanding",
    description: "Ability to explain principles with clear mental models",
    subtext: "Explain principles with clear examples",
    variant: "navy" as const,
  },
  independent: {
    label: "Independent Mastery",
    description: "Solving problems correctly without hints or scaffolding",
    subtext: "Solve without tutor hints",
    variant: "coral" as const,
  },
  transfer: {
    label: "Transfer to Novel Cases",
    description: "Applying concepts to new scenarios and unfamiliar contexts",
    subtext: "Apply in novel scenarios",
    variant: "soft-blue" as const,
  },
  retention: {
    label: "Spaced Retention",
    description: "Recalling concepts reliably over time after a break",
    subtext: "Recall reliably after a break",
    variant: "yellow" as const,
  },
};

export function ProofScreen({
  onLearn,
}: {
  onLearn?: (launch: LearningLaunch) => void;
}) {
  const { subjects, courses, sessions, memory, localState, map } = useOvael();
  const [subject, setSubject] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [states, setStates] = useState<State[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchProofData = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    void api(
      `/v1/proof-learning${subject ? `?subject_id=${encodeURIComponent(subject)}` : ""}`
    )
      .then((r) => {
        if (!cancelled) {
          const saved =
            memory?.memory_mode === "local_first" && r.scope === "persistent"
              ? localState.flatMap((delta) =>
                  (!subject || delta.subject_id === subject) &&
                  Array.isArray(delta.proof_states)
                    ? (delta.proof_states as State[])
                    : []
                )
              : [];
          const merged = [
            ...new Map(
              [...r.states, ...saved].map((state: State) => [
                state.concept_id,
                state,
              ])
            ).values(),
          ] as State[];
          const unstarted = map.nodes
            .filter(
              (node) =>
                node.subject_id &&
                (!subject || node.subject_id === subject) &&
                !merged.some((state) => state.concept_id === node.id)
            )
            .map((node) => ({
              concept_id: node.id,
              concept_name: node.label,
              status:
                node.status === "unknown" &&
                !sessions.some(
                  (session) =>
                    session.concept_id === node.id &&
                    (session.turn_count || 0) > 0
                )
                  ? "not_started"
                  : "needs_skill_checks",
              acquisition: 0,
              independent: 0,
              transfer: 0,
              retention: 0,
              retention_due: false,
              evidence_mass: {},
            }));
          setStates(
            [...merged, ...unstarted].map((state) => ({
              ...state,
              concept_name:
                state.concept_name ||
                map.nodes.find((node) => node.id === state.concept_id)?.label ||
                state.concept_id,
            }))
          );
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Failed to load skill evidence.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [subject, memory?.memory_mode, localState, map, sessions]);

  useEffect(() => {
    return fetchProofData();
  }, [fetchProofData]);

  // Filtered evidence states
  const filteredStates = useMemo(() => {
    return states.filter((s) => {
      // 1. Text Search Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const node = map.nodes.find((item) => item.id === s.concept_id);
        const sub = subjects.find((sub) => sub.subject_id === node?.subject_id);
        const matchesName = (s.concept_name || "").toLowerCase().includes(q);
        const matchesSubject = (sub?.name || "").toLowerCase().includes(q);
        if (!matchesName && !matchesSubject) return false;
      }

      // 2. Status Filter
      if (statusFilter === "verified" && s.status !== "verified") return false;
      if (statusFilter === "needs_evidence" && s.status !== "needs_skill_checks") return false;
      if (statusFilter === "review_due" && !s.retention_due) return false;
      if (statusFilter === "unstarted" && s.status !== "not_started") return false;

      return true;
    });
  }, [states, searchQuery, statusFilter, map.nodes, subjects]);

  // Aggregate Stats
  const verifiedCount = useMemo(
    () => states.filter((s) => s.status === "verified").length,
    [states]
  );
  const reviewDueCount = useMemo(
    () => states.filter((s) => s.retention_due).length,
    [states]
  );

  const hasActiveFilters = Boolean(subject || searchQuery || statusFilter !== "all");

  const resetFilters = () => {
    setSubject("");
    setSearchQuery("");
    setStatusFilter("all");
  };

  return (
    <div className="page proof-page" role="region" aria-label="Skills Evidence">
      {/* Editorial Header */}
      <header className="page-heading proof-header">
        <div className="proof-header-info">
          <p className="proof-eyebrow">Skills Evidence</p>
          <h1 className="proof-title">Skills Evidence</h1>
          <p className="proof-lead">
            Help learners inspect the available evidence associated with their learning and understanding.
          </p>
        </div>
      </header>

      {/* Summary Metrics Strip */}
      <div className="proof-stats-strip" aria-label="Evidence metrics summary">
        <div className="proof-stat-item" title={`${states.length} total concepts tracked`}>
          <div className="proof-stat-icon icon-cobalt" aria-hidden="true">
            <Activity size={16} />
          </div>
          <div className="proof-stat-info">
            <span className="proof-stat-val">{states.length}</span>
            <span className="proof-stat-lbl">Tracked Skills</span>
          </div>
        </div>

        <div className="proof-stat-divider" aria-hidden="true" />

        <div className="proof-stat-item" title={`${verifiedCount} verified skills`}>
          <div className="proof-stat-icon icon-teal" aria-hidden="true">
            <CheckCircle2 size={16} />
          </div>
          <div className="proof-stat-info">
            <span className="proof-stat-val">{verifiedCount}</span>
            <span className="proof-stat-lbl">Verified Mastery</span>
          </div>
        </div>

        <div className="proof-stat-divider" aria-hidden="true" />

        <div className="proof-stat-item" title={`${reviewDueCount} spaced reviews due`}>
          <div className="proof-stat-icon icon-coral" aria-hidden="true">
            <RotateCcw size={16} />
          </div>
          <div className="proof-stat-info">
            <span className="proof-stat-val">{reviewDueCount}</span>
            <span className="proof-stat-lbl">Reviews Due</span>
          </div>
        </div>

        <div className="proof-stats-meta">
          Showing {filteredStates.length} of {states.length} skills
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="proof-filter-bar" aria-label="Filter evidence records">
        <div className="proof-search-wrap">
          <Search size={15} className="proof-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="proof-search-input"
            placeholder="Search skill or concept…"
            aria-label="Search skills by title or domain"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="proof-search-clear"
              aria-label="Clear search"
              onClick={() => setSearchQuery("")}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="proof-filters-group">
          {/* Subject Filter */}
          <select
            aria-label="Filter skills by subject domain"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="proof-select"
          >
            <option value="">All Subject Domains</option>
            {subjects.map((s) => (
              <option key={s.subject_id} value={s.subject_id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            aria-label="Filter skills by verification status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="proof-select"
          >
            <option value="all">All Verification Statuses</option>
            <option value="verified">Verified Only</option>
            <option value="needs_evidence">Needs Evidence</option>
            <option value="review_due">Spaced Review Due</option>
            <option value="unstarted">Unstarted</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="proof-reset-btn"
              onClick={resetFilters}
              aria-label="Reset all filters"
            >
              <X size={13} aria-hidden="true" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <aside className="proof-error-banner" role="alert">
          <div className="proof-error-message">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="proof-error-retry-btn"
            onClick={fetchProofData}
          >
            Retry
          </button>
        </aside>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="proof-loading-skeleton" aria-label="Loading skills evidence">
          {[1, 2, 3].map((n) => (
            <div key={n} className="proof-skeleton-card">
              <div className="proof-skeleton-header" />
              <div className="proof-skeleton-row" />
            </div>
          ))}
        </div>
      ) : (
        <div className="proof-cards-list" aria-label="Skills evidence cards">
          {filteredStates.map((s) => {
            const isVerified = s.status === "verified";
            const isUnstarted = s.status === "not_started";
            const node = map.nodes.find((item) => item.id === s.concept_id);
            const subjectObj = subjects.find(
              (sub) => sub.subject_id === node?.subject_id
            );
            const courseObj = courses.find(
              (course) => course.subject_id === node?.subject_id
            );
            const conceptSessions = sessions.filter(
              (sess) => sess.concept_id === s.concept_id
            );
            const totalTurns = conceptSessions.reduce(
              (acc, sess) => acc + (sess.turn_count || 0),
              0
            );
            const observationCount = Object.values(s.evidence_mass || {}).reduce(
              (a, b) => a + b,
              0
            );

            return (
              <article key={s.concept_id} className="proof-skill-card">
                {/* Card Header */}
                <div className="skill-card-header">
                  <div className="skill-card-header-left">
                    <div className="skill-meta-tags">
                      {subjectObj && (
                        <span className="skill-domain-pill">
                          <Layers size={11} aria-hidden="true" />
                          {subjectObj.name}
                        </span>
                      )}
                      {courseObj && (
                        <span className="skill-domain-pill">
                          <BookOpen size={11} aria-hidden="true" />
                          {courseObj.name}
                        </span>
                      )}
                      <span className="skill-activity-pill">
                        {conceptSessions.length > 0
                          ? `${conceptSessions.length} recorded session${
                              conceptSessions.length === 1 ? "" : "s"
                            } (${totalTurns} turn${totalTurns === 1 ? "" : "s"})`
                          : "No study sessions recorded yet"}
                      </span>
                    </div>

                    <h2 className="skill-concept-title">{s.concept_name}</h2>
                  </div>

                  {/* Status & Review Pills */}
                  <div className="skill-card-badges">
                    <span
                      className={`skill-status-tag ${
                        isVerified
                          ? "is-verified"
                          : isUnstarted
                            ? "is-unstarted"
                            : "is-checking"
                      }`}
                    >
                      {isVerified ? (
                        <>
                          <CheckCircle2 size={12} aria-hidden="true" /> Verified
                        </>
                      ) : isUnstarted ? (
                        <>
                          <Clock size={12} aria-hidden="true" /> Unstarted
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} aria-hidden="true" /> Needs Evidence
                        </>
                      )}
                    </span>

                    {s.retention_due && (
                      <span className="retention-pill">
                        <RotateCcw size={12} aria-hidden="true" /> Spaced Review Due
                      </span>
                    )}
                  </div>
                </div>

                {/* 4 Skill Dimensions Breakdown */}
                <div className="proof-dimensions-panel">
                  {(
                    [
                      "acquisition",
                      "independent",
                      "transfer",
                      "retention",
                    ] as const
                  ).map((d) => {
                    const cfg = DIMENSION_CONFIG[d];
                    const hasMass = (s.evidence_mass?.[d] || 0) > 0;
                    const score = Math.round(s[d] * 100);

                    return (
                      <div key={d} className="dimension-row">
                        <div className="dimension-label-group">
                          <span className="dimension-name">{cfg.label}</span>
                          <span
                            className={`dimension-score ${
                              hasMass ? "" : "no-evidence"
                            }`}
                          >
                            {hasMass ? `${score} / 100` : "No evidence yet"}
                          </span>
                        </div>

                        {hasMass ? (
                          <div className="dimension-progress-bar">
                            <AnimatedProgressBar
                              value={s[d]}
                              max={1}
                              variant={cfg.variant}
                            />
                          </div>
                        ) : (
                          <div
                            className="dimension-empty-bar"
                            title="No evidence recorded yet for this dimension"
                          />
                        )}

                        <small className="dimension-subtext">{cfg.subtext}</small>
                      </div>
                    );
                  })}
                </div>

                {/* Card Action & Observability Footer */}
                <div className="skill-card-footer">
                  <div className="skill-evidence-observations">
                    <Award size={14} aria-hidden="true" />
                    <span>
                      {observationCount > 0
                        ? `${observationCount} recorded evidence observation${
                            observationCount === 1 ? "" : "s"
                          }`
                        : "Diagnostic observation pending"}
                    </span>
                  </div>

                  {onLearn && (
                    <div className="skill-card-actions">
                      <button
                        type="button"
                        className="practice-skill-btn"
                        onClick={() => {
                          const resolvedSubjectId =
                            node?.subject_id ||
                            s.concept_id.split(":")[0] ||
                            subjects[0]?.subject_id ||
                            "";
                          onLearn({
                            subjectId: resolvedSubjectId,
                            courseId: courseObj?.course_id,
                            conceptId: s.concept_id,
                            conceptName: s.concept_name,
                            mode: s.retention_due ? "review" : "practice",
                          });
                        }}
                      >
                        <span>
                          {s.status === "not_started"
                            ? "Start Diagnostic"
                            : s.retention_due
                              ? "Complete Spaced Review"
                              : "Reinforce Skill"}
                        </span>
                        <ArrowRight size={14} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}

          {filteredStates.length === 0 && (
            <section
              className="proof-empty-card"
              aria-label="No skills evidence found"
            >
              <Award size={40} className="proof-empty-icon" aria-hidden="true" />
              <h3>
                {hasActiveFilters
                  ? "No matching skills evidence found"
                  : "Your Skill Verification Records Will Appear Here"}
              </h3>
              <p>
                {hasActiveFilters
                  ? "No skills match the current search query or filter criteria. Try resetting your filters to explore other skills."
                  : "Complete practice questions, diagnostics, and grounded sessions to verify mastery across all 4 learning dimensions."}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  className="proof-reset-btn"
                  onClick={resetFilters}
                  style={{ marginTop: 8 }}
                >
                  <X size={14} aria-hidden="true" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
