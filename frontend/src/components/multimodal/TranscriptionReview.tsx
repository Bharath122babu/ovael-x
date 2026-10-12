import React, { useId } from 'react';
import {
  FileSearch,
  Sparkles,
  Info,
  AlertTriangle,
  CheckCircle2,
  X,
  FileText,
} from 'lucide-react';
import { Button, Badge } from '../ui';
import type { Transcription } from '../../assessment';

export interface TranscriptionReviewProps {
  ocr: Transcription;
  onOcrChange?: (ocr: Transcription) => void;
  ocrConfirmed?: boolean;
  onOcrConfirmChange?: (confirmed: boolean) => void;
  onRemoveImage?: () => void;
  activeFile?: File | null;
  busy?: boolean;
  className?: string;
}

export const TranscriptionReview: React.FC<TranscriptionReviewProps> = ({
  ocr,
  onOcrChange,
  ocrConfirmed,
  onOcrConfirmChange,
  onRemoveImage,
  activeFile,
  busy = false,
  className = '',
}) => {
  const generatedId = useId();
  const textareaId = `ocr-transcript-${generatedId}`;

  const isLowConfidence =
    ocr.extraction_confidence != null && ocr.extraction_confidence < 0.65;
  const confidencePercent =
    ocr.extraction_confidence != null
      ? Math.round(ocr.extraction_confidence * 100)
      : null;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onOcrChange?.({
      ...ocr,
      text: e.target.value,
    });
    // Modifying text unchecks confirmation so the learner verifies their edit
    if (ocrConfirmed) {
      onOcrConfirmChange?.(false);
    }
  };

  return (
    <section
      className={`ocr-review ocr-review-panel ${className}`}
      aria-label="Handwriting transcription review"
    >
      {/* 1. Header with Metadata Badges */}
      <div className="ocr-review-panel__header">
        <div className="ocr-review-panel__title-wrap">
          <FileSearch size={16} className="text-primary" aria-hidden="true" />
          <h3 className="ocr-review-panel__title">Handwriting Transcription</h3>
          <Badge variant="neutral" size="sm">
            {ocr.source === 'drawing' ? 'Drawing' : 'Image'}
          </Badge>
          {ocr.engine && (
            <Badge variant="neutral" size="sm">
              {ocr.engine}
            </Badge>
          )}
        </div>

        <div className="ocr-review-panel__confidence">
          {confidencePercent !== null && (
            <Badge
              variant={isLowConfidence ? 'warning' : 'success'}
              size="sm"
            >
              {confidencePercent}% confidence
            </Badge>
          )}
        </div>
      </div>

      {/* 2. Educational & Diagnostic Notice */}
      <div className="ocr-review-panel__notice" role="note">
        <Info size={14} aria-hidden="true" />
        <span>
          Uploaded {ocr.source === 'drawing' ? 'drawing' : 'photo'}: verify the extracted text below. OCR transcribes characters but does not grade raw diagram topology.
        </span>
      </div>

      {/* 3. Low Confidence Warning */}
      {isLowConfidence && (
        <div className="ocr-review-panel__alert" role="alert">
          <AlertTriangle size={15} className="text-warning" aria-hidden="true" />
          <span>
            Low OCR confidence ({confidencePercent}%): review and correct any misrecognized mathematical symbols, subscripts, or terms.
          </span>
        </div>
      )}

      {/* 4. Editable Transcription Field */}
      <div className="ocr-review-panel__field">
        <label htmlFor={textareaId} className="ocr-review-panel__label">
          Extracted Text (editable):
        </label>
        <textarea
          id={textareaId}
          value={ocr.text}
          onChange={handleTextChange}
          rows={3}
          disabled={busy}
          placeholder="No readable text extracted. Type your solution or try a clearer image."
          className="ocr-review-panel__textarea"
        />
        <div className="ocr-review-panel__meta-row">
          <span className="ocr-review-panel__char-count">
            {ocr.text.trim().length} characters
          </span>
          {activeFile && (
            <span className="ocr-review-panel__file-ref">
              <FileText size={12} aria-hidden="true" />
              <span>{activeFile.name}</span>
            </span>
          )}
        </div>
      </div>

      {/* 5. Verification Consent & Action Footer */}
      <div className="ocr-review-panel__footer">
        <label className="transcript-consent">
          <input
            type="checkbox"
            checked={ocrConfirmed}
            onChange={(e) => onOcrConfirmChange?.(e.target.checked)}
            disabled={busy}
          />
          <span className="transcript-consent__text">
            I checked this transcription against my image
          </span>
        </label>

        <div className="ocr-review-panel__actions">
          {onRemoveImage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemoveImage}
              disabled={busy}
              leftIcon={<X size={13} />}
              className="ocr-review-panel__remove-btn"
            >
              Remove image
            </Button>
          )}
        </div>
      </div>

      {!ocrConfirmed && (
        <span className="ocr-review-panel__unconfirmed-hint" role="status">
          Check the box above to approve this transcription for assessment.
        </span>
      )}
    </section>
  );
};
