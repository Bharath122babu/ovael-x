import React, { useId } from 'react';
import { Hash } from 'lucide-react';

export interface NumericAnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  error?: string;
  onSubmitShortcut?: () => void;
  autoFocus?: boolean;
}

const NUMERIC_REGEX = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

export const NumericAnswerInput: React.FC<NumericAnswerInputProps> = ({
  value,
  onChange,
  unit,
  placeholder = 'Enter numeric value (e.g. 42 or -3.14)...',
  disabled = false,
  label = 'Numeric answer',
  error,
  onSubmitShortcut,
  autoFocus = false,
}) => {
  const generatedId = useId();
  const inputId = `numeric-answer-${generatedId}`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const trimmed = value.trim();
  const isMalformed = trimmed.length > 0 && !NUMERIC_REGEX.test(trimmed);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!disabled && onSubmitShortcut && !isMalformed && trimmed.length > 0) {
        onSubmitShortcut();
      }
    }
  };

  return (
    <div className={`answer-input-group ${error || isMalformed ? 'answer-input-group--error' : ''}`}>
      <div className="answer-input-group__label-row">
        <label htmlFor={inputId} className="answer-input-group__label">
          <Hash size={14} aria-hidden="true" />
          <span>{label}</span>
        </label>
        <span className="answer-input-group__shortcut-hint" aria-hidden="true">
          <kbd>Enter</kbd> to submit
        </span>
      </div>

      <div className="numeric-input-wrap">
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error || isMalformed)}
          aria-describedby={
            [error || isMalformed ? errorId : null, helperId]
              .filter(Boolean)
              .join(' ') || undefined
          }
          className="answer-composer__numeric-input"
        />
        {unit && (
          <span className="numeric-input-wrap__unit" aria-hidden="true">
            {unit}
          </span>
        )}
      </div>

      <div className="answer-input-group__footer">
        {error ? (
          <span id={errorId} className="answer-input-group__error-text" role="alert">
            {error}
          </span>
        ) : isMalformed ? (
          <span id={errorId} className="answer-input-group__error-text" role="alert">
            Please enter a valid finite number (e.g. 42, -3.14, 1.2e-3).
          </span>
        ) : (
          <span id={helperId} className="answer-input-group__helper-text">
            Accepts integers, finite decimals, negative values, and scientific notation.
          </span>
        )}
      </div>
    </div>
  );
};
