import React, { useEffect } from 'react';
import {
  ShieldCheck,
  X,
  Cpu,
  Eye,
  Brain,
  Stethoscope,
  Terminal,
  Layers,
  Info,
} from 'lucide-react';
import { Button, IconButton, Badge, Alert } from '../ui';
import { DecisionAuditData } from './types';

export interface DecisionAuditDrawerProps {
  isOpen: boolean;
  auditData: DecisionAuditData | null;
  loading: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export const DecisionAuditDrawer: React.FC<DecisionAuditDrawerProps> = ({
  isOpen,
  auditData,
  loading,
  onClose,
  onRefresh,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const decisionFrame = auditData?.decision?.decision_frame || {};
  const decisionTrace = auditData?.decision?.decision_trace || {};
  const observedEv = auditData?.observed?.evidence || {};
  const diagnosis = auditData?.diagnosis || {};
  const arch = auditData?.architecture || {};

  return (
    <div
      className="decision-audit-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-audit-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="decision-audit-panel" role="document">
        {/* Header */}
        <div className="decision-audit-header">
          <div className="decision-audit-header__title-wrap">
            <span className="decision-audit-header__icon" aria-hidden="true">
              <Cpu size={20} />
            </span>
            <div>
              <h3 id="decision-audit-title" className="decision-audit-title">
                Learning-Engine Decision Audit
              </h3>
              <p className="decision-audit-subtitle">
                Privacy-safe audit of the latest OVAEL closed-loop decision transaction.
              </p>
            </div>
          </div>
          <div className="decision-audit-header__actions">
            {onRefresh && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onRefresh}
                loading={loading}
              >
                Refresh Trace
              </Button>
            )}
            <IconButton
              label="Close decision audit"
              icon={<X size={18} />}
              onClick={onClose}
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="decision-audit-body">
          {/* Transparency Notice */}
          <div className="decision-audit-notice" role="note">
            <Info size={16} aria-hidden="true" />
            <span>
              This audit verifies deterministic policy enforcement. OVAEL-X isolates AI as an
              escalation coprocessor while keeping all pedagogical sequencing, state tracking,
              and assessment contracts deterministic and auditable.
            </span>
          </div>

          {loading ? (
            <div className="decision-audit-loading">
              <p>Fetching latest closed-loop transaction audit...</p>
            </div>
          ) : auditData?.status === 'no_session' ? (
            <div className="decision-audit-empty">
              <p>No recent learning session found. Start a learning session to generate decision traces.</p>
            </div>
          ) : (
            <div className="decision-audit-sections">
              {/* 1. Architecture Verification */}
              <section className="audit-section">
                <div className="audit-section__head">
                  <Terminal size={16} aria-hidden="true" />
                  <h4>Architecture Guarantees</h4>
                </div>
                <div className="audit-spec-list">
                  <div className="audit-spec-item">
                    <span className="spec-label">Controller:</span>
                    <span className="spec-val">
                      <Badge variant="primary" size="sm">
                        {arch.controller || 'DecisionKernel'}
                      </Badge>
                    </span>
                  </div>
                  <div className="audit-spec-item">
                    <span className="spec-label">Control Path:</span>
                    <span className="spec-val">
                      <code>{arch.control_path || 'deterministic state -> one DecisionFrame'}</code>
                    </span>
                  </div>
                  <div className="audit-spec-item">
                    <span className="spec-label">AI Boundary:</span>
                    <span className="spec-val">
                      {arch.ai_boundary || 'Semantic escalation only; no autonomous authority'}
                    </span>
                  </div>
                </div>
              </section>

              {/* 2. Observed Evidence */}
              <section className="audit-section">
                <div className="audit-section__head">
                  <Eye size={16} aria-hidden="true" />
                  <h4>Observed Assessment Evidence</h4>
                </div>
                <div className="audit-spec-list">
                  <div className="audit-spec-item">
                    <span className="spec-label">Evaluation Status:</span>
                    <span className="spec-val">
                      <Badge
                        variant={
                          observedEv.correct ? 'success' : 'neutral'
                        }
                        size="sm"
                      >
                        {observedEv.correct ? 'Demonstrated Correct' : 'Needs Practice / Review'}
                      </Badge>
                    </span>
                  </div>
                  {observedEv.score !== undefined && (
                    <div className="audit-spec-item">
                      <span className="spec-label">Calculated Score:</span>
                      <span className="spec-val">
                        <strong>{(observedEv.score * 100).toFixed(0)}%</strong>
                      </span>
                    </div>
                  )}
                  {observedEv.evaluation?.needs_review_reason && (
                    <div className="audit-spec-item">
                      <span className="spec-label">Verification Reason:</span>
                      <span className="spec-val text-warning">
                        {observedEv.evaluation.needs_review_reason}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* 3. Causal Gap Diagnosis */}
              <section className="audit-section">
                <div className="audit-section__head">
                  <Stethoscope size={16} aria-hidden="true" />
                  <h4>Causal Gap Diagnosis</h4>
                </div>
                <p className="audit-desc-text">
                  {diagnosis.summary ||
                    'No active prerequisite gaps or conceptual misconceptions flagged in current turn.'}
                </p>
                {Array.isArray(diagnosis.cases) && diagnosis.cases.length > 0 && (
                  <div className="diagnosis-cases">
                    {diagnosis.cases.map((c: any, i: number) => (
                      <div key={i} className="diagnosis-case-pill">
                        <span>{typeof c === 'string' ? c : c.concept || c.summary}</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 4. Pedagogical Decision Frame */}
              <section className="audit-section">
                <div className="audit-section__head">
                  <Brain size={16} aria-hidden="true" />
                  <h4>Selected Pedagogical Action</h4>
                </div>
                <div className="audit-spec-list">
                  <div className="audit-spec-item">
                    <span className="spec-label">Action Selected:</span>
                    <span className="spec-val">
                      <Badge variant="primary" size="sm">
                        {decisionFrame.action || decisionTrace.action || 'practice'}
                      </Badge>
                    </span>
                  </div>
                  <div className="audit-spec-item">
                    <span className="spec-label">Decision Reason:</span>
                    <span className="spec-val">
                      {decisionFrame.reason || decisionTrace.reason || 'Minimum assistance policy'}
                    </span>
                  </div>
                  {decisionFrame.assistance_level !== undefined && (
                    <div className="audit-spec-item">
                      <span className="spec-label">Assistance Level:</span>
                      <span className="spec-val">
                        Level {decisionFrame.assistance_level} (Sovereignty Scale 0–6)
                      </span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="decision-audit-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close Audit
          </Button>
        </div>
      </div>
    </div>
  );
};
