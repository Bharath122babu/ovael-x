import React, { useRef } from 'react';
import {
  PenLine,
  Send,
  Image as ImageIcon,
  Code2,
  Mic,
  FileText,
  Network,
  Info,
  HelpCircle,
  Lightbulb,
} from 'lucide-react';
import { Button, IconButton, Badge } from '../ui';
import { TextAnswerInput } from './TextAnswerInput';
import { MultipleChoiceInput } from './MultipleChoiceInput';
import { TrueFalseInput } from './TrueFalseInput';
import { NumericAnswerInput } from './NumericAnswerInput';
import { CodeAnswerInput } from './CodeAnswerInput';
import { SubmissionStatus } from './SubmissionStatus';
import { TranscriptionReview, SpeechInputButton } from '../multimodal';
import type { Transcription } from '../../assessment';

export interface AnswerComposerProps {
  move?: any;
  answer: string;
  onAnswerChange: (value: string) => void;
  choice: number | null;
  onSelectChoice: (choice: number) => void;
  mode: 'text' | 'code';
  onToggleMode: (mode: 'text' | 'code') => void;
  busy: boolean;
  error?: string | null;
  onClearError?: () => void;
  onSubmit: (intent?: 'answer' | 'ask_question' | 'need_explanation' | 'example') => void;
  showTrace?: boolean;
  onToggleTrace?: () => void;
  activeFile?: File | null;
  onUploadFile?: (file: File) => void;
  onOpenDraw?: () => void;
  micActive?: boolean;
  onToggleMic?: () => void;
  ocr?: Transcription | null;
  onOcrChange?: (ocr: Transcription | null) => void;
  ocrConfirmed?: boolean;
  onOcrConfirmChange?: (confirmed: boolean) => void;
  onRemoveImage?: () => void;
}

