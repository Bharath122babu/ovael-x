import React from 'react';
import { cn } from './utils';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  hasError?: boolean;
  inputSize?: InputSize;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      hasError = false,
      inputSize = 'md',
      leftElement,
      rightElement,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div
        className={cn(
          'ui-input-wrapper',
          `ui-input-wrapper--${inputSize}`,
          hasError && 'ui-input-wrapper--error',
          disabled && 'ui-input-wrapper--disabled'
        )}
      >
        {leftElement && <span className="ui-input-element ui-input-element--left">{leftElement}</span>}
        <input
          ref={ref}
          disabled={disabled}
          aria-invalid={hasError ? 'true' : undefined}
          className={cn('ui-input', `ui-input--${inputSize}`, className)}
          {...props}
        />
        {rightElement && <span className="ui-input-element ui-input-element--right">{rightElement}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
