import { useEffect, useState, useRef } from "react";
import {
  BookOpen,
  Layers3,
  History,
  Menu,
  MessageSquareText,
  Moon,
  Network,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { OvaelProvider, useOvael } from "../context/OvaelContext";
import { TeachingProvider, useTeaching } from "../context/TeachingContext";
import { LearnerWorkspace } from "./learner/LearnerWorkspace";
import { TeacherWorkspace } from "./teacher/TeacherWorkspace";
import { PageTransition } from "./content/MotionPrimitives";
import type { LearnerScreen, LearningLaunch } from "../types";
import { AuthScreen } from "./auth/AuthScreen";
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
  const handoffSeen = useRef("");
  useEffect(() => {
    const token = window.location.pathname.match(
      /^\/app\/continue\/([A-Za-z0-9_-]{20,100})$/,
    )?.[1];
    if (
      !token ||
      !user ||
      !memory ||
      teaching.busy ||
      teaching.pending ||
      handoffSeen.current === token
    )
      return;
    handoffSeen.current = token;
    void teaching.openHandoff(token).then((opened) => {
      if (opened) window.history.replaceState(null, "", "/");
    });
  }, [user?.user_id, memory, teaching.busy, teaching.pending]);
  const [screen, setScreen] = useState<LearnerScreen>(() =>
    user?.role === "teacher" ? "courses" : "learn",
  );
  const [mobile, setMobile] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (user?.role === "teacher" && screen === "learn") {
      setScreen("courses");
    }
  }, [user?.role, screen]);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    const stored = localStorage.getItem("ovael_theme");
    if (stored === "dark" || stored === "light") return stored;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ovael_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };
  const [launch, setLaunch] = useState<LearningLaunch | null>(null),
    [recovery, setRecovery] = useState("");
  useEffect(() => {
    const body = document.querySelector(".app-body");
    body?.toggleAttribute("inert", mobile);
    if (!mobile) return;
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
    const handleOutside = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        setProfileOpen(false);
      } else if (event instanceof MouseEvent) {
        const target = event.target as HTMLElement | null;
        if (!target?.closest(".profile-wrap")) {
          setProfileOpen(false);
        }
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
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
      await logout();
      setProfileOpen(false);
      setScreen("learn");
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
      <AuthScreen
        connection={connection}
        loading={loading}
        error={error}
        setError={setError}
        refresh={refresh}
        login={login}
        theme={theme}
        toggleTheme={toggleTheme}
        onRegisteredRecovery={(key) => setRecovery(key)}
      />
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
  return (
    <div className="app-frame">
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
        className={`side-rail ${mobile ? "is-open" : ""}`}
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
          <span className={`status-pill ${connection === "online" ? "stable" : "uncertain"}`}>
            <span>{connection === "online" ? "Connected" : "Offline"}</span>
          </span>
          <span className="version-tag">v5.0</span>
        </div>
      </aside>
      <div className="app-body">
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
              <strong className="context-heading">
                {nav.find((n) => n.id === screen)?.label || "Learning"}
              </strong>
            </div>
          </div>
          <div className="top-actions">
            <button
              type="button"
              className="icon-button theme-toggle-btn"
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            {profile?.synthetic === true && (
              <span className="demo-account">Demo account</span>
            )}
            <div className="profile-wrap">
              <button
                className="profile-button"
                aria-expanded={profileOpen}
                onClick={() => setProfileOpen(!profileOpen)}
              >
                <span className="avatar">{user.username[0].toUpperCase()}</span>
                <span className="profile-copy">
                  <strong>
                    {String(profile?.display_name || user.username)}
                  </strong>
                  <small>{teacher ? "Teacher" : "Learner"}</small>
                </span>
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <button
                    onClick={() => {
                      navigate("settings");
                      setProfileOpen(false);
                    }}
                  >
                    Account & privacy
                  </button>
                  <button
                    onClick={() => {
                      toggleTheme();
                    }}
                  >
                    {theme === "dark" ? "Light theme" : "Dark theme"}
                  </button>
                  <button onClick={() => void signOut()}>Sign out</button>
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
