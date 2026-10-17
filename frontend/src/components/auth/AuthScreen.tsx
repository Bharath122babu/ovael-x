import React, { useState, useEffect, useRef } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  EyeOff,
  Info,
  Key,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { MIN_PASSWORD_LENGTH, passwordMinLength } from "../../auth";
import {
  PASSWORD_MAX,
  USERNAME_MIN,
  USERNAME_MAX,
  validateUsername,
  validatePassword,
  validateRecoveryKey,
  generateRecoveryFileContent,
} from "../../authValidation";
import { ovaelApi } from "../../api/client";
import { safeStorage } from "../../storage";
import { AuthVisualAccent, type AuthFeatureKey } from "../content/AuthVisualAccent";
import { usePrefersReducedMotion } from "../content/MotionPrimitives";

interface AuthScreenProps {
  connection: "online" | "checking" | "offline";
  loading: boolean;
  error: string;
  setError: (err: string) => void;
  refresh: () => Promise<void>;
  login: (name: string, pass: string) => Promise<void>;
  theme?: "light" | "dark";
  toggleTheme?: () => void;
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
  theme: _theme,
  toggleTheme: _toggleTheme,
  onRegisteredRecovery,
  onModeChange,
}: AuthScreenProps) {
  const prefersReduced = usePrefersReducedMotion();
  const [mode, setMode] = useState<"login" | "register" | "recover">("login");
  const [isEnteringLogin, setIsEnteringLogin] = useState(!prefersReduced);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryKeyInput, setRecoveryKeyInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [recoveryOrigin, setRecoveryOrigin] = useState<"register" | "recover" | null>(null);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [copiedRecovery, setCopiedRecovery] = useState(false);
  const [downloadedRecovery, setDownloadedRecovery] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const [reconnecting, setReconnecting] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [rememberId, setRememberId] = useState(false);
  const [successNotice, setSuccessNotice] = useState("");
  const [duplicateIdSuggested, setDuplicateIdSuggested] = useState(false);
  const [formError, setFormError] = useState("");
  const activeError = formError || error;

  const clearActiveError = () => {
    setFormError("");
    setError("");
  };

  const [touchedFields, setTouchedFields] = useState<{
    username?: boolean;
    password?: boolean;
    recoveryKey?: boolean;
  }>({});
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
    recoveryKey?: string;
  }>({});

  const [activeFeature, setActiveFeature] = useState<AuthFeatureKey | null>(null);
  const featurePointerInsideRef = useRef(false);
  const featurePointerTargetRef = useRef<AuthFeatureKey | null>(null);
  const focusedFeatureRef = useRef<AuthFeatureKey | null>(null);
  const entranceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accentColumnRef = useRef<HTMLElement>(null);
  const rAFRef = useRef<number | null>(null);

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const recoveryKeyInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (prefersReduced) {
      video.pause();
    } else {
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Autoplay handled gracefully by poster/background fallback
        });
      }
    }
  }, [prefersReduced]);

  useEffect(() => {
    const remembered = safeStorage.getItem("ovael_remembered_username");
    if (remembered) {
      setName(remembered);
      setRememberId(true);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (entranceTimerRef.current) clearTimeout(entranceTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
      setRecoveryKey("");
    };
  }, []);

  const isRegister = mode === "register";
  const isRecover = mode === "recover";

  const handleFeaturePointerEnter = (
    feature: AuthFeatureKey,
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (event.pointerType === "touch") return;
    featurePointerInsideRef.current = true;
    featurePointerTargetRef.current = feature;
    setActiveFeature(feature);
  };

  const handleFeaturePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    featurePointerInsideRef.current = false;
    featurePointerTargetRef.current = null;
    setActiveFeature(focusedFeatureRef.current);
  };

  const handleFeatureFocus = (feature: AuthFeatureKey) => {
    focusedFeatureRef.current = feature;
    setActiveFeature(feature);
  };

  const handleFeatureBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;

    focusedFeatureRef.current = null;
    setActiveFeature(
      featurePointerInsideRef.current ? featurePointerTargetRef.current : null,
    );
  };

  const handleAccentPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (prefersReduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    rAFRef.current = requestAnimationFrame(() => {
      const el = accentColumnRef.current;
      if (el) {
        el.style.setProperty("--pointer-x", `${x.toFixed(1)}%`);
        el.style.setProperty("--pointer-y", `${y.toFixed(1)}%`);
      }
    });
  };

  const handleAccentPointerLeave = () => {
    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    const el = accentColumnRef.current;
    if (el) {
      el.style.setProperty("--pointer-x", "50%");
      el.style.setProperty("--pointer-y", "45%");
    }
  };

  const handleFeatureClick = (feature: AuthFeatureKey) => {
    setActiveFeature((prev) => (prev === feature ? null : feature));
  };

  useEffect(() => {
    if (!isEnteringLogin) return;
    entranceTimerRef.current = setTimeout(() => {
      setIsEnteringLogin(false);
    }, 850);
    return () => {
      if (entranceTimerRef.current) {
        clearTimeout(entranceTimerRef.current);
        entranceTimerRef.current = null;
      }
    };
  }, [isEnteringLogin]);

  const handleModeSwitch = (nextMode: "login" | "register" | "recover") => {
    setMode(nextMode);
    if (nextMode === "login" || nextMode === "register") {
      onModeChange?.(nextMode);
    } else {
      onModeChange?.("login");
    }
    clearActiveError();
    setSuccessNotice("");
    setFieldErrors({});
    setTouchedFields({});
    setDuplicateIdSuggested(false);
    setRecoveryKey("");
    setRecoveryConfirmed(false);
    setCopyFeedback("");
    setDownloadedRecovery(false);

    // The branded entrance plays once on initial login-page entry. Switching
    // between Sign In and Create Account must not replay the full choreography.
    if (nextMode !== "login" || prefersReduced) {
      setIsEnteringLogin(false);
    }

    requestAnimationFrame(() => {
      if (usernameInputRef.current) {
        usernameInputRef.current.focus({ preventScroll: true });
      }
    });
  };

  const handleUsernameChange = (val: string) => {
    setName(val);
    if (fieldErrors.username || touchedFields.username) {
      const err = validateUsername(val, mode);
      if (!err) {
        setFieldErrors((prev) => ({ ...prev, username: undefined }));
        setDuplicateIdSuggested(false);
      }
    }
  };

  const handleUsernameBlur = () => {
    setTouchedFields((prev) => ({ ...prev, username: true }));
    const err = validateUsername(name, mode);
    if (err) {
      setFieldErrors((prev) => ({ ...prev, username: err }));
    } else {
      setFieldErrors((prev) => ({ ...prev, username: undefined }));
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (fieldErrors.password || touchedFields.password) {
      const err = validatePassword(val, mode);
      if (!err) {
        setFieldErrors((prev) => ({ ...prev, password: undefined }));
      }
    }
  };

  const handlePasswordBlur = () => {
    setTouchedFields((prev) => ({ ...prev, password: true }));
    setCapsLockActive(false);
    const err = validatePassword(password, mode);
    if (err) {
      setFieldErrors((prev) => ({ ...prev, password: err }));
    } else {
      setFieldErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handlePasswordKeyEvent = (event: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLockActive(event.getModifierState("CapsLock"));
  };

  const handleRecoveryKeyInputChange = (val: string) => {
    setRecoveryKeyInput(val);
    if (fieldErrors.recoveryKey || touchedFields.recoveryKey) {
      const err = validateRecoveryKey(val);
      if (!err) {
        setFieldErrors((prev) => ({ ...prev, recoveryKey: undefined }));
      }
    }
  };

  const handleRecoveryKeyInputBlur = () => {
    setTouchedFields((prev) => ({ ...prev, recoveryKey: true }));
    const err = validateRecoveryKey(recoveryKeyInput);
    if (err) {
      setFieldErrors((prev) => ({ ...prev, recoveryKey: err }));
    } else {
      setFieldErrors((prev) => ({ ...prev, recoveryKey: undefined }));
    }
  };

  const handleTogglePassword = (e: React.MouseEvent) => {
    e.preventDefault();
    const input = passwordInputRef.current;
    const start = input?.selectionStart;
    const end = input?.selectionEnd;
    setShowPassword((prev) => !prev);
    requestAnimationFrame(() => {
      if (input) {
        input.focus({ preventScroll: true });
        if (start !== null && end !== null && start !== undefined && end !== undefined) {
          input.setSelectionRange(start, end);
        }
      }
    });
  };

  const handleSelectRecoveryKey = () => {
    try {
      const codeElem = document.querySelector(".recovery-code");
      if (codeElem && window.getSelection) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(codeElem);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    } catch {
      // Selection fallback
    }
  };

  const handleCopyRecovery = async () => {
    if (!recoveryKey) return;
    if (copyTimerRef.current) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
    let copied = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(recoveryKey);
        copied = true;
      }
    } catch {
      copied = false;
    }

    if (!copied) {
      try {
        if (typeof document !== "undefined") {
          const textarea = document.createElement("textarea");
          textarea.value = recoveryKey;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "absolute";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          copied = document.execCommand("copy");
          document.body.removeChild(textarea);
        }
      } catch {
        copied = false;
      }
    }

    if (copied) {
      setCopiedRecovery(true);
      setCopyFeedback("");
      copyTimerRef.current = setTimeout(() => {
        setCopiedRecovery(false);
      }, 2500);
    } else {
      setCopiedRecovery(false);
      setCopyFeedback("Please press Ctrl+C / Cmd+C to copy your key");
      handleSelectRecoveryKey();
    }
  };

  const handleDownloadRecovery = () => {
    if (!recoveryKey) return;
    try {
      const content = generateRecoveryFileContent(name.trim(), recoveryKey);
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "ovael-recovery-key.txt";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setDownloadedRecovery(true);
    } catch {
      // If blob download fails, fallback to copy/selection
      void handleCopyRecovery();
    }
  };

  const handleContinueAfterRecovery = async () => {
    if (!recoveryConfirmed || authBusy) return;

    if (recoveryOrigin === "recover") {
      setRecoveryKey("");
      setRecoveryConfirmed(false);
      setCopyFeedback("");
      setDownloadedRecovery(false);
      handleModeSwitch("login");
      setPassword("");
      setRecoveryKeyInput("");
      setSuccessNotice("Password updated. Sign in with your new password.");
      return;
    }

    setAuthBusy(true);
    try {
      setRecoveryKey("");
      setRecoveryConfirmed(false);
      setCopyFeedback("");
      setDownloadedRecovery(false);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load session. Please sign in.");
    } finally {
      setAuthBusy(false);
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
    if (authBusy) return;

    setTouchedFields({ username: true, password: true, recoveryKey: true });
    setDuplicateIdSuggested(false);
    setSuccessNotice("");

    const usernameErr = validateUsername(name, mode);
    const passwordErr = validatePassword(password, mode);
    const recoveryErr = isRecover ? validateRecoveryKey(recoveryKeyInput) : null;

    const errors: { username?: string; password?: string; recoveryKey?: string } = {};
    if (usernameErr) errors.username = usernameErr;
    if (passwordErr) errors.password = passwordErr;
    if (recoveryErr) errors.recoveryKey = recoveryErr;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Please fix the highlighted errors before continuing.");
      setError("Please fix the highlighted errors before continuing.");
      if (usernameErr) {
        usernameInputRef.current?.focus({ preventScroll: true });
      } else if (recoveryErr) {
        recoveryKeyInputRef.current?.focus({ preventScroll: true });
      } else if (passwordErr) {
        passwordInputRef.current?.focus({ preventScroll: true });
      }
      return;
    }

    if (loading || connection !== "online") return;

    setFieldErrors({});
    clearActiveError();
    setAuthBusy(true);

    const trimmedName = name.trim();

    try {
      if (isRegister) {
        const result = await ovaelApi.register(trimmedName, password, "learner");
        if (result.recovery_key) {
          setRecoveryOrigin("register");
          setRecoveryKey(result.recovery_key);
          setRecoveryConfirmed(false);
          if (onRegisteredRecovery) {
            onRegisteredRecovery(result.recovery_key);
          }
        } else {
          await refresh();
        }
      } else if (isRecover) {
        const result = await ovaelApi.recover(trimmedName, recoveryKeyInput.trim(), password);
        if (result.recovery_key) {
          setRecoveryOrigin("recover");
          setRecoveryKey(result.recovery_key);
          setRecoveryConfirmed(false);
        } else {
          handleModeSwitch("login");
          setPassword("");
          setRecoveryKeyInput("");
          setSuccessNotice("Password updated. Sign in with your new password.");
        }
      } else {
        await login(trimmedName, password);
        if (rememberId) {
          safeStorage.setItem("ovael_remembered_username", trimmedName);
        } else {
          safeStorage.removeItem("ovael_remembered_username");
        }
      }
    } catch (e) {
      const rawMessage = e instanceof Error ? e.message : "Authentication failed.";
      if (rawMessage.includes("Learner ID is already registered")) {
        setFieldErrors((prev) => ({
          ...prev,
          username: "Learner ID is already registered.",
        }));
        setDuplicateIdSuggested(true);
        setFormError("Learner ID is already registered.");
        setError("Learner ID is already registered.");
        usernameInputRef.current?.focus({ preventScroll: true });
      } else if (rawMessage.includes("Too many attempts")) {
        setFormError("Too many attempts. Try again in a few minutes.");
        setError("Too many attempts. Try again in a few minutes.");
      } else if (
        rawMessage.includes("Connection interrupted") ||
        rawMessage.includes("Failed to fetch") ||
        rawMessage.includes("NetworkError")
      ) {
        setFormError("We couldn't reach the server. Check your connection and try again.");
        setError("We couldn't reach the server. Check your connection and try again.");
      } else {
        setFormError(rawMessage);
        setError(rawMessage);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleFillDemo = () => {
    handleModeSwitch("login");
    setName("Bharat");
    setPassword("OVAEL-demo-2026!");
    clearActiveError();
    setSuccessNotice("");
    setFieldErrors({});
    // Demo-fill is an interaction, not a new page entry; do not restart motion.
  };

  const passwordProgress = Math.min(100, Math.round((password.length / MIN_PASSWORD_LENGTH) * 100));
  const passwordLengthValid = password.length >= MIN_PASSWORD_LENGTH;

  return (
    <main
      className={`auth-page-shell auth-page ${
        isRegister ? "auth-page--register" : "auth-page--login"
      } ${!isRegister && isEnteringLogin ? "auth-login-entrance" : ""}`}
      id="main-content"
    >
      <div className="auth-card-container">
        {/* Interactive Form Column */}
        <section className="auth-form-column" aria-labelledby="auth-heading">
          {/* Top Utilities Header */}
          <header className="auth-top-row">
            <div className="brand auth-brand-mini">
              <span className="brand-mark auth-brand-mark" aria-hidden="true">
                <svg
                  className="auth-brand-mark-svg"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  focusable="false"
                  aria-hidden="true"
                >
                  <rect
                    className="auth-brand-frame-path"
                    x="1.5"
                    y="1.5"
                    width="29"
                    height="29"
                    rx="5"
                    stroke="#B4DFE5"
                    strokeWidth="0.9"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    className="auth-brand-glint"
                    d="M5 2.5H11M2.5 5V11"
                    stroke="#FBE8A6"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <span className="auth-brand-mark-glyph">O</span>
              </span>
              <span className="brand-name auth-brand-wordmark">OVAEL-X</span>
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
            </div>
          </header>

          {/* Centered Form Workspace Container */}
          <div className="auth-form-body">
            {/* Mode Tabs (Sign In / Register) */}
            <div className="auth-mode-selector" role="tablist" aria-label="Authentication type">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`auth-mode-tab ${mode === "login" ? "active" : ""}`}
              onClick={() => handleModeSwitch("login")}
              onMouseDown={(e) => e.preventDefault()}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`auth-mode-tab ${mode === "register" ? "active" : ""}`}
              onClick={() => handleModeSwitch("register")}
              onMouseDown={(e) => e.preventDefault()}
            >
              Create Account
            </button>
          </div>

          {/* Heading Block */}
          <div className="auth-heading-group">
            <span className="auth-eyebrow">
              {isRecover
                ? "Account Access Recovery"
                : isRegister
                  ? "New Learner Setup"
                  : "Adaptive Learning Workspace"}
            </span>
            <h1 id="auth-heading" className="auth-title">
              {isRecover
                ? "Reset your password"
                : isRegister
                  ? "Create your account"
                  : "Welcome back."}
            </h1>
            <p className="auth-subtitle">
              {isRecover
                ? "Enter your learner ID and single-use recovery key to establish a new password."
                : isRegister
                  ? "Build a clear map of what you know, uncover learning gaps, and learn with evidence-backed practice."
                  : "Sign in to continue your focused, evidence-led learning session."}
            </p>
          </div>

          {/* Success Notification Banner */}
          {successNotice && (
            <div className="auth-success-card" role="status" aria-live="polite">
              <CheckCircle2 size={18} className="success-icon" aria-hidden="true" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Recovery Key Display Step (after registration or password recovery) */}
          {recoveryKey && (
            <div className="auth-recovery-card" role="region" aria-label="Account Recovery Key">
              <div className="recovery-header">
                <Key size={18} className="recovery-icon" />
                <strong>
                  {recoveryOrigin === "recover"
                    ? "Save Your Replacement Recovery Key"
                    : "Save Your Recovery Key"}
                </strong>
              </div>
              <p className="recovery-text">
                This secret key is shown only once and is single-use. If you ever lose access,
                this key restores your account and issues a new replacement key. Store it in a safe place.
              </p>
              <div className="recovery-key-row">
                <code
                  className="recovery-code"
                  onClick={handleSelectRecoveryKey}
                  title="Click to select key"
                  tabIndex={0}
                  role="textbox"
                  aria-readonly="true"
                >
                  {recoveryKey}
                </code>
              </div>

              <div className="recovery-actions-row">
                <button
                  type="button"
                  className="secondary-button compact copy-btn"
                  onClick={() => void handleCopyRecovery()}
                  aria-label="Copy recovery key"
                >
                  {copiedRecovery ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedRecovery ? "Copied" : "Copy key"}</span>
                </button>
                <button
                  type="button"
                  className="secondary-button compact recovery-download-btn"
                  onClick={handleDownloadRecovery}
                  aria-label="Download recovery key as a text file"
                >
                  {downloadedRecovery ? <Check size={14} /> : <Download size={14} />}
                  <span>{downloadedRecovery ? "Downloaded" : "Download .txt"}</span>
                </button>
              </div>

              {copyFeedback && (
                <p className="recovery-copy-hint" role="status" aria-live="polite">
                  {copyFeedback}
                </p>
              )}

              <div className="recovery-confirm-row">
                <input
                  type="checkbox"
                  id="confirm-recovery-saved"
                  className="recovery-confirm-checkbox"
                  checked={recoveryConfirmed}
                  onChange={(e) => setRecoveryConfirmed(e.target.checked)}
                />
                <label htmlFor="confirm-recovery-saved">
                  I have safely stored my recovery key and understand it cannot be recovered by OVAEL.
                </label>
              </div>

              <div className="recovery-continue-row">
                <button
                  type="button"
                  className="primary-button compact recovery-continue-btn"
                  onClick={() => void handleContinueAfterRecovery()}
                  disabled={!recoveryConfirmed || authBusy}
                >
                  {authBusy
                    ? "Continuing…"
                    : recoveryOrigin === "recover"
                      ? "I have saved my key — Continue to Sign In"
                      : "I have saved my key — Continue to Workspace"}
                </button>
              </div>
            </div>
          )}

          {/* Form Error Banner */}
          {activeError && (
            <div className="auth-error-card" role="alert">
              <AlertCircle size={18} className="error-icon" aria-hidden="true" />
              <div className="error-text">
                <span>{activeError}</span>
                {duplicateIdSuggested && (
                  <div className="auth-duplicate-action">
                    <span>Already registered? </span>
                    <button
                      type="button"
                      className="auth-inline-link-btn"
                      onClick={() => handleModeSwitch("login")}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      Sign in instead
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="error-dismiss"
                aria-label="Dismiss error message"
                onClick={clearActiveError}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Main Auth Form - hidden when dedicated recovery confirmation step is active */}
          {!recoveryKey && (
            <form
              className="auth-form"
              onSubmit={(e) => void handleSubmit(e)}
              noValidate
            >
              {/* Username / Learner ID Field */}
              <div className="form-field-group auth-field-username">
                <label htmlFor="auth-username" className="field-label">
                  <span>Learner ID or Username</span>
                  {(isRegister || isRecover) && (
                    <small className="field-hint">
                      {USERNAME_MIN}–{USERNAME_MAX} chars
                    </small>
                  )}
                </label>
                <div className="input-wrap">
                  <User size={17} className="input-icon-leading" aria-hidden="true" />
                  <input
                    ref={usernameInputRef}
                    id="auth-username"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    autoFocus
                    placeholder="e.g. learner_42"
                    value={name}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    onBlur={handleUsernameBlur}
                    className="auth-input with-leading-icon"
                    aria-invalid={!!fieldErrors.username}
                    aria-describedby={
                      fieldErrors.username ? "auth-username-error" : undefined
                    }
                    disabled={authBusy}
                  />
                </div>
                {fieldErrors.username && (
                  <div id="auth-username-error" className="field-error-msg" role="alert">
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>{fieldErrors.username}</span>
                  </div>
                )}
              </div>

              {/* Recovery Key Field (Recover mode only) */}
              {isRecover && (
                <div className="form-field-group auth-field-recovery">
                  <label htmlFor="auth-recovery-key" className="field-label">
                    <span>Recovery Key</span>
                  </label>
                  <div className="input-wrap">
                    <Key size={17} className="input-icon-leading" aria-hidden="true" />
                    <input
                      ref={recoveryKeyInputRef}
                      id="auth-recovery-key"
                      name="recovery_key"
                      type="text"
                      required
                      placeholder="e.g. ovrec_..."
                      value={recoveryKeyInput}
                      onChange={(e) => handleRecoveryKeyInputChange(e.target.value)}
                      onBlur={handleRecoveryKeyInputBlur}
                      className="auth-input with-leading-icon"
                      aria-invalid={!!fieldErrors.recoveryKey}
                      aria-describedby={
                        fieldErrors.recoveryKey ? "auth-recovery-key-error" : undefined
                      }
                      disabled={authBusy}
                    />
                  </div>
                  {fieldErrors.recoveryKey && (
                    <div id="auth-recovery-key-error" className="field-error-msg" role="alert">
                      <AlertCircle size={14} aria-hidden="true" />
                      <span>{fieldErrors.recoveryKey}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Password Field */}
              <div className="form-field-group auth-field-password">
                <div className="field-label-row">
                  <label htmlFor="auth-password" className="field-label">
                    <span>{isRecover ? "New Password" : "Password"}</span>
                  </label>
                  {(isRegister || isRecover) && (
                    <span
                      className={`password-requirement ${
                        password.length === 0
                          ? "neutral"
                          : passwordLengthValid
                            ? "valid"
                            : "invalid"
                      }`}
                    >
                      {passwordLengthValid
                        ? `✓ ${password.length} characters`
                        : `Min ${MIN_PASSWORD_LENGTH} characters`}
                    </span>
                  )}
                </div>

                <div className="input-wrap">
                  <Lock size={17} className="input-icon-leading" aria-hidden="true" />
                  <input
                    ref={passwordInputRef}
                    id="auth-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete={
                      isRegister || isRecover ? "new-password" : "current-password"
                    }
                    minLength={passwordMinLength(mode === "recover" ? "register" : mode)}
                    maxLength={PASSWORD_MAX}
                    placeholder={
                      isRegister || isRecover
                        ? `Password (min ${MIN_PASSWORD_LENGTH} chars)`
                        : "Enter your password"
                    }
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onBlur={handlePasswordBlur}
                    onKeyDown={handlePasswordKeyEvent}
                    onKeyUp={handlePasswordKeyEvent}
                    className="auth-input with-leading-icon with-trailing-action"
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={
                      fieldErrors.password ? "auth-password-error" : undefined
                    }
                    disabled={authBusy}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn icon-button"
                    aria-label={showPassword ? "Hide password text" : "Show password text"}
                    aria-pressed={showPassword}
                    title={showPassword ? "Hide password" : "Show password"}
                    onClick={handleTogglePassword}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Caps Lock Non-Blocking Indicator */}
                {capsLockActive && (
                  <div className="caps-lock-hint" role="status" aria-live="polite">
                    <Info size={13} aria-hidden="true" />
                    <span>Caps Lock is on</span>
                  </div>
                )}

                {/* Password Length Progress Indicator (Register / Recover modes only) */}
                {(isRegister || isRecover) && (
                  <div className="password-meter-wrap" aria-hidden="true">
                    <div className="password-meter-track">
                      <div
                        className={`password-meter-bar ${
                          passwordLengthValid ? "valid" : "short"
                        }`}
                        style={{ width: `${passwordProgress}%` }}
                      />
                    </div>
                    <div className="password-meter-meta">
                      <span>Length progress</span>
                      <span className={passwordLengthValid ? "meter-status valid" : "meter-status"}>
                        {Math.min(password.length, PASSWORD_MAX)} / {MIN_PASSWORD_LENGTH}
                      </span>
                    </div>
                  </div>
                )}

                {/* Field-level error */}
                {fieldErrors.password && (
                  <div id="auth-password-error" className="field-error-msg" role="alert">
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>{fieldErrors.password}</span>
                  </div>
                )}

              </div>

              {/* Supporting Utilities Row: Remember ID & Forgot Password */}
              {mode === "login" && (
                <div className="auth-form-utilities-row">
                  <label className="auth-remember-row">
                    <input
                      type="checkbox"
                      className="auth-remember-checkbox"
                      checked={rememberId}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setRememberId(next);
                        if (!next) {
                          safeStorage.removeItem("ovael_remembered_username");
                        }
                      }}
                    />
                    <span>Remember my learner ID</span>
                  </label>
                  <button
                    type="button"
                    className="auth-link-btn"
                    onClick={() => handleModeSwitch("recover")}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Submit Action */}
              <button
                type="submit"
                className="primary-button full auth-submit-btn"
                disabled={authBusy || loading || connection !== "online"}
                aria-busy={authBusy}
                onMouseDown={(e) => {
                  // Prevent input blur layout shift from cancelling the click before submit
                  if (!authBusy && !loading && connection === "online") {
                    e.preventDefault();
                  }
                }}
              >
                {authBusy ? (
                  <span className="btn-loading-content">
                    <RefreshCw size={16} className="spin-icon" />
                    <span>
                      {isRecover
                        ? "Resetting password…"
                        : isRegister
                          ? "Creating account…"
                          : "Signing in…"}
                    </span>
                  </span>
                ) : connection === "offline" ? (
                  <span>Cannot connect — backend is offline</span>
                ) : (
                  <span>
                    {isRecover
                      ? "Reset password"
                      : isRegister
                        ? "Create learner account"
                        : "Sign in to workspace"}
                  </span>
                )}
              </button>

              {/* Contextual Mode Switch Prompt */}
              <div className="auth-switch-prompt">
                {isRecover ? (
                  <>
                    <span className="auth-switch-text">Remember your password?</span>{" "}
                    <button
                      type="button"
                      className="auth-switch-link"
                      onClick={() => handleModeSwitch("login")}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      Back to sign in
                    </button>
                  </>
                ) : isRegister ? (
                  <>
                    <span className="auth-switch-text">Already have an account?</span>{" "}
                    <button
                      type="button"
                      className="auth-switch-link"
                      onClick={() => handleModeSwitch("login")}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    <span className="auth-switch-text">Don't have an account yet?</span>{" "}
                    <button
                      type="button"
                      className="auth-switch-link"
                      onClick={() => handleModeSwitch("register")}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      Create an account
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
          </div> {/* /auth-form-body */}

          {/* Bottom Auxiliary & Security Utilities */}
          <footer className="auth-form-footer">
            {/* Dev Demo Account Utility */}
            {import.meta.env.DEV && !recoveryKey && (
              <div className="auth-dev-tools">
                <button
                  type="button"
                  className="demo-account-pill-btn"
                  onClick={handleFillDemo}
                  onMouseDown={(e) => e.preventDefault()}
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
            <div className="auth-footer-note">
              <ShieldCheck size={16} className="shield-icon" aria-hidden="true" />
              <span>
                Your learning data is privacy-first and backed by Argon2id credentials and local memory.
              </span>
            </div>
          </footer>
        </section>

        {/* Visual Accent Column */}
        <section
          ref={accentColumnRef}
          className="auth-accent-column"
          aria-label="OVAEL-X Features and Knowledge Visual"
          onPointerMove={handleAccentPointerMove}
          onPointerLeave={handleAccentPointerLeave}
        >
          {/* White Abstract Background Video Layer */}
          <div className="auth-video-container" aria-hidden="true">
            {!videoFailed && (
              <video
                ref={videoRef}
                className="auth-video-element"
                autoPlay={!prefersReduced}
                muted
                loop
                playsInline
                poster="/videos/login-background-poster.jpg"
                aria-hidden="true"
                tabIndex={-1}
                onError={() => setVideoFailed(true)}
              >
                <source src="/videos/login-background.mp4" type="video/mp4" />
              </video>
            )}
            <div className="auth-video-overlay" aria-hidden="true" />
          </div>

          <div className="auth-accent-content">
            <div className="auth-accent-badge">Evidence-Grounded Learning</div>
            <h2 className="auth-accent-headline">
              Understand what is holding you back.
            </h2>
            <p className="auth-accent-description">
              Study your own materials, identify causal misconceptions through evidence-backed practice, and build durable mastery under your control.
            </p>

            <div
              className="auth-feature-pills"
              onPointerLeave={handleFeaturePointerLeave}
              onBlurCapture={handleFeatureBlur}
              role="group"
              aria-label="Explore learning capabilities"
            >
              <button
                type="button"
                className={`feature-pill ${activeFeature === "sources" ? "is-active" : ""}`}
                data-feature="sources"
                aria-pressed={activeFeature === "sources"}
                onPointerEnter={(event) => handleFeaturePointerEnter("sources", event)}
                onFocus={() => handleFeatureFocus("sources")}
                onClick={() => handleFeatureClick("sources")}
              >
                <span className="pill-dot" aria-hidden="true" />
                <span>Source-grounded lessons.</span>
                <span className="feature-pill-indicator" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`feature-pill ${activeFeature === "gaps" ? "is-active" : ""}`}
                data-feature="gaps"
                aria-pressed={activeFeature === "gaps"}
                onPointerEnter={(event) => handleFeaturePointerEnter("gaps", event)}
                onFocus={() => handleFeatureFocus("gaps")}
                onClick={() => handleFeatureClick("gaps")}
              >
                <span className="pill-dot" aria-hidden="true" />
                <span>Gap forensics.</span>
                <span className="feature-pill-indicator" aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`feature-pill ${activeFeature === "memory" ? "is-active" : ""}`}
                data-feature="memory"
                aria-pressed={activeFeature === "memory"}
                onPointerEnter={(event) => handleFeaturePointerEnter("memory", event)}
                onFocus={() => handleFeatureFocus("memory")}
                onClick={() => handleFeatureClick("memory")}
              >
                <span className="pill-dot" aria-hidden="true" />
                <span>Memory under your control.</span>
                <span className="feature-pill-indicator" aria-hidden="true" />
              </button>
            </div>

            <div className="auth-visual-wrapper">
              <AuthVisualAccent isLogin={!isRegister} activeFeature={activeFeature} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
