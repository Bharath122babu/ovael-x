import { RefreshCw, Award } from "lucide-react";
import { useOvael } from "../../../context/OvaelContext";
import { engagement } from "../../../rewards";
import { useState } from "react";
import { api } from "../../../api";
import { RichText } from "../../content/RichText";
import type { LearningLaunch } from "../../../types";
function date(value?: string) {
  const d = new Date(value || "");
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : "Date unavailable";
}
export function HistoryScreen({
  onLearn,
}: {
  onLearn?: (launch: LearningLaunch) => void;
}) {
  const { sessions, map, refresh } = useOvael(),
    reward = engagement(sessions);
  const [review, setReview] = useState<any>(null),
    [reviewBusy, setReviewBusy] = useState(false),
    [reviewError, setReviewError] = useState("");
  async function openReview(id: string, generate = false) {
    setReviewBusy(true);
    setReviewError("");
    try {
      setReview(
        await api(
          `/v1/learning/sessions/${id}/review`,
          generate ? "POST" : "GET",
        ),
      );
    } catch (e) {
      setReviewError(
        e instanceof Error ? e.message : "Could not load conversation.",
      );
    } finally {
      setReviewBusy(false);
    }
  }
  return (
    <div className="page">
      <header className="page-heading">
        <p className="eyebrow blue">Progress & rewards</p>
        <h1>Your progress</h1>
        <p>Your practice, achievements and recent conversations.</p>
      </header>
      <section className="progress-summary">
        <div>
          <Award size={20} />
          <span>Practice points</span>
          <strong>{reward.points}</strong>
          <small>Earned by practicing</small>
        </div>
        <div>
          <span>Completed with practice</span>
          <strong>{reward.completed}</strong>
          <small>Lessons with at least one response</small>
        </div>
        <div>
          <span>Saved practice turns</span>
          <strong>{reward.turns}</strong>
          <small>Responses you have saved</small>
        </div>
        <div>
          <span>Practice days</span>
          <strong>{reward.days}</strong>
          <small>Days represented in recent history</small>
        </div>
      </section>
      <div className="reward-badges">
        {reward.badges.map((b) => (
          <article key={b.name} className={b.earned ? "earned" : ""}>
            <Award size={22} />
            <strong>{b.name}</strong>
            <span>{b.earned ? "Earned" : "Keep practicing"}</span>
          </article>
        ))}
      </div>

      <section>
        {reviewError && (
          <p role="alert" className="form-error">
            {reviewError}
          </p>
        )}
        {reviewBusy && <p role="status">Opening your learning record…</p>}
        {review && (
          <section className="session-review">
            <div className="section-heading">
              <h2>Conversation review</h2>
              <button onClick={() => setReview(null)} className="quiet-button">
                Close review
              </button>
            </div>
            <p>Discussed: {review.topics.join(", ") || "No topic recorded"}</p>
            <RichText markdown={review.summary} />
            <p>{review.next_step}</p>
            <div className="lesson-actions">
              <button
                className="secondary-button"
                disabled={reviewBusy}
                onClick={() =>
                  void openReview(review.session.teaching_session_id, true)
                }
              >
                Create quick summary
              </button>
              <button
                className="primary-button"
                disabled={reviewBusy}
                onClick={() =>
                  onLearn?.({
                    subjectId: review.session.subject_id,
                    courseId: review.session.course_id,
                    conceptId: review.session.concept_id,
                    mode: "review",
                  })
                }
              >
                Review this topic
              </button>
            </div>
            <details>
              <summary>What you answered and what came next</summary>
              {review.turns.map((turn: any, index: number) => (
                <article className="review-turn" key={index}>
                  <h3>
                    Response {index + 1} ·{" "}
                    {turn.graded
                      ? turn.correct
                        ? "Correct"
                        : "Needs practice"
                      : "Not assessed"}
                  </h3>
                  <p>
                    {turn.response ||
                      String(turn.intent || "Practice interaction").replaceAll(
                        "_",
                        " ",
                      )}
                  </p>
                  {turn.feedback && <p>{turn.feedback}</p>}
                  <details>
                    <summary>Next explanation or question</summary>
                    <RichText markdown={turn.next_content} />
                  </details>
                </article>
              ))}
              {!review.turns.length && (
                <p>
                  No saved responses. This conversation has not established
                  learning evidence.
                </p>
              )}
            </details>
          </section>
        )}
        <div className="section-heading">
          <h2>Your learning record</h2>
          <button className="text-button" onClick={() => void refresh()}>
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>
        <div className="timeline">
          {sessions.map((s) => (
            <article key={s.teaching_session_id}>
              <time>{date(s.updated_at)}</time>
              <span className={`timeline-dot ${s.status}`} />
              <div>
                <div>
                  <h3>
                    {map.nodes.find((n) => n.id === s.concept_id)?.label ||
                      s.concept_id}
                  </h3>
                  <button
                    className="text-button"
                    disabled={reviewBusy}
                    onClick={() => void openReview(s.teaching_session_id)}
                  >
                    {s.status === "completed"
                      ? "Conversation ended · Review"
                      : "Open learning record"}
                  </button>
                </div>
                <p>
                  {s.goal || s.mode} · {s.turn_count || 0} saved turns
                </p>
              </div>
            </article>
          ))}
          {!sessions.length && (
            <p className="empty-state">
              Your sessions will appear here once you start learning.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
