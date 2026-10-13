import React, { useState } from 'react';
import { BookOpen, Activity, ArrowRight, ShieldCheck, Target, Sparkles } from 'lucide-react';
import { Button, Input, Field, Badge } from '../ui';
import { MechanismMotionVisual } from '../visuals';

export type LearningIntent = 'study' | 'practice';

export interface SessionSetupPanelProps {
  selectedCourseName?: string;
  selectedConceptName?: string;
  canStart: boolean;
  goal: string;
  onGoalChange: (goal: string) => void;
  onStart: (mode: LearningIntent) => void;
  busy?: boolean;
}

export const SessionSetupPanel: React.FC<SessionSetupPanelProps> = ({
  selectedCourseName,
  selectedConceptName,
  canStart,
  goal,
  onGoalChange,
  onStart,
  busy = false,
}) => {
  const [mode, setMode] = useState<LearningIntent>('study');
  const mechanismState = busy ? 'active' : canStart ? 'settled' : 'idle';

  return (
    <aside className="session-setup-panel" aria-label="Learning session configuration">
      <div className="session-setup-panel__head">
        <div className="session-setup-panel__head-row">
          <div>
            <div className="eyebrow">SESSION WORKSPACE</div>
            <h3 className="session-setup-panel__title">Ready to Begin</h3>
          </div>
          <MechanismMotionVisual
            variant="compact"
            state={mechanismState}
            decorative={true}
            className="session-setup-panel__mechanism"
          />
        </div>
        <p className="session-setup-panel__desc">
          Configure how the decision engine approaches this session.
        </p>
      </div>

      {/* Selected Targets Summary */}
      <div className="session-summary-card">
        <div className="session-summary-card__row">
          <span className="session-summary-card__label">Active Course:</span>
          <strong className="session-summary-card__value">
            {selectedCourseName || <span className="text-muted">None chosen</span>}
          </strong>
        </div>
        <div className="session-summary-card__row">
          <span className="session-summary-card__label">Active Topic:</span>
          <strong className="session-summary-card__value">
            {selectedConceptName || <span className="text-muted">None chosen</span>}
          </strong>
        </div>
      </div>

      {/* Mode Choice */}
      <div className="session-mode-group" role="radiogroup" aria-label="Learning Mode">
        <label className="session-mode-group__label">Choose Learning Mode</label>

        <button
          type="button"
          role="radio"
          aria-checked={mode === 'study'}
          className={`session-mode-card ${mode === 'study' ? 'session-mode-card--active' : ''}`}
          onClick={() => setMode('study')}
        >
          <div className="session-mode-card__icon" aria-hidden="true">
            <BookOpen size={18} />
          </div>
          <div className="session-mode-card__content">
            <div className="session-mode-card__title-row">
              <strong>Guided Study</strong>
              {mode === 'study' && <Badge variant="primary" size="sm">Recommended</Badge>}
            </div>
            <p>
              Interactive explanations, concept breakdowns, and progressive mastery verification.
            </p>
          </div>
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={mode === 'practice'}
          className={`session-mode-card ${mode === 'practice' ? 'session-mode-card--active' : ''}`}
          onClick={() => setMode('practice')}
        >
          <div className="session-mode-card__icon" aria-hidden="true">
            <Activity size={18} />
          </div>
          <div className="session-mode-card__content">
            <div className="session-mode-card__title-row">
              <strong>Targeted Practice</strong>
            </div>
            <p>
              Immediate diagnostic questions, problem solving, and evidence checks.
            </p>
          </div>
        </button>
      </div>

      {/* Goal Input */}
      <div className="session-goal-field">
        <Field
          label="Learning Goal or Focus (Optional)"
          description="Direct the initial focus toward a specific question or topic area"
          id="learning-goal-input"
        >
          <Input
            id="learning-goal-input"
            value={goal}
            onChange={(e) => onGoalChange(e.target.value)}
            placeholder="e.g. Mechanism of action, key formulas..."
            leftElement={<Target size={16} />}
            disabled={busy}
          />
        </Field>
      </div>

      {/* Primary CTA */}
      <div className="session-setup-panel__action">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canStart || busy}
          loading={busy}
          loadingText="Starting session..."
          onClick={() => onStart(mode)}
          rightIcon={<ArrowRight size={17} />}
        >
          {canStart ? (mode === 'study' ? 'Start guided study' : 'Start practice session') : 'Select a topic to start'}
        </Button>
      </div>

      {/* Trust & Evidence Footer */}
      <div className="session-setup-panel__footer">
        <ShieldCheck size={16} className="text-primary" aria-hidden="true" />
        <span>
          Grounded decision engine: Only verified grading counts toward recorded mastery.
        </span>
      </div>
    </aside>
  );
};
