import React from 'react';
import {
  BookOpen,
  Layers3,
  Activity,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  LockKeyhole,
  LogOut,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { IconButton } from '../ui';

export type ViewType = 'learn' | 'courses' | 'insights' | 'settings';

export interface NavItemDef {
  id: ViewType;
  label: string;
  icon: LucideIcon | React.ComponentType<{ size?: number | string; className?: string }>;
}

export const NAV_ITEMS: readonly NavItemDef[] = [
  { id: 'learn', label: 'Learn', icon: BookOpen },
  { id: 'courses', label: 'My courses', icon: Layers3 },
  { id: 'insights', label: 'Learning evidence', icon: Activity },
  { id: 'settings', label: 'Settings', icon: MoreHorizontal },
] as const;

export interface SidebarProps {
  view: ViewType;
  collapsed: boolean;
  user: { username?: string; role?: string; [key: string]: any } | null;
  onToggleCollapse: () => void;
  onNavigate: (view: ViewType) => void;
  onLogout: () => void;
  className?: string;
}

export function Brand({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="brand" title="OVAEL-X Learning Workbench">
      <div className="brand-mark">
        <Layers3 size={20} aria-hidden="true" />
      </div>
      {!collapsed && (
        <span>
          ovael<span className="brand-dot">.</span>
          <small> X</small>
        </span>
      )}
    </div>
  );
}

export const Sidebar: React.FC<SidebarProps> = ({
  view,
  collapsed,
  user,
  onToggleCollapse,
  onNavigate,
  onLogout,
  className = '',
}) => {
  return (
    <aside
      aria-label="Sidebar navigation"
      className={`sidebar ${collapsed ? 'collapsed' : ''} ${className}`}
    >
      <div className="side-head">
        <Brand collapsed={collapsed} />
        <IconButton
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          tooltip={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          icon={collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          className="sidebar-toggle-btn"
        />
      </div>

      <nav aria-label="Main navigation" className="side-nav">
        <div className="nav-label" aria-hidden={collapsed ? 'true' : undefined}>
          WORKSPACE
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isSelected = view === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={isSelected ? 'page' : undefined}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
            >
              <span className="nav-item__icon" aria-hidden="true">
                <Icon size={18} />
              </span>
              {!collapsed && <span className="nav-item__label">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="side-bottom">
        <div
          className="privacy-mini"
          title="Local-first learning: Evidence is preserved while raw conversation transcripts are not stored"
        >
          <LockKeyhole size={18} aria-hidden="true" />
          {!collapsed && (
            <span>
              <b>Local-first learning</b>
              <small>Evidence, not transcripts</small>
            </span>
          )}
        </div>

        {user && (
          <div className="user-section">
            <button
              type="button"
              className="user-item"
              onClick={onLogout}
              title={`Signed in as ${user.username || 'Learner'}. Click to sign out.`}
              aria-label={`Signed in as ${user.username || 'Learner'}. Sign out.`}
            >
              <span className="avatar" aria-hidden="true">
                {user.username?.[0]?.toUpperCase() || 'U'}
              </span>
              {!collapsed && (
                <span>
                  <b>{user.username || 'Learner'}</b>
                  <small>Sign out</small>
                </span>
              )}
              {!collapsed && <LogOut size={15} aria-hidden="true" />}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
