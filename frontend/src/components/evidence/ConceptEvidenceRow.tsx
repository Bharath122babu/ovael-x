import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Badge, Button, IconButton } from '../ui';
import { ProofDimensionBar } from './ProofDimensionBar';
import { ConceptProofState } from './types';

export interface ConceptEvidenceRowProps {
  state: ConceptProofState;
  onStudyConcept?: (conceptId: string) => void;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'retained':
      return (
        <Badge variant="primary" size="sm" icon={<ShieldCheck size={12} />}>
          Retained
        </Badge>
      );
    case 'transfer_verified':
      return (
        <Badge variant="primary" size="sm" icon={<Sparkles size={12} />}>
          Transfer Verified
        </Badge>
      );
    case 'independent_verified':
      return (
        <Badge variant="success" size="sm" icon={<CheckCircle2 size={12} />}>
          Independently Verified
        </Badge>
      );
    case 'needs_independent_practice':
      return (
        <Badge variant="warning" size="sm" icon={<AlertTriangle size={12} />}>
          Needs Practice
        </Badge>
      );
    case 'insufficient_evidence':
    default:
      return (
        <Badge variant="neutral" size="sm" icon={<Clock size={12} />}>
          Insufficient Evidence
        </Badge>
      );
  }
}

export const ConceptEvidenceRow: React.FC<ConceptEvidenceRowProps> = ({
  state,
  onStudyConcept,
}) => {
  const [expanded, setExpanded] = useState(false);

  const title = state.concept_name || state.concept_id;
  const gap = state.assistance_gap;
  const formattedGap =
    gap !== null && gap !== undefined
      ? `${gap >= 0 ? '+' : ''}${(gap * 100).toFixed(0)}%`
      : 'N/A';

  const lastDate = state.last_evidence_at
    ? new Date(state.last_evidence_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const nextRetentionDate = state.next_retention_check_at
    ? new Date(state.next_retention_check_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <article
      className={`concept-evidence-row ${expanded ? 'concept-evidence-row--expanded' : ''}`}
      aria-labelledby={`evidence-title-${state.concept_id}`}
    >
      <div className="concept-evidence-row__main">
        {/* Leading Info */}
        <div className="concept-evidence-row__identity">
          <div className="concept-evidence-row__title-wrap">
            <h4
              id={`evidence-title-${state.concept_id}`}
              className="concept-evidence-row__name"
            >
              {title}
            </h4>
            {getStatusBadge(state.status)}
            {state.retention_due && (
              <Badge variant="error" size="sm" icon={<Clock size={12} />}>
                Retention Due
              </Badge>
            )}
          </div>
          <div className="concept-evidence-row__meta">
            <span className="concept-evidence-row__sub-id">
              Subject: <code>{state.subject_id}</code>
            </span>
            {lastDate && (
              <>
                <span className="meta-sep">·</span>
                <span>Last observed {lastDate}</span>
              </>
            )}
            <span className="meta-sep">·</span>
            <span
              className="concept-evidence-row__quality"
              title="Determined by saturating evidence sufficiency curve 1 - 2^(-mass/5)"
            >
              {`${(state.evidence_quality * 100).toFixed(0)}% data sufficiency`}
            </span>
          </div>
        </div>

        {/* Dimension Indicators Grid */}
        <div className="concept-evidence-row__dimensions">
          <ProofDimensionBar
            label="Acquisition"
            score={state.acquisition}
            mass={state.evidence_mass?.acquisition || 0}
            dimension="acquisition"
          />
          <ProofDimensionBar
            label="Independent"
            score={state.independent}
            mass={state.evidence_mass?.independent || 0}
            dimension="independent"
          />
          <ProofDimensionBar
            label="Transfer"
            score={state.transfer}
            mass={state.evidence_mass?.transfer || 0}
            dimension="transfer"
          />
          <ProofDimensionBar
            label="Retention"
            score={state.retention}
            mass={state.evidence_mass?.retention || 0}
            dimension="retention"
          />
        </div>

        {/* Right Stats & Actions */}
        <div className="concept-evidence-row__actions">
          <div
            className="concept-evidence-row__gap-stat"
            title="Assistance gap: difference between assisted performance and independent unassisted performance"
          >
            <span className="gap-label">Scaffold Gap</span>
            <span
              className={`gap-value ${
                gap !== null && gap > 0.2
                  ? 'gap-value--high'
                  : 'gap-value--normal'
              }`}
            >
              {formattedGap}
            </span>
          </div>

          {onStudyConcept && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onStudyConcept(state.concept_id)}
              rightIcon={<ArrowRight size={14} />}
            >
              Practice
            </Button>
          )}

          <IconButton
            size="sm"
            label={expanded ? 'Collapse details' : 'Expand details'}
            icon={expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            onClick={() => setExpanded(!expanded)}
          />
        </div>
      </div>

      {/* Expanded Audit Details */}
      {expanded && (
        <div className="concept-evidence-row__details">
          <div className="evidence-detail-grid">
            <div className="evidence-detail-card">
              <h5>Verification Recommendation</h5>
              <p>
                The learning engine recommends verifying{' '}
                <strong>{state.recommended_verification}</strong> next to strengthen
                independent transferable proof.
              </p>
              {nextRetentionDate && (
                <div className="evidence-detail-subtext">
                  <Calendar size={13} aria-hidden="true" />
                  <span>
                    Next spaced retention check:{' '}
                    <strong>{nextRetentionDate}</strong> ({state.retention_interval_days} day interval)
                  </span>
                </div>
              )}
            </div>

            <div className="evidence-detail-card">
              <h5>Observation Mass Breakdown</h5>
              <div className="mass-tags">
                <span className="mass-tag">
                  Acquisition: {state.evidence_mass.acquisition.toFixed(2)}
                </span>
                <span className="mass-tag">
                  Independent: {state.evidence_mass.independent.toFixed(2)}
                </span>
                <span className="mass-tag">
                  Transfer: {state.evidence_mass.transfer.toFixed(2)}
                </span>
                <span className="mass-tag">
                  Retention: {state.evidence_mass.retention.toFixed(2)}
                </span>
                {state.evidence_mass.assisted !== undefined && (
                  <span className="mass-tag">
                    Assisted: {state.evidence_mass.assisted.toFixed(2)}
                  </span>
                )}
              </div>
              <p className="evidence-detail-subtext">
                <Info size={13} aria-hidden="true" />
                Observations decay in mass when hints or retries are requested.
              </p>
            </div>

            <div className="evidence-detail-card">
              <h5>Epistemic Boundaries</h5>
              <p>
                Scores represent internal evidence indices based on confirmed
                evaluations, not psychometric claims of universal human mastery.
              </p>
              <div className="evidence-detail-subtext">
                <span>Uncertainty: <strong>{(state.uncertainty * 100).toFixed(0)}%</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};
