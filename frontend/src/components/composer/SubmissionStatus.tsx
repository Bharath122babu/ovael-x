import React from 'react';
import { AlertCircle, LoaderCircle, CheckCircle2 } from 'lucide-react';
import { Alert } from '../ui';

export interface SubmissionStatusProps {
  error?: string | null;
  busy?: boolean;
  busyText?: string;
  onClearError?: () => void;
  className?: string;
}

export const SubmissionStatus: React.FC<SubmissionStatusProps> = ({
  error,
  busy = false,
  busyText = 'Submitting response and planning next step...',
  onClearError,
  className = '',
}) => {
  if (busy) {
    return (
      <div
        className={`submission-status submission-status--busy ${className}`}
        role="status"
        aria-live="polite"
      >
        <LoaderCircle size={15} className="spin text-primary" aria-hidden="true" />
        <span>{busyText}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`submission-status submission-status--error ${className}`}>
        <Alert
          variant="error"
          title="Submission error"
          onDismiss={onClearError}
        >
          {error}
        </Alert>
      </div>
    );
  }

  return null;
};
