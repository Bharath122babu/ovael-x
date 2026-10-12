import React, { useEffect, useRef, useState } from 'react';
import {
  UploadCloud,
  Image as ImageIcon,
  FileText,
  X,
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  RefreshCw,
} from 'lucide-react';
import { Button, IconButton } from '../ui';

export interface ImageUploadZoneProps {
  onFileSelected: (file: File) => void;
  activeFile?: File | null;
  onRemoveFile?: () => void;
  busy?: boolean;
  maxBytes?: number;
  className?: string;
}

const DEFAULT_MAX_BYTES = 12 * 1024 * 1024; // 12MB matching backend OCR limit

export const ImageUploadZone: React.FC<ImageUploadZoneProps> = ({
  onFileSelected,
  activeFile,
  onRemoveFile,
  busy = false,
  maxBytes = DEFAULT_MAX_BYTES,
  className = '',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manage preview object URL lifecycle
  useEffect(() => {
    if (activeFile && activeFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(activeFile);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setPreviewUrl(null);
      };
    } else {
      setPreviewUrl(null);
    }
  }, [activeFile]);

  const validateAndSelectFile = (file: File) => {
    setError(null);

    // 1. Validate MIME type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPEG, WebP, etc.).');
      return;
    }

    // 2. Validate empty file
    if (file.size === 0) {
      setError('The selected image is empty (0 bytes). Please choose a valid image.');
      return;
    }

    // 3. Validate file size limit
    if (file.size > maxBytes) {
      const mbLimit = Math.round(maxBytes / (1024 * 1024));
      setError(`Image size exceeds the ${mbLimit}MB limit. Please choose a smaller image.`);
      return;
    }

    onFileSelected(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (busy) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSelectFile(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSelectFile(file);
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`upload-zone-wrapper ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleInputChange}
        disabled={busy}
      />

      {/* When File is Selected: Preview Card */}
      {activeFile ? (
        <div className="upload-preview-card" role="region" aria-label="Selected image preview">
          <div className="upload-preview-card__thumb-wrap">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Uploaded handwriting preview"
                className="upload-preview-card__img"
              />
            ) : (
              <div className="upload-preview-card__placeholder" aria-hidden="true">
                <ImageIcon size={24} />
              </div>
            )}
            {busy && (
              <div className="upload-preview-card__overlay" role="status" aria-live="polite">
                <LoaderCircle size={20} className="spin text-primary" />
                <span>Processing OCR...</span>
              </div>
            )}
          </div>

          <div className="upload-preview-card__details">
            <div className="upload-preview-card__name" title={activeFile.name}>
              <FileText size={15} aria-hidden="true" />
              <span>{activeFile.name}</span>
            </div>
            <div className="upload-preview-card__meta">
              <span>{formatFileSize(activeFile.size)}</span>
              <span>·</span>
              <span>{activeFile.type || 'image'}</span>
            </div>

            <div className="upload-preview-card__actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                leftIcon={<RefreshCw size={13} />}
              >
                Replace
              </Button>
              {onRemoveFile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRemoveFile}
                  disabled={busy}
                  leftIcon={<X size={13} />}
                  className="upload-preview-card__remove-btn"
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty Dropzone State */
        <div
          className={`upload-zone ${isDragging ? 'upload-zone--dragging' : ''} ${busy ? 'upload-zone--busy' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !busy && fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !busy) {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          aria-label="Upload handwritten answer image. Drag and drop or press Enter to browse files."
        >
          <div className="upload-zone__icon-wrap" aria-hidden="true">
            <UploadCloud size={24} />
          </div>
          <div className="upload-zone__content">
            <span className="upload-zone__prompt">
              <strong>Click to upload</strong> or drag and drop an image
            </span>
            <span className="upload-zone__hint">
              PNG, JPG, or WebP up to {Math.round(maxBytes / (1024 * 1024))}MB
            </span>
          </div>
        </div>
      )}

      {/* Validation Error Banner */}
      {error && (
        <div className="upload-zone__error" role="alert">
          <AlertCircle size={15} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
