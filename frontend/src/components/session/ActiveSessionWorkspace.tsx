import React, { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';
import { SessionHeader } from './SessionHeader';
import { TutorTurn } from './TutorTurn';
import { LearnerTurn } from './LearnerTurn';
import { EvidenceBanner } from './EvidenceBanner';
import { SessionContextPanel } from './SessionContextPanel';

export interface MessageItem {
  who: 'system' | 'user';
  text: string;
}

export interface ActiveSessionWorkspaceProps {
  courseName?: string;
  conceptName?: string;
  mode?: string;
  goal?: string;
  messages: MessageItem[];
  move?: any;
  evidence?: any;
  choice?: number | null;
  onSelectChoice?: (index: number) => void;
  busy?: boolean;
  user: { username?: string; [key: string]: any };
  activeFile?: File | null;
  onLeaveSession: () => void;
  composerSlot: React.ReactNode;
}

export const ActiveSessionWorkspace: React.FC<ActiveSessionWorkspaceProps> = ({
  courseName,
  conceptName,
  mode = 'study',
  goal,
  messages,
  move,
  evidence,
  choice,
  onSelectChoice,
  busy = false,
  user,
  activeFile,
  onLeaveSession,
  composerSlot,
}) => {
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const timelineEndRef = useRef<HTMLDivElement>(null);

  // Smooth scroll to bottom when messages or turns update
  useEffect(() => {
    timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, move?.content, evidence?.score, busy]);

  return (
    <div className="active-workspace">
      {/* 1. Compact Active Session Header */}
      <SessionHeader
        courseName={courseName}
        conceptName={conceptName}
        mode={mode}
        isActive={true}
        onLeaveSession={onLeaveSession}
        onToggleContext={() => setIsContextDrawerOpen(!isContextDrawerOpen)}
        isContextOpen={isContextDrawerOpen}
      />

      <div className="active-workspace__grid">
        {/* 2. Main Conversation Column & Composer */}
        <main className="active-workspace__main" aria-label="Tutoring dialogue">
          <div className="conversation-timeline" role="log" aria-live="polite">
            <div className="conversation-timeline__date-pill">
              ACTIVE LEARNING SESSION
            </div>

            {messages.length === 0 && !busy && (
              <div className="conversation-timeline__empty">
                <p>Connecting to decision engine...</p>
              </div>
            )}

            {messages.map((m, idx) => {
              const isLastSystem =
                m.who === 'system' &&
                (idx === messages.length - 1 ||
                  (idx === messages.length - 2 && messages[messages.length - 1].who === 'user'));

              if (m.who === 'system') {
                return (
                  <TutorTurn
                    key={idx}
                    text={m.text}
                    move={isLastSystem ? move : undefined}
                    choice={choice}
                    onSelectChoice={onSelectChoice}
                    isLatest={isLastSystem}
                  />
                );
              }

              return (
                <LearnerTurn
                  key={idx}
                  username={user?.username || 'learner'}
                  text={m.text}
                  fileName={idx === messages.length - 1 ? activeFile?.name : undefined}
                />
              );
            })}

            {/* Assessment Feedback Banner */}
            {evidence && (
              <div className="conversation-timeline__feedback">
                <EvidenceBanner evidence={evidence} />
              </div>
            )}

            {/* Asynchronous Loading / Evaluating Indicator */}
            {busy && (
              <div className="tutor-typing-indicator" role="status" aria-live="polite">
                <LoaderCircle size={17} className="spin text-primary" aria-hidden="true" />
                <span>Evaluating answer &amp; planning next step...</span>
              </div>
            )}

            <div ref={timelineEndRef} tabIndex={-1} aria-hidden="true" />
          </div>

          {/* 3. Anchored Answer Composer (Preserved for Step 7) */}
          <div className="active-workspace__composer">
            {composerSlot}
          </div>
        </main>

        {/* 4. Desktop Context Panel */}
        <div className="active-workspace__aside">
          <SessionContextPanel
            courseName={courseName}
            conceptName={conceptName}
            mode={mode}
            goal={goal}
            move={move}
            evidence={evidence}
          />
        </div>
      </div>

      {/* Mobile / Tablet Context Drawer */}
      {isContextDrawerOpen && (
        <div className="context-drawer-backdrop" onClick={() => setIsContextDrawerOpen(false)}>
          <div
            className="context-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Session context details"
          >
            <SessionContextPanel
              courseName={courseName}
              conceptName={conceptName}
              mode={mode}
              goal={goal}
              move={move}
              evidence={evidence}
              onClose={() => setIsContextDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
