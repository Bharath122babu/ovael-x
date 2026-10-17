import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  GitFork,
  HelpCircle,
  MessageSquare,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  X,
} from "lucide-react";
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
  return value
    .replaceAll("retained evidence window", "recent practice")
    .replaceAll("unhinted first attempts", "answers without hints")
    .replaceAll("observations", "practice records")
    .replaceAll(
      "No retained attempts are available",
      "No recent answers are available for this check"
    );
}

function CausalMicrograph({ gap }: { gap: CausalGapCase }) {
  return (
    <div className="gap-micrograph-container">
      <MermaidDiagram
        source={gapMermaid(gap)}
        title={`Your practice map · ${gap.concept_name}`}
      />
    </div>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "high" | "misconception" | "abstained">("all");

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
          : next.cases[0]?.case_id || ""
      );
    } catch (nextError) {
      if (revision !== requestRevision.current) return;
      setError(
        nextError instanceof Error
          ? nextError.message
          : "IRIS could not load the gap analysis."
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
        selectedSubject || undefined
      );
      if (revision !== requestRevision.current) return;
      setReport(next);
      setSelectedId(next.cases[0]?.case_id || "");
    } catch (nextError) {
      if (revision !== requestRevision.current) return;
      setError(
        nextError instanceof Error
          ? nextError.message
          : "IRIS could not complete the analysis."
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
              item.concept_id === gap.target_concept_id
          )
        : concepts[0];
      if (!concept)
        throw new Error(
          "Add a topic or material to this course before practicing it."
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
        challengeReason
      );
      setReport((current) =>
        current
          ? {
              ...current,
              cases: current.cases.map((item) =>
                item.case_id === updated.case_id ? updated : item
              ),
            }
          : current
      );
      setChallengeOpen(false);
      setChallengeReason("");
      await loadStored(subjectId);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "The challenge could not be recorded."
      );
    } finally {
      setActionBusy(false);
    }
  };

  // Filter gap cases based on filterType and searchQuery
  const filteredCases = useMemo(() => {
    if (!report?.cases) return [];
    return report.cases.filter((item) => {
      // Type filter
      if (filterType === "high" && item.severity !== "high") return false;
      if (filterType === "misconception" && item.abstained) return false;
      if (filterType === "abstained" && !item.abstained) return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.concept_name.toLowerCase().includes(q) ||
        item.cause_label.toLowerCase().includes(q) ||
        item.learner_message.toLowerCase().includes(q)
      );
    });
  }, [report?.cases, filterType, searchQuery]);

  // Counts for filters
  const counts = useMemo(() => {
    const cases = report?.cases || [];
    return {
      all: cases.length,
      high: cases.filter((c) => c.severity === "high").length,
      misconception: cases.filter((c) => !c.abstained).length,
      abstained: cases.filter((c) => c.abstained).length,
    };
  }, [report?.cases]);

  // Subject display name
  const currentSubjectName = useMemo(() => {
    if (!subjectId) return "All Subjects";
    const sub = subjects.find((s) => s.subject_id === subjectId);
    return sub ? sub.name : subjectId;
  }, [subjectId, subjects]);

  return (
    <div className="page gaps-page simplified-gaps">
      {/* Editorial Page Header */}
      <header className="page-heading gaps-header">
        <div className="gaps-header-left">
          <span className="gaps-eyebrow">GAP ANALYSIS &amp; PRIORITIZATION</span>
          <h1 className="gaps-title">Practice Priorities</h1>
          <p className="page-lead">
            Focus your practice where conceptual misunderstandings or missing evidence need attention.
          </p>
        </div>

        {/* Header Controls: Subject Picker & Analyze Action */}
        <div className="gaps-header-controls">
          <div className="gaps-subject-select-wrap">
            <label htmlFor="gaps-subject-select" className="gaps-control-lbl">
              Curriculum Subject
            </label>
            <select
              id="gaps-subject-select"
              aria-label="Filter learning gaps by subject"
              className="gaps-subject-select"
              value={subjectId}
              disabled={loading || actionBusy}
              onChange={(e) => {
                const val = e.target.value;
                setSubjectId(val);
                void loadStored(val);
              }}
            >
              <option value="">All subjects</option>
              {subjects.map((sub) => (
                <option key={sub.subject_id} value={sub.subject_id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="gaps-analyze-btn"
            onClick={() => void analyze()}
            disabled={
              loading || actionBusy || memory?.personalization_enabled !== true
            }
            aria-label="Analyze progress and recalculate practice priorities"
            title={
              memory?.personalization_enabled === false
                ? "Resume personalization in Settings to re-run analysis"
                : "Run fresh gap forensics check on your recent practice"
            }
          >
            <RefreshCw size={14} className={loading ? "spin-icon" : ""} />
            <span>{loading ? "Analyzing…" : "Check Progress"}</span>
          </button>
        </div>
      </header>

      {/* Personalization Advisory Notice */}
      {memory?.personalization_enabled === false && (
        <aside className="chat-notice gaps-notice-banner" role="status">
          <AlertCircle size={15} />
          <span>Resume personalization in Settings to update adaptive gap suggestions.</span>
        </aside>
      )}

      {/* Global Error Banner */}
      {error && (
        <aside className="chat-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </aside>
      )}

      {/* Compact Real-Data Summary Strip */}
      {report?.summary && (
        <section className="gaps-summary-strip" aria-label="Learning gap overview metrics">
          <div className="gaps-summary-item" title={`${report.summary.case_count} total prioritized topics`}>
            <span className="summary-item-val">{report.summary.case_count}</span>
            <span className="summary-item-lbl">Total Gaps</span>
          </div>

          <div className="gaps-summary-divider" aria-hidden="true" />

          <div
            className="gaps-summary-item"
            title={`${report.summary.high_priority_count} critical priority items`}
          >
            <span className="summary-item-val is-high">
              {report.summary.high_priority_count}
            </span>
            <span className="summary-item-lbl">High Priority</span>
          </div>

          <div className="gaps-summary-divider" aria-hidden="true" />

          <div
            className="gaps-summary-item"
            title={`${counts.misconception} persistent misconceptions`}
          >
            <span className="summary-item-val is-misconception">
              {counts.misconception}
            </span>
            <span className="summary-item-lbl">Misconceptions</span>
          </div>

          <div className="gaps-summary-divider" aria-hidden="true" />

          <div
            className="gaps-summary-item"
            title={`${report.summary.abstained_count} concepts needing independent evidence`}
          >
            <span className="summary-item-val is-abstained">
              {report.summary.abstained_count}
            </span>
            <span className="summary-item-lbl">Needs Evidence</span>
          </div>

          {report.summary.headline && (
            <>
              <div className="gaps-summary-divider desktop-only" aria-hidden="true" />
              <div className="gaps-headline-callout desktop-only" title={report.summary.headline}>
                <Sparkles size={14} className="sparkle-icon" aria-hidden="true" />
                <span className="headline-text">{report.summary.headline}</span>
              </div>
            </>
          )}
        </section>
      )}

      {/* Loading Skeleton */}
      {loading && !report && (
        <div className="gaps-loading-skeleton" aria-busy="true" aria-label="Loading gap forensics report">
          <div className="skeleton-sidebar">
            <div className="skeleton-pill" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
            <div className="skeleton-card" />
          </div>
          <div className="skeleton-dossier">
            <div className="skeleton-hero" />
            <div className="skeleton-line" />
            <div className="skeleton-block" />
          </div>
        </div>
      )}

      {/* Empty State: No gap cases at all */}
      {!loading && (!report?.cases || report.cases.length === 0) && (
        <section className="gaps-empty-state" aria-label="No learning gaps found">
          <div className="empty-icon-wrap" aria-hidden="true">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="empty-title">
            {subjectId
              ? `No Active Gaps in ${currentSubjectName}`
              : "No Persistent Learning Gaps Established"}
          </h2>
          <p className="empty-desc">
            {subjectId
              ? "All assessed concepts in this subject meet current mastery confidence. Practice a new lesson or choose another subject."
              : "No persistent conceptual misunderstandings have been flagged across your practice records. Complete more lesson questions to discover focus areas."}
          </p>
          <div className="empty-actions">
            <button
              type="button"
              className="session-action-btn btn-primary"
              disabled={actionBusy}
              onClick={() => void beginPractice()}
            >
              <Play size={13} aria-hidden="true" />
              <span>{actionBusy ? "Opening…" : "Start Practice Session"}</span>
            </button>
            <button
              type="button"
              className="session-action-btn btn-secondary"
              disabled={loading || actionBusy}
              onClick={() => void analyze()}
            >
              <RefreshCw size={13} aria-hidden="true" />
              <span>Re-check Progress</span>
            </button>
          </div>
        </section>
      )}

      {/* Main Two-Pane Workspace */}
      {!loading && report?.cases && report.cases.length > 0 && (
        <div className="gaps-workspace-shell">
          {/* Master List: Left Pane */}
          <aside className="gaps-master-pane" aria-label="Identified practice priorities">
            <div className="gaps-master-header">
              <div className="master-title-line">
                <h2 className="master-heading">Identified Topics</h2>
                <span className="master-count-pill">{report.cases.length}</span>
              </div>

              {/* Filter Pills */}
              <div className="gaps-filter-pills" role="radiogroup" aria-label="Filter gap cases">
                <button
                  type="button"
                  role="radio"
                  aria-checked={filterType === "all"}
                  className={`filter-pill ${filterType === "all" ? "active" : ""}`}
                  onClick={() => setFilterType("all")}
                >
                  All ({counts.all})
                </button>
                {counts.high > 0 && (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={filterType === "high"}
                    className={`filter-pill ${filterType === "high" ? "active" : ""}`}
                    onClick={() => setFilterType("high")}
                  >
                    High ({counts.high})
                  </button>
                )}
                <button
                  type="button"
                  role="radio"
                  aria-checked={filterType === "misconception"}
                  className={`filter-pill ${filterType === "misconception" ? "active" : ""}`}
                  onClick={() => setFilterType("misconception")}
                >
                  Misconceptions ({counts.misconception})
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={filterType === "abstained"}
                  className={`filter-pill ${filterType === "abstained" ? "active" : ""}`}
                  onClick={() => setFilterType("abstained")}
                >
                  Evidence Needed ({counts.abstained})
                </button>
              </div>

              {/* Search Bar */}
              <div className="gaps-search-wrap">
                <Search size={14} className="search-icon" aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Search gap topics"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter by concept name…"
                  className="gaps-search-input"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="search-clear-btn"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear topic search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* List of Cases */}
            <div className="gaps-cases-list" role="list">
              {filteredCases.length === 0 ? (
                <div className="gaps-filter-empty">
                  <p>No topics match the selected filter.</p>
                  <button
                    type="button"
                    className="session-action-btn btn-secondary btn-sm"
                    onClick={() => {
                      setFilterType("all");
                      setSearchQuery("");
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredCases.map((item) => {
                  const isSelected = selected?.case_id === item.case_id;
                  const isHigh = item.severity === "high";

                  return (
                    <button
                      key={item.case_id}
                      type="button"
                      role="listitem"
                      aria-pressed={isSelected}
                      className={`gap-case-card ${isSelected ? "is-selected" : ""} ${
                        isHigh ? "is-high-priority" : ""
                      }`}
                      onClick={() => {
                        setSelectedId(item.case_id);
                        setChallengeOpen(false);
                      }}
                    >
                      <div className="case-card-top">
                        <span className="case-concept-title">{item.concept_name}</span>
                        {isHigh && (
                          <span className="badge-severity high" title="High Priority Review">
                            <AlertTriangle size={10} aria-hidden="true" />
                            <span>High</span>
                          </span>
                        )}
                      </div>

                      <div className="case-card-cause-line">
                        {item.abstained ? (
                          <span className="cause-tag abstained">
                            <HelpCircle size={11} aria-hidden="true" />
                            <span>Needs Evidence</span>
                          </span>
                        ) : (
                          <span className="cause-tag misconception">
                            <Target size={11} aria-hidden="true" />
                            <span>{item.cause_label}</span>
                          </span>
                        )}
                      </div>

                      <div className="case-card-meta-line">
                        {item.recommended_minutes > 0 && (
                          <span className="case-meta-chip" title="Recommended Practice Duration">
                            <Clock size={11} aria-hidden="true" />
                            <span>{item.recommended_minutes}m practice</span>
                          </span>
                        )}
                        {item.focus_allocation_pct > 0 && (
                          <span className="case-meta-chip" title="Focus Allocation Ratio">
                            <span>{item.focus_allocation_pct}% focus</span>
                          </span>
                        )}
                        {item.mastery_belief != null && (
                          <span className="case-meta-chip" title="Estimated Concept Mastery">
                            <span>{Math.round(item.mastery_belief * 100)}% mastery</span>
                          </span>
                        )}
                      </div>

                      <div className="case-card-arrow" aria-hidden="true">
                        <ArrowRight size={13} />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Detail Dossier: Right Pane */}
          {selected && (
            <article className="gaps-detail-dossier" aria-label={`Details for ${selected.concept_name}`}>
              {/* Dossier Header */}
              <div className="dossier-hero-card">
                <div className="dossier-header-top">
                  <div className="dossier-title-group">
                    <div className="dossier-chips-row">
                      <span className={`badge-severity ${selected.severity}`}>
                        {selected.severity === "high" && <AlertTriangle size={11} aria-hidden="true" />}
                        <span>{selected.severity.toUpperCase()} PRIORITY</span>
                      </span>

                      {selected.abstained ? (
                        <span className="cause-tag abstained">
                          <HelpCircle size={11} aria-hidden="true" />
                          <span>More Evidence Needed</span>
                        </span>
                      ) : (
                        <span className="cause-tag misconception">
                          <Target size={11} aria-hidden="true" />
                          <span>{selected.cause_label}</span>
                        </span>
                      )}

                      <span className="dossier-subject-tag">
                        <BookOpen size={11} aria-hidden="true" />
                        <span>{selected.subject_id}</span>
                      </span>
                    </div>

                    <h2 className="dossier-concept-name">{selected.concept_name}</h2>

                    <p className="dossier-learner-message">
                      {selected.abstained
                        ? "We need more independent practice before identifying a specific gap."
                        : selected.learner_message}
                    </p>
                  </div>

                  {/* Primary Action Button */}
                  <div className="dossier-header-actions">
                    <button
                      type="button"
                      className="session-action-btn btn-primary dossier-practice-btn"
                      disabled={actionBusy}
                      onClick={() => void beginPractice(selected)}
                      aria-label={`Practice ${selected.concept_name}`}
                    >
                      <Play size={14} aria-hidden="true" />
                      <span>{actionBusy ? "Opening…" : "Practice This"}</span>
                    </button>
                  </div>
                </div>

                {/* Recommended Next Action Highlight Card */}
                <div className="dossier-next-action-box">
                  <div className="next-action-header">
                    <Sparkles size={15} className="sparkle-icon" aria-hidden="true" />
                    <span className="next-action-eyebrow">RECOMMENDED ACTION</span>
                  </div>
                  <h3 className="next-action-title">
                    {selected.abstained
                      ? "Try one question on your own"
                      : selected.next_step.title}
                  </h3>
                  <p className="next-action-detail">
                    {selected.abstained
                      ? "Start without hints, then review the feedback together."
                      : selected.next_step.detail}
                  </p>
                </div>
              </div>

              {/* 3-Step Forensics Investigation Sections */}
              <section className="dossier-evidence-sections">
                <div className="forensic-step-card">
                  <div className="step-num-badge">1</div>
                  <div className="step-content">
                    <h4 className="step-title">
                      {selected.abstained
                        ? "What We Still Need to Check"
                        : "Root Misconception Identified"}
                    </h4>
                    <p className="step-lead">
                      {selected.abstained
                        ? "A clear first attempt, without hints. Missing evidence is not treated as a mistake."
                        : selected.cause_label}
                    </p>
                    {selected.falsification_check && (
                      <div className="falsification-box">
                        <strong>Falsification Test:</strong>
                        <span>{selected.falsification_check}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="forensic-step-card">
                  <div className="step-num-badge">2</div>
                  <div className="step-content">
                    <h4 className="step-title">
                      What Your Practice Shows ({selected.evidence_count} records)
                    </h4>

                    {selected.evidence_for && selected.evidence_for.length > 0 ? (
                      <ul className="evidence-signals-list">
                        {selected.evidence_for.map((item, idx) => (
                          <li key={idx} className="evidence-signal-row">
                            <span className="signal-badge">{item.signal.replaceAll("_", " ")}</span>
                            <span className="signal-text">{learnerCopy(item.detail)}</span>
                            {item.strength != null && (
                              <span
                                className="signal-strength"
                                title={`Signal confidence: ${Math.round(item.strength * 100)}%`}
                              >
                                {Math.round(item.strength * 100)}%
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="step-lead">
                        There is not enough recorded evidence for a definitive conclusion yet.
                      </p>
                    )}

                    {selected.evidence_against && selected.evidence_against.length > 0 && (
                      <div className="counter-evidence-box">
                        <span className="counter-label">Counter-signals observed:</span>
                        <ul>
                          {selected.evidence_against.map((against, idx) => (
                            <li key={idx}>{against}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="forensic-step-card">
                  <div className="step-num-badge">3</div>
                  <div className="step-content">
                    <h4 className="step-title">Improvement Path</h4>
                    <p className="step-lead">
                      {selected.abstained
                        ? "Try one question without hints so IRIS can review the diagnostic result."
                        : learnerCopy(selected.next_step.detail)}
                    </p>
                    <p className="step-sublead">
                      Then solve a contrast problem on your own and revisit after 24 hours to test retention.
                    </p>
                  </div>
                </div>
              </section>

              {/* Collapsible Topic & Dependency Map (Causal Micrograph) */}
              <details className="dossier-micrograph-section" open>
                <summary className="micrograph-summary">
                  <div className="summary-left">
                    <GitFork size={15} aria-hidden="true" />
                    <span>How These Concepts Connect (Topic Micrograph)</span>
                  </div>
                  <span className="summary-pill">Interactive Graph</span>
                </summary>

                <div className="micrograph-body">
                  <CausalMicrograph gap={selected} />
                  <p className="micrograph-caption">
                    {selected.micrograph?.caption ||
                      "Visual map showing the focus topic and related prerequisite or blocker connections."}
                  </p>
                </div>
              </details>

              {/* Challenge / Reconsider Suggestion Drawer */}
              <div className="dossier-challenge-footer">
                <button
                  type="button"
                  className="challenge-toggle-btn"
                  onClick={() => setChallengeOpen(!challengeOpen)}
                  aria-expanded={challengeOpen}
                  aria-controls="gaps-challenge-panel"
                >
                  <MessageSquare size={14} aria-hidden="true" />
                  <span>{challengeOpen ? "Hide Feedback Form" : "This suggestion doesn't fit"}</span>
                </button>

                {selected.challenge && (
                  <div className="recorded-challenge-pill" title={selected.challenge.reason}>
                    <CheckCircle2 size={12} />
                    <span>Feedback recorded: &ldquo;{selected.challenge.reason}&rdquo;</span>
                  </div>
                )}
              </div>

              {challengeOpen && (
                <section
                  id="gaps-challenge-panel"
                  className="gaps-challenge-drawer"
                  aria-label="Submit feedback on this gap suggestion"
                >
                  <label htmlFor="gaps-challenge-reason" className="challenge-label">
                    What should IRIS reconsider about this topic?
                  </label>
                  <textarea
                    id="gaps-challenge-reason"
                    rows={3}
                    placeholder="Describe why this topic suggestion doesn't fit your current understanding or goals…"
                    value={challengeReason}
                    onChange={(e) => setChallengeReason(e.target.value)}
                    className="challenge-textarea"
                  />
                  <div className="challenge-actions">
                    <button
                      type="button"
                      className="session-action-btn btn-secondary"
                      onClick={() => {
                        setChallengeOpen(false);
                        setChallengeReason("");
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="session-action-btn btn-primary"
                      disabled={!challengeReason.trim() || actionBusy}
                      onClick={() => void challenge()}
                    >
                      {actionBusy ? "Saving…" : "Save Feedback"}
                    </button>
                  </div>
                </section>
              )}
            </article>
          )}
        </div>
      )}
    </div>
  );
}
