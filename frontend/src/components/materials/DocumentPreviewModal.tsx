import React, { useEffect, useState } from 'react';
import {
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  Info,
  ShieldCheck,
  RotateCw,
} from 'lucide-react';
import { Button, IconButton, Badge, Alert, Spinner } from '../ui';
import { api } from '../../api';
import { DocumentItem, DocumentPage } from './types';

export interface DocumentPreviewModalProps {
  isOpen: boolean;
  document: DocumentItem | null;
  onClose: () => void;
  fetchPageText?: (documentId: string, pageNo: number) => Promise<DocumentPage>;
  initialPageData?: DocumentPage;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  isOpen,
  document,
  onClose,
  fetchPageText,
  initialPageData,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageData, setPageData] = useState<DocumentPage | null>(
    initialPageData || null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load page 1 text whenever document opens
  useEffect(() => {
    if (!isOpen || !document) {
      setPageData(null);
      setCurrentPage(1);
      setError('');
      return;
    }

    let isMounted = true;
    const loadPage = async () => {
      setLoading(true);
      setError('');
      try {
        let data: DocumentPage;
        if (fetchPageText) {
          data = await fetchPageText(document.document_id, currentPage);
        } else {
          data = await api(
            `/v1/documents/${document.document_id}/pages/${currentPage}`
          );
        }
        if (isMounted) {
          setPageData(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            err?.message ||
              'Could not load page text. The document may still be extracting.'
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadPage();
    return () => {
      isMounted = false;
    };
  }, [isOpen, document, currentPage, fetchPageText]);

  if (!isOpen || !document) return null;

  const provenanceMethod =
    pageData?.provenance?.method ||
    pageData?.provenance?.engine ||
    'Native text extraction';

  return (
    <div
      className="doc-preview-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-preview-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="doc-preview-dialog" role="document">
        {/* Header */}
        <div className="doc-preview-dialog__header">
          <div className="doc-preview-dialog__title-wrap">
            <span className="doc-preview-dialog__icon" aria-hidden="true">
              <FileText size={18} />
            </span>
            <div>
              <h2 id="doc-preview-title" className="doc-preview-dialog__title">
                {document.original_filename || document.filename || 'Document'}
              </h2>
              <span className="doc-preview-dialog__meta">
                Document ID: <code>{document.document_id}</code>{document.version ? ` · Version ${document.version}` : ''}
              </span>
            </div>
          </div>
          <IconButton
            label="Close preview"
            icon={<X size={18} />}
            onClick={onClose}
          />
        </div>

        {/* Educational Disclaimer */}
        <div className="doc-preview-dialog__notice" role="note">
          <Info size={15} aria-hidden="true" />
          <span>
            Extracted source text is used for adaptive knowledge grounding in the tutor. It is not an evaluated learner answer.
          </span>
        </div>

        {/* Provenance metadata bar */}
        <div className="doc-preview-dialog__provenance">
          <div className="provenance-item">
            <span className="provenance-label">Method:</span>
            <Badge variant="neutral" size="sm">
              {provenanceMethod}
            </Badge>
          </div>
          {pageData?.text && (
            <div className="provenance-item">
              <span className="provenance-label">Characters:</span>
              <span>{pageData.text.length.toLocaleString()}</span>
            </div>
          )}
          <div className="provenance-pagination">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              leftIcon={<ChevronLeft size={14} />}
            >
              Previous
            </Button>
            <span className="page-indicator">Page {currentPage}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading || !pageData?.text}
              onClick={() => setCurrentPage((p) => p + 1)}
              rightIcon={<ChevronRight size={14} />}
            >
              Next
            </Button>
          </div>
        </div>

        {/* Text Viewport */}
        <div className="doc-preview-dialog__body">
          {loading ? (
            <div className="doc-preview-dialog__loading">
              <Spinner size="md" />
              <span>Loading extracted text from server...</span>
            </div>
          ) : error ? (
            <div className="doc-preview-dialog__error">
              <Alert variant="error">{error}</Alert>
            </div>
          ) : pageData?.text ? (
            <div className="doc-preview-dialog__text-view">
              <pre>{pageData.text}</pre>
            </div>
          ) : (
            <div className="doc-preview-dialog__empty">
              <p>No text extracted for page {currentPage}.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="doc-preview-dialog__footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </div>
  );
};
