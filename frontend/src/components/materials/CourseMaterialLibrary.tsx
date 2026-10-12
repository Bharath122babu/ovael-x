import React, { useMemo, useState } from 'react';
import {
  UploadCloud,
  Search,
  RefreshCw,
  FolderOpen,
  FileCheck2,
  AlertTriangle,
  LoaderCircle,
} from 'lucide-react';
import { Button, Input, Badge, EmptyState } from '../ui';
import { DocumentUploadZone } from './DocumentUploadZone';
import { DocumentItemRow } from './DocumentItemRow';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DeleteDocumentModal } from './DeleteDocumentModal';
import { DocumentItem, DocumentFilterStatus } from './types';

export interface CourseMaterialLibraryProps {
  courseId: string;
  courseName: string;
  documents: DocumentItem[];
  onUploadDocument: (file: File) => Promise<void>;
  onRetryDocument?: (documentId: string) => Promise<void>;
  onDeleteDocument?: (documentId: string) => Promise<void>;
  onRefresh?: () => void;
  busy?: boolean;
  isOwner?: boolean;
}

export const CourseMaterialLibrary: React.FC<CourseMaterialLibraryProps> = ({
  courseId,
  courseName,
  documents,
  onUploadDocument,
  onRetryDocument,
  onDeleteDocument,
  onRefresh,
  busy = false,
  isOwner = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<DocumentFilterStatus>('all');
  const [inspectDoc, setInspectDoc] = useState<DocumentItem | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<DocumentItem | null>(null);

  // Counts
  const readyCount = useMemo(
    () =>
      documents.filter(
        (d) => d.status === 'ready' || d.status === 'ready_partial'
      ).length,
    [documents]
  );

  const processingCount = useMemo(
    () =>
      documents.filter(
        (d) => d.status === 'processing' || d.status === 'uploaded'
      ).length,
    [documents]
  );

  const failedCount = useMemo(
    () =>
      documents.filter(
        (d) =>
          d.status === 'failed_retryable' || d.status === 'password_required'
      ).length,
    [documents]
  );

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Status filter
      if (filterStatus === 'ready') {
        if (doc.status !== 'ready' && doc.status !== 'ready_partial') return false;
      } else if (filterStatus === 'processing') {
        if (doc.status !== 'processing' && doc.status !== 'uploaded') return false;
      } else if (filterStatus === 'failed') {
        if (
          doc.status !== 'failed_retryable' &&
          doc.status !== 'password_required'
        )
          return false;
      }

      // 2. Search query filter
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;

      const nameMatch = (doc.original_filename || doc.filename || '')
        .toLowerCase()
        .includes(q);
      const topicMatch = doc.focus_concept_name?.toLowerCase().includes(q);
      const subjectMatch = doc.subject_name?.toLowerCase().includes(q);
      return Boolean(nameMatch || topicMatch || subjectMatch);
    });
  }, [documents, filterStatus, searchQuery]);

  return (
    <section
      className="course-material-library"
      aria-labelledby="material-library-heading"
    >
      {/* 1. Header with Refresh */}
      <div className="course-material-library__header">
        <div>
          <div className="course-material-library__title-wrap">
            <h3 id="material-library-heading" className="course-material-library__title">
              Course Reference Materials
            </h3>
            <Badge variant="primary" size="sm">
              {documents.length} {documents.length === 1 ? 'document' : 'documents'}
            </Badge>
          </div>
          <p className="course-material-library__desc">
            Upload PDFs, lecture slides, notes, or media. Content is processed and indexed for grounded AI tutoring in{' '}
            <strong>{courseName}</strong>.
          </p>
        </div>

        {onRefresh && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={busy}
            leftIcon={<RefreshCw size={14} className={busy ? 'spin' : ''} />}
          >
            Refresh List
          </Button>
        )}
      </div>

      {/* 2. Upload Zone (Available for owner or authorized users) */}
      {isOwner && (
        <DocumentUploadZone
          onUpload={onUploadDocument}
          busy={busy}
          courseName={courseName}
        />
      )}

      {/* 3. Toolbar: Search and Filter Pills (when documents exist) */}
      {documents.length > 0 && (
        <div className="course-material-library__toolbar">
          <div className="doc-search-box">
            <Search size={15} className="search-icon" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search materials by filename or topic..."
              className="doc-search-input"
              aria-label="Filter course materials"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear document filter"
              >
                Clear
              </button>
            )}
          </div>

          <div
            className="doc-status-filters"
            role="group"
            aria-label="Filter by extraction status"
          >
            <button
              type="button"
              className={`filter-pill ${filterStatus === 'all' ? 'active' : ''}`}
              onClick={() => setFilterStatus('all')}
              aria-pressed={filterStatus === 'all'}
            >
              All ({documents.length})
            </button>
            <button
              type="button"
              className={`filter-pill ${filterStatus === 'ready' ? 'active' : ''}`}
              onClick={() => setFilterStatus('ready')}
              aria-pressed={filterStatus === 'ready'}
            >
              Ready ({readyCount})
            </button>
            {processingCount > 0 && (
              <button
                type="button"
                className={`filter-pill ${
                  filterStatus === 'processing' ? 'active' : ''
                }`}
                onClick={() => setFilterStatus('processing')}
                aria-pressed={filterStatus === 'processing'}
              >
                Processing ({processingCount})
              </button>
            )}
            {failedCount > 0 && (
              <button
                type="button"
                className={`filter-pill ${
                  filterStatus === 'failed' ? 'active' : ''
                }`}
                onClick={() => setFilterStatus('failed')}
                aria-pressed={filterStatus === 'failed'}
              >
                Needs Review ({failedCount})
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4. Document List */}
      <div className="course-material-library__list" role="list">
        {documents.length === 0 ? (
          <EmptyState
            title="No course materials uploaded yet"
            description="Upload your syllabus, lecture slides, papers, or recordings above to ground adaptive tutoring in your course material."
          />
        ) : filteredDocuments.length === 0 ? (
          <div className="doc-empty-search">
            <p>
              No documents matched &ldquo;<strong>{searchQuery}</strong>&rdquo;
              {filterStatus !== 'all' && ` with status "${filterStatus}"`}.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <DocumentItemRow
              key={doc.document_id}
              document={doc}
              onInspect={(d) => setInspectDoc(d)}
              onRetry={
                onRetryDocument
                  ? async (d) => onRetryDocument(d.document_id)
                  : undefined
              }
              onDelete={
                onDeleteDocument ? (d) => setDeleteDoc(d) : undefined
              }
              isOwner={isOwner}
            />
          ))
        )}
      </div>

      {/* Preview Modal */}
      <DocumentPreviewModal
        isOpen={Boolean(inspectDoc)}
        document={inspectDoc}
        onClose={() => setInspectDoc(null)}
      />

      {/* Delete Confirmation Modal */}
      <DeleteDocumentModal
        isOpen={Boolean(deleteDoc)}
        document={deleteDoc}
        onClose={() => setDeleteDoc(null)}
        onDelete={async (id) => {
          if (onDeleteDocument) {
            await onDeleteDocument(id);
          }
        }}
      />
    </section>
  );
};
