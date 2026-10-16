import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Focus } from "lucide-react";
import { ovaelApi } from "../../../api/client";
import { useOvael } from "../../../context/OvaelContext";
import { gapMermaid } from "../../../diagrams";
import { MermaidDiagram } from "../../content/MermaidDiagram";
import { api } from "../../../api";
import type {
  CausalGapCase,
  CausalGapReport,
  LearningLaunch,
} from "../../../types";
function learnerCopy(value: string) {
  return value.replaceAll("retained evidence window", "recent practice").replaceAll("unhinted first attempts", "answers without hints").replaceAll("observations", "practice records").replaceAll("No retained attempts are available", "No recent answers are available for this check");
}
function CausalMicrograph({ gap }: { gap: CausalGapCase }) {
  return (
    <MermaidDiagram
      source={gapMermaid(gap)}
      title={`Your practice map · ${gap.concept_name}`}
    />
  );
}
export function GapForensicsScreen({
  onLearn,
}: {
  onLearn: (launch: LearningLaunch) => void;
}) {
  const { subjects, memory, courses, refresh } = useOvael();
  const requestRevision = useRef(0);
  const [report, setReport] = useState<CausalGapReport | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [challengeReason, setChallengeReason] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const loadStored = useCallback(async (selectedSubject = "") => {
    const revision = ++requestRevision.current;
    setLoading(true);
    setError("");
    try {
      const next = await ovaelApi.causalGaps(selectedSubject || undefined);
      if (revision !== requestRevision.current) return;
      setReport(next);
      setSelectedId((current) =>
        next.cases.some((item) => item.case_id === current)
          ? current
          : next.cases[0]?.case_id || "",
      );
    } catch (nextError) {
      if (revision !== requestRevision.current) return;
      setError(
        nextError instanceof Error
          ? nextError.message
          : "IRIS could not load the gap analysis.",
      );
    } finally {
      if (revision === requestRevision.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void loadStored(""), 0);
    const revRef = requestRevision;
    return () => {
      window.clearTimeout(timer);
      revRef.current++;
    };
  }, [loadStored]);
  const analyze = async (selectedSubject = subjectId) => {
    if (memory?.personalization_enabled !== true) return;
    const revision = ++requestRevision.current;
    setLoading(true);
    setError("");
    try {
      const next = await ovaelApi.analyzeCausalGaps(
        selectedSubject || undefined,
      );
      if (revision !== requestRevision.current) return;
      setReport(next);
      setSelectedId(next.cases[0]?.case_id || "");
    } catch (nextError) {
      if (revision !== requestRevision.current) return;
      setError(
        nextError instanceof Error
          ? nextError.message
          : "IRIS could not complete the analysis.",
      );
    } finally {
      if (revision === requestRevision.current) setLoading(false);
    }
  };
  const selected =
    report?.cases.find((item) => item.case_id === selectedId) ||
    report?.cases[0];
  const beginPractice = async (gap?: CausalGapCase) => {
    const sid = gap?.subject_id || subjectId;
    if (!sid || actionBusy) return;
    setActionBusy(true);
    setError("");
    try {
      let course = courses.find((item) => item.subject_id === sid);
      if (!course) {
        const subject = subjects.find((item) => item.subject_id === sid);
        course = await ovaelApi.createCourse({
          name: subject?.name || "My course",
          subject_id: sid,
          course_kind: "personal",
        });
        await refresh();
      }
      const concepts = await api(`/v1/courses/${course!.course_id}/concepts`);
      const concept = gap
        ? concepts.find(
            (item: { concept_id: string }) =>
              item.concept_id === gap.target_concept_id,
          )
        : concepts[0];
      if (!concept)
        throw new Error(
          "Add a topic or material to this course before practicing it.",
        );
      onLearn({
        courseId: course!.course_id,
        subjectId: sid,
        conceptId: concept.concept_id,
        conceptName: concept.name,
        mode: "practice",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open practice.");
    } finally {
      setActionBusy(false);
    }
  };
  const challenge = async () => {
    if (!selected || !challengeReason.trim()) return;
    setActionBusy(true);
    setError("");
    try {
      const updated = await ovaelApi.challengeCausalGap(
        selected.case_id,
        challengeReason,
      );
      setReport((current) =>
        current
          ? {
              ...current,
              cases: current.cases.map((item) =>
                item.case_id === updated.case_id ? updated : item,
              ),
            }
          : current,
      );
      setChallengeOpen(false);
      setChallengeReason("");
      await loadStored(subjectId);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "The challenge could not be recorded.",
      );
    } finally {
      setActionBusy(false);
    }
  };
  return (
    <div className="iris-page simplified-gaps">
      <header className="iris-heading">
        <div>
          <h1>Your next steps</h1>
          <p>
            Find the gap, understand the mistake, and make a plan to improve.
          </p>
        </div>
        <div className="iris-controls">
          <label>
            Subject
            <select
              value={subjectId}
              disabled={loading || actionBusy}
              onChange={(e) => {
                setSubjectId(e.target.value);
                void loadStored(e.target.value);
              }}
            >
              <option value="">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject.subject_id} value={subject.subject_id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary-button"
            onClick={() => void analyze()}
            disabled={
              loading || actionBusy || memory?.personalization_enabled !== true
            }
          >
            {loading ? "Checking…" : "Check my progress"}
          </button>
        </div>
      </header>
      {memory?.personalization_enabled === false && (
        <p className="chat-notice">
          Resume personalization in Settings to update suggestions.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {loading && !report ? (
        <p role="status">Looking at your recent practice…</p>
      ) : !report?.cases.length ? (
        <section className="iris-empty">
          <Focus size={28} />
          <h2>
            {subjectId
              ? "Start with a first check"
              : "Choose a subject to get started"}
          </h2>
          <p>
            No practice gap is established here yet. A short question helps us
            see what to explain or practice next.
          </p>
          {subjectId && (
            <button
              className="primary-button"
              disabled={actionBusy}
              onClick={() => void beginPractice()}
            >
              {actionBusy ? "Opening…" : "Start practice"}
              <ArrowRight size={16} />
            </button>
          )}
        </section>
      ) : (
        <div className="iris-workspace">
          <aside className="iris-case-list" aria-label="Suggested topics">
            <header>
              <h2>Suggested topics</h2>
            </header>
            {report.cases.map((item) => (
              <button
                key={item.case_id}
                className={selected?.case_id === item.case_id ? "active" : ""}
                aria-pressed={selected?.case_id === item.case_id}
                onClick={() => {
                  setSelectedId(item.case_id);
                  setChallengeOpen(false);
                }}
              >
                <span className="iris-case-copy">
                  <strong>{item.concept_name}</strong>
                  <small>
                    {item.abstained ? "Try a fresh question" : item.cause_label}
                  </small>
                </span>
              </button>
            ))}
          </aside>
          {selected && (
            <article className="iris-dossier">
              <header className="iris-case-header">
                <div>
                  <h2>{selected.concept_name}</h2>
                  <p>
                    {selected.abstained
                      ? "We need more independent practice before identifying a specific gap."
                      : selected.learner_message}
                  </p>
                </div>
              </header>
              <section className="iris-next">
                <div>
                  <h3>
                    {selected.abstained
                      ? "Try one question on your own"
                      : selected.next_step.title}
                  </h3>
                  <p>
                    {selected.abstained
                      ? "Start without hints, then review the feedback together."
                      : selected.next_step.detail}
                  </p>
                </div>
                <button
                  className="primary-button"
                  disabled={actionBusy}
                  onClick={() => void beginPractice(selected)}
                >
                  Practice this <ArrowRight size={16} />
                </button>
              </section>
              <ol className="improvement-path">
                <li>
                  <span>1</span>
                  <div>
                    <strong>
                      {selected.abstained
                        ? "What we still need to check"
                        : "What is getting in the way"}
                    </strong>
                    <p>
                      {selected.abstained
                        ? "A clear first attempt, without hints. Missing evidence is not a mistake."
                        : selected.cause_label}
                    </p>
                  </div>
                </li>
                <li>
                  <span>2</span>
                  <div>
                    <strong>What your practice shows</strong>
                    {selected.evidence_for.slice(0, 3).map((item, index) => (
                      <p key={index}>{learnerCopy(item.detail)}</p>
                    ))}
                    {!selected.evidence_for.length && (
                      <p>
                        There is not enough evidence for a reliable conclusion
                        yet.
                      </p>
                    )}
                  </div>
                </li>
                <li>
                  <span>3</span>
                  <div>
                    <strong>How to improve</strong>
                    <p>{selected.abstained?"Try one question without hints so we can review the result.":learnerCopy(selected.next_step.detail)}</p>
                    <p>
                      Then try a different problem on your own. Revisit it later
                      to check what you remember.
                    </p>
                  </div>
                </li>
              </ol>
              <details className="gap-explanation" open>
                <summary>How these ideas connect</summary>
                <CausalMicrograph gap={selected} />
                <p>A map of this topic and the ideas to check next.</p>
              </details>
              <details className="gap-explanation">
                <summary>What your practice suggests</summary>
                {selected.evidence_for.map((item) => (
                  <p key={item.signal + item.detail}>{item.detail}</p>
                ))}
                {selected.evidence_against.map((item) => (
                  <p key={item}>{item}</p>
                ))}
                <p>These suggestions can change as you practice more.</p>
              </details>
              <button
                className="text-button"
                onClick={() => setChallengeOpen(!challengeOpen)}
              >
                This suggestion doesn't fit
              </button>
              {challengeOpen && (
                <section className="iris-challenge">
                  <label htmlFor="iris-challenge-reason">
                    What should we reconsider?
                  </label>
                  <textarea
                    id="iris-challenge-reason"
                    value={challengeReason}
                    onChange={(e) => setChallengeReason(e.target.value)}
                  />
                  <button
                    className="secondary-button"
                    disabled={!challengeReason.trim() || actionBusy}
                    onClick={() => void challenge()}
                  >
                    {actionBusy ? "Saving…" : "Save feedback"}
                  </button>
                </section>
              )}
            </article>
          )}
        </div>
      )}
    </div>
  );
}
