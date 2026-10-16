import type { RefObject } from "react";
import { ArrowRight, BookOpen, Layers3, Lightbulb, Paperclip, Plus } from "lucide-react";
import { KnowledgeNetworkGraphic } from "../../../content/KnowledgeNetworkGraphic";
import { IllustrationPanel } from "../../../content/IllustrationPanel";
import { TurnCard } from "./TurnCard";
import { AnswerInputs } from "./AnswerInputs";
import type {
  AuthUser,
  UserProfile,
  Course,
  ConceptNode,
  TeachingSession,
  TeachingMove,
  LearnerScreen,
} from "../../../../types";
import type { Concept, TeachingEntry } from "./types";

export interface MessageListProps {
  session: TeachingSession | null;
  entries: TeachingEntry[];
  user: AuthUser | null;
  profile: UserProfile | null;
  courses: Course[];
  mapNodes: ConceptNode[];
  sessionsCount: number;
  loading: boolean;
  courseId: string;
  conceptId: string;
  concepts: Concept[];
  topicsLoading: boolean;
  disabled: boolean;
  label: string;
  illustrations: boolean;
  evaluation?: {
    status?: string;
    needs_review_reason?: string;
    feedback?: string;
    correct?: boolean | null;
    score?: number | null;
  };
  move?: TeachingMove;
  choice: number | null;
  busy: boolean;
  tailRef: RefObject<HTMLDivElement>;
  copiedId: string | null;
  onCourseChange: (id: string) => void;
  onConceptChange: (id: string) => void;
  onStart: (mode: "study" | "practice" | "review") => void;
  onNavigate?: (screen: LearnerScreen) => void;
  onCopyMessage: (id: string, text: string) => void;
  onSelectChoice: (index: number) => void;
}

export function MessageList({
  session,
  entries,
  user,
  profile,
  courses,
  mapNodes,
  sessionsCount,
  loading,
  courseId,
  conceptId,
  concepts,
  topicsLoading,
  disabled,
  label,
  illustrations,
  evaluation,
  move,
  choice,
  busy,
  tailRef,
  copiedId,
  onCourseChange,
  onConceptChange,
  onStart,
  onNavigate,
  onCopyMessage,
  onSelectChoice,
}: MessageListProps) {
  const selectors = (
    <div className="chat-selectors-card" role="group" aria-label="Course and Topic Selection">
      <div className="chat-selector-field">
        <label htmlFor="chat-course-select" className="selector-label">
          <Layers3 size={15} className="selector-icon" />
          <span>Course</span>
        </label>
        <select
          id="chat-course-select"
          aria-label="Select course"
          value={courseId}
          disabled={topicsLoading || disabled}
          onChange={(e) => {
            onCourseChange(e.target.value);
          }}
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
        <label htmlFor="chat-topic-select" className="selector-label">
          <BookOpen size={15} className="selector-icon" />
          <span>Learning Topic</span>
          {concepts.length > 0 && (
            <span className="concept-count-pill">{concepts.length}</span>
          )}
        </label>
        <select
          id="chat-topic-select"
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
  );

  return (
    <div className="chat-scroll">
      {!session ? (
        <section className="chat-welcome">
          <div className="welcome-hero">
            <KnowledgeNetworkGraphic size={190} />
            <div className="welcome-greeting">
              <span className="eyebrow blue">
                {user ? `Welcome, ${profile?.display_name || user.username}` : "Evidence-Grounded Learning"}
              </span>
              <h1>What would you like to explore today?</h1>
              <p>
                Explore your courses with causal explanations, practice targeted questions,
                or synthesize new concepts from your notes.
              </p>
            </div>
          </div>

          {/* Overview Stats Strip */}
          {courses.length > 0 && (
            <div className="welcome-stats-strip" aria-label="Learning overview stats">
              <div className="stat-pill">
                <strong>{courses.length}</strong>
                <span>Active Course{courses.length === 1 ? "" : "s"}</span>
              </div>
              <div className="stat-pill">
                <strong>{mapNodes.length}</strong>
                <span>Knowledge Node{mapNodes.length === 1 ? "" : "s"}</span>
              </div>
              <div className="stat-pill">
                <strong>{sessionsCount}</strong>
                <span>Practice Session{sessionsCount === 1 ? "" : "s"}</span>
              </div>
            </div>
          )}

          {/* Course & Topic Selection */}
          {selectors}

          {!courses.length && !loading && (
            <div className="empty-courses-card">
              <p>You have not created or enrolled in any courses yet.</p>
              <button
                type="button"
                className="primary-button compact"
                onClick={() => onNavigate?.("courses")}
              >
                <Plus size={15} />
                <span>Create your first course</span>
              </button>
            </div>
          )}

          {/* Action Cards */}
          <div className="chat-suggestions">
            <button
              type="button"
              className="suggestion-card"
              disabled={!conceptId || disabled}
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
              disabled={!conceptId || disabled}
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
        </section>
      ) : (
        <div className="chat-messages" aria-live="polite" aria-busy={busy}>
          {/* Optional Illustration Panel */}
          {illustrations && (
            <IllustrationPanel
              key={session.concept_id}
              topic={
                mapNodes.find((node) => node.id === session.concept_id)?.label || label
              }
            />
          )}

          {/* Conversation Entries */}
          {entries.map((entry) => (
            <TurnCard
              key={entry.id}
              entry={entry}
              isCopied={copiedId === entry.id}
              onCopy={onCopyMessage}
              onNavigate={onNavigate}
            />
          ))}

          {/* Assessment Evaluation Banner & MCQ Options */}
          <AnswerInputs
            evaluation={evaluation}
            move={move}
            choice={choice}
            disabled={disabled}
            onSelectChoice={onSelectChoice}
          />

          {/* Thinking / Generation Indicator */}
          {busy && (
            <div className="chat-thinking-card" role="status">
              <div className="thinking-avatar">O</div>
              <div className="thinking-content">
                <span>OVAEL-X is thinking</span>
                <span className="pulse-dots">···</span>
              </div>
            </div>
          )}

          <div ref={tailRef} />
        </div>
      )}
    </div>
  );
}
