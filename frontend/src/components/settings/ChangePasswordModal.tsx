import React, { useState, useEffect } from 'react';
import { KeyRound, X } from 'lucide-react';
import { Button, IconButton, Field, Input, Alert } from '../ui';
import { api } from '../../api';

export interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
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
    if (!currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await api('/v1/auth/change-password', 'POST', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="settings-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="settings-modal" role="document">
        <div className="settings-modal__header">
          <div className="settings-modal__title-wrap">
            <span className="settings-modal__icon" aria-hidden="true">
              <KeyRound size={18} />
            </span>
            <div>
              <h3 id="change-password-title" className="settings-modal__title">
                Change Password
              </h3>
              <p className="settings-modal__subtitle">
                Update your account password with cryptographic verification.
              </p>
            </div>
          </div>
          <IconButton
            label="Close password dialog"
            icon={<X size={18} />}
            onClick={onClose}
            disabled={busy}
          />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="settings-modal__body">
            {error && (
              <Alert variant="error" onDismiss={() => setError('')}>
                {error}
              </Alert>
            )}

            <Field label="Current Password" required>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter existing password"
                disabled={busy}
                autoComplete="current-password"
              />
            </Field>

            <Field
              label="New Password"
              description="Must be at least 8 characters"
              required
            >
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Create strong new password"
                disabled={busy}
                autoComplete="new-password"
              />
            </Field>

            <Field label="Confirm New Password" required>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                disabled={busy}
                autoComplete="new-password"
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
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
