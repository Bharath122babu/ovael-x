export interface DocumentItem {
  document_id: string;
  course_id?: string | null;
  course_name?: string | null;
  subject_id?: string | null;
  subject_name?: string | null;
  focus_concept_id?: string | null;
  focus_concept_name?: string | null;
  filename?: string;
  original_filename?: string;
  content_type?: string;
  size_bytes?: number;
  byte_size?: number;
  sha256?: string;
  version?: number;
  status:
    | 'uploaded'
    | 'processing'
    | 'ready'
    | 'ready_partial'
    | 'failed_retryable'
    | 'password_required'
    | string;
  error?: string | null;
  failure_reason?: string | null;
  ready_page_count?: number;
  total_page_count?: number | null;
  created_at?: string;
  updated_at?: string;
  duplicate?: boolean;
}

export interface DocumentPage {
  document_id: string;
  page_no: number;
  status: string;
  text: string;
  provenance?: Record<string, any>;
}

export type DocumentFilterStatus = 'all' | 'ready' | 'processing' | 'failed';

export const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.pptx',
  '.txt',
  '.md',
  '.epub',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.wav',
  '.mp3',
  '.m4a',
  '.mp4',
  '.webm',
  '.mov',
] as const;

export const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MiB server limit

export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i] || 'MB'}`;
}
