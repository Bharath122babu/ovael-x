import type { RefObject } from "react";
import { IllustrationPanel } from "../../../content/IllustrationPanel";
import { TurnCard } from "./TurnCard";
import { AnswerInputs } from "./AnswerInputs";
import { LearnerDashboard } from "./LearnerDashboard";
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
  sessionsCount: _sessionsCount,
  loading: _loading,
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
  return (
    <div className="chat-scroll">
      {!session ? (
        <LearnerDashboard
          user={user}
          profile={profile}
          courses={courses}
          mapNodes={mapNodes}
          courseId={courseId}
          conceptId={conceptId}
          concepts={concepts}
          topicsLoading={topicsLoading}
          disabled={disabled}
          label={label}
          onCourseChange={onCourseChange}
          onConceptChange={onConceptChange}
          onStart={onStart}
          onNavigate={onNavigate}
        />
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
