import React from 'react';
import { cn } from './utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  codeMode?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      hasError = false,
      resize = 'vertical',
      codeMode = false,
      disabled,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : undefined}
        className={cn(
          'ui-textarea',
          `ui-textarea--resize-${resize}`,
          hasError && 'ui-textarea--error',
          codeMode && 'ui-textarea--code',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
