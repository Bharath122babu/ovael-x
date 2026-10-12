import React from 'react';
import { Skeleton } from '../ui';

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  className = '',
}) => {
  const widths = ['100%', '85%', '65%', '90%', '75%'];
  return (
    <div className={`skeleton-text-group ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          variant="text"
          style={{ width: widths[idx % widths.length], height: '14px', marginBottom: '8px' }}
        />
      ))}
    </div>
  );
};

export interface SkeletonCardProps {
  className?: string;
  hasAvatar?: boolean;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  className = '',
  hasAvatar = false,
}) => {
  return (
    <div className={`skeleton-card-group ${className}`} aria-hidden="true">
      <div className="skeleton-card-header">
        {hasAvatar && (
          <Skeleton variant="circular" width={40} height={40} style={{ flexShrink: 0 }} />
        )}
        <div style={{ flex: 1 }}>
          <Skeleton variant="text" style={{ width: '45%', height: '18px', marginBottom: '6px' }} />
          <Skeleton variant="text" style={{ width: '25%', height: '12px' }} />
        </div>
      </div>
      <div className="skeleton-card-body" style={{ marginTop: '14px' }}>
        <Skeleton variant="text" style={{ width: '100%', height: '14px', marginBottom: '6px' }} />
        <Skeleton variant="text" style={{ width: '80%', height: '14px' }} />
      </div>
    </div>
  );
};

export interface SkeletonRowProps {
  className?: string;
}

export const SkeletonRow: React.FC<SkeletonRowProps> = ({ className = '' }) => {
  return (
    <div className={`skeleton-row-group ${className}`} aria-hidden="true">
      <Skeleton variant="circular" width={28} height={28} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <Skeleton variant="text" style={{ width: '60%', height: '16px', marginBottom: '4px' }} />
        <Skeleton variant="text" style={{ width: '35%', height: '12px' }} />
      </div>
      <Skeleton variant="rectangular" width={60} height={24} style={{ borderRadius: '12px' }} />
    </div>
  );
};

export interface SkeletonTableProps {
  rows?: number;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 4,
  className = '',
}) => {
  return (
    <div className={`skeleton-table-group ${className}`} aria-hidden="true">
      <div className="skeleton-table-header">
        <Skeleton variant="text" style={{ width: '25%', height: '14px' }} />
        <Skeleton variant="text" style={{ width: '35%', height: '14px' }} />
        <Skeleton variant="text" style={{ width: '20%', height: '14px' }} />
      </div>
      <div className="skeleton-table-rows">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="skeleton-table-row">
            <Skeleton variant="text" style={{ width: '30%', height: '14px' }} />
            <Skeleton variant="text" style={{ width: '50%', height: '14px' }} />
            <Skeleton variant="rectangular" width={48} height={18} style={{ borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  );
};
