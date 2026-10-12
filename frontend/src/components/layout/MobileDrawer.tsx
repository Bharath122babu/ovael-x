import React, { useEffect, useRef } from 'react';
import { X, LockKeyhole, LogOut } from 'lucide-react';
import { IconButton, useFocusTrap } from '../ui';
import { Brand, NAV_ITEMS, ViewType } from './Sidebar';

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  view: ViewType;
  onNavigate: (view: ViewType) => void;
  user: { username?: string; role?: string; [key: string]: any } | null;
  onLogout: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  view,
  onNavigate,
  user,
  onLogout,
}) => {
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Accessible focus trap and restoration
  useFocusTrap(isOpen, drawerRef, closeButtonRef);
  // Close on Escape key press
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scrolling while drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleItemClick = (id: ViewType) => {
    onNavigate(id);
    onClose();
  };

  const handleLogoutClick = () => {
    onLogout();
    onClose();
  };

  return (
    <div className="mobile-drawer-container">
      {/* Backdrop */}
      <div
        className="mobile-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className="mobile-drawer"
        tabIndex={-1}
      >
        <div className="mobile-drawer__head">
          <Brand collapsed={false} />
          <IconButton
            ref={closeButtonRef as any}
            label="Close navigation menu"
            icon={<X size={20} />}
            onClick={onClose}
            className="mobile-drawer-close"
          />
        </div>

        <nav aria-label="Mobile main navigation" className="mobile-drawer__nav">
          <div className="nav-label">WORKSPACE</div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isSelected = view === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item ${isSelected ? 'selected' : ''}`}
                onClick={() => handleItemClick(item.id)}
                aria-current={isSelected ? 'page' : undefined}
              >
                <span className="nav-item__icon" aria-hidden="true">
                  <Icon size={20} />
                </span>
                <span className="nav-item__label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mobile-drawer__footer">
          <div className="privacy-mini">
            <LockKeyhole size={18} aria-hidden="true" />
            <span>
              <b>Local-first learning</b>
              <small>Evidence, not transcripts</small>
            </span>
          </div>

          {user && (
            <button
              type="button"
              className="user-item"
              onClick={handleLogoutClick}
              aria-label={`Signed in as ${user.username || 'Learner'}. Sign out.`}
            >
              <span className="avatar" aria-hidden="true">
                {user.username?.[0]?.toUpperCase() || 'U'}
              </span>
              <span>
                <b>{user.username || 'Learner'}</b>
                <small>Sign out</small>
              </span>
              <LogOut size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
