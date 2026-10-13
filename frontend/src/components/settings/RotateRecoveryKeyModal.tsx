import React, { useState, useEffect } from 'react';
import { Key, Copy, Check, X, ShieldAlert } from 'lucide-react';
import { Button, IconButton, Field, Input, Alert } from '../ui';
import { api } from '../../api';

export interface RotateRecoveryKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RotateRecoveryKeyModal: React.FC<RotateRecoveryKeyModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [password, setPassword] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setGeneratedKey('');
      setError('');
      setCopied(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, busy, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password to generate a new key.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const res = await api('/v1/auth/recovery-key', 'POST', { password });
      setGeneratedKey(res.recovery_key);
    } catch (err: any) {
      setError(err?.message || 'Failed to rotate recovery key.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div
      className="settings-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rotate-key-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="settings-modal" role="document">
        <div className="settings-modal__header">
          <div className="settings-modal__title-wrap">
            <span className="settings-modal__icon" aria-hidden="true">
              <Key size={18} />
            </span>
            <div>
              <h3 id="rotate-key-title" className="settings-modal__title">
                Rotate Recovery Key
              </h3>
              <p className="settings-modal__subtitle">
                Generate an emergency offline key for account recovery.
              </p>
            </div>
          </div>
          <IconButton
            label="Close recovery dialog"
            icon={<X size={18} />}
            onClick={onClose}
            disabled={busy}
          />
        </div>

        {!generatedKey ? (
          <form onSubmit={handleSubmit}>
            <div className="settings-modal__body">
              {error && (
                <Alert variant="error" onDismiss={() => setError('')}>
                  {error}
                </Alert>
              )}

              <p className="settings-modal__desc-text">
                Generating a new recovery key will immediately invalidate your previous
                recovery key. Confirm your current password to proceed.
              </p>

              <Field label="Account Password" required>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter current password"
                  disabled={busy}
                  autoComplete="current-password"
                />
              </Field>
            </div>

            <div className="settings-modal__footer">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={busy}
                disabled={busy}
              >
                Generate New Key
              </Button>
            </div>
          </form>
        ) : (
          <div className="settings-modal__body">
            <div className="key-display-box">
              <span className="key-display-label">Your New Recovery Key:</span>
              <code className="key-display-code">{generatedKey}</code>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                leftIcon={copied ? <Check size={14} /> : <Copy size={14} />}
              >
                {copied ? 'Copied to Clipboard!' : 'Copy Key'}
              </Button>
            </div>

            <div className="key-warning-notice">
              <ShieldAlert size={16} aria-hidden="true" />
              <span>
                Store this key in a secure password manager. This key will not be shown
                again and is the only way to restore your account if your password is lost.
              </span>
            </div>

            <div className="settings-modal__footer">
              <Button type="button" variant="primary" onClick={onClose}>
                Done &amp; Saved
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
