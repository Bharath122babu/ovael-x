import React from 'react';
import { ShieldCheck, AlertCircle, Info } from 'lucide-react';

export interface EvidenceBannerProps {
  evidence?: {
    score?: number | null;
    evaluation?: {
      status?: 'graded' | 'needs_review' | 'abstain' | string;
      needs_review_reason?: string;
    };
  } | null;
}

export const EvidenceBanner: React.FC<EvidenceBannerProps> = ({ evidence }) => {
  if (!evidence) return null;

  const status = evidence.evaluation?.status || 'recorded';
  const score = evidence.score;
  const reason = evidence.evaluation?.needs_review_reason;

  const isGraded = status === 'graded';
  const isNeedsReview = status === 'needs_review';

  const percentage = score != null ? Math.round(score * 100) : null;

  let title = 'Response Recorded';
  let description =
    score != null
      ? 'Verified grading recorded from this turn.'
      : 'No graded evidence was recorded from this interaction.';
  let variantClass = 'evidence-banner--info';
  let Icon = Info;

  if (isGraded) {
    title = percentage != null ? `Evaluated • ${percentage}% Mastery Signal` : 'Evaluated • Score Recorded';
    description = 'Verified grading updated your demonstrable learning state.';
    variantClass = 'evidence-banner--success';
    Icon = ShieldCheck;
  } else if (isNeedsReview) {
    title = 'Needs Manual Verification';
    description =
      reason ||
      'Answer could not be reliably verified automatically. Progress remains preserved without penalties.';
    variantClass = 'evidence-banner--warning';
    Icon = AlertCircle;
  }

  return (
    <aside className={`evidence-banner ${variantClass}`} role="status" aria-label="Assessment evidence update">
      <div className="evidence-banner__icon" aria-hidden="true">
        <Icon size={19} />
      </div>
      <div className="evidence-banner__body">
        <strong className="evidence-banner__title">{title}</strong>
        <p className="evidence-banner__desc">{description}</p>
      </div>
    </aside>
  );
};
