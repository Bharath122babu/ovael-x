import React, { useState } from 'react';
import { Network, ChevronDown, ChevronUp, Copy, Check, Terminal } from 'lucide-react';
import { Button, Badge } from '../ui';
import { MechanismMotionVisual } from '../visuals';

export interface DecisionTraceViewerProps {
  decisionFrame?: Record<string, any>;
  decisionTrace?: Record<string, any>;
}

export const DecisionTraceViewer: React.FC<DecisionTraceViewerProps> = ({
  decisionFrame,
  decisionTrace,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const payload = decisionFrame || decisionTrace;
  if (!payload || Object.keys(payload).length === 0) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Ignore copy error
    }
  };

  const action = payload.action || payload.decision || payload.pedagogy_action;
  const reason = payload.reason || payload.decision_summary || payload.rule;

  return (
    <div className="decision-trace-viewer">
      <div className="decision-trace-viewer__header">
        <button
          type="button"
          className="decision-trace-viewer__toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls="decision-trace-content"
        >
          <Network size={15} aria-hidden="true" className="text-primary" />
          <span>Adaptive Decision Trace</span>
          {action && (
            <Badge variant="neutral" size="sm">
              {String(action)}
            </Badge>
          )}
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {isOpen && (
          <button
            type="button"
            className="decision-trace-viewer__copy-btn"
            onClick={handleCopy}
            aria-label="Copy decision trace JSON"
            title="Copy JSON"
          >
            {copied ? (
              <>
                <Check size={12} aria-hidden="true" /> Copied
              </>
            ) : (
              <>
                <Copy size={12} aria-hidden="true" /> Copy JSON
              </>
            )}
          </button>
        )}
      </div>

      {isOpen && (
        <div id="decision-trace-content" className="decision-trace-viewer__content">
          <div className="decision-trace-viewer__mechanism-bar">
            <MechanismMotionVisual variant="inline" state="settled" decorative={true} />
            <span className="decision-trace-viewer__mechanism-caption">Deterministic frame locked</span>
          </div>
          {reason && (
            <div className="decision-trace-viewer__summary">
              <span className="decision-trace-viewer__summary-label">Decision Rationale:</span>
              <p className="decision-trace-viewer__summary-text">{String(reason)}</p>
            </div>
          )}

          <div className="decision-trace-viewer__json-wrap">
            <div className="decision-trace-viewer__json-head">
              <Terminal size={12} aria-hidden="true" />
              <span>Inspection Frame</span>
            </div>
            <pre className="decision-trace-viewer__pre">
              <code>{JSON.stringify(payload, null, 2)}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
