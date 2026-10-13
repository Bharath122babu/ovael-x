import React from 'react';
import { Check, HelpCircle } from 'lucide-react';

export interface MultipleChoiceInputProps {
  options: string[];
  selectedChoice: number | null;
  onSelectChoice: (index: number) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const MultipleChoiceInput: React.FC<MultipleChoiceInputProps> = ({
  options = [],
  selectedChoice = null,
  onSelectChoice,
  disabled = false,
  label = 'Select the best option:',
  className = '',
}) => {
  if (!options || options.length === 0) {
    return (
      <div className="mcq-input-empty" role="status">
        <HelpCircle size={18} className="text-muted" aria-hidden="true" />
        <span>No selectable options provided for this question.</span>
      </div>
    );
  }

  return (
    <div
      className={`mcq-input-group ${className}`}
      role="radiogroup"
      aria-label={label}
    >
      <div className="mcq-input-group__label">{label}</div>
      <div className="mcq-input-group__options">
        {options.map((optionText, idx) => {
          const isSelected = selectedChoice === idx;
          const letter = String.fromCharCode(65 + idx);

          return (
            <button
              type="button"
              key={idx}
              role="radio"
              aria-checked={isSelected}
              disabled={disabled}
              className={`mcq-option ${isSelected ? 'mcq-option--selected' : ''}`}
              onClick={() => onSelectChoice(idx)}
            >
              <span className="mcq-option__letter" aria-hidden="true">
                {letter}
              </span>
              <span className="mcq-option__text">{optionText}</span>
              {isSelected && (
                <span className="mcq-option__check" aria-hidden="true">
                  <Check size={16} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
