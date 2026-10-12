import React, { useId } from 'react';
import { Code2, Terminal } from 'lucide-react';

export interface CodeAnswerInputProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  label?: string;
  error?: string;
  onSubmitShortcut?: () => void;
  autoFocus?: boolean;
}

export const CodeAnswerInput: React.FC<CodeAnswerInputProps> = ({
  value,
  onChange,
  language = 'Python',
  placeholder = '# Write your code solution here...\ndef solution():\n    pass',
  disabled = false,
  rows = 5,
  label = 'Code Implementation',
  error,
  onSubmitShortcut,
  autoFocus = false,
}) => {
  const generatedId = useId();
  const inputId = `code-answer-${generatedId}`;
  const errorId = `${inputId}-error`;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Intercept Tab key to insert 2 spaces
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      // Restore cursor position on next tick
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
      return;
    }

    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!disabled && onSubmitShortcut) {
        onSubmitShortcut();
      }
    }
  };

  const lineCount = value.split('\n').length;

  return (
    <div className={`answer-input-group answer-input-group--code ${error ? 'answer-input-group--error' : ''}`}>
      <div className="code-editor-header">
        <div className="code-editor-header__tag">
          <Code2 size={14} aria-hidden="true" />
          <span>{label}</span>
          <span className="code-editor-header__lang-badge">{language}</span>
        </div>
        <div className="code-editor-header__meta">
          <span className="code-editor-header__lines" aria-hidden="true">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'}
          </span>
          <span className="answer-input-group__shortcut-hint" aria-hidden="true">
            <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to submit
          </span>
        </div>
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
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        aria-label={`${label} in ${language}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="answer-composer__code-area"
      />

      {error && (
        <div className="answer-input-group__footer">
          <span id={errorId} className="answer-input-group__error-text" role="alert">
            {error}
          </span>
        </div>
      )}
    </div>
  );
};
