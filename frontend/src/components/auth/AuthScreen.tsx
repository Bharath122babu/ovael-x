import React, { useState, useEffect, useRef } from "react";
import {
  Check,
  Copy,
  Download,
  RefreshCw,
  Sparkles,
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
import { AuthVisualAccent } from "../content/AuthVisualAccent";
import { usePrefersReducedMotion } from "../content/MotionPrimitives";

export type AuthMode = "signin" | "register" | "login" | "recover";

export interface AuthScreenProps {
  connection?: "online" | "checking" | "offline";
  loading?: boolean;
  error?: string | null;
  setError?: (err: string) => void;
  refresh?: () => Promise<void>;
  login?: (name: string, pass: string) => Promise<void>;
  theme?: "light" | "dark";
  toggleTheme?: () => void;
  onRegisteredRecovery?: (key: string) => void;
  onModeChange?: (mode: "login" | "register") => void;

  // Additional props for backward/extended compatibility
  mode?: AuthMode;
  learnerId?: string;
  onLearnerIdChange?: (value: string) => void;
  password?: string;
  onPasswordChange?: (value: string) => void;
  displayName?: string;
  onDisplayNameChange?: (value: string) => void;
  confirmPassword?: string;
  onConfirmPasswordChange?: (value: string) => void;
  rememberLearnerId?: boolean;
  onRememberLearnerIdChange?: (checked: boolean) => void;
  onPasswordRecovery?: () => void;
  recoveryMessage?: string | null;
  onSubmit?: (payload: {
    mode: AuthMode;
    learnerId: string;
    password: string;
    displayName?: string;
    confirmPassword?: string;
    rememberLearnerId?: boolean;
  }) => Promise<void> | void;
  fieldErrors?: {
    learnerId?: string;
    password?: string;
    displayName?: string;
    confirmPassword?: string;
  };
  backendOnline?: boolean;
  versionLabel?: string;
}

export function AuthScreen({
  connection = "online",
  loading = false,
  error = "",
  setError = () => {},
  refresh = async () => {},
  login = async () => {},
  theme: _theme,
  toggleTheme: _toggleTheme,
  onRegisteredRecovery,
  onModeChange,
  mode: controlledMode,
  learnerId: controlledLearnerId,
  password: controlledPassword,
  recoveryMessage,
  backendOnline,
  versionLabel = "SYS.ACCESS // OVAEL-X CORE · ARGON2ID ENCRYPTED · LOCAL-FIRST",
}: AuthScreenProps) {
  const prefersReduced = usePrefersReducedMotion();
  const effectiveOnline = backendOnline !== undefined ? backendOnline : connection === "online";

  const initialMode = controlledMode === "register" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register" | "recover">(initialMode);
  const [isEnteringLogin, setIsEnteringLogin] = useState(!prefersReduced);
  const [name, setName] = useState(controlledLearnerId ?? "");
  const [password, setPassword] = useState(controlledPassword ?? "");
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
  const [successNotice, setSuccessNotice] = useState(recoveryMessage ?? "");
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

  const entranceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          // Handled gracefully by fallback
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
      setRecoveryKey("");
    };
  }, []);

  const isRegister = mode === "register";
  const isRecover = mode === "recover";

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
  };

  const passwordLengthValid = password.length >= MIN_PASSWORD_LENGTH;

  return (
    <div
      className={`ovael-auth-viewport auth-page-shell auth-page ${
        isRegister ? "auth-page--register" : "auth-page--login"
      } ${!isRegister && isEnteringLogin ? "auth-login-entrance" : ""}`}
      data-theme="light"
      id="main-content"
    >
      {/* Background Video Layer with subtle white wash */}
      <div className="ovael-auth-video-backdrop" aria-hidden="true">
        {!videoFailed && (
          <video
            ref={videoRef}
            className="ovael-auth-video-element"
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
        <div className="ovael-auth-video-wash" aria-hidden="true" />
      </div>

      {/* Top Product Header */}
      <header className="ovael-auth-header" role="banner">
        <div className="ovael-auth-brand brand auth-brand-mini">
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

        <div className="ovael-auth-header__meta">
          <div
            className="ovael-auth-header__connection"
            title={
              connection === "online"
                ? "Adaptive backend online"
                : connection === "checking"
                  ? "Checking connection…"
                  : "Offline / local fallback"
            }
          >
            <span
              className={`ovael-auth-header__dot ${
                connection === "online"
                  ? "ovael-auth-header__dot--online"
                  : connection === "checking"
                    ? "ovael-auth-header__dot--checking"
                    : "ovael-auth-header__dot--offline"
              }`}
              aria-hidden="true"
            />
            <span className="sr-only">Backend: {connection}</span>
          </div>
          <span className="ovael-auth-header__annotation">LEARNER ACCESS / 01</span>
        </div>
      </header>

      {/* Main Asymmetrical Workspace Stage */}
      <main className="ovael-auth-main">
        <div className="ovael-auth-stage">
          <section
            className="ovael-auth-column"
            aria-labelledby="ovael-auth-heading"
          >
            {/* Typographic Hierarchy */}
            <div className="ovael-auth-intro">
              <p className="ovael-auth-eyebrow">
                {isRecover
                  ? "ACCOUNT ACCESS RECOVERY"
                  : isRegister
                    ? "LEARNER ONBOARDING"
                    : "WELCOME BACK"}
              </p>
              <h1 id="ovael-auth-heading" className="ovael-auth-heading">
                {isRecover
                  ? "Reset your password."
                  : isRegister
                    ? "Create your learner profile."
                    : "Good to have you back."}
              </h1>
              <p className="ovael-auth-supporting">
                {isRecover
                  ? "Enter your learner ID and single-use recovery key to establish a new password."
                  : isRegister
                    ? "Initialize your adaptive workspace and continue where your thinking leads."
                    : "Continue where your thinking left off."}
              </p>
            </div>

            {/* Minimal Underline Mode Selector */}
            <div
              className="ovael-auth-tabs"
              role="tablist"
              aria-label="Authentication mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                className={`ovael-auth-tab ${
                  mode === "login" ? "ovael-auth-tab--active" : ""
                }`}
                onClick={() => handleModeSwitch("login")}
                onMouseDown={(e) => e.preventDefault()}
                disabled={authBusy}
              >
                Sign In
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                className={`ovael-auth-tab ${
                  mode === "register" ? "ovael-auth-tab--active" : ""
                }`}
                onClick={() => handleModeSwitch("register")}
                onMouseDown={(e) => e.preventDefault()}
                disabled={authBusy}
              >
                Create Account
              </button>
            </div>

            {/* Success Notification Banner */}
            {successNotice && (
              <div
                className="ovael-auth-banner ovael-auth-banner--notice"
                role="status"
                aria-live="polite"
              >
                <span className="ovael-auth-banner__code">OK</span>
                <span>{successNotice}</span>
              </div>
            )}

            {/* Form Error Banner */}
            {activeError && (
              <div
                className="ovael-auth-banner ovael-auth-banner--error"
                role="alert"
                aria-live="polite"
              >
                <span className="ovael-auth-banner__code">ERR</span>
                <div className="ovael-auth-banner__content">
                  <span>{activeError}</span>
                  {duplicateIdSuggested && (
                    <span className="ovael-auth-banner__link-wrap">
                      {" — "}
                      <button
                        type="button"
                        className="ovael-auth-inline-link"
                        onClick={() => handleModeSwitch("login")}
                      >
                        Sign in instead
                      </button>
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="ovael-auth-banner__dismiss"
                  onClick={clearActiveError}
                  aria-label="Dismiss error"
                >
                  ×
                </button>
              </div>
            )}

            {/* Dedicated Recovery Key Presentation Step */}
            {recoveryKey && (
              <div
                className="ovael-auth-recovery"
                role="region"
                aria-label="Account Recovery Key"
              >
                <div className="ovael-auth-recovery__header">
                  <span className="ovael-auth-eyebrow">SECURITY // KEY GENERATION</span>
                  <h2 className="ovael-auth-recovery__title">
                    {recoveryOrigin === "recover"
                      ? "Save Your Replacement Key"
                      : "Save Your Recovery Key"}
                  </h2>
                  <p className="ovael-auth-supporting">
                    This secret key is shown only once and is single-use. If you ever lose access,
                    this key restores your account and issues a new replacement key. Store it safely.
                  </p>
                </div>

                <div className="ovael-auth-recovery__code-box">
                  <code
                    className="recovery-code ovael-auth-recovery__code"
                    onClick={handleSelectRecoveryKey}
                    title="Click to select key"
                    tabIndex={0}
                    role="textbox"
                    aria-readonly="true"
                  >
                    {recoveryKey}
                  </code>
                </div>

                <div className="ovael-auth-recovery__actions">
                  <button
                    type="button"
                    className="ovael-auth-btn-secondary copy-btn"
                    onClick={() => void handleCopyRecovery()}
                    aria-label="Copy recovery key"
                  >
                    {copiedRecovery ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedRecovery ? "Copied" : "Copy key"}</span>
                  </button>
                  <button
                    type="button"
                    className="ovael-auth-btn-secondary recovery-download-btn"
                    onClick={handleDownloadRecovery}
                    aria-label="Download recovery key as a text file"
                  >
                    {downloadedRecovery ? <Check size={14} /> : <Download size={14} />}
                    <span>{downloadedRecovery ? "Downloaded" : "Download .txt"}</span>
                  </button>
                </div>

                {copyFeedback && (
                  <p
                    className="recovery-copy-hint ovael-auth-recovery__hint"
                    role="status"
                    aria-live="polite"
                  >
                    {copyFeedback}
                  </p>
                )}

                <label className="ovael-auth-checkbox ovael-auth-recovery__confirm">
                  <input
                    type="checkbox"
                    id="confirm-recovery-saved"
                    className="ovael-auth-checkbox__input recovery-confirm-checkbox"
                    checked={recoveryConfirmed}
                    onChange={(e) => setRecoveryConfirmed(e.target.checked)}
                  />
                  <span className="ovael-auth-checkbox__label">
                    I have safely stored my recovery key and understand it cannot be recovered by OVAEL.
                  </span>
                </label>

                <button
                  type="button"
                  className="ovael-auth-submit recovery-continue-btn"
                  onClick={() => void handleContinueAfterRecovery()}
                  disabled={!recoveryConfirmed || authBusy}
                >
                  <span>
                    {authBusy
                      ? "Continuing…"
                      : recoveryOrigin === "recover"
                        ? "I have saved my key — Continue to Sign In"
                        : "I have saved my key — Continue to Workspace"}
                  </span>
                  <span className="ovael-auth-submit__arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              </div>
            )}

            {/* Main Interactive Form */}
            {!recoveryKey && (
              <form
                className="ovael-auth-form"
                onSubmit={(e) => void handleSubmit(e)}
                noValidate
              >
                {/* Learner ID / Username Field */}
                <div className="ovael-auth-field">
                  <div className="ovael-auth-field__header">
                    <label htmlFor="auth-username" className="ovael-auth-label">
                      Learner ID or Username
                    </label>
                    {(isRegister || isRecover) && (
                      <span className="ovael-auth-field__hint">
                        {USERNAME_MIN}–{USERNAME_MAX} chars
                      </span>
                    )}
                    {fieldErrors.username && (
                      <span
                        id="auth-username-error"
                        className="ovael-auth-field__error"
                        role="alert"
                      >
                        {fieldErrors.username}
                      </span>
                    )}
                  </div>
                  <input
                    ref={usernameInputRef}
                    id="auth-username"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="e.g. learner_42"
                    value={name}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    onBlur={handleUsernameBlur}
                    disabled={authBusy}
                    aria-invalid={Boolean(fieldErrors.username)}
                    aria-describedby={
                      fieldErrors.username ? "auth-username-error" : undefined
                    }
                    className={`ovael-auth-input ${
                      fieldErrors.username ? "ovael-auth-input--error" : ""
                    }`}
                  />
                </div>

                {/* Single-Use Recovery Key Field (Recover mode only) */}
                {isRecover && (
                  <div className="ovael-auth-field">
                    <div className="ovael-auth-field__header">
                      <label htmlFor="auth-recovery-key" className="ovael-auth-label">
                        Recovery Key
                      </label>
                      {fieldErrors.recoveryKey && (
                        <span
                          id="auth-recovery-key-error"
                          className="ovael-auth-field__error"
                          role="alert"
                        >
                          {fieldErrors.recoveryKey}
                        </span>
                      )}
                    </div>
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
                      disabled={authBusy}
                      aria-invalid={Boolean(fieldErrors.recoveryKey)}
                      aria-describedby={
                        fieldErrors.recoveryKey
                          ? "auth-recovery-key-error"
                          : undefined
                      }
                      className={`ovael-auth-input ${
                        fieldErrors.recoveryKey ? "ovael-auth-input--error" : ""
                      }`}
                    />
                  </div>
                )}

                {/* Password Field */}
                <div className="ovael-auth-field">
                  <div className="ovael-auth-field__header">
                    <label htmlFor="auth-password" className="ovael-auth-label">
                      {isRecover ? "New Password" : "Password"}
                    </label>
                    {(isRegister || isRecover) && (
                      <span
                        className={`ovael-auth-field__hint ${
                          passwordLengthValid ? "ovael-auth-field__hint--valid" : ""
                        }`}
                      >
                        {passwordLengthValid
                          ? `✓ ${password.length} chars`
                          : `Min ${MIN_PASSWORD_LENGTH} chars`}
                      </span>
                    )}
                    {fieldErrors.password && (
                      <span
                        id="auth-password-error"
                        className="ovael-auth-field__error"
                        role="alert"
                      >
                        {fieldErrors.password}
                      </span>
                    )}
                  </div>
                  <div className="ovael-auth-password-wrap">
                    <input
                      ref={passwordInputRef}
                      id="auth-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete={
                        isRegister || isRecover
                          ? "new-password"
                          : "current-password"
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
                      disabled={authBusy}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={
                        fieldErrors.password ? "auth-password-error" : undefined
                      }
                      className={`ovael-auth-input ovael-auth-input--password ${
                        fieldErrors.password ? "ovael-auth-input--error" : ""
                      }`}
                    />
                    <button
                      type="button"
                      className="ovael-auth-password-toggle password-toggle-btn"
                      onClick={handleTogglePassword}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      disabled={authBusy}
                    >
                      {showPassword ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M3 3L21 21M10.58 10.58A2 2 0 0013.42 13.42M9.88 5.09A9.77 9.77 0 0112 5c5 0 9.27 3.11 11 7.5a11.77 11.77 0 01-2.16 3.19M6.61 6.61A11.75 11.75 0 001 12.5C2.73 16.89 7 20 12 20a9.77 9.77 0 005.39-1.61"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="square"
                          />
                        </svg>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <path
                            d="M1 12C2.73 7.61 7 4.5 12 4.5S21.27 7.61 23 12c-1.73 4.39-6 7.5-11 7.5S2.73 16.39 1 12z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="3"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          />
                        </svg>
                      )}
                    </button>
                  </div>

                  {capsLockActive && (
                    <div
                      className="caps-lock-hint ovael-auth-field__caps"
                      role="status"
                      aria-live="polite"
                    >
                      <span>Caps Lock is on</span>
                    </div>
                  )}
                </div>

                {/* Utilities Row: Remember Learner ID & Password Reset */}
                <div className="ovael-auth-utilities">
                  <label className="ovael-auth-checkbox auth-remember-row">
                    <input
                      type="checkbox"
                      className="ovael-auth-checkbox__input auth-remember-checkbox"
                      checked={rememberId}
                      onChange={(e) => {
                        const next = e.target.checked;
                        setRememberId(next);
                        if (!next) {
                          safeStorage.removeItem("ovael_remembered_username");
                        }
                      }}
                      disabled={authBusy}
                    />
                    <span className="ovael-auth-checkbox__label">
                      Remember Learner ID
                    </span>
                  </label>

                  {mode === "login" && (
                    <button
                      type="button"
                      className="ovael-auth-recovery-link auth-link-btn"
                      onClick={() => handleModeSwitch("recover")}
                      onMouseDown={(e) => e.preventDefault()}
                      disabled={authBusy}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                {/* Primary Action Button */}
                <button
                  type="submit"
                  className="ovael-auth-submit primary-button auth-submit-btn"
                  disabled={authBusy || loading || connection !== "online"}
                  aria-busy={authBusy}
                >
                  <span>
                    {authBusy
                      ? isRecover
                        ? "Resetting password…"
                        : isRegister
                          ? "Creating account…"
                          : "Signing in…"
                      : connection === "offline"
                        ? "Backend is offline"
                        : isRecover
                          ? "Reset password"
                          : isRegister
                            ? "Create learner account"
                            : "Sign in to workspace"}
                  </span>
                  <span className="ovael-auth-submit__arrow" aria-hidden="true">
                    →
                  </span>
                </button>

                {/* Contextual Mode Switch Prompt */}
                <p className="ovael-auth-switch-prompt">
                  {isRecover ? (
                    <>
                      Remember your password?{" "}
                      <button
                        type="button"
                        className="ovael-auth-switch-link"
                        onClick={() => handleModeSwitch("login")}
                        onMouseDown={(e) => e.preventDefault()}
                        disabled={authBusy}
                      >
                        Sign in
                      </button>
                    </>
                  ) : isRegister ? (
                    <>
                      Already have a Learner ID?{" "}
                      <button
                        type="button"
                        className="ovael-auth-switch-link"
                        onClick={() => handleModeSwitch("login")}
                        onMouseDown={(e) => e.preventDefault()}
                        disabled={authBusy}
                      >
                        Sign in
                      </button>
                    </>
                  ) : (
                    <>
                      New to OVAEL-X?{" "}
                      <button
                        type="button"
                        className="ovael-auth-switch-link"
                        onClick={() => handleModeSwitch("register")}
                        onMouseDown={(e) => e.preventDefault()}
                        disabled={authBusy}
                      >
                        Create account
                      </button>
                    </>
                  )}
                </p>

                {/* Dev Demo Account Utility */}
                {import.meta.env.DEV && (
                  <div className="ovael-auth-dev">
                    <button
                      type="button"
                      className="ovael-auth-demo-btn demo-account-pill-btn"
                      onClick={handleFillDemo}
                      onMouseDown={(e) => e.preventDefault()}
                      disabled={authBusy}
                      title="Populate test credentials (Bharat / OVAEL-demo-2026!)"
                    >
                      <Sparkles size={13} aria-hidden="true" />
                      <span>Fill synthetic demo credentials</span>
                    </button>
                  </div>
                )}
              </form>
            )}
          </section>

          {/* Right Side / Secondary Dot-Matrix Technical Calibration Motif */}
          <div className="ovael-auth-stage__aside">
            <AuthVisualAccent
              mode={isRegister ? "register" : "signin"}
              online={effectiveOnline}
            />
          </div>
        </div>
      </main>

      {/* Minimal Industrial Footer */}
      <footer className="ovael-auth-footer">
        <div className="ovael-auth-footer__inner">
          <span className="ovael-auth-footer__meta">
            {versionLabel}
          </span>
          {connection === "offline" && (
            <button
              type="button"
              className="ovael-auth-retry-btn"
              onClick={() => void handleRetryConnection()}
              disabled={reconnecting}
            >
              <RefreshCw
                size={12}
                className={reconnecting ? "spin-icon" : ""}
              />
              <span>{reconnecting ? "Reconnecting…" : "Retry connection"}</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

export default AuthScreen;
