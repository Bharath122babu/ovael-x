import React from 'react';
import { cn } from './utils';
import { Spinner } from './Spinner';
import { ButtonVariant, ButtonSize } from './Button';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string; // Required for screen-reader accessibility
  icon: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  tooltip?: string;
  loading?: boolean;
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      label,
      icon,
      variant = 'ghost',
      size = 'md',
      tooltip,
      loading = false,
      disabled,
      className,
      type = 'button',
      onClick,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        e.preventDefault();
        return;
      }
      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-label={label}
        aria-busy={loading ? 'true' : undefined}
        title={tooltip || label}
        onClick={handleClick}
        className={cn(
          'ui-icon-button',
          `ui-button--${variant}`,
          `ui-icon-button--${size}`,
          loading && 'ui-button--loading',
          className
        )}
        {...props}
      >
        {loading ? (
          <Spinner size={size === 'sm' ? 'sm' : 'md'} />
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = 'IconButton';
