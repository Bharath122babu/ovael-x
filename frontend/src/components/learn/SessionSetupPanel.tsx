import React, { useState } from 'react';
import { BookOpen, Activity, ArrowRight, ShieldCheck, Target, Sparkles } from 'lucide-react';
import { Button, Input, Field, Badge } from '../ui';
import { MechanismMotionVisual } from '../visuals';

export type LearningIntent = 'study' | 'practice' | 'review';

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
  const [submitting, setSubmitting] = useState(false);
  const mechanismState = busy || submitting ? 'active' : canStart ? 'settled' : 'idle';

  const modes: Array<{
    id: LearningIntent;
    title: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: 'study',
      title: 'Guided Study',
      description: 'Interactive explanations, concept breakdowns, and progressive mastery verification.',
      icon: <BookOpen size={18} />,
      badge: 'Recommended',
    },
    {
      id: 'practice',
      title: 'Targeted Practice',
      description: 'Immediate diagnostic questions, problem solving, and evidence checks.',
      icon: <Activity size={18} />,
    },
    {
      id: 'review',
      title: 'Review & Retention',
      description: 'Spaced retrieval, edge-case probing, and retention consolidation.',
      icon: <Sparkles size={18} />,
    },
  ];

  const handleStart = () => {
    if (!canStart || busy || submitting) return;
    setSubmitting(true);
    try {
      onStart(mode);
    } finally {
      setTimeout(() => setSubmitting(false), 1000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % modes.length;
      setMode(modes[nextIndex].id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + modes.length) % modes.length;
      setMode(modes[prevIndex].id);
    }
  };

  const ctaLabel = canStart
    ? mode === 'study'
      ? 'Start guided study'
      : mode === 'practice'
      ? 'Start practice session'
      : 'Start conceptual review'
    : 'Select a topic to start';

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
          <strong className="session-summary-card__value" title={selectedCourseName}>
            {selectedCourseName || <span className="text-muted">None chosen</span>}
          </strong>
        </div>
        <div className="session-summary-card__row">
          <span className="session-summary-card__label">Active Topic:</span>
          <strong className="session-summary-card__value" title={selectedConceptName}>
            {selectedConceptName || <span className="text-muted">None chosen</span>}
          </strong>
        </div>
      </div>

      {/* Mode Choice */}
      <div className="session-mode-group" role="radiogroup" aria-label="Learning Mode">
        <label className="session-mode-group__label">Choose Learning Mode</label>

        {modes.map((item, idx) => {
          const isActive = mode === item.id;
          return (
            <button
              type="button"
              key={item.id}
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              className={`session-mode-card ${isActive ? 'session-mode-card--active' : ''}`}
              onClick={() => setMode(item.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            >
              <div className="session-mode-card__icon" aria-hidden="true">
                {item.icon}
              </div>
              <div className="session-mode-card__content">
                <div className="session-mode-card__title-row">
                  <strong>{item.title}</strong>
                  {item.badge && isActive && (
                    <Badge variant="primary" size="sm">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <p>{item.description}</p>
              </div>
            </button>
          );
        })}
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
            disabled={busy || submitting}
          />
        </Field>
      </div>

      {/* Primary CTA */}
      <div className="session-setup-panel__action">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!canStart || busy || submitting}
          loading={busy || submitting}
          loadingText="Starting session..."
          onClick={handleStart}
          rightIcon={<ArrowRight size={17} />}
        >
          {ctaLabel}
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
