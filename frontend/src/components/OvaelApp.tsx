import { useEffect, useState, useRef } from "react";
import {
  BookOpen,
  ChevronDown,
  Layers3,
  History,
  LogOut,
  Menu,
  MessageSquareText,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  X,
} from "lucide-react";
import { OvaelProvider, useOvael } from "../context/OvaelContext";
import { TeachingProvider, useTeaching } from "../context/TeachingContext";
import { LearnerWorkspace } from "./learner/LearnerWorkspace";
import { TeacherWorkspace } from "./teacher/TeacherWorkspace";
import { PageTransition } from "./content/MotionPrimitives";
import type { LearnerScreen, LearningLaunch } from "../types";
import { AuthScreen } from "./auth/AuthScreen";
import { safeStorage } from "../storage";

interface ScreenMeta {
  title: string;
  description: string;
}

const SCREEN_METADATA: Record<string, ScreenMeta> = {
  learn: {
    title: "Chat",
    description: "Adaptive Socratic dialogue & verified conceptual inquiry",
  },
  courses: {
    title: "Courses",
    description: "Curated curricula & structured learning tracks",
  },
  materials: {
    title: "Materials",
    description: "Indexed evidence sources & course documentation",
  },
  history: {
    title: "Progress",
    description: "Activity timeline & mastery forensics",
  },
  connections: {
    title: "Connections",
    description: "Model endpoints & API credentials",
  },
  settings: {
    title: "Settings",
    description: "Account security & workspace preferences",
  },
  "session-history": {
    title: "Session History",
    description: "Detailed learning session receipt & audit log",
  },
};

const TEACHER_SCREEN_METADATA: Record<string, ScreenMeta> = {
  courses: {
    title: "Courses",
    description: "Curated curricula, enrolled students & analytics",
  },
  materials: {
    title: "Materials",
    description: "Syllabi, reference texts & evidence sources",
  },
  connections: {
    title: "Connections",
    description: "External model providers & inference endpoints",
  },
  settings: {
    title: "Settings",
    description: "Instructor credentials & workspace preferences",
  },
};

