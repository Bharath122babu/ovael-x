import React from 'react';
import { Card } from '../ui';

export interface EvidenceMetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
  badge?: React.ReactNode;
  variant?: 'default' | 'highlight' | 'warning';
}

export const EvidenceMetricCard: React.FC<EvidenceMetricCardProps> = ({
  icon,
  label,
  value,
  description,
  badge,
  variant = 'default',
}) => {
  return (
    <Card className={`evidence-metric-card evidence-metric-card--${variant}`}>
      <div className="evidence-metric-card__header">
        <span className="evidence-metric-card__icon" aria-hidden="true">
          {icon}
        </span>
        {badge && <div className="evidence-metric-card__badge">{badge}</div>}
      </div>
      <div className="evidence-metric-card__content">
        <span className="evidence-metric-card__value">{value}</span>
        <h4 className="evidence-metric-card__label">{label}</h4>
        <p className="evidence-metric-card__desc">{description}</p>
      </div>
    </Card>
  );
};
