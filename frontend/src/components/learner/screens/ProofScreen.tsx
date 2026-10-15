import { useEffect, useState } from "react";
import {
  Award,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  RotateCcw,
  Sparkles,
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
    subtext: "Explain the idea with an example",
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
    subtext: "Apply it in a different problem",
    variant: "soft-blue" as const,
  },
  retention: {
    label: "Spaced Retention",
    description: "Recalling concepts reliably over time after a break",
    subtext: "Recall it after a break",
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
  const [states, setStates] = useState<State[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subject, memory?.memory_mode, localState, map, sessions]);

  return (
    <div className="page proof-page">
      {/* Header */}
      <header className="page-heading proof-header">
        <div className="proof-header-info">
          <p className="eyebrow blue">Multidimensional Proof of Learning</p>
          <h1>Skill Verification & Evidence</h1>
          <p className="page-lead">
            Tracking 4 dimensions of mastery: conceptual understanding, independent solving, transfer to new problems, and spaced retention.
          </p>
        </div>

        <div className="proof-tools">
          <label className="subject-filter-label">
            <span className="filter-text">Subject:</span>
            <select
              aria-label="Filter skills by subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="proof-subject-select"
            >
              <option value="">All Subject Domains</option>
              {subjects.map((s) => (
                <option key={s.subject_id} value={s.subject_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {error && (
        <aside className="chat-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </aside>
      )}

      {loading ? (
        <div className="proof-loading-state">
          <p>Analyzing recorded skill observations…</p>
        </div>
      ) : (
        <div className="proof-cards-grid" aria-label="Skills evidence cards">
          {states.map((s) => {
            const isVerified = s.status === "verified";
            const isUnstarted = s.status === "not_started";

            return (
              <article key={s.concept_id} className="proof-skill-card">
                <div className="skill-card-top">
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
                          <CheckCircle2 size={12} /> Verified
                        </>
                      ) : isUnstarted ? (
                        <>
                          <Clock size={12} /> Unstarted
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} /> Needs Evidence
                        </>
                      )}
                    </span>

                    {s.retention_due && (
                      <span className="retention-pill">
                        <RotateCcw size={12} /> Spaced Review Due
                      </span>
                    )}
                  </div>

                  <h3 className="skill-concept-title">{s.concept_name}</h3>
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
                    const hasMass = s.evidence_mass?.[d] > 0;
                    const score = Math.round(s[d] * 100);

                    return (
                      <div key={d} className="dimension-row">
                        <div className="dimension-label-group">
                          <span className="dimension-name">{cfg.label}</span>
                          <span className="dimension-score">
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
                          <div className="dimension-empty-bar" />
                        )}

                        <small className="dimension-subtext">{cfg.subtext}</small>
                      </div>
                    );
                  })}
                </div>

                {/* Card Action Footer */}
                {onLearn && (
                  <div className="skill-card-actions">
                    <button
                      type="button"
                      className="primary-button full practice-skill-btn"
                      onClick={() => {
                        const node = map.nodes.find(
                          (item) => item.id === s.concept_id
                        );
                        if (node?.subject_id) {
                          onLearn({
                            subjectId: node.subject_id,
                            courseId: courses.find(
                              (course) => course.subject_id === node.subject_id
                            )?.course_id,
                            conceptId: s.concept_id,
                            conceptName: s.concept_name,
                            mode: s.retention_due ? "review" : "practice",
                          });
                        }
                      }}
                    >
                      <span>
                        {s.status === "not_started"
                          ? "Start Initial Diagnostic"
                          : s.retention_due
                            ? "Complete Spaced Review"
                            : "Reinforce Skill"}
                      </span>
                      <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </article>
            );
          })}

          {states.length === 0 && (
            <section className="proof-empty-card" aria-label="No skills recorded">
              <Award size={40} />
              <h3>Your Skill Verification Records Will Appear Here</h3>
              <p>Complete practice questions and diagnostic assessments to verify mastery across all 4 learning dimensions.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
