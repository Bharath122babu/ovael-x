import React, { useId } from 'react';
import { CornerDownLeft } from 'lucide-react';

export interface TextAnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  label?: string;
  helperText?: string;
  error?: string;
  onSubmitShortcut?: () => void;
  autoFocus?: boolean;
}

export const TextAnswerInput: React.FC<TextAnswerInputProps> = ({
  value,
  onChange,
  placeholder = 'Type your answer, reasoning, or response here...',
  disabled = false,
  rows = 3,
  label = 'Your response',
  helperText,
  error,
  onSubmitShortcut,
  autoFocus = false,
}) => {
  const generatedId = useId();
  const inputId = `text-answer-${generatedId}`;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!disabled && onSubmitShortcut) {
        onSubmitShortcut();
      }
    }
  };

  return (
    <div className={`answer-input-group ${error ? 'answer-input-group--error' : ''}`}>
      <div className="answer-input-group__label-row">
        <label htmlFor={inputId} className="answer-input-group__label">
          {label}
        </label>
        <span className="answer-input-group__shortcut-hint" aria-hidden="true">
          <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to submit
        </span>
      </div>

      <textarea
        id={inputId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        autoFocus={autoFocus}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [error ? errorId : null, helperText ? helperId : null]
            .filter(Boolean)
            .join(' ') || undefined
        }
        className="answer-composer__textarea"
      />

      <div className="answer-input-group__footer">
        {error ? (
          <span id={errorId} className="answer-input-group__error-text" role="alert">
            {error}
          </span>
        ) : helperText ? (
          <span id={helperId} className="answer-input-group__helper-text">
            {helperText}
          </span>
        ) : (
          <span className="answer-input-group__count">
            {value.trim().length > 0 ? `${value.trim().length} characters` : ''}
          </span>
        )}
      </div>
    </div>
  );
};
