import React from 'react';
import { cn } from './utils';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'compact' | 'card';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'ui-empty-state',
        variant !== 'default' && `ui-empty-state--${variant}`,
        className
      )}
      {...props}
    >
      {icon && <div className="ui-empty-state__icon">{icon}</div>}
      <h3 className="ui-empty-state__title">{title}</h3>
      {description && <p className="ui-empty-state__description">{description}</p>}
      {action && <div className="ui-empty-state__action">{action}</div>}
    </div>
  );
};
