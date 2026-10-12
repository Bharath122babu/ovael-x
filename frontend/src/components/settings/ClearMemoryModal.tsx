import React, { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button, IconButton, Alert } from '../ui';
import { api } from '../../api';

export interface ClearMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCleared: () => void;
}

export const ClearMemoryModal: React.FC<ClearMemoryModalProps> = ({
  isOpen,
  onClose,
  onCleared,
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleClear = async () => {
    setBusy(true);
    setError('');
    try {
      await api('/v1/memory', 'DELETE', { delete_all: true });
      onCleared();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to clear memory graph.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="settings-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clear-memory-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="settings-modal" role="document">
        <div className="settings-modal__header">
          <div className="settings-modal__title-wrap">
            <span
              className="settings-modal__icon settings-modal__icon--danger"
              aria-hidden="true"
            >
              <AlertTriangle size={18} />
            </span>
            <div>
              <h3 id="clear-memory-title" className="settings-modal__title">
                Clear Adaptive Memory Graph
              </h3>
              <p className="settings-modal__subtitle">
                Reset procedural and episodic learning recall.
              </p>
            </div>
          </div>
          <IconButton
            label="Close dialog"
            icon={<X size={18} />}
            onClick={onClose}
            disabled={busy}
          />
        </div>

        <div className="settings-modal__body">
          {error && (
            <Alert variant="error" onDismiss={() => setError('')}>
              {error}
            </Alert>
          )}

          <p className="settings-modal__desc-text">
            This will wipe your historical learning-memory graph and reset adaptive
            prerequisite tracking. Your courses, documents, and account credentials will
            remain untouched.
          </p>

          <div className="danger-warning-box">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              Future tutoring sessions will start without historical context from prior
              sessions.
            </span>
          </div>
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
            type="button"
            variant="danger"
            loading={busy}
            disabled={busy}
            onClick={handleClear}
            leftIcon={<Trash2 size={16} />}
          >
            Clear Memory Graph
          </Button>
        </div>
      </div>
    </div>
  );
};
