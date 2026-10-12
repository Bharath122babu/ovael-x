import React from 'react';
import { Menu } from 'lucide-react';
import { Badge, IconButton } from '../ui';
import { ViewType } from './Sidebar';

export interface TopBarProps {
  view: ViewType;
  user: { username?: string; role?: string; [key: string]: any } | null;
  activeCourseName?: string;
  activeConceptName?: string;
  isSessionActive?: boolean;
  onOpenMobile: () => void;
  onOpenSettings: () => void;
  className?: string;
}

const VIEW_TITLES: Record<ViewType, string> = {
  learn: 'Learning session',
  courses: 'Courses & materials',
  insights: 'Learning evidence',
  settings: 'Workspace settings',
};

export const TopBar: React.FC<TopBarProps> = ({
  view,
  user,
  activeCourseName,
  activeConceptName,
  isSessionActive = false,
  onOpenMobile,
  onOpenSettings,
  className = '',
}) => {
  return (
    <header className={`topbar ${className}`} role="banner">
      <div className="topbar__left">
        <IconButton
          label="Open navigation menu"
          icon={<Menu size={19} />}
          onClick={onOpenMobile}
          className="mobile-nav-trigger"
        />

        <nav aria-label="Breadcrumb" className="crumb">
          <span className="crumb-root">Workspace</span>
          <span className="slash" aria-hidden="true">
            /
          </span>
          <b className="crumb-current">{VIEW_TITLES[view]}</b>

          {activeCourseName && view === 'learn' && (
            <span className="topbar-context-tag" title={`Course: ${activeCourseName}`}>
              <span className="slash" aria-hidden="true">
                /
              </span>
              <span className="context-course">{activeCourseName}</span>
              {activeConceptName && <span className="context-concept">· {activeConceptName}</span>}
            </span>
          )}
        </nav>
      </div>

      <div className="top-actions">
        <span className="runtime-status">
          <Badge variant="success" dot size="sm">
            Decision + AI v5
          </Badge>
        </span>

        {user && (
          <button
            type="button"
            className="icon-btn topbar-account-btn"
            title={`Account: ${user.username || 'Learner'} (Click to open settings)`}
            aria-label={`Signed in as ${user.username || 'Learner'}. Open settings`}
            onClick={onOpenSettings}
          >
            <span className="avatar small" aria-hidden="true">
              {user.username?.[0]?.toUpperCase() || 'U'}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
