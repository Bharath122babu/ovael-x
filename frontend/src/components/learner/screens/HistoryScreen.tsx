import { useState, useMemo } from "react";
import {
  RefreshCw,
  Award,
  Calendar,
  Clock,
  BookOpen,
  ArrowRight,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
} from "lucide-react";
import { useOvael } from "../../../context/OvaelContext";
import { engagement } from "../../../rewards";
import { api } from "../../../api";
import { RichText } from "../../content/RichText";
import { RadialGauge, AnimatedProgressBar } from "../../content/MotionPrimitives";
import type { LearningLaunch } from "../../../types";

function formatDate(value?: string): string {
  const d = new Date(value || "");
  return Number.isFinite(d.getTime())
    ? d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Date unavailable";
}

export function HistoryScreen({
  onLearn,
}: {
  onLearn?: (launch: LearningLaunch) => void;
}) {
  const { sessions, map, refresh, courses } = useOvael();
  const reward = engagement(sessions);

  const [review, setReview] = useState<any>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "active">("all");

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
      const goalStr = s.goal || "";
      const modeStr = s.mode || "";
      return (
        conceptName.toLowerCase().includes(q) ||
        goalStr.toLowerCase().includes(q) ||
        modeStr.toLowerCase().includes(q)
      );
    });
  }, [sessions, statusFilter, searchQuery, map.nodes]);

  return (
    <div className="page history-page">
      {/* Header */}
      <header className="page-heading history-header">
        <div>
          <p className="eyebrow blue">Engagement & History</p>
          <h1>Learning Progress & Records</h1>
          <p className="page-lead">
            Review earned practice points, mastery badges, and previous Socratic conversation receipts.
          </p>
        </div>

        <button
          type="button"
          className="quiet-button refresh-history-btn"
          disabled={reviewBusy}
          onClick={() => void refresh()}
        >
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </header>

      {/* Metric Cards Grid */}
      <section className="history-metric-grid" aria-label="Learning metrics summary">
        {/* Practice Points Gauge */}
        <div className="history-stat-card radial-card">
          <RadialGauge
            value={reward.points}
            max={Math.max(100, reward.points)}
            variant="coral"
            size={76}
          />
          <div className="stat-card-text">
            <span className="stat-label">Practice Points</span>
            <strong className="stat-value">{reward.points}</strong>
            <small className="stat-subtext">Earned across interactive lessons</small>
          </div>
        </div>

        {/* Lessons Completed */}
        <div className="history-stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Lessons Completed</span>
            <strong className="stat-value">{reward.completed}</strong>
          </div>
          <small className="stat-subtext">Sessions with verified responses</small>
          <div className="stat-progress-wrap">
            <AnimatedProgressBar
              value={reward.completed}
              max={Math.max(10, reward.completed)}
              variant="navy"
            />
          </div>
        </div>

        {/* Practice Turns */}
        <div className="history-stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Saved Responses</span>
            <strong className="stat-value">{reward.turns}</strong>
          </div>
          <small className="stat-subtext">Evidence-backed answers saved</small>
          <div className="stat-progress-wrap">
            <AnimatedProgressBar
              value={reward.turns}
              max={Math.max(25, reward.turns)}
              variant="coral"
            />
          </div>
        </div>

        {/* Practice Days */}
        <div className="history-stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Active Learning Days</span>
            <strong className="stat-value">{reward.days}</strong>
          </div>
          <small className="stat-subtext">Distinct days with study activity</small>
          <div className="days-indicator-pill">
            <Calendar size={13} />
            <span>Regular consistency</span>
          </div>
        </div>
      </section>

      {/* Achievement Badges Section */}
      <section className="badges-section" aria-label="Earned achievements">
        <h2 className="section-title">
          <Award size={18} />
          <span>Milestones & Badges</span>
        </h2>

        <div className="badges-grid">
          {reward.badges.map((b) => (
            <article
              key={b.name}
              className={`badge-card ${b.earned ? "is-earned" : "is-locked"}`}
            >
              <div className="badge-icon-box">
                <Award size={24} />
              </div>
              <div className="badge-info">
                <strong>{b.name}</strong>
                <span>{b.earned ? "Achieved" : "In Progress"}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Conversation Review Card / Drawer */}
      {reviewError && (
        <aside className="chat-error-banner" role="alert">
          <AlertCircle size={16} />
          <span>{reviewError}</span>
          <button
            type="button"
            className="icon-button"
            onClick={() => setReviewError("")}
            aria-label="Dismiss error"
          >
            <X size={14} />
          </button>
        </aside>
      )}

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
              className="secondary-button"
              disabled={reviewBusy}
              onClick={() => void openReview(review.session.teaching_session_id, true)}
            >
              <RefreshCw size={14} className={reviewBusy ? "spin-icon" : ""} />
              <span>Generate Fresh Summary</span>
            </button>

            {onLearn && (
              <button
                type="button"
                className="primary-button"
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

      {/* Session History Log Section */}
      <section className="history-timeline-section" aria-label="Learning history log">
        <div className="timeline-section-header">
          <div>
            <h2 className="section-title">
              <Clock size={18} />
              <span>Learning Sessions Record</span>
            </h2>
            <p className="section-desc">
              All interactive tutoring and practice sessions recorded on this account.
            </p>
          </div>

          <div className="timeline-filter-tools">
            <div className="search-pill-box">
              <Search size={14} />
              <input
                type="search"
                aria-label="Search learning history"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by topic or goal…"
                className="history-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="status-pill-group">
              <button
                type="button"
                className={`pill-btn ${statusFilter === "all" ? "active" : ""}`}
                onClick={() => setStatusFilter("all")}
              >
                All ({sessions.length})
              </button>
              <button
                type="button"
                className={`pill-btn ${statusFilter === "completed" ? "active" : ""}`}
                onClick={() => setStatusFilter("completed")}
              >
                Completed ({sessions.filter((s) => s.status === "completed").length})
              </button>
              <button
                type="button"
                className={`pill-btn ${statusFilter === "active" ? "active" : ""}`}
                onClick={() => setStatusFilter("active")}
              >
                Active ({sessions.filter((s) => s.status === "active").length})
              </button>
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="history-sessions-list">
          {filteredSessions.map((s) => {
            const node = map.nodes.find((n) => n.id === s.concept_id);
            const conceptTitle = node?.label || s.concept_id;
            const courseObj = courses.find((c) => c.course_id === s.course_id);
            const isCompleted = s.status === "completed";

            return (
              <article key={s.teaching_session_id} className="history-session-card">
                <div className="session-card-left">
                  <div className={`session-status-dot ${isCompleted ? "is-completed" : "is-active"}`} />
                  <div className="session-info-group">
                    <h3 className="session-concept-name">{conceptTitle}</h3>
                    <div className="session-meta-row">
                      <span className="session-date">{formatDate(s.updated_at || s.created_at)}</span>
                      <span className="session-turns-pill">
                        {s.turn_count || 0} response{(s.turn_count || 0) === 1 ? "" : "s"}
                      </span>
                      {s.mode && <span className="session-mode-tag">{s.mode}</span>}
                      {courseObj && <span className="session-course-tag">{courseObj.name}</span>}
                    </div>
                    {s.goal && <p className="session-goal-text">"{s.goal}"</p>}
                  </div>
                </div>

                <div className="session-card-actions">
                  <button
                    type="button"
                    className="quiet-button review-trigger-btn"
                    disabled={reviewBusy}
                    onClick={() => void openReview(s.teaching_session_id)}
                  >
                    <span>{isCompleted ? "Review Record" : "Inspect Session"}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </article>
            );
          })}

          {sessions.length === 0 && (
            <div className="history-empty-card">
              <BookOpen size={36} />
              <h3>No Learning Sessions Recorded Yet</h3>
              <p>
                Your interactive Socratic conversations, practice responses, and concept evaluations will appear here.
              </p>
            </div>
          )}

          {sessions.length > 0 && filteredSessions.length === 0 && (
            <div className="history-empty-card">
              <Search size={32} />
              <h3>No matching sessions found</h3>
              <p>Try clearing your search query or switching filters.</p>
              <button
                type="button"
                className="quiet-button"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
