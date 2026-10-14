import { useEffect, useState, useRef } from "react";
import {
  BookOpen,
  Layers3,
  History,
  Menu,
  MessageSquareText,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { OvaelProvider, useOvael } from "../context/OvaelContext";
import { TeachingProvider, useTeaching } from "../context/TeachingContext";
import { LearnerWorkspace } from "./learner/LearnerWorkspace";
import { TeacherWorkspace } from "./teacher/TeacherWorkspace";
import type { LearnerScreen, LearningLaunch } from "../types";
import { MIN_PASSWORD_LENGTH } from "../auth";
import { ovaelApi } from "../api/client";
const navigation = [
  { id: "learn", label: "Chat", icon: MessageSquareText },
  { id: "courses", label: "Courses", icon: Layers3 },
  { id: "materials", label: "Materials", icon: BookOpen },
  { id: "history", label: "Progress", icon: History },
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
  const [screen, setScreen] = useState<LearnerScreen>("learn"),
    [mobile, setMobile] = useState(false),
    [profileOpen, setProfileOpen] = useState(false);
  const [launch, setLaunch] = useState<LearningLaunch | null>(null),
    [name, setName] = useState(""),
    [password, setPassword] = useState(""),
    [register, setRegister] = useState(false),
    [recovery, setRecovery] = useState(""),
    [authBusy, setAuthBusy] = useState(false);
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
  const navigate = (next: LearnerScreen, nextLaunch?: LearningLaunch) => {
    setScreen(next);
    setLaunch(next === "learn" ? nextLaunch || null : null);
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setError("");
    try {
      if (register) {
        const result = await ovaelApi.register(name, password, "learner");
        setRecovery(result.recovery_key || "");
        await refresh();
      } else await login(name, password);
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed.");
    } finally {
      setAuthBusy(false);
    }
  }
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
  if (!user)
    return (
      <main className="auth-page" id="main-content">
        <section className="auth-intro">
          <div className="brand auth-brand">
            <span className="brand-mark">O</span>
            <span>OVAEL-X</span>
          </div>
          <p className="eyebrow blue">Your learning, backed by evidence</p>
          <h1>Understand what is holding you back.</h1>
          <p>
            Learn from your own material, practice independently, and see which
            ideas need a different approach.
          </p>
          <div className="auth-points">
            <span>Source-grounded lessons</span>
            <span>Gap forensics</span>
            <span>Memory under your control</span>
          </div>
        </section>
        <section className="auth-panel">
          <div className={`backend-state ${connection}`}>
            <i />
            {connection === "online"
              ? "Backend connected"
              : connection === "checking"
                ? "Checking connection…"
                : "Connection unavailable"}
          </div>
          <p className="eyebrow">Your workspace</p>
          <h2>{register ? "Create your account" : "Welcome back"}</h2>
          <form onSubmit={signIn}>
            <label>
              Username
              <input
                autoComplete="username"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                required
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? MIN_PASSWORD_LENGTH : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="form-error">
                {error}
              </p>
            )}
            <button
              className="primary-button full"
              disabled={authBusy || loading || connection !== "online"}
            >
              {authBusy
                ? "Connecting…"
                : register
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>
          <button
            className="demo-login"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register
              ? "Already registered? Sign in"
              : "Create a learner account"}
          </button>
          {import.meta.env.DEV && (
            <button
              className="demo-login"
              onClick={() => {
                setRegister(false);
                setName("Bharat");
                setPassword("OVAEL-demo-2026!");
              }}
            >
              <Sparkles size={16} /> Fill synthetic demo account
            </button>
          )}
          <p className="auth-privacy">
            <ShieldCheck size={15} /> Sign in to save your courses and
            conversations.
          </p>
          {connection === "offline" && (
            <button className="secondary-button" onClick={() => void refresh()}>
              Retry connection
            </button>
          )}
        </section>
      </main>
    );
  const teacher = user.role === "teacher",
    nav = teacher
      ? navigation.filter((n) =>
          [
            "courses",
            "materials",
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
            <span className="brand-mark">O</span>OVAEL-X
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
              <n.icon size={18} />
              {n.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="app-body">
        <header className="top-bar">
          <button
            className="menu-button icon-button"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={20} />
          </button>
          <div className="context-title">
            <span>{nav.find((n) => n.id === screen)?.label || "Learning"}</span>
          </div>
          <div className="top-actions">
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
            <TeacherWorkspace />
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
