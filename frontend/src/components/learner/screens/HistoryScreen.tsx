import { useState, useMemo } from "react";
import {
  RefreshCw,
  Clock,
  BookOpen,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
  RotateCcw,
  Play,
  Layers,
} from "lucide-react";
import { useOvael } from "../../../context/OvaelContext";
import { engagement } from "../../../rewards";
import { api } from "../../../api";
import { RichText } from "../../content/RichText";
import type { LearningLaunch, TeachingSession } from "../../../types";

function getSessionDate(s: TeachingSession): Date | null {
  const raw = s.updated_at || s.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
}

function formatDateGroupHeading(date: Date | null): string {
  if (!date) return "Other Sessions";

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();

  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatSessionTime(date: Date | null): string {
  if (!date) return "Time unavailable";
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface DateGroup {
  dateKey: string;
  displayDate: string;
  sessions: TeachingSession[];
}

export function HistoryScreen({
  onLearn,
}: {
  onLearn?: (launch: LearningLaunch) => void;
}) {
  const { sessions, map, refresh, courses, loading, error } = useOvael();
  const reward = engagement(sessions);

  const [review, setReview] = useState<any>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "active">("all");

  const totalSessions = sessions.length;
  const completedCount = useMemo(
    () => sessions.filter((s) => s.status === "completed").length,
    [sessions]
  );
  const activeCount = useMemo(
    () => sessions.filter((s) => s.status === "active").length,
    [sessions]
  );

  async function openReview(id: string, generate = false) {
    setReviewBusy(true);
    setReviewError("");
    try {
      setReview(
        await api(
          `/v1/learning/sessions/${id}/review`,
          generate ? "POST" : "GET"
        )
      );
    } catch (e) {
      setReviewError(
        e instanceof Error ? e.message : "Could not load session conversation review."
      );
    } finally {
      setReviewBusy(false);
    }
  }

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const conceptName = map.nodes.find((n) => n.id === s.concept_id)?.label || s.concept_id;
      const courseName = courses.find((c) => c.course_id === s.course_id)?.name || "";
      const goalStr = s.goal || "";
      const modeStr = s.mode || "";
      return (
        conceptName.toLowerCase().includes(q) ||
        courseName.toLowerCase().includes(q) ||
        goalStr.toLowerCase().includes(q) ||
        modeStr.toLowerCase().includes(q)
      );
    });
  }, [sessions, statusFilter, searchQuery, map.nodes, courses]);

  // Group filtered sessions chronologically (newest first)
  const groupedSessions = useMemo(() => {
    const sorted = [...filteredSessions].sort((a, b) => {
      const da = getSessionDate(a)?.getTime() ?? 0;
      const db = getSessionDate(b)?.getTime() ?? 0;
      return db - da;
    });

    const groups: DateGroup[] = [];
    const dateMap = new Map<string, TeachingSession[]>();

    for (const s of sorted) {
      const d = getSessionDate(s);
      const key = d ? d.toISOString().split("T")[0] : "unknown";
      if (!dateMap.has(key)) {
        dateMap.set(key, []);
      }
      dateMap.get(key)!.push(s);
    }

    for (const [key, sessionList] of dateMap.entries()) {
      const sampleDate = getSessionDate(sessionList[0]);
      groups.push({
        dateKey: key,
        displayDate: formatDateGroupHeading(sampleDate),
        sessions: sessionList,
      });
    }

    return groups;
  }, [filteredSessions]);

  return (
    <div className="page history-page">
      {/* Editorial Header */}
      <header className="page-heading history-header">
        <div className="history-header-left">
          <span className="history-eyebrow">ACTIVITY TIMELINE</span>
          <h1 className="history-title">Learning Activity</h1>
          <p className="page-lead">
            Review your previous learning sessions and continue where you left off.
          </p>
        </div>

        <button
          type="button"
          className="refresh-history-btn"
          disabled={reviewBusy}
          onClick={() => void refresh()}
          aria-label="Refresh learning activity"
        >
          <RefreshCw size={14} className={reviewBusy ? "spin-icon" : ""} />
          <span>Refresh</span>
        </button>
      </header>

      {/* Global Error Banner */}
      {(error || reviewError) && (
        <aside className="chat-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{reviewError || error}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              setReviewError("");
            }}
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </aside>
      )}

      {/* Compact Activity Summary Strip */}
      <section className="history-summary-strip" aria-label="Learning activity summary">
        <div className="summary-stat-item" title={`${totalSessions} total recorded sessions`}>
          <span className="summary-stat-val">{totalSessions}</span>
          <span className="summary-stat-lbl">Total Sessions</span>
        </div>
        <div className="summary-stat-divider" aria-hidden="true" />
        <div className="summary-stat-item" title={`${completedCount} completed sessions`}>
          <span className="summary-stat-val is-completed">{completedCount}</span>
          <span className="summary-stat-lbl">Completed</span>
        </div>
        <div className="summary-stat-divider" aria-hidden="true" />
        <div className="summary-stat-item" title={`${activeCount} in-progress sessions`}>
          <span className="summary-stat-val is-active">{activeCount}</span>
          <span className="summary-stat-lbl">In Progress</span>
        </div>
        <div className="summary-stat-divider" aria-hidden="true" />
        <div className="summary-stat-item" title={`${reward.points} practice points earned`}>
          <span className="summary-stat-val">{reward.points}</span>
          <span className="summary-stat-lbl">Practice Pts</span>
        </div>
        <div className="summary-stat-divider" aria-hidden="true" />
        <div className="summary-stat-item" title={`${reward.days} active learning days`}>
          <span className="summary-stat-val">{reward.days}</span>
          <span className="summary-stat-lbl">Study Days</span>
        </div>
      </section>

      {/* Active Conversation Review Card / Drawer */}
      {review && (
        <section className="session-review-card" aria-label="Session review detail">
          <div className="review-card-header">
            <div>
              <span className="eyebrow coral">Session Receipt</span>
              <h2>Conversation Analysis & Feedback</h2>
              <p className="topics-discussed">
                <strong>Concepts covered:</strong>{" "}
                {review.topics && review.topics.length > 0
                  ? review.topics.join(", ")
                  : "General subject inquiry"}
              </p>
            </div>

            <button
              type="button"
              className="icon-button close-review-btn"
              onClick={() => setReview(null)}
              aria-label="Close conversation review"
            >
              <X size={18} />
            </button>
          </div>

          <div className="review-summary-body">
            <div className="summary-markdown-box">
              <RichText markdown={review.summary || "No executive summary recorded for this session."} />
            </div>

            {review.next_step && (
              <div className="next-step-box">
                <Sparkles size={16} />
                <div>
                  <strong>Recommended Next Focus</strong>
                  <p>{review.next_step}</p>
                </div>
              </div>
            )}
          </div>

          <div className="review-actions-bar">
            <button
              type="button"
              className="session-action-btn btn-secondary"
              disabled={reviewBusy}
              onClick={() => void openReview(review.session.teaching_session_id, true)}
            >
              <RefreshCw size={14} className={reviewBusy ? "spin-icon" : ""} />
              <span>Generate Fresh Summary</span>
            </button>

            {onLearn && (
              <button
                type="button"
                className="session-action-btn btn-primary"
                disabled={reviewBusy}
                onClick={() => {
                  const s = review.session;
                  setReview(null);
                  onLearn({
                    subjectId: s.subject_id,
                    courseId: s.course_id,
                    conceptId: s.concept_id,
                    mode: "review",
                  });
                }}
              >
                <span>Continue Review Session</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>

          {/* Turn-by-Turn Evidence Accordion */}
          <details className="review-turns-accordion">
            <summary className="accordion-summary">
              <span>View Submitted Responses & Tutor Feedback ({review.turns?.length || 0})</span>
            </summary>

            <div className="turns-list">
              {review.turns?.map((turn: any, index: number) => {
                const isCorrect = turn.correct;
                const isGraded = turn.graded;

                return (
                  <article key={index} className="turn-receipt-row">
                    <div className="turn-receipt-header">
                      <span className="turn-num-pill">Turn {index + 1}</span>
                      <span
                        className={`turn-eval-badge ${
                          isGraded ? (isCorrect ? "is-correct" : "is-practice") : "is-ungraded"
                        }`}
                      >
                        {isGraded ? (
                          isCorrect ? (
                            <>
                              <CheckCircle2 size={12} /> Correct
                            </>
                          ) : (
                            <>
                              <AlertCircle size={12} /> Needs Practice
                            </>
                          )
                        ) : (
                          <>
                            <HelpCircle size={12} /> Diagnostic
                          </>
                        )}
                      </span>
                    </div>

                    <div className="turn-response-text">
                      <strong>Your Answer:</strong>
                      <p>
                        {turn.response ||
                          String(turn.intent || "Exploratory response").replaceAll("_", " ")}
                      </p>
                    </div>

                    {turn.feedback && (
                      <div className="turn-feedback-box">
                        <strong>Tutor Rationale:</strong>
                        <p>{turn.feedback}</p>
                      </div>
                    )}

                    {turn.next_content && (
                      <details className="turn-subdetails">
                        <summary>Show Follow-up Explanation</summary>
                        <div className="next-content-rich">
                          <RichText markdown={turn.next_content} />
                        </div>
                      </details>
                    )}
                  </article>
                );
              })}

              {(!review.turns || review.turns.length === 0) && (
                <p className="no-turns-note">
                  No submitted answers in this session. Questions were answered or reviewed without recorded assessment turns.
                </p>
              )}
            </div>
          </details>
        </section>
      )}

      {/* History Toolbar: Search & Status Filters */}
      <div className="history-toolbar">
        <div className="history-search-wrap">
          <Search size={15} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            aria-label="Search learning history"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by topic, course, or goal…"
            className="history-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search query"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="history-filter-pills" role="radiogroup" aria-label="Filter sessions by status">
          <button
            type="button"
            role="radio"
            aria-checked={statusFilter === "all"}
            className={`filter-pill ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => setStatusFilter("all")}
          >
            All ({sessions.length})
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={statusFilter === "completed"}
            className={`filter-pill ${statusFilter === "completed" ? "active" : ""}`}
            onClick={() => setStatusFilter("completed")}
          >
            Completed ({completedCount})
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={statusFilter === "active"}
            className={`filter-pill ${statusFilter === "active" ? "active" : ""}`}
            onClick={() => setStatusFilter("active")}
          >
            In Progress ({activeCount})
          </button>
        </div>
      </div>

      {/* Restrained Loading Skeleton */}
      {loading && sessions.length === 0 && (
        <div className="history-skeleton-list" aria-busy="true" aria-label="Loading learning sessions">
          <div className="history-skeleton-card" />
          <div className="history-skeleton-card" />
          <div className="history-skeleton-card" />
        </div>
      )}

      {/* Empty State: No sessions at all */}
      {!loading && sessions.length === 0 && (
        <div className="history-empty-state">
          <div className="empty-icon-wrap" aria-hidden="true">
            <BookOpen size={28} />
          </div>
          <h3 className="empty-title">No Learning Sessions Recorded Yet</h3>
          <p className="empty-desc">
            Your interactive tutoring conversations, practice attempts, and evaluations will be tracked on this timeline.
          </p>
        </div>
      )}

      {/* Empty State: Filter produced no matches */}
      {sessions.length > 0 && filteredSessions.length === 0 && (
        <div className="history-empty-state">
          <div className="empty-icon-wrap" aria-hidden="true">
            <Search size={26} />
          </div>
          <h3 className="empty-title">No matching learning sessions</h3>
          <p className="empty-desc">
            No recorded sessions matched your search or filter selection.
          </p>
          <button
            type="button"
            className="session-action-btn btn-secondary"
            onClick={() => {
              setSearchQuery("");
              setStatusFilter("all");
            }}
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Activity Timeline List */}
      {filteredSessions.length > 0 && (
        <div className="activity-timeline-container" aria-label="Learning sessions timeline">
          {groupedSessions.map((group) => (
            <section key={group.dateKey} className="timeline-date-group">
              <div className="timeline-date-header">
                <span className="date-header-badge">
                  <Clock size={12} aria-hidden="true" />
                  <span>{group.displayDate}</span>
                  <span className="date-count-pill">({group.sessions.length})</span>
                </span>
                <div className="date-header-line" aria-hidden="true" />
              </div>

              <div className="timeline-entries-list">
                {group.sessions.map((s) => {
                  const node = map.nodes.find((n) => n.id === s.concept_id);
                  const conceptTitle = node?.label || s.concept_id;
                  const courseObj = courses.find((c) => c.course_id === s.course_id);
                  const isCompleted = s.status === "completed";
                  const sessionDate = getSessionDate(s);
                  const timeStr = formatSessionTime(sessionDate);

                  return (
                    <article key={s.teaching_session_id} className="timeline-item-row">
                      {/* Timeline Marker Dot */}
                      <div
                        className={`timeline-marker-dot ${isCompleted ? "is-completed" : "is-active"}`}
                        title={isCompleted ? "Completed Session" : "In Progress Session"}
                        aria-hidden="true"
                      >
                        {isCompleted ? <CheckCircle2 size={13} /> : <Play size={10} />}
                      </div>

                      {/* Timeline Session Card */}
                      <div className="history-session-card">
                        <div className="session-card-main">
                          <div className="session-card-top-line">
                            <h3 className="session-concept-name">{conceptTitle}</h3>
                            <span
                              className={`session-status-badge ${
                                isCompleted ? "is-completed" : "is-active"
                              }`}
                            >
                              {isCompleted ? "Completed" : "In Progress"}
                            </span>
                            <span className="session-time-text">
                              <Clock size={12} aria-hidden="true" />
                              <span>{timeStr}</span>
                            </span>
                          </div>

                          <div className="session-meta-chips">
                            {courseObj && (
                              <span className="session-chip course-chip" title={`Course: ${courseObj.name}`}>
                                <BookOpen size={11} aria-hidden="true" />
                                <span>{courseObj.name}</span>
                              </span>
                            )}
                            {s.mode && (
                              <span className="session-chip mode-chip" title={`Learning Mode: ${s.mode}`}>
                                <Layers size={11} aria-hidden="true" />
                                <span>{s.mode}</span>
                              </span>
                            )}
                            <span className="session-chip turns-chip">
                              <span>
                                {s.turn_count || 0} response{(s.turn_count || 0) === 1 ? "" : "s"}
                              </span>
                            </span>
                          </div>

                          {s.goal && (
                            <p className="session-goal-box">
                              &ldquo;{s.goal}&rdquo;
                            </p>
                          )}
                        </div>

                        <div className="session-card-actions">
                          {/* Reopen or Continue Activity */}
                          {onLearn && (
                            <button
                              type="button"
                              className={`session-action-btn ${
                                isCompleted ? "btn-secondary" : "btn-primary"
                              }`}
                              onClick={() => {
                                onLearn({
                                  subjectId: s.subject_id,
                                  courseId: s.course_id || undefined,
                                  conceptId: s.concept_id,
                                  conceptName: conceptTitle,
                                  mode: isCompleted ? "practice" : s.mode === "practice" ? "practice" : "study",
                                });
                              }}
                              aria-label={
                                isCompleted
                                  ? `Practice ${conceptTitle} again`
                                  : `Continue learning ${conceptTitle}`
                              }
                            >
                              {isCompleted ? (
                                <>
                                  <RotateCcw size={13} aria-hidden="true" />
                                  <span>Practice Again</span>
                                </>
                              ) : (
                                <>
                                  <Play size={13} aria-hidden="true" />
                                  <span>Continue Session</span>
                                </>
                              )}
                            </button>
                          )}

                          {/* Inspect Session Conversation / Receipt */}
                          <button
                            type="button"
                            className="session-action-btn btn-secondary review-trigger-btn"
                            disabled={reviewBusy}
                            onClick={() => void openReview(s.teaching_session_id)}
                            aria-label={`Inspect conversation review for ${conceptTitle}`}
                          >
                            <span>Inspect Record</span>
                            <ArrowRight size={13} aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
