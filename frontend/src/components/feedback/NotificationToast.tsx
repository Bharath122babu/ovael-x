import React, { useEffect, useRef } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import { NotificationItem } from './types';
import { Button } from '../ui';

export interface NotificationToastProps {
  notification: NotificationItem;
  onDismiss: (id: string) => void;
}

const severityIcons = {
  success: <CheckCircle2 size={18} aria-hidden="true" />,
  info: <Info size={18} aria-hidden="true" />,
  warning: <AlertTriangle size={18} aria-hidden="true" />,
  error: <AlertCircle size={18} aria-hidden="true" />,
};

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
}) => {
  const { id, message, severity, title, action, duration } = notification;
  const timerRef = useRef<number | null>(null);
  const remainingTimeRef = useRef<number>(duration || 5000);
  const startTimeRef = useRef<number>(Date.now());
  const isPausedRef = useRef<boolean>(false);

  // Setup auto-dismiss lifecycle
  useEffect(() => {
    if (!duration || duration <= 0 || duration === Infinity) return;

    const startTimer = (ms: number) => {
      startTimeRef.current = Date.now();
      timerRef.current = window.setTimeout(() => {
        onDismiss(id);
      }, ms);
    };

    startTimer(remainingTimeRef.current);

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [id, duration, onDismiss]);

  const handleMouseEnter = () => {
    if (!duration || duration <= 0 || duration === Infinity || isPausedRef.current) return;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(1000, remainingTimeRef.current - elapsed);
    isPausedRef.current = true;
  };

  const handleMouseLeave = () => {
    if (!duration || duration <= 0 || duration === Infinity || !isPausedRef.current) return;
    isPausedRef.current = false;
    startTimeRef.current = Date.now();
    timerRef.current = window.setTimeout(() => {
      onDismiss(id);
    }, remainingTimeRef.current);
  };

  const isAlert = severity === 'error';

  return (
    <div
      role={isAlert ? 'alert' : 'status'}
      aria-live={isAlert ? 'assertive' : 'polite'}
      className={`notification-toast notification-toast--${severity}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      <div className="notification-toast__icon">
        {severityIcons[severity]}
      </div>

      <div className="notification-toast__content">
        {title && <strong className="notification-toast__title">{title}</strong>}
        <div className="notification-toast__message">{message}</div>
        {action && (
          <div className="notification-toast__action">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                action.onClick();
                onDismiss(id);
              }}
              aria-label={action.ariaLabel || action.label}
            >
              {action.label}
            </Button>
          </div>
        )}
      </div>

      <button
        type="button"
        className="notification-toast__dismiss"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
        title="Dismiss notification"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
};
