import React from 'react';
import { ProgressionMotionVisual } from '../visuals/ProgressionMotionVisual';

export interface AuthEditorialMotifProps {
  className?: string;
}

/**
 * OVAEL-X Editorial Learning-Path Motif.
 *
 * Preserves the curved learning-path illustration on the authentication screen
 * with progressive orange path drawing, a single Electric Tangerine accent traversal,
 * sequential node activation, and a clean static resting state.
 *
 * Independent of authentication state and free of fake metrics or stage labels.
 */
export const AuthEditorialMotif: React.FC<AuthEditorialMotifProps> = ({
  className = '',
}) => {
  return (
    <ProgressionMotionVisual
      variant="editorial"
      className={`auth-editorial-motif ${className}`.trim()}
      ariaLabel="Abstract geometric editorial motif representing learning progression"
    />
  );
};
