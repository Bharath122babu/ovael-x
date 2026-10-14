import { useEffect, useState } from "react";
import { api } from "../../../api";
import { useOvael } from "../../../context/OvaelContext";
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
export function ProofScreen({
  onLearn,
}: {
  onLearn?: (launch: LearningLaunch) => void;
}) {
  const { subjects, courses, sessions, memory, localState, map } = useOvael(),
    [subject, setSubject] = useState(""),
    [states, setStates] = useState<State[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    void api(
      `/v1/proof-learning${subject ? `?subject_id=${encodeURIComponent(subject)}` : ""}`,
    )
      .then((r) => {
        if (!cancelled) {
          const saved =
            memory?.memory_mode === "local_first" && r.scope === "persistent"
              ? localState.flatMap((delta) =>
                  (!subject || delta.subject_id === subject) &&
                  Array.isArray(delta.proof_states)
                    ? (delta.proof_states as State[])
                    : [],
                )
              : [];
          const merged = [
            ...new Map(
              [...r.states, ...saved].map((state: State) => [
                state.concept_id,
                state,
              ]),
            ).values(),
          ] as State[];
          const unstarted = map.nodes
            .filter(
              (node) =>
                node.subject_id &&
                (!subject || node.subject_id === subject) &&
                !merged.some((state) => state.concept_id === node.id),
            )
            .map((node) => ({
              concept_id: node.id,
              concept_name: node.label,
              status: node.status === "unknown" && !sessions.some(session=>session.concept_id===node.id&&(session.turn_count||0)>0) ? "not_started" : "needs_skill_checks",
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
            })),
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
  }, [subject, memory?.memory_mode, localState, map]);
  return (
    <div className="page">
      <header className="page-heading">
        <p className="eyebrow blue">Learning evidence</p>
        <h1>Your learning skills</h1>
        <p>See which skills you have practiced and what needs another check.</p>
        <label>
          Subject
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.subject_id} value={s.subject_id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </header>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p role="status">Loading your evidence…</p>
      ) : (
        <div className="proof-cards">
          {states.map((s) => (
            <article key={s.concept_id}>
              <p className="eyebrow">{s.status.replaceAll("_", " ")}</p>
              <h2>{s.concept_name}</h2>
              <div className="proof-dimensions">
                {(
                  [
                    "acquisition",
                    "independent",
                    "transfer",
                    "retention",
                  ] as const
                ).map((d) => (
                  <div key={d}>
                    <span>
                      {
                        {
                          acquisition: "Understanding",
                          independent: "On your own",
                          transfer: "New problems",
                          retention: "Remembering",
                        }[d]
                      }
                    </span>
                    <strong>
                      {s.evidence_mass?.[d] > 0
                        ? `${Math.round(s[d] * 100)} / 100`
                        : "Not checked yet"}
                    </strong>
                    {s.evidence_mass?.[d] > 0 && (
                      <meter
                        min={0}
                        max={1}
                        value={s[d]}
                        aria-label={`${d} evidence index`}
                      />
                    )}
                    <small>
                      {
                        {
                          acquisition: "Explain the idea with an example",
                          independent: "Solve without hints",
                          transfer: "Apply it in a different problem",
                          retention: "Recall it after a break",
                        }[d]
                      }
                    </small>
                  </div>
                ))}
              </div>
              {s.retention_due && (
                <p className="lesson-note">Time for a quick review.</p>
              )}
              {onLearn && (
                <button
                  className="secondary-button"
                  onClick={() => {
                    const node = map.nodes.find(
                      (node) => node.id === s.concept_id,
                    );
                    if (node?.subject_id)
                      onLearn({
                        subjectId: node.subject_id,
                        courseId: courses.find(
                          (course) => course.subject_id === node.subject_id,
                        )?.course_id,
                        conceptId: s.concept_id,
                        conceptName: s.concept_name,
                        mode: s.retention_due ? "review" : "practice",
                      });
                  }}
                >
                  {" "}
                  {s.status === "not_started"
                    ? "Start a first check"
                    : s.retention_due
                      ? "Review now"
                      : "Practice this skill"}
                </button>
              )}
            </article>
          ))}
          {!states.length && (
            <section className="empty-library">
              <h2>Your skills will appear here</h2>
              <p>Try a practice question to see your progress.</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
