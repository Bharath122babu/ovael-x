import React from 'react';
import { Check } from 'lucide-react';

export interface TrueFalseInputProps {
  value: string;
  onChange: (value: 'true' | 'false') => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export const TrueFalseInput: React.FC<TrueFalseInputProps> = ({
  value,
  onChange,
  disabled = false,
  label = 'Evaluate the statement as True or False:',
  className = '',
}) => {
  const isTrueSelected = value.toLowerCase() === 'true';
  const isFalseSelected = value.toLowerCase() === 'false';

  return (
    <div
      className={`true-false-group ${className}`}
      role="radiogroup"
      aria-label={label}
    >
      <div className="true-false-group__label">{label}</div>
      <div className="true-false-group__options">
        <button
          type="button"
          role="radio"
          aria-checked={isTrueSelected}
          disabled={disabled}
          className={`true-false-option ${isTrueSelected ? 'true-false-option--selected' : ''}`}
          onClick={() => onChange('true')}
        >
          <span className="true-false-option__indicator" aria-hidden="true">
            T
          </span>
          <span className="true-false-option__title">True</span>
          {isTrueSelected && (
            <span className="true-false-option__check" aria-hidden="true">
              <Check size={16} />
            </span>
          )}
        </button>

        <button
          type="button"
          role="radio"
          aria-checked={isFalseSelected}
          disabled={disabled}
          className={`true-false-option ${isFalseSelected ? 'true-false-option--selected' : ''}`}
          onClick={() => onChange('false')}
        >
          <span className="true-false-option__indicator" aria-hidden="true">
            F
          </span>
          <span className="true-false-option__title">False</span>
          {isFalseSelected && (
            <span className="true-false-option__check" aria-hidden="true">
              <Check size={16} />
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
