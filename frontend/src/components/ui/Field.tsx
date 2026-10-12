import React, { useId } from 'react';
import { cn } from './utils';

export interface FieldProps {
  id?: string;
  label?: string;
  description?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  id: providedId,
  label,
  description,
  error,
  required = false,
  className,
  children,
}) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const descriptionId = description ? `${id}-desc` : undefined;
  const errorId = error ? `${id}-err` : undefined;

  return (
    <div className={cn('ui-field', error && 'ui-field--has-error', className)}>
      {label && (
        <label htmlFor={id} className="ui-field__label">
          <span>{label}</span>
          {required && (
            <span className="ui-field__required" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {description && (
        <p id={descriptionId} className="ui-field__description">
          {description}
        </p>
      )}

      <div className="ui-field__control">
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<any>, {
              id: (children.props as any).id || id,
              hasError: (children.props as any).hasError !== undefined ? (children.props as any).hasError : Boolean(error),
              'aria-describedby':
                cn(
                  (children.props as any)['aria-describedby'],
                  descriptionId,
                  errorId
                ) || undefined,
            })
          : children}
      </div>

      {error && (
        <p id={errorId} role="alert" className="ui-field__error">
          {error}
        </p>
      )}
    </div>
  );
};
