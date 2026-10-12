import React, { useState } from 'react';
import {
  Activity,
  RefreshCw,
  Cpu,
  ShieldCheck,
  Sparkles,
  Layers,
  Clock,
  Split,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Button, Alert, Spinner } from '../ui';
import { PageHeader } from '../layout';
import { EvidenceMetricCard } from './EvidenceMetricCard';
import { ConceptEvidenceTable } from './ConceptEvidenceTable';
import { DecisionAuditDrawer } from './DecisionAuditDrawer';
import {
  ProofLearningSnapshot,
  DecisionAuditData,
} from './types';
import { api } from '../../api';

export interface LearningEvidenceViewProps {
  snapshot: ProofLearningSnapshot | null;
  loading?: boolean;
  error?: string | null;
  onRefresh: () => Promise<void>;
  onStudyConcept?: (conceptId: string) => void;
}

export const LearningEvidenceView: React.FC<LearningEvidenceViewProps> = ({
  snapshot,
  loading = false,
  error = null,
  onRefresh,
  onStudyConcept,
}) => {
  const [showAudit, setShowAudit] = useState(false);
  const [auditData, setAuditData] = useState<DecisionAuditData | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const handleOpenAudit = async () => {
    setShowAudit(true);
    setAuditLoading(true);
    try {
      const data = await api('/v1/judge/latest');
      setAuditData(data);
    } catch (err: any) {
      console.error('Failed to load latest decision audit:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const summary = snapshot?.summary;
  const states = snapshot?.states || [];

  const meanGap = summary?.mean_assistance_gap;
  const formattedMeanGap =
    meanGap !== null && meanGap !== undefined
      ? `${meanGap >= 0 ? '+' : ''}${(meanGap * 100).toFixed(0)}%`
      : 'N/A';

  return (
    <div className="learning-evidence-view">
      {/* 1. Page Header */}
      <PageHeader
        eyebrow="EVIDENCE OVER GUESSWORK"
        title="Learning Evidence"
        description="Review what your learning sessions and assessments have demonstrated."
        actions={
          <div className="learning-evidence-view__header-actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleOpenAudit}
              leftIcon={<Cpu size={15} />}
            >
              Inspect Decision Audit
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              loading={loading}
              leftIcon={<RefreshCw size={15} />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* 2. Error Display */}
      {error && (
        <div className="learning-evidence-view__alert">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* 3. Loading State */}
      {loading && !snapshot ? (
        <div className="learning-evidence-view__loading">
          <Spinner size="lg" />
          <p>Loading learning evidence records and proof state...</p>
        </div>
      ) : (
        <>
          {/* 4. Epistemic Principle Banner */}
          <section
            className="evidence-principle-banner"
            aria-label="Core epistemic guarantee"
          >
            <div className="evidence-principle-banner__icon" aria-hidden="true">
              <ShieldCheck size={22} />
            </div>
            <div className="evidence-principle-banner__content">
              <h4 className="evidence-principle-banner__heading">
                Verifiable Competence vs. Assisted Hints
              </h4>
              <p className="evidence-principle-banner__quote">
                &ldquo;{snapshot?.principle ||
                  'Assisted performance is evidence of acquisition, not automatic proof of independent retained transferable competence.'}&rdquo;
              </p>
              <div className="evidence-principle-banner__dimensions">
                <span className="dim-pill dim-pill--acq">
                  <strong>Acquisition:</strong> Guided understanding during tutoring
                </span>
                <span className="dim-pill dim-pill--indep">
                  <strong>Independent:</strong> Unassisted success without cues
                </span>
                <span className="dim-pill dim-pill--trans">
                  <strong>Transfer:</strong> Applied in novel task formulations
                </span>
                <span className="dim-pill dim-pill--ret">
                  <strong>Retention:</strong> Retained across delayed spaced checks
                </span>
              </div>
            </div>
          </section>

          {/* 5. Summary KPI Overview Cards */}
          {summary && (
            <section
              className="evidence-metrics-grid"
              aria-label="Evidence overview statistics"
            >
              <EvidenceMetricCard
                icon={<Layers size={20} />}
                label="Topics Evaluated"
                value={summary.concepts}
                description="Assessed concepts with recorded observations"
              />
              <EvidenceMetricCard
                icon={<ShieldCheck size={20} />}
                label="Independently Verified"
                value={summary.independently_verified}
                description="Concepts passed without cues or repeated attempts"
                variant={
                  summary.independently_verified > 0 ? 'highlight' : 'default'
                }
              />
              <EvidenceMetricCard
                icon={<Sparkles size={20} />}
                label="Transfer & Retention"
                value={`${summary.transfer_verified} / ${summary.retained}`}
                description="Transfer verified / Spaced retention confirmed"
              />
              <EvidenceMetricCard
                icon={<Split size={20} />}
                label="Mean Scaffold Gap"
                value={formattedMeanGap}
                description="Average difference between assisted and unassisted scores"
                variant={
                  meanGap !== null && meanGap !== undefined && meanGap > 0.2
                    ? 'warning'
                    : 'default'
                }
              />
            </section>
          )}

          {/* 6. Spaced Retention Due Banner (if any due) */}
          {summary && summary.retention_checks_due > 0 && (
            <div className="retention-due-alert" role="status">
              <Clock size={18} aria-hidden="true" />
              <div className="retention-due-alert__text">
                <strong>
                  {summary.retention_checks_due === 1
                    ? '1 spaced retention check is due!'
                    : `${summary.retention_checks_due} spaced retention checks are due!`}
                </strong>{' '}
                Independent retrieval checks keep your evidence records verified over time.
              </div>
            </div>
          )}

          {/* 7. Concept Proof Table / Breakdown */}
          <ConceptEvidenceTable
            states={states}
            onStudyConcept={onStudyConcept}
          />
        </>
      )}

      {/* Decision Audit Drawer */}
      <DecisionAuditDrawer
        isOpen={showAudit}
        auditData={auditData}
        loading={auditLoading}
        onClose={() => setShowAudit(false)}
        onRefresh={handleOpenAudit}
      />
    </div>
  );
};
