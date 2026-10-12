import React from 'react';
import { cn } from './utils';
import { X, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

const defaultIcons: Record<AlertVariant, React.ReactNode> = {
  info: <Info size={16} />,
  success: <CheckCircle size={16} />,
  warning: <AlertTriangle size={16} />,
  error: <AlertCircle size={16} />,
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  icon,
  onDismiss,
  className,
  children,
  ...props
}) => {
  const isAlertRole = variant === 'error' || variant === 'warning';
  const role = isAlertRole ? 'alert' : 'status';
  const displayIcon = icon !== undefined ? icon : defaultIcons[variant];

  return (
    <div
      role={role}
      className={cn('ui-alert', `ui-alert--${variant}`, className)}
      {...props}
    >
      {displayIcon && <span className="ui-alert__icon">{displayIcon}</span>}
      <div className="ui-alert__content">
        {title && <strong className="ui-alert__title">{title}</strong>}
        <div className="ui-alert__description">{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ui-alert__dismiss"
          aria-label="Dismiss alert"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
};
