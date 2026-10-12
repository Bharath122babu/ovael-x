import React from 'react';
import { cn } from './utils';

export type BadgeVariant = 'neutral' | 'success' | 'warning' | 'error' | 'info' | 'primary';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  icon,
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'ui-badge',
        `ui-badge--${variant}`,
        `ui-badge--${size}`,
        className
      )}
      {...props}
    >
      {dot && <span className="ui-badge__dot" aria-hidden="true" />}
      {icon && <span className="ui-badge__icon" aria-hidden="true">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
