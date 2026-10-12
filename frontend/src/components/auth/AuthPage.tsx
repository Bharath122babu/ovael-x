import React, { useState } from 'react';
import { KeyRound, Copy, Check, Layers3, ShieldCheck, Cpu, Database } from 'lucide-react';
import { Alert, Button } from '../ui';
import { SignInForm } from './SignInForm';
import { RegisterForm } from './RegisterForm';
import { RecoverForm } from './RecoverForm';
import { AuthMotionPath } from './AuthMotionPath';

export type AuthMode = 'signin' | 'register' | 'recover';

export interface AuthPageProps {
  onLogin: (credentials: { username: string; password: string }) => Promise<void>;
  onRegister: (data: {
    username: string;
    password: string;
    role: 'learner' | 'teacher';
    teacher_invite_code?: string;
  }) => Promise<{ recovery_key?: string } | void>;
  onRecover: (data: {
    username: string;
    recovery_key: string;
    new_password: string;
  }) => Promise<{ recovery_key?: string } | void>;
  error?: string;
  onClearError?: () => void;
  busy?: boolean;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  onLogin,
  onRegister,
  onRecover,
  error = '',
  onClearError,
  busy = false,
}) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [successNotice, setSuccessNotice] = useState<string>('');
  const [issuedRecoveryKey, setIssuedRecoveryKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const handleCopyKey = () => {
    if (!issuedRecoveryKey) return;
    navigator.clipboard?.writeText(issuedRecoveryKey).catch(() => {});
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleRegisterSubmit = async (data: {
    username: string;
    password: string;
    role: 'learner' | 'teacher';
    teacher_invite_code?: string;
  }) => {
    onClearError?.();
    const res = await onRegister(data);
    if (res && res.recovery_key) {
      setIssuedRecoveryKey(res.recovery_key);
    }
  };

  const handleRecoverSubmit = async (data: {
    username: string;
    recovery_key: string;
    new_password: string;
  }) => {
    onClearError?.();
    const res = await onRecover(data);
    if (res && res.recovery_key) {
      setSuccessNotice(
        `Password reset successful! A new recovery key was generated: ${res.recovery_key}. You may now sign in.`
      );
    } else {
      setSuccessNotice('Password reset successful! You may now sign in with your new password.');
    }
    setMode('signin');
  };

  const switchMode = (newMode: AuthMode) => {
    onClearError?.();
    setSuccessNotice('');
    setIssuedRecoveryKey(null);
    setMode(newMode);
  };

  return (
    <div className="auth-page-root">
      {/* Skip Link for accessibility */}
      <a href="#auth-main-card" className="skip-link sr-only">
        Skip to authentication form
      </a>

      {/* Composed Architectural Stage */}
      <div className="auth-page__stage">
        {/* Supporting Visual & Motion Storytelling Companion (Desktop / Tablet) */}
        <aside className="auth-page__companion" aria-label="Platform Architecture Overview">
          {/* Brand Header */}
          <header className="auth-page__brand">
            <div className="auth-brand" title="OVAEL-X v5.0.0">
              <div className="auth-brand__mark">
                <Layers3 size={22} aria-hidden="true" />
              </div>
              <div className="auth-brand__details">
                <div className="auth-brand__name-row">
                  <span className="auth-brand__name">
                    OVAEL<span className="brand-dot">.</span>X
                  </span>
                  <span className="auth-brand__version">v5.0.0</span>
                </div>
                <span className="auth-brand__tagline">Adaptive AI Tutoring Workbench</span>
              </div>
            </div>
          </header>

          <div className="auth-companion__story">
            <div className="auth-companion__eyebrow">
              <span className="auth-companion__eyebrow-dot" />
              <span>CONTINUOUS ADAPTIVE ARCHITECTURE</span>
            </div>

            <h2 className="auth-companion__headline">
              Deterministic learning, grounded in evidence.
            </h2>

            <p className="auth-companion__copy">
              An intelligent tutoring engine that continuously adapts to learner responses with verifiable mastery milestones.
            </p>

            {/* Signature Abstract Learning-Path Motion Graphic */}
            <AuthMotionPath className="auth-companion__motif" />

            {/* Architectural Pillars */}
            <div className="auth-companion__pillars">
              <div className="auth-companion__pillar">
                <div className="auth-companion__pillar-icon">
                  <Cpu size={14} aria-hidden="true" />
                </div>
                <span>Deterministic kernel</span>
              </div>
              <div className="auth-companion__pillar">
                <div className="auth-companion__pillar-icon">
                  <Database size={14} aria-hidden="true" />
                </div>
                <span>Demonstrated mastery</span>
              </div>
              <div className="auth-companion__pillar">
                <div className="auth-companion__pillar-icon">
                  <ShieldCheck size={14} aria-hidden="true" />
                </div>
                <span>Local-first privacy</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Focused Authentication Card Column */}
        <main id="auth-main-card" className="auth-page__container" tabIndex={-1}>
          <div className="auth-page__box">
            {/* Mobile-only brand header (visible when companion collapses on mobile screens) */}
            <div className="auth-page__mobile-brand" aria-hidden="true">
              <div className="auth-brand">
                <div className="auth-brand__mark">
                  <Layers3 size={20} aria-hidden="true" />
                </div>
                <div className="auth-brand__name-row">
                  <span className="auth-brand__name">
                    OVAEL<span className="brand-dot">.</span>X
                  </span>
                  <span className="auth-brand__version">v5.0.0</span>
                </div>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="auth-page__alert" role="alert">
                <Alert variant="error" onDismiss={onClearError}>
                  {error}
                </Alert>
              </div>
            )}

            {/* Success Banner */}
            {successNotice && (
              <div className="auth-page__alert" role="status">
                <Alert variant="success" onDismiss={() => setSuccessNotice('')}>
                  {successNotice}
                </Alert>
              </div>
            )}

            {/* Recovery Key Notice upon Registration */}
            {issuedRecoveryKey && (
              <div className="auth-recovery-banner" role="status">
                <div className="auth-recovery-banner__head">
                  <KeyRound size={18} className="auth-recovery-banner__icon" />
                  <div>
                    <strong>Save your account recovery key</strong>
                    <p>Keep this key in a secure place to restore access if you ever reset your password.</p>
                  </div>
                </div>
                <div className="auth-recovery-banner__keybox">
                  <code>{issuedRecoveryKey}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyKey}
                    leftIcon={copiedKey ? <Check size={14} /> : <Copy size={14} />}
                  >
                    {copiedKey ? 'Copied' : 'Copy key'}
                  </Button>
                </div>
                <Button
                  size="md"
                  variant="primary"
                  fullWidth
                  onClick={() => setIssuedRecoveryKey(null)}
                  className="auth-recovery-banner__dismiss"
                >
                  I saved my key — Continue to Workspace
                </Button>
              </div>
            )}

            {/* Form Switcher */}
            {!issuedRecoveryKey && (
              <>
                {mode === 'signin' && (
                  <SignInForm
                    onSubmit={async (credentials) => {
                      onClearError?.();
                      await onLogin(credentials);
                    }}
                    onSwitchToRegister={() => switchMode('register')}
                    onSwitchToRecover={() => switchMode('recover')}
                    busy={busy}
                  />
                )}

                {mode === 'register' && (
                  <RegisterForm
                    onSubmit={handleRegisterSubmit}
                    onSwitchToSignIn={() => switchMode('signin')}
                    busy={busy}
                  />
                )}

                {mode === 'recover' && (
                  <RecoverForm
                    onSubmit={handleRecoverSubmit}
                    onSwitchToSignIn={() => switchMode('signin')}
                    busy={busy}
                  />
                )}
              </>
            )}

            {/* Quiet, unobtrusive footer */}
            <footer className="auth-page__footer">
              <p>OVAEL-X v5.0.0 • Adaptive Learning Platform</p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};
