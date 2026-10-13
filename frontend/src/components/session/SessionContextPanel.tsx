import React from 'react';
import { ShieldCheck, BookOpen, Target, Sparkles, X, Activity } from 'lucide-react';
import { Badge, IconButton } from '../ui';
import { DecisionTraceViewer } from './DecisionTraceViewer';

export interface SessionContextPanelProps {
  courseName?: string;
  conceptName?: string;
  mode?: string;
  goal?: string;
  move?: any;
  evidence?: any;
  onClose?: () => void;
}

export const SessionContextPanel: React.FC<SessionContextPanelProps> = ({
  courseName = 'Active Course',
  conceptName = 'Current Topic',
  mode = 'study',
  goal,
  move,
  evidence,
  onClose,
}) => {
  const evidenceStatus = evidence?.evaluation?.status;
  const evidenceScore = evidence?.score != null ? `${Math.round(evidence.score * 100)}%` : null;

  return (
    <aside className="session-context-panel" aria-label="Learning session context">
      <div className="session-context-panel__head">
        <div className="session-context-panel__title-wrap">
          <Activity size={16} className="text-primary" aria-hidden="true" />
          <h3 className="session-context-panel__title">Learning Context</h3>
        </div>
        {onClose && (
          <IconButton
            icon={<X size={16} />}
            label="Close context panel"
            onClick={onClose}
            size="sm"
          />
        )}
      </div>

      <div className="session-context-panel__content">
        {/* Active Target Section */}
        <section className="session-context-card" aria-labelledby="active-target-title">
          <div className="session-context-card__eyebrow" id="active-target-title">
            ACTIVE TARGET
          </div>
          <strong className="session-context-card__heading">{conceptName}</strong>
          <span className="session-context-card__sub">{courseName}</span>

          {goal && (
            <div className="session-context-card__goal">
              <span className="session-context-card__goal-label">
                <Target size={12} aria-hidden="true" /> Target Goal:
              </span>
              <p className="session-context-card__goal-text">{goal}</p>
            </div>
          )}

          <div className="session-context-card__divider" />

          <dl className="session-context-card__details">
            <div className="session-context-card__row">
              <dt>Mode</dt>
              <dd>
                <Badge variant={mode === 'practice' ? 'info' : 'primary'} size="sm">
                  {mode === 'practice' ? 'Practice' : 'Guided'}
                </Badge>
              </dd>
            </div>
            <div className="session-context-card__row">
              <dt>Response Type</dt>
              <dd>
                <code className="session-context-card__code">
                  {move?.answer_type || 'discussion'}
                </code>
              </dd>
            </div>
            <div className="session-context-card__row">
              <dt>Evidence</dt>
              <dd>
                {evidenceStatus ? (
                  <Badge variant={evidenceStatus === 'graded' ? 'success' : 'warning'} size="sm">
                    {evidenceScore ? `${evidenceStatus} (${evidenceScore})` : evidenceStatus}
                  </Badge>
                ) : (
                  <span className="text-muted">Awaiting answer</span>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {/* Adaptive Guarantees */}
        <section className="session-context-card session-context-card--tinted">
          <div className="session-context-card__brand-row">
            <ShieldCheck size={18} className="text-primary" aria-hidden="true" />
            <strong>Demonstrated Mastery</strong>
          </div>
          <p>
            OVAEL-X records progress solely from verified, independent answers. Guesses, hints,
            and unverified transcriptions do not affect your evaluated knowledge state.
          </p>
        </section>

        {/* Technical Decision Trace */}
        {(move?.decision_frame || move?.decision_trace) && (
          <section aria-label="Technical Decision Frame">
            <DecisionTraceViewer
              decisionFrame={move?.decision_frame}
              decisionTrace={move?.decision_trace}
            />
          </section>
        )}
      </div>
    </aside>
  );
};
