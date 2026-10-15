import React, { useState } from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Lock,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
} from "lucide-react";
import { MIN_PASSWORD_LENGTH, passwordMinLength } from "../../auth";
import { ovaelApi } from "../../api/client";
import { AuthVisualAccent } from "../content/AuthVisualAccent";

interface AuthScreenProps {
  connection: "online" | "checking" | "offline";
  loading: boolean;
  error: string;
  setError: (err: string) => void;
  refresh: () => Promise<void>;
  login: (name: string, pass: string) => Promise<void>;
  theme: "light" | "dark";
  toggleTheme: () => void;
  onRegisteredRecovery?: (key: string) => void;
  onModeChange?: (mode: "login" | "register") => void;
}

export function AuthScreen({
  connection,
  loading,
  error,
  setError,
  refresh,
  login,
  theme,
  toggleTheme,
  onRegisteredRecovery,
  onModeChange,
}: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  const isRegister = mode === "register";
  const passwordLengthValid = password.length >= MIN_PASSWORD_LENGTH;

  const handleModeSwitch = (nextMode: "login" | "register") => {
    setMode(nextMode);
    onModeChange?.(nextMode);
    setError("");
  };

  const handleCopyRecovery = async () => {
    if (!recoveryKey) return;
    try {
      await navigator.clipboard.writeText(recoveryKey);
      setCopiedRecovery(true);
      setTimeout(() => setCopiedRecovery(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleRetryConnection = async () => {
    setReconnecting(true);
    try {
      await refresh();
    } finally {
      setReconnecting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (authBusy || loading || connection !== "online") return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a username or learner ID.");
      return;
    }

    if (isRegister && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must contain at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }

    setAuthBusy(true);
    setError("");

    try {
      if (isRegister) {
        const result = await ovaelApi.register(trimmedName, password, "learner");
        if (result.recovery_key) {
          setRecoveryKey(result.recovery_key);
          if (onRegisteredRecovery) {
            onRegisteredRecovery(result.recovery_key);
          }
        }
        await refresh();
      } else {
        await login(trimmedName, password);
      }
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Authentication failed.");
    } finally {
      setAuthBusy(false);
    }
  };

  const handleFillDemo = () => {
    setMode("login");
    onModeChange?.("login");
    setName("Bharat");
    setPassword("OVAEL-demo-2026!");
    setError("");
  };

  return (
    <main
      className={`auth-page-shell auth-page ${isRegister ? "auth-page--register" : "auth-page--login"}`}
      id="main-content"
    >
      <div className="auth-card-container">
        {/* Interactive Form Column */}
        <section className="auth-form-column" aria-labelledby="auth-heading">
          {/* Top Utilities Header */}
          <header className="auth-top-row">
            <div className="brand auth-brand-mini">
              <span className="brand-mark">O</span>
              <span className="brand-name">OVAEL-X</span>
            </div>

            <div className="auth-top-actions">
              <div
                className={`backend-state-badge ${connection}`}
                title={`Backend: ${connection}`}
                role="status"
                aria-live="polite"
              >
                <span className="state-dot" aria-hidden="true" />
                <span className="state-label">
                  {connection === "online"
                    ? "Online"
                    : connection === "checking"
                      ? "Connecting…"
                      : "Offline"}
                </span>
              </div>

              <button
                type="button"
                className="icon-button auth-theme-toggle"
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
                onClick={toggleTheme}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </header>

          {/* Mode Tabs (Sign In / Register) */}
          <div className="auth-mode-selector" role="tablist" aria-label="Authentication type">
            <button
              type="button"
              role="tab"
              aria-selected={!isRegister}
              className={`auth-mode-tab ${!isRegister ? "active" : ""}`}
              onClick={() => handleModeSwitch("login")}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              className={`auth-mode-tab ${isRegister ? "active" : ""}`}
              onClick={() => handleModeSwitch("register")}
            >
              Create Account
            </button>
          </div>

          {/* Heading Block */}
          <div className="auth-heading-group">
            <span className="auth-eyebrow">
              {isRegister ? "New Learner Setup" : "Adaptive Learning Workspace"}
            </span>
            <h1 id="auth-heading" className="auth-title">
              {isRegister ? "Create your account" : "Welcome back"}
            </h1>
            <p className="auth-subtitle">
              {isRegister
                ? "Start understanding your knowledge boundaries with causal graph forensics and evidence-backed learning."
                : "Enter your credentials to continue your personalized learning journey."}
            </p>
          </div>

          {/* Recovery Key Display (if just registered) */}
          {recoveryKey && (
            <div className="auth-recovery-card" role="region" aria-label="Account Recovery Key">
              <div className="recovery-header">
                <Key size={18} className="recovery-icon" />
                <strong>Save Your Recovery Key</strong>
              </div>
              <p className="recovery-text">
                This secret key is shown only once. Store it in a secure place in case you need
                to restore access.
              </p>
              <div className="recovery-key-row">
                <code className="recovery-code">{recoveryKey}</code>
                <button
                  type="button"
                  className="secondary-button compact copy-btn"
                  onClick={() => void handleCopyRecovery()}
                  aria-label="Copy recovery key"
                >
                  {copiedRecovery ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedRecovery ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Form Error Banner */}
          {error && (
            <div className="auth-error-card" role="alert">
              <AlertCircle size={18} className="error-icon" aria-hidden="true" />
              <div className="error-text">
                <span>{error}</span>
              </div>
              <button
                type="button"
                className="error-dismiss"
                aria-label="Dismiss error message"
                onClick={() => setError("")}
              >
                &times;
              </button>
            </div>
          )}

          {/* Main Auth Form */}
          <form className="auth-form" onSubmit={(e) => void handleSubmit(e)} noValidate={false}>
            {/* Username / Learner ID Field */}
            <div className="form-field-group">
              <label htmlFor="auth-username" className="field-label">
                <span>Learner ID or Username</span>
                {isRegister && <small className="field-hint">3–64 chars</small>}
              </label>
              <div className="input-wrap">
                <User size={17} className="input-icon-leading" aria-hidden="true" />
                <input
                  id="auth-username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  autoFocus
                  placeholder="e.g. learner_42"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="auth-input with-leading-icon"
                  aria-invalid={!!error && !name.trim()}
                  disabled={authBusy}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-field-group">
              <div className="field-label-row">
                <label htmlFor="auth-password" className="field-label">
                  <span>Password</span>
                </label>
                {isRegister && (
                  <span
                    className={`password-requirement ${
                      password.length === 0
                        ? "neutral"
                        : passwordLengthValid
                          ? "valid"
                          : "invalid"
                    }`}
                  >
                    {passwordLengthValid ? "✓ 10+ characters" : "Min 10 characters"}
                  </span>
                )}
              </div>

              <div className="input-wrap">
                <Lock size={17} className="input-icon-leading" aria-hidden="true" />
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  minLength={passwordMinLength(mode)}
                  placeholder={
                    isRegister
                      ? `Create password (min ${MIN_PASSWORD_LENGTH} chars)`
                      : "Enter your password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input with-leading-icon with-trailing-action"
                  aria-invalid={!!error && !password}
                  disabled={authBusy}
                />
                <button
                  type="button"
                  className="password-toggle-btn icon-button"
                  aria-label={showPassword ? "Hide password text" : "Show password text"}
                  title={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              className="primary-button full auth-submit-btn"
              disabled={authBusy || loading || connection !== "online"}
            >
              {authBusy ? (
                <span className="btn-loading-content">
                  <RefreshCw size={16} className="spin-icon" />
                  <span>{isRegister ? "Creating account…" : "Signing in…"}</span>
                </span>
              ) : (
                <span>{isRegister ? "Create learner account" : "Sign in to workspace"}</span>
              )}
            </button>
          </form>

          {/* Dev Demo Account Utility */}
          {import.meta.env.DEV && (
            <div className="auth-dev-tools">
              <button
                type="button"
                className="demo-account-pill-btn"
                onClick={handleFillDemo}
                title="Populate test credentials (Bharat / OVAEL-demo-2026!)"
              >
                <Sparkles size={14} className="sparkle-icon" />
                <span>Fill synthetic demo credentials</span>
              </button>
            </div>
          )}

          {/* Offline Recovery Action */}
          {connection === "offline" && (
            <div className="auth-offline-notice">
              <p>Backend service is currently unreachable.</p>
              <button
                type="button"
                className="secondary-button compact retry-conn-btn"
                onClick={() => void handleRetryConnection()}
                disabled={reconnecting}
              >
                <RefreshCw size={14} className={reconnecting ? "spin-icon" : ""} />
                <span>{reconnecting ? "Reconnecting…" : "Retry connection"}</span>
              </button>
            </div>
          )}

          {/* Footer Security / Privacy Guarantee */}
          <footer className="auth-footer-note">
            <ShieldCheck size={16} className="shield-icon" aria-hidden="true" />
            <span>
              Your learning data is privacy-first and backed by Argon2id credentials and local memory.
            </span>
          </footer>
        </section>

        {/* Visual Accent Column */}
        <section className="auth-accent-column" aria-label="OVAEL-X Features and Knowledge Visual">
          <div className="auth-accent-content">
            <div className="auth-accent-badge">Evidence-Grounded Learning</div>
            <h2 className="auth-accent-headline">
              Understand what is holding you back.
            </h2>
            <p className="auth-accent-description">
              Learn from your own materials, practice autonomously, and pinpoint the causal
              misconceptions requiring a fresh approach.
            </p>

            <div className="auth-feature-pills">
              <span className="feature-pill">
                <span className="pill-dot" /> Source-grounded lessons
              </span>
              <span className="feature-pill">
                <span className="pill-dot" /> Gap forensics
              </span>
              <span className="feature-pill">
                <span className="pill-dot" /> Memory under your control
              </span>
            </div>

            <div className="auth-visual-wrapper">
              <AuthVisualAccent />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