export const AnswerComposer: React.FC<AnswerComposerProps> = ({
  move,
  answer,
  onAnswerChange,
  choice,
  onSelectChoice,
  mode,
  onToggleMode,
  busy,
  error,
  onClearError,
  onSubmit,
  showTrace = false,
  onToggleTrace,
  activeFile,
  onUploadFile,
  onOpenDraw,
  micActive = false,
  onToggleMic,
  ocr,
  onOcrChange,
  ocrConfirmed = false,
  onOcrConfirmChange,
  onRemoveImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rawAnswerType = move?.answer_type;
  const isCodeMode = mode === 'code' || rawAnswerType === 'code';
  const effectiveType = rawAnswerType === 'mcq'
    ? 'mcq'
    : rawAnswerType === 'boolean'
    ? 'boolean'
    : rawAnswerType === 'numeric'
    ? 'numeric'
    : isCodeMode
    ? 'code'
    : 'text';

  // Calculate submit readiness
  const isSubmitDisabled = () => {
    if (busy) return true;
    if (effectiveType === 'mcq') {
      return choice === null;
    }
    if (effectiveType === 'boolean') {
      return !['true', 'false'].includes(answer.trim().toLowerCase());
    }
    if (effectiveType === 'numeric') {
      const trimmed = answer.trim();
      return !trimmed || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed);
    }
    if (effectiveType === 'code') {
      return !answer.trim();
    }
    // Text / Multimodal
    const hasText = answer.trim().length > 0;
    const hasTranscript = Boolean(ocr && ocr.text && ocr.text.trim().length > 0);
    if (!hasText && !hasTranscript) return true;
    if (ocr && !ocrConfirmed) return true;
    return false;
  };

  const handlePrimarySubmit = () => {
    if (!isSubmitDisabled()) {
      onSubmit('answer');
    }
  };

  const answerTypeLabel = rawAnswerType
    ? rawAnswerType.replace('_', ' ')
    : 'open response';

  return (
    <div className="answer-composer" role="region" aria-label="Answer composer">
      {/* 1. Header Toolbar with Context, Question Type Badge & Trace Toggle */}
      <div className="answer-composer__header">
        <div className="answer-composer__title-wrap">
          <span className="answer-composer__title">
            <PenLine size={15} aria-hidden="true" />
            <span>Your Response</span>
          </span>
          <Badge variant="primary" size="sm">
            {answerTypeLabel}
          </Badge>
        </div>

        <div className="answer-composer__header-actions">
          {onToggleTrace && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleTrace}
              leftIcon={<Network size={14} />}
              className="answer-composer__trace-btn"
            >
              {showTrace ? 'Hide' : 'View'} decision
            </Button>
          )}
        </div>
      </div>

      {/* Decision Trace Collapsible Viewer */}
      {showTrace && move && (
        <pre className="trace-view" aria-label="Decision Trace JSON">
          {JSON.stringify(move.decision_frame || move.decision_trace || {}, null, 2)}
        </pre>
      )}

      {/* Required Modalities or Content Warning Notice */}
      {move?.required_modalities && move.required_modalities.length > 0 && (
        <div className="answer-composer__instructions" role="note">
          <Info size={14} aria-hidden="true" />
          <span>
            This step requires: <strong>{move.required_modalities.join(', ')}</strong>. You can type, draw, or upload handwriting below.
          </span>
        </div>
      )}

      {/* 2. Question-Specific Input Control */}
      <div className="answer-composer__body">
        {effectiveType === 'mcq' && (
          <MultipleChoiceInput
            options={move?.options || []}
            selectedChoice={choice}
            onSelectChoice={onSelectChoice}
            disabled={busy}
          />
        )}

        {effectiveType === 'boolean' && (
          <TrueFalseInput
            value={answer}
            onChange={onAnswerChange}
            disabled={busy}
          />
        )}

        {effectiveType === 'numeric' && (
          <NumericAnswerInput
            value={answer}
            onChange={onAnswerChange}
            disabled={busy}
            onSubmitShortcut={handlePrimarySubmit}
          />
        )}

        {effectiveType === 'code' && (
          <CodeAnswerInput
            value={answer}
            onChange={onAnswerChange}
            disabled={busy}
            onSubmitShortcut={handlePrimarySubmit}
          />
        )}

        {effectiveType === 'text' && (
          <TextAnswerInput
            value={answer}
            onChange={onAnswerChange}
            disabled={busy}
            onSubmitShortcut={handlePrimarySubmit}
            placeholder="Type your answer, reasoning, or response here..."
          />
        )}
      </div>

      {/* 3. OCR Review & Transcript Confirmation Card */}
      {ocr && (
        <TranscriptionReview
          ocr={ocr}
          onOcrChange={onOcrChange}
          ocrConfirmed={ocrConfirmed}
          onOcrConfirmChange={onOcrConfirmChange}
          onRemoveImage={onRemoveImage}
          activeFile={activeFile}
          busy={busy}
        />
      )}

      {/* 4. Validation and Submission Status Alert */}
      <SubmissionStatus
        error={error}
        busy={busy}
        onClearError={onClearError}
      />

      {/* 5. Footer Action Toolbar */}
      <div className="answer-composer__footer">
        <div className="input-modes" role="toolbar" aria-label="Input modalities">
          {onUploadFile && (
            <>
              <button
                type="button"
                className="mode-btn"
                title="Upload handwritten answer"
                aria-label="Upload handwritten answer"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                <ImageIcon size={18} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUploadFile(f);
                  e.currentTarget.value = '';
                }}
              />
            </>
          )}

          {onOpenDraw && (
            <button
              type="button"
              className="mode-btn"
              title="Draw answer"
              aria-label="Draw answer"
              onClick={onOpenDraw}
              disabled={busy}
            >
              <PenLine size={18} />
            </button>
          )}

          <button
            type="button"
            className={`mode-btn ${mode === 'code' ? 'active' : ''}`}
            title="Toggle code input mode"
            aria-label="Toggle code input mode"
            aria-pressed={mode === 'code'}
            onClick={() => onToggleMode(mode === 'code' ? 'text' : 'code')}
            disabled={busy}
          >
            <Code2 size={18} />
          </button>

          {onToggleMic && (
            <SpeechInputButton
              isListening={micActive}
              onToggleListening={onToggleMic}
              disabled={busy}
            />
          )}

          {activeFile && (
            <span className="file-chip" title={activeFile.name}>
              <FileText size={12} aria-hidden="true" />
              <span>{activeFile.name}</span>
            </span>
          )}
        </div>

        <div className="submit-actions">
          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onSubmit('need_explanation')}
            leftIcon={<HelpCircle size={14} />}
          >
            Explain
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => onSubmit('example')}
            leftIcon={<Lightbulb size={14} />}
          >
            Example
          </Button>

          <Button
            variant="primary"
            size="md"
            disabled={isSubmitDisabled()}
            loading={busy}
            onClick={handlePrimarySubmit}
            leftIcon={<Send size={16} />}
            className="send-btn"
          >
            Submit answer
          </Button>
        </div>
      </div>
    </div>
  );
};
