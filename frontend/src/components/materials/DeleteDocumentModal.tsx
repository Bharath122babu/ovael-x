import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button, IconButton, Alert, useFocusTrap } from '../ui';
import { DocumentItem } from './types';

export interface DeleteDocumentModalProps {
  isOpen: boolean;
  document: DocumentItem | null;
  onClose: () => void;
  onDelete: (documentId: string) => Promise<void>;
}

export const DeleteDocumentModal: React.FC<DeleteDocumentModalProps> = ({
  isOpen,
  document,
  onClose,
  onDelete,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(isOpen, dialogRef);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) setError('');
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, busy, onClose]);

  if (!isOpen || !document) return null;

  const handleDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await onDelete(document.document_id);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete document.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="doc-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-doc-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div ref={dialogRef} className="doc-modal doc-modal--danger" role="document" tabIndex={-1}>
        <div className="doc-modal__header">
          <div className="doc-modal__title-wrap">
            <span
              className="doc-modal__icon doc-modal__icon--danger"
              aria-hidden="true"
            >
              <AlertTriangle size={18} />
            </span>
            <div>
              <h2 id="delete-doc-title" className="doc-modal__title">
                Delete Course Material
              </h2>
              <span className="doc-modal__subtitle">
                Permanent deletion of uploaded learning reference.
              </span>
            </div>
          </div>
          <IconButton
            label="Close delete dialog"
            icon={<X size={18} />}
            onClick={onClose}
            disabled={busy}
          />
        </div>

        {error && (
          <div className="doc-modal__alert">
            <Alert variant="error" onDismiss={() => setError('')}>
              {error}
            </Alert>
          </div>
        )}

        <div className="doc-modal__body">
          <p>
            Are you sure you want to delete <strong>{document.original_filename || document.filename || 'this document'}</strong>?
          </p>
          <div className="doc-modal__warning-box">
            <AlertTriangle size={16} aria-hidden="true" />
            <span>
              This will remove the file from storage and permanently delete all indexed knowledge chunks derived from it. The AI tutor will no longer reference this document.
            </span>
          </div>
        </div>

        <div className="doc-modal__footer">
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
            onClick={handleDelete}
            leftIcon={<Trash2 size={16} />}
          >
            Delete Material
          </Button>
        </div>
      </div>
    </div>
  );
};
