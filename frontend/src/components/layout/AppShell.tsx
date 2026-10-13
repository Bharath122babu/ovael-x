import React, { useState, useEffect } from 'react';
import { Sidebar, ViewType } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileDrawer } from './MobileDrawer';

export interface AppShellProps {
  view: ViewType;
  user: { username?: string; role?: string; [key: string]: any } | null;
  activeCourseName?: string;
  activeConceptName?: string;
  isSessionActive?: boolean;
  onNavigate: (view: ViewType) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  view,
  user,
  activeCourseName,
  activeConceptName,
  isSessionActive = false,
  onNavigate,
  onLogout,
  children,
}) => {
  // Safe localStorage persistence for sidebar collapsed preference
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ovael_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ovael_sidebar_collapsed', String(next));
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  return (
    <div className="shell">
      {/* Accessible skip link */}
      <a href="#main-content" className="skip-link sr-only">
        Skip to main content
      </a>

      {/* Persistent Desktop Sidebar */}
      <Sidebar
        view={view}
        collapsed={sidebarCollapsed}
        user={user}
        onToggleCollapse={toggleSidebar}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      {/* Responsive Mobile Drawer */}
      <MobileDrawer
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        view={view}
        onNavigate={onNavigate}
        user={user}
        onLogout={onLogout}
      />

      {/* Main Content Area */}
      <div className="main">
        <TopBar
          view={view}
          user={user}
          activeCourseName={activeCourseName}
          activeConceptName={activeConceptName}
          isSessionActive={isSessionActive}
          onOpenMobile={() => setMobileOpen(true)}
          onOpenSettings={() => onNavigate('settings')}
        />

        <main id="main-content" className="page-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
};
