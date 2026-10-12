import React from 'react';
import { BrainCircuit, Check, ShieldAlert } from 'lucide-react';
import { Card, Badge, Spinner } from '../ui';

export interface PersonalizationToggleProps {
  enabled: boolean;
  loading: boolean;
  onToggle: (newVal: boolean) => Promise<void>;
}

export const PersonalizationToggle: React.FC<PersonalizationToggleProps> = ({
  enabled,
  loading,
  onToggle,
}) => {
  return (
    <Card className="settings-card personalization-card">
      <div className="personalization-card__header">
        <div className="personalization-card__icon" aria-hidden="true">
          <BrainCircuit size={20} />
        </div>
        <div className="personalization-card__info">
          <div className="personalization-card__title-line">
            <h4 className="personalization-card__title">
              Adaptive Memory &amp; Personalization
            </h4>
            <Badge variant={enabled ? 'primary' : 'neutral'} size="sm">
              {enabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>
          <p className="personalization-card__desc">
            When enabled, the pedagogical engine retrieves procedural memory from past
            interactions to personalize explanation scaffolds and calibrate difficulty.
            When disabled, active context relays are purged and sessions operate with
            stateless curriculum boundaries.
          </p>
        </div>

        <div className="personalization-card__action">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            disabled={loading}
            onClick={() => onToggle(!enabled)}
            className={`toggle-switch ${enabled ? 'toggle-switch--on' : 'toggle-switch--off'}`}
            aria-label="Toggle adaptive memory personalization"
          >
            <span className="toggle-switch__thumb">
              {loading && <Spinner size="sm" />}
            </span>
          </button>
        </div>
      </div>

      <div className="personalization-card__subtext">
        <ShieldAlert size={14} aria-hidden="true" />
        <span>
          Disabling personalization automatically deletes all transient MCP context relay
          records on the backend.
        </span>
      </div>
    </Card>
  );
};
