import React from 'react';

export interface PageHeaderProps {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  eyebrow?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  eyebrow,
  badge,
  actions,
  className = '',
}) => {
  return (
    <div className={`page-heading ${className}`}>
      <div className="page-heading__main">
        {eyebrow && (
          <div className="eyebrow">
            {eyebrow} <span className="mini-line" aria-hidden="true" />
          </div>
        )}
        <h1>
          {title}
          <span className="accent">.</span>
        </h1>
        {description && <p>{description}</p>}
      </div>

      {(badge || actions) && (
        <div className="page-heading__actions">
          {badge}
          {actions}
        </div>
      )}
    </div>
  );
};
