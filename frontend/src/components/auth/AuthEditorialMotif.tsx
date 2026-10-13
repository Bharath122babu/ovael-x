import React from 'react';
import { ProgressionMotionVisual } from '../visuals/ProgressionMotionVisual';

export interface AuthEditorialMotifProps {
  className?: string;
  /** Reflects real pending authentication operation */
  active?: boolean;
}

/**
 * OVAEL-X Editorial Artwork Motif (Powered by Signature Motion Concept B: PROGRESSION).
 *
 * A 2.5D mechanical sphere-and-track composition representing structured, bounded
 * learning progression. Features a studio-lit Sustainable Linen (#FAF3E1) sphere
 * rolling along a sculpted Recycled Cotton (#F5E7C6) and Electric Tangerine (#FF6D1F)
 * guideway channel from Origin through an Inflection Gate to a Destination Plinth.
 *
 * Free of fake metrics, percentage labels, and promotional copy.
 */
export const AuthEditorialMotif: React.FC<AuthEditorialMotifProps> = ({
  className = '',
  active = false,
}) => {
  return (
    <ProgressionMotionVisual
      variant="editorial"
      active={active}
      className={`auth-editorial-motif ${className}`.trim()}
      ariaLabel="Abstract geometric editorial motif representing learning progression"
    />
  );
};
