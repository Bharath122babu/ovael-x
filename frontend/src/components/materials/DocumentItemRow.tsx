import React from 'react';
import {
  FileText,
  Presentation,
  Image as ImageIcon,
  FileAudio,
  FileVideo,
  File,
  Eye,
  RotateCw,
  Trash2,
  Tag,
  Calendar,
} from 'lucide-react';
import { Button, IconButton, Badge } from '../ui';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { DocumentItem, formatBytes } from './types';

export interface DocumentItemRowProps {
  document: DocumentItem;
  onInspect: (document: DocumentItem) => void;
  onRetry?: (document: DocumentItem) => void;
  onDelete?: (document: DocumentItem) => void;
  isOwner?: boolean;
}

function getFileIcon(filename: string = '') {
  if (!filename) return <File size={20} />;
  const parts = filename.split('.');
  const ext = parts.length > 1 ? '.' + parts.pop()?.toLowerCase() : '';
  if (ext === '.pdf' || ext === '.txt' || ext === '.md' || ext === '.docx' || ext === '.epub') {
    return <FileText size={20} />;
  }
  if (ext === '.pptx') {
    return <Presentation size={20} />;
  }
  if (ext === '.png' || ext === '.jpg' || ext === '.jpeg' || ext === '.webp') {
    return <ImageIcon size={20} />;
  }
  if (ext === '.wav' || ext === '.mp3' || ext === '.m4a') {
    return <FileAudio size={20} />;
  }
  if (ext === '.mp4' || ext === '.webm' || ext === '.mov') {
    return <FileVideo size={20} />;
  }
  return <File size={20} />;
}

export const DocumentItemRow: React.FC<DocumentItemRowProps> = ({
  document,
  onInspect,
  onRetry,
  onDelete,
  isOwner = true,
}) => {
  const filename = document.original_filename || document.filename || 'Untitled document';
  const byteSize = document.byte_size ?? document.size_bytes ?? 0;
  const failureReason = document.failure_reason || document.error;

  const dateStr = document.created_at || document.updated_at;
  const formattedDate = dateStr
    ? new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const isExtractionReady =
    document.status === 'ready' || document.status === 'ready_partial';
  const isFailed = document.status === 'failed_retryable';

  return (
    <article
      className="doc-row"
      aria-labelledby={`doc-title-${document.document_id}`}
    >
      <div className="doc-row__leading">
        <span className="doc-row__icon" aria-hidden="true">
          {getFileIcon(filename)}
        </span>
        <div className="doc-row__details">
          <h4
            id={`doc-title-${document.document_id}`}
            className="doc-row__name"
            title={filename}
          >
            {filename}
          </h4>
          <div className="doc-row__metadata">
            <span className="doc-row__size">{formatBytes(byteSize)}</span>
            {document.ready_page_count !== undefined && (
              <>
                <span className="doc-row__meta-sep">·</span>
                <span className="doc-row__pages">{document.ready_page_count} pages ready</span>
              </>
            )}
            {formattedDate && (
              <>
                <span className="doc-row__meta-sep">·</span>
                <span className="doc-row__date">{formattedDate}</span>
              </>
            )}
            {document.focus_concept_name && (
              <>
                <span className="doc-row__meta-sep">·</span>
                <span className="doc-row__topic">
                  <Tag size={12} aria-hidden="true" />
                  <span>{document.focus_concept_name}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="doc-row__status-col">
        <DocumentStatusBadge
          status={document.status}
          error={failureReason || undefined}
        />
      </div>

      <div className="doc-row__actions">
        {/* View extracted text action */}
        {isExtractionReady && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onInspect(document)}
            leftIcon={<Eye size={14} />}
          >
            Inspect Text
          </Button>
        )}

        {/* Retry action if extraction failed */}
        {isOwner && onRetry && isFailed && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onRetry(document)}
            leftIcon={<RotateCw size={14} />}
          >
            Retry Extraction
          </Button>
        )}

        {/* Re-index action if already extracted */}
        {isOwner && onRetry && isExtractionReady && (
          <IconButton
            size="sm"
            label={`Re-index ${filename}`}
            icon={<RotateCw size={14} />}
            onClick={() => onRetry(document)}
          />
        )}

        {/* Delete action */}
        {isOwner && onDelete && (
          <IconButton
            size="sm"
            label={`Delete document ${filename}`}
            icon={<Trash2 size={14} />}
            onClick={() => onDelete(document)}
          />
        )}
      </div>

      {isFailed && failureReason && (
        <div className="doc-item-row__failure" role="alert">
          <span>{failureReason}</span>
        </div>
      )}
    </article>
  );
};
