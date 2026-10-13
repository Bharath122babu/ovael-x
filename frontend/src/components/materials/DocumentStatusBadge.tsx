import React from 'react';
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  Lock,
  Clock,
  LoaderCircle,
} from 'lucide-react';
import { Badge, BadgeVariant } from '../ui';

export interface DocumentStatusBadgeProps {
  status: string;
  error?: string | null;
  size?: 'sm' | 'md';
}

export const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({
  status,
  error,
  size = 'sm',
}) => {
  let variant: BadgeVariant = 'neutral';
  let label = status;
  let icon: React.ReactNode = null;

  switch (status) {
    case 'ready':
      variant = 'success';
      label = 'Ready for Learning';
      icon = <CheckCircle2 size={12} aria-hidden="true" />;
      break;

    case 'ready_partial':
      variant = 'warning';
      label = 'Partially Extracted';
      icon = <Info size={12} aria-hidden="true" />;
      break;

    case 'processing':
    case 'uploaded':
      variant = 'primary';
      label = 'Extracting Content';
      icon = <LoaderCircle size={12} className="status-spinner-icon" aria-hidden="true" />;
      break;

    case 'failed_retryable':
      variant = 'error';
      label = 'Extraction Failed';
      icon = <AlertTriangle size={12} aria-hidden="true" />;
      break;

    case 'password_required':
      variant = 'warning';
      label = 'Password Required';
      icon = <Lock size={12} aria-hidden="true" />;
      break;

    default:
      variant = 'neutral';
      label = status.replace(/_/g, ' ');
      icon = <Clock size={12} aria-hidden="true" />;
      break;
  }

  return (
    <span
      className={`document-status-wrapper doc-status-badge doc-status-badge--${status}`}
      title={error || label}
    >
      <Badge variant={variant} size={size} icon={icon}>
        {label}
      </Badge>
    </span>
  );
};
