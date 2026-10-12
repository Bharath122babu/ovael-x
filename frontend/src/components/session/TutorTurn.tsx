import React from 'react';
import { Sparkles, Info, Check } from 'lucide-react';
import { Badge } from '../ui';
import { SafeMarkdown } from './SafeMarkdown';

export interface TutorTurnProps {
  text: string;
  move?: {
    action?: string;
    answer_type?: string;
    content_status?: 'unavailable' | 'source_excerpt' | string;
    validation_state?: 'generated_unvalidated' | string;
    required_modalities?: string[];
    options?: string[];
  };
  choice?: number | null;
  onSelectChoice?: (index: number) => void;
  isLatest?: boolean;
}

export const TutorTurn: React.FC<TutorTurnProps> = ({
  text,
  move,
  choice = null,
  onSelectChoice,
  isLatest = false,
}) => {
  // Format action name e.g. "socratic_question" -> "Socratic Question"
  const actionLabel = move?.action
    ? move.action
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : undefined;

  return (
    <article className="tutor-turn" aria-label="Tutor explanation and instruction">
      <div className="tutor-turn__head">
        <div className="tutor-turn__avatar" aria-hidden="true">
          <Sparkles size={16} />
        </div>
        <div className="tutor-turn__meta">
          <strong className="tutor-turn__author">OVAEL Tutor</strong>
          {actionLabel && (
            <span className="tutor-turn__action-tag">
              {actionLabel}
            </span>
          )}
        </div>
      </div>

      <div className="tutor-turn__body">
        <SafeMarkdown content={text} />

        {/* Content Status Notices */}
        {move?.content_status === 'unavailable' && (
          <div className="tutor-callout tutor-callout--warning" role="alert">
            <Info size={16} aria-hidden="true" />
            <div>
              <strong>Instruction unavailable</strong>
              <p>Connect a teaching model or upload verified course material. This is not a complete lesson.</p>
            </div>
          </div>
        )}

        {move?.content_status === 'source_excerpt' && (
          <div className="tutor-callout tutor-callout--info">
            <Info size={15} aria-hidden="true" />
            <span>Source extract only — not a complete generated lesson.</span>
          </div>
        )}

        {move?.validation_state === 'generated_unvalidated' && (
          <div className="tutor-callout tutor-callout--warning">
            <Info size={15} aria-hidden="true" />
            <span>Unvalidated question: no mastery credit until verified.</span>
          </div>
        )}

        {move?.required_modalities && move.required_modalities.length > 0 && (
          <div className="tutor-callout tutor-callout--neutral">
            <Info size={15} aria-hidden="true" />
            <span>Required answer parts: <strong>{move.required_modalities.join(', ')}</strong></span>
          </div>
        )}

        {/* Multiple Choice Options (if present) */}
        {move?.options && move.options.length > 0 && (
          <div className="tutor-mcq" role="radiogroup" aria-label="Answer options">
            <div className="tutor-mcq__label">Select your answer:</div>
            <div className="tutor-mcq__grid">
              {move.options.map((optionText, idx) => {
                const isSelected = choice === idx;
                const letter = String.fromCharCode(65 + idx);
                return (
                  <button
                    type="button"
                    key={idx}
                    role="radio"
                    aria-checked={isSelected}
                    className={`tutor-mcq__option ${isSelected ? 'tutor-mcq__option--selected' : ''}`}
                    onClick={() => onSelectChoice?.(idx)}
                  >
                    <span className="tutor-mcq__letter" aria-hidden="true">
                      {letter}
                    </span>
                    <span className="tutor-mcq__text">{optionText}</span>
                    {isSelected && (
                      <span className="tutor-mcq__check" aria-hidden="true">
                        <Check size={14} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};