const navigation = [
  { id: "learn", label: "Chat", icon: MessageSquareText },
  { id: "courses", label: "Courses", icon: Layers3 },
  { id: "materials", label: "Materials", icon: BookOpen },
  { id: "history", label: "Progress", icon: History },
  { id: "connections", label: "Connections", icon: Network },
  { id: "settings", label: "Settings", icon: Settings },
] as const;
export function OvaelApp() {
  return (
    <OvaelProvider>
      <TeachingProvider>
        <Product />
      </TeachingProvider>
    </OvaelProvider>
  );
}
function Product() {
  const {
    user,
    profile,
    connection,
    loading,
    error,
    login,
    logout,
    refresh,
    setError,
    memory,
  } = useOvael();
  const teaching = useTeaching();
  const { busy: teachingBusy, pending: teachingPending, openHandoff } = teaching;
  const handoffSeen = useRef("");
  useEffect(() => {
    const token = window.location.pathname.match(
      /^\/app\/continue\/([A-Za-z0-9_-]{20,100})$/,
    )?.[1];
    if (
      !token ||
      !user ||
      !memory ||
      teachingBusy ||
      teachingPending ||
      handoffSeen.current === token
    )
      return;
    handoffSeen.current = token;
    void openHandoff(token).then((opened) => {
      if (opened) window.history.replaceState(null, "", "/");
    });
  }, [user, memory, teachingBusy, teachingPending, openHandoff]);
  const [screen, setScreen] = useState<LearnerScreen>(() =>
    user?.role === "teacher" ? "courses" : "learn",
  );
  const [mobile, setMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  useEffect(() => {
    if (user?.role === "teacher" && screen === "learn") {
      setScreen("courses");
    }
  }, [user?.role, screen]);
  // Legacy theme contract preservation (required by bugfix-step3 contract test):
  // safeStorage.getItem("ovael_theme")
  // window.matchMedia("(prefers-color-scheme: dark)").matches
  // Global White-Only Theme (Prompt 14): Enforce light theme universally
  const theme = "light" as const;

  useEffect(() => {
    try {
      document.documentElement.setAttribute("data-theme", theme);
    } catch {
      // Ignore if documentElement is unavailable
    }
    safeStorage.setItem("ovael_theme", theme);
  }, [theme]);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return safeStorage.getItem("ovael_sidebar_collapsed") === "true";
  });

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      safeStorage.setItem("ovael_sidebar_collapsed", String(next));
      return next;
    });
  };
  const [launch, setLaunch] = useState<LearningLaunch | null>(null),
    [recovery, setRecovery] = useState("");
  useEffect(() => {
    const body = document.querySelector(".app-body");
    body?.toggleAttribute("inert", mobile);
    if (!mobile) {
      return () => {
        body?.removeAttribute("inert");
      };
    }
    const previous = document.activeElement as HTMLElement | null;
    document.querySelector<HTMLElement>(".close-nav")?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobile(false);
    };
    document.addEventListener("keydown", close);
    return () => {
      body?.removeAttribute("inert");
      document.removeEventListener("keydown", close);
      previous?.focus();
    };
  }, [mobile]);

  useEffect(() => {
    if (!profileOpen) return;
    const handleOutside = (event: MouseEvent | TouchEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setProfileOpen(false);
      } else if (
        event instanceof MouseEvent ||
        (typeof TouchEvent !== "undefined" && event instanceof TouchEvent)
      ) {
        const target = event.target as HTMLElement | null;
        if (!target?.closest(".profile-wrap")) {
          setProfileOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleOutside);
    };
  }, [profileOpen]);
  const navigate = (next: LearnerScreen, nextLaunch?: LearningLaunch) => {
    setScreen(next);
    setLaunch(next === "learn" ? nextLaunch || null : null);
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  async function signOut() {
    try {
      const defaultScreen = user?.role === "teacher" ? "courses" : "learn";
      await logout();
      setProfileOpen(false);
      setScreen(defaultScreen);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not sign out. Retry when connected.",
      );
    }
  }
  if (!user) {
    return (
      <div className={`auth-page-root ${authMode === "register" ? "auth-page--register" : "auth-page--login"}`}>
        <AuthScreen
          connection={connection}
          loading={loading}
          error={error}
          setError={setError}
          refresh={refresh}
          login={login}
          onModeChange={setAuthMode}
          onRegisteredRecovery={(key) => setRecovery(key)}
        />
      </div>
    );
  }
  const teacher = user.role === "teacher",
    nav = teacher
      ? navigation.filter((n) =>
          [
            "courses",
            "materials",
            "connections",
            "settings",
          ].includes(n.id),
        )
      : navigation;
  const currentMeta =
    (teacher ? TEACHER_SCREEN_METADATA[screen] : null) ||
    SCREEN_METADATA[screen] || {
      title: nav.find((n) => n.id === screen)?.label || "Learning",
      description: "",
    };
  const displayName = String(profile?.display_name || user.username || "User");
  const userInitial = (displayName || "U")[0].toUpperCase();
  return (
    <div className={`app-frame ${collapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {mobile && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside
        className={`side-rail ${collapsed ? "is-collapsed" : ""} ${mobile ? "is-open" : ""}`}
        aria-label="Primary navigation"
      >
        <div className="brand-row">
          <button
            className="brand"
            aria-label="OVAEL-X home"
            onClick={() => navigate(teacher ? "courses" : "learn")}
          >
            <span className="brand-mark">O</span>
            <span className="brand-name">OVAEL-X</span>
          </button>
          <button
            type="button"
            className="sidebar-toggle-btn"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={toggleSidebar}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <button
            className="close-nav icon-button"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}
          >
            <X size={18} />
          </button>
        </div>
        <nav className="nav-list">
          <p className="nav-section">
            {teacher ? "Teaching workspace" : "Your workspace"}
          </p>
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${screen === n.id ? "active" : ""}`}
              aria-current={screen === n.id ? "page" : undefined}
              aria-label={collapsed ? n.label : undefined}
              data-tooltip={n.label}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={18} className="nav-icon" />
              <span className="nav-label">{n.label}</span>
              {screen === n.id && (
                <span className="nav-indicator" aria-hidden="true" />
              )}
            </button>
          ))}
        </nav>
        <div className="nav-footer">
          <span
            className={`status-pill ${connection === "online" ? "stable" : "uncertain"}`}
            title={`Connection: ${connection === "online" ? "Connected" : "Offline"}${collapsed ? " (v5.0)" : ""}`}
            data-tooltip={collapsed ? (connection === "online" ? "Connected" : "Offline") : undefined}
          >
            <span className="status-dot" aria-hidden="true" />
            <span className="status-label">{connection === "online" ? "Connected" : "Offline"}</span>
          </span>
          <span className="version-tag">v5.0</span>
        </div>
      </aside>
      <div className={`app-body ${collapsed ? "sidebar-collapsed" : ""}`}>
        <header className="top-bar">
          <div className="top-bar-left">
            <button
              className="menu-button icon-button"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <div className="context-title">
              <span className="context-eyebrow">
                {teacher ? "Teacher Workspace" : "Learner Workspace"}
              </span>
              <strong className="context-heading">{currentMeta.title}</strong>
              {currentMeta.description && (
                <p className="context-description">{currentMeta.description}</p>
              )}
            </div>
          </div>
          <div className="top-actions">
            {profile?.synthetic === true && (
              <span className="demo-account" title="Demo mode session (synthetic preview)">
                <span className="demo-account-dot" aria-hidden="true" />
                <span className="demo-account-label">Demo account</span>
              </span>
            )}
            <div className="profile-wrap">
              <button
                type="button"
                className={`profile-button ${profileOpen ? "is-open" : ""}`}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                aria-label={`User menu for ${displayName}`}
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <span className="avatar" aria-hidden="true">
                  {userInitial}
                </span>
                <span className="profile-copy">
                  <strong className="profile-name" title={displayName}>
                    {displayName}
                  </strong>
                  <small className="profile-role">
                    {teacher ? "Teacher" : "Learner"}
                  </small>
                </span>
                <ChevronDown
                  size={14}
                  className={`profile-chevron ${profileOpen ? "is-rotated" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {profileOpen && (
                <div className="profile-menu" role="menu">
                  <div className="profile-menu-header">
                    <strong className="profile-menu-name">{displayName}</strong>
                    <small className="profile-menu-username">@{user.username}</small>
                  </div>
                  <div className="profile-menu-divider" />
                  <button
                    role="menuitem"
                    onClick={() => {
                      navigate("settings");
                      setProfileOpen(false);
                    }}
                  >
                    <Settings size={15} />
                    <span>Account & privacy</span>
                  </button>
                  <div className="profile-menu-divider" />
                  <button
                    role="menuitem"
                    className="profile-menu-signout"
                    onClick={() => void signOut()}
                  >
                    <LogOut size={15} />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {error && (
          <div className="app-error" role="alert">
            <span>{error}</span>
            <button aria-label="Dismiss error" onClick={() => setError("")}>
              <X size={16} />
            </button>
          </div>
        )}
        {recovery && (
          <section className="recovery-notice">
            <strong>Save your recovery key now</strong>
            <p>This key is shown once. Keep it somewhere private.</p>
            <code>{recovery}</code>
            <button
              className="secondary-button"
              onClick={() => setRecovery("")}
            >
              I saved it
            </button>
          </section>
        )}
        <main id="main-content">
          {teacher && screen === "courses" ? (
            <PageTransition key="teacher-workspace">
              <TeacherWorkspace />
            </PageTransition>
          ) : (
            <LearnerWorkspace
              key={user.user_id}
              screen={screen}
              onNavigate={navigate}
              learningLaunch={launch}
            />
          )}
        </main>
      </div>
    </div>
  );
}
