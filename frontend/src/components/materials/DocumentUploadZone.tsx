import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileText,
  X,
  ArrowRight,
  AlertCircle,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import { Button, IconButton, Alert, Badge } from '../ui';
import { ALLOWED_EXTENSIONS, MAX_FILE_BYTES, formatBytes } from './types';

export interface DocumentUploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  busy?: boolean;
  courseName?: string;
}

export const DocumentUploadZone: React.FC<DocumentUploadZoneProps> = ({
  onUpload,
  busy = false,
  courseName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState('');
  const [uploading, setUploading] = useState(false);

  const validateAndStageFile = (file: File) => {
    setValidationError('');

    // Check size
    if (file.size > MAX_FILE_BYTES) {
      setValidationError(
        `File is too large (${formatBytes(file.size)}). The maximum allowed upload size is 100 MB.`
      );
      return false;
    }

    if (file.size === 0) {
      setValidationError('Cannot upload an empty file.');
      return false;
    }

    // Check extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const isAllowed = ALLOWED_EXTENSIONS.some((allowed) => allowed === ext);
    if (!isAllowed) {
      setValidationError(
        `Unsupported file type (${ext}). Supported formats: PDF, DOCX, PPTX, TXT, MD, EPUB, Images, Audio, and Video.`
      );
      return false;
    }

    setSelectedFile(file);
    return true;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy && !uploading) setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (busy || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndStageFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndStageFile(file);
    }
    e.target.value = '';
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setValidationError('');
    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
    } catch (err: any) {
      setValidationError(err?.message || 'Failed to upload document. Please retry.');
    } finally {
      setUploading(false);
    }
  };

  const isActionDisabled = busy || uploading;

  return (
    <div className="doc-upload-panel">
      {validationError && (
        <div className="doc-upload-panel__alert" role="alert">
          <Alert variant="error" onDismiss={() => setValidationError('')}>
            {validationError}
          </Alert>
        </div>
      )}

      {selectedFile ? (
        /* Staged file ready for upload */
        <div className="doc-upload-staged">
          <div className="doc-upload-staged__info">
            <span className="doc-upload-staged__icon" aria-hidden="true">
              <FileCheck2 size={24} />
            </span>
            <div className="doc-upload-staged__details">
              <strong className="doc-upload-staged__name" title={selectedFile.name}>
                {selectedFile.name}
              </strong>
              <span className="doc-upload-staged__meta">
                {formatBytes(selectedFile.size)} · Ready to upload
                {courseName && ` to ${courseName}`}
              </span>
            </div>
          </div>

          <div className="doc-upload-staged__actions">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSelectedFile(null)}
              disabled={isActionDisabled}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={uploading || busy}
              disabled={isActionDisabled}
              onClick={handleStartUpload}
              leftIcon={<UploadCloud size={16} />}
            >
              Upload Material
            </Button>
          </div>
        </div>
      ) : (
        /* Dropzone area */
        <div
          className={`doc-dropzone ${dragActive ? 'doc-dropzone--active' : ''} ${
            isActionDisabled ? 'doc-dropzone--disabled' : ''
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          role="region"
          aria-label="File upload dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            className="visually-hidden"
            accept={ALLOWED_EXTENSIONS.join(',')}
            onChange={handleFileChange}
            disabled={isActionDisabled}
            id="doc-file-upload-input"
          />

          <div className="doc-dropzone__icon-wrap" aria-hidden="true">
            <UploadCloud size={28} />
          </div>

          <div className="doc-dropzone__content">
            <p className="doc-dropzone__main-text">
              <strong>Drag &amp; drop learning material</strong> or{' '}
              <button
                type="button"
                className="doc-dropzone__browse-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isActionDisabled}
              >
                browse files
              </button>
            </p>
            <p className="doc-dropzone__sub-text">
              Supports PDF, DOCX, PPTX, TXT, MD, EPUB, Images, and Audio/Video (up to 100 MB).
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
