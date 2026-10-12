import React from 'react';
import { BookOpen, ChevronRight, ArrowLeft, Layers3, SlidersHorizontal } from 'lucide-react';
import { Badge, Button } from '../ui';

export interface SessionHeaderProps {
  courseName?: string;
  conceptName?: string;
  mode?: string;
  isActive?: boolean;
  onLeaveSession: () => void;
  onToggleContext?: () => void;
  isContextOpen?: boolean;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  courseName = 'Course Workspace',
  conceptName = 'Learning Session',
  mode = 'study',
  isActive = true,
  onLeaveSession,
  onToggleContext,
  isContextOpen = false,
}) => {
  const modeLabel = mode === 'practice' ? 'Targeted Practice' : 'Guided Study';

  return (
    <header className="session-header" aria-label="Active tutoring session bar">
      <div className="session-header__identity">
        <div className="session-header__icon" aria-hidden="true">
          <BookOpen size={17} />
        </div>

        <nav aria-label="Session context" className="session-header__breadcrumbs">
          <span className="session-header__course" title={courseName}>
            {courseName}
          </span>
          <ChevronRight size={13} className="session-header__sep" aria-hidden="true" />
          <strong className="session-header__topic" title={conceptName}>
            {conceptName}
          </strong>
        </nav>

        <Badge variant={mode === 'practice' ? 'info' : 'primary'} size="sm">
          {modeLabel}
        </Badge>
      </div>

      <div className="session-header__actions">
        <div className="session-header__status" role="status" aria-live="polite">
          {isActive ? (
            <>
              <span className="status-dot" aria-hidden="true" />
              <span>Session active</span>
            </>
          ) : (
            <>
              <span className="idle-dot" aria-hidden="true" />
              <span>Paused</span>
            </>
          )}
        </div>

        {onToggleContext && (
          <Button
            variant={isContextOpen ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onToggleContext}
            leftIcon={<SlidersHorizontal size={14} />}
            aria-label={isContextOpen ? 'Hide context panel' : 'Show context panel'}
            className="session-header__context-btn"
          >
            Context
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onLeaveSession}
          leftIcon={<ArrowLeft size={14} />}
          aria-label="Exit learning session"
        >
          Exit session
        </Button>
      </div>
    </header>
  );
};
