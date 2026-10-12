import React, { useState } from 'react';
import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '../ui';
import { formatApiError } from './errorUtils';
import { ApiErrorInfo } from './types';

export interface RetryableErrorProps {
  error: unknown;
  title?: string;
  onRetry?: () => void | Promise<void>;
  retryLabel?: string;
  className?: string;
  compact?: boolean;
}

export const RetryableError: React.FC<RetryableErrorProps> = ({
  error,
  title,
  onRetry,
  retryLabel = 'Try Again',
  className = '',
  compact = false,
}) => {
  const [retrying, setRetrying] = useState(false);
  const info: ApiErrorInfo = formatApiError(error);

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      // Small cooldown to prevent tight retry loops
      setTimeout(() => {
        setRetrying(false);
      }, 400);
    }
  };

  const defaultTitle = info.isNetworkError
    ? 'Network Connection Issue'
    : 'Operation Failed';

  const icon = info.isNetworkError ? (
    <WifiOff size={18} aria-hidden="true" />
  ) : (
    <AlertCircle size={18} aria-hidden="true" />
  );

  return (
    <div
      role="alert"
      className={`retryable-error ${compact ? 'retryable-error--compact' : ''} ${className}`}
      aria-busy={retrying}
    >
      <div className="retryable-error__icon">{icon}</div>

      <div className="retryable-error__body">
        <h4 className="retryable-error__title">{title || defaultTitle}</h4>
        <p className="retryable-error__message">{info.message}</p>
        {info.rawDetails && info.rawDetails !== info.message && (
          <details className="retryable-error__details">
            <summary>Technical Details</summary>
            <code>{info.rawDetails}</code>
          </details>
        )}
      </div>

      {onRetry && (
        <div className="retryable-error__action">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            loading={retrying}
            disabled={retrying}
            leftIcon={<RefreshCw size={14} className={retrying ? 'spin-icon' : ''} />}
          >
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
