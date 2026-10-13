import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button, IconButton, Field, Input, Alert } from '../ui';
import { api } from '../../api';

export interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onDeleted,
}) => {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPassword('');
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

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Password is required to confirm account deletion.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await api('/v1/auth/account', 'DELETE', { password });
      onDeleted();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete account.');
      setBusy(false);
    }
  };

  return (
    <div
      className="settings-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="settings-modal settings-modal--danger" role="document">
        <div className="settings-modal__header">
          <div className="settings-modal__title-wrap">
            <span
              className="settings-modal__icon settings-modal__icon--danger"
              aria-hidden="true"
            >
              <AlertTriangle size={18} />
            </span>
            <div>
              <h3 id="delete-account-title" className="settings-modal__title">
                Delete Account
              </h3>
              <p className="settings-modal__subtitle">
                Permanent deletion of account identity, credentials, and data.
              </p>
            </div>
          </div>
          <IconButton
            label="Close deletion dialog"
            icon={<X size={18} />}
            onClick={onClose}
            disabled={busy}
          />
        </div>

        <form onSubmit={handleDelete}>
          <div className="settings-modal__body">
            {error && (
              <Alert variant="error" onDismiss={() => setError('')}>
                {error}
              </Alert>
            )}

            <div className="danger-warning-box">
              <AlertTriangle size={16} aria-hidden="true" />
              <span>
                <strong>Warning:</strong> This action is completely permanent and cannot be
                reversed. All course materials, learning sessions, evidence records, and
                credentials will be deleted immediately.
              </span>
            </div>

            <Field label="Confirm Your Password" required>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password to confirm"
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
              variant="danger"
              loading={busy}
              disabled={busy}
              leftIcon={<Trash2 size={16} />}
            >
              Permanently Delete Account
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
