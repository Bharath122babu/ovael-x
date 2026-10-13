import React from 'react';

export interface ProofDimensionBarProps {
  label: string;
  score: number;
  mass: number;
  dimension: 'acquisition' | 'independent' | 'transfer' | 'retention';
  showDetails?: boolean;
}

export const ProofDimensionBar: React.FC<ProofDimensionBarProps> = ({
  label,
  score,
  mass,
  dimension,
  showDetails = true,
}) => {
  const percent = Math.round(Math.max(0, Math.min(1, score)) * 100);
  const hasEvidence = mass > 0;

  return (
    <div className={`proof-dimension-bar proof-dimension-bar--${dimension}`}>
      <div className="proof-dimension-bar__header">
        <span className="proof-dimension-bar__label">{label}</span>
        <div className="proof-dimension-bar__values">
          {hasEvidence ? (
            <>
              <span className="proof-dimension-bar__score">{`${percent}%`}</span>
              {showDetails && (
                <span className="proof-dimension-bar__mass" title="Accumulated observation mass">
                  {`(${mass.toFixed(1)} mass)`}
                </span>
              )}
            </>
          ) : (
            <span className="proof-dimension-bar__empty">Unobserved</span>
          )}
        </div>
      </div>

      <div
        className="proof-dimension-bar__track"
        role="progressbar"
        aria-label={`${label} demonstrated score`}
        aria-valuenow={hasEvidence ? percent : 0}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`proof-dimension-bar__fill proof-dimension-bar__fill--${dimension}`}
          style={{ width: `${hasEvidence ? percent : 0}%` }}
        />
      </div>
    </div>
  );
};
