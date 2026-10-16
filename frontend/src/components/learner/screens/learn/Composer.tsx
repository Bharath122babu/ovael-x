import { useState, useRef, useEffect } from "react";
import {
  ArrowRight,
  Check,
  Lightbulb,
  Mic,
  Paperclip,
  PenLine,
  Plus,
  RefreshCw,
  ScanText,
  Send,
  Sparkles,
} from "lucide-react";
import { VoiceInput } from "../../../content/VoiceInput";
import type { TeachingMove, TeachingSession, LearnerScreen } from "../../../../types";
import type { SocraticAction } from "./types";

export interface ComposerProps {
  session: TeachingSession | null;
  move?: TeachingMove;
  answer: string;
  goal: string;
  intent: "answer" | "ask_question";
  disabled: boolean;
  busy: boolean;
  uploadNotice: string;
  speechDraft: string | null;
  transcript: { text: string; confidence?: number; image_url?: string } | null;
  approved: boolean;
  illustrations: boolean;
  questionReady: boolean;
  onAnswerChange: (val: string) => void;
  onGoalChange: (val: string) => void;
  onIntentChange: (intent: "answer" | "ask_question") => void;
  onSetSpeechDraft: (draft: string | null) => void;
  onApproveSpeech: () => void;
  onSetTranscriptText: (text: string) => void;
  onSetApproved: (approved: boolean) => void;
  onSendSocratic: (action: SocraticAction) => void;
  onToggleIllustrations: () => void;
  onSubmit: () => void;
  onOpenDraw: () => void;
  onExtractImage: (file: File) => void;
  onTranscribeAudio: (file: File) => Promise<void>;
  onUploadMaterials: (files: File[]) => void;
  onNavigate?: (screen: LearnerScreen) => void;
  onError: (msg: string) => void;
}

export function Composer({
  session,
  move,
  answer,
  goal,
  intent,
  disabled,
  busy,
  uploadNotice,
  speechDraft,
  transcript,
  approved,
  illustrations,
  questionReady,
  onAnswerChange,
  onGoalChange,
  onIntentChange,
  onSetSpeechDraft,
  onApproveSpeech,
  onSetTranscriptText,
  onSetApproved,
  onSendSocratic,
  onToggleIllustrations,
  onSubmit,
  onOpenDraw,
  onExtractImage,
  onTranscribeAudio,
  onUploadMaterials,
  onNavigate,
  onError,
}: ComposerProps) {
  const [attachments, setAttachments] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const audio = useRef<HTMLInputElement>(null);
  const materialInput = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);

  // Auto-expanding composer textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const nextHeight = Math.min(Math.max(el.scrollHeight, 44), 180);
    el.style.height = `${nextHeight}px`;
  }, [answer, goal]);

  return (
    <div className="chat-input-area">
      {/* Material Upload Status Notice */}
      {uploadNotice && (
        <div className="chat-upload-notice" role="status">
          <span>{uploadNotice}</span>
          <button
            type="button"
            className="text-button"
            onClick={() => onNavigate?.("materials")}
          >
            <span>View in Materials</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Speech Recording Review Draft */}
      {speechDraft !== null && (
        <section className="chat-review-card" aria-label="Review voice recording">
          <header className="review-header">
            <Mic size={16} />
            <strong>Review Your Spoken Answer</strong>
          </header>
          <textarea
            className="review-textarea"
            value={speechDraft}
            onChange={(e) => onSetSpeechDraft(e.target.value)}
            disabled={disabled}
            rows={3}
          />
          <footer className="review-footer">
            <button
              type="button"
              className="secondary-button compact"
              onClick={() => onSetSpeechDraft(null)}
            >
              Discard
            </button>
            <button
              type="button"
              className="primary-button compact"
              disabled={disabled || !speechDraft.trim()}
              onClick={onApproveSpeech}
            >
              <Check size={14} />
              <span>Use this text</span>
            </button>
          </footer>
        </section>
      )}

      {/* Image OCR Handwriting / Text Review */}
      {transcript && (
        <section className="chat-review-card" aria-label="Review extracted text">
          <header className="review-header">
            <ScanText size={16} />
            <strong>Review Extracted Handwriting / Text</strong>
          </header>
          <textarea
            className="review-textarea"
            value={transcript.text}
            disabled={disabled}
            rows={3}
            onChange={(e) => onSetTranscriptText(e.target.value)}
          />
          <footer className="review-footer">
            <label className="checkbox-confirm-label">
              <input
                type="checkbox"
                disabled={disabled}
                checked={approved}
                onChange={(e) => onSetApproved(e.target.checked)}
              />
              <span>This extracted text is correct</span>
            </label>
          </footer>
        </section>
      )}

      {/* Interactive Chat Tools Strip */}
      {session && (
        <div className="chat-tools-bar">
          {/* Mode Switcher */}
          <div className="composer-modes-pill" role="tablist" aria-label="Response Mode">
            <button
              type="button"
              role="tab"
              aria-selected={intent === "ask_question"}
              className={`mode-btn ${intent === "ask_question" ? "active" : ""}`}
              onClick={() => onIntentChange("ask_question")}
            >
              Ask
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={intent === "answer"}
              className={`mode-btn ${intent === "answer" ? "active" : ""}`}
              onClick={() => onIntentChange("answer")}
            >
              Answer
            </button>
          </div>

          {/* Quick Socratic Actions */}
          {move?.content_status !== "unavailable" && (
            <div className="socratic-actions">
              <button
                type="button"
                className="tool-btn"
                disabled={disabled}
                onClick={() => onSendSocratic("example")}
                title="Show a concrete example"
              >
                <Sparkles size={13} />
                <span>Example</span>
              </button>
              <button
                type="button"
                className="tool-btn"
                disabled={disabled}
                onClick={() => onSendSocratic("slow_down")}
                title="Deconstruct the explanation step-by-step"
              >
                <span>Break it down</span>
              </button>
              <button
                type="button"
                className="tool-btn"
                disabled={disabled}
                onClick={() => onSendSocratic("practice")}
                title="Generate a targeted practice question"
              >
                <Lightbulb size={13} />
                <span>Practice</span>
              </button>
            </div>
          )}

          {/* Visual Illustration Panel Toggle */}
          <button
            type="button"
            className="tool-btn illustration-toggle"
            onClick={onToggleIllustrations}
          >
            <span>{illustrations ? "Hide illustration" : "Illustration"}</span>
          </button>
        </div>
      )}

      {/* Main Composer Box */}
      <form
        className="chat-composer-box"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        {/* Boolean True / False Selection */}
        {session && move?.answer_type === "boolean" && intent === "answer" ? (
          <div className="boolean-choice-wrapper" role="radiogroup" aria-label="True or False response">
            <span className="boolean-prompt">Select response:</span>
            <button
              type="button"
              role="radio"
              aria-checked={answer === "true"}
              className={`boolean-choice-btn ${answer === "true" ? "selected" : ""}`}
              disabled={disabled}
              onClick={() => onAnswerChange("true")}
            >
              <span>True</span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={answer === "false"}
              className={`boolean-choice-btn ${answer === "false" ? "selected" : ""}`}
              disabled={disabled}
              onClick={() => onAnswerChange("false")}
            >
              <span>False</span>
            </button>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            aria-label={session ? "Message OVAEL-X" : "Start a learning conversation"}
            rows={1}
            value={session ? answer : goal}
            disabled={disabled}
            onChange={(e) =>
              session ? onAnswerChange(e.target.value) : onGoalChange(e.target.value)
            }
            placeholder={
              intent === "answer" && session
                ? move?.answer_type === "mcq"
                  ? "Choose an option above…"
                  : move?.answer_type === "numeric"
                    ? "Enter a number or decimal (e.g. 42 or 3.14)…"
                    : move?.answer_type === "code"
                      ? "Write your code solution…"
                      : "Write your answer…"
                : session
                  ? "Message OVAEL-X…"
                  : "What would you like to understand about this topic?"
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                onSubmit();
              }
            }}
            className="chat-textarea"
          />
        )}

        {/* Composer Controls Bottom Strip */}
        <div className="composer-bottom-bar">
          {/* Attachment Menu Popover */}
          <div className="attachment-wrap">
            <button
              type="button"
              className="icon-button attachment-trigger-btn"
              aria-label="Add attachment or input method"
              aria-expanded={attachments}
              disabled={disabled}
              onClick={() => setAttachments(!attachments)}
              title="Attach files, OCR, or drawings"
            >
              <Plus size={18} />
            </button>
            {attachments && (
              <div className="attachment-menu-popover" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={() => {
                    setAttachments(false);
                    materialInput.current?.click();
                  }}
                >
                  <Paperclip size={16} />
                  <div>
                    <strong>Upload study materials</strong>
                    <small>PDF, books, notes, audio, video (50 MB)</small>
                  </div>
                </button>
                {session && (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={disabled}
                      onClick={() => {
                        setAttachments(false);
                        file.current?.click();
                      }}
                    >
                      <ScanText size={16} />
                      <div>
                        <strong>Answer from an image</strong>
                        <small>Extract handwritten text / diagrams</small>
                      </div>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={disabled}
                      onClick={() => {
                        setAttachments(false);
                        audio.current?.click();
                      }}
                    >
                      <Mic size={16} />
                      <div>
                        <strong>Upload recorded audio</strong>
                        <small>WAV, MP3, M4A, WebM speech</small>
                      </div>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      disabled={disabled}
                      onClick={() => {
                        setAttachments(false);
                        onOpenDraw();
                      }}
                    >
                      <PenLine size={16} />
                      <div>
                        <strong>Draw an answer</strong>
                        <small>Sketch equations or diagrams</small>
                      </div>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <span className="composer-tip">
            {session ? "Shift + Enter for a new line" : "Select a course and topic above"}
          </span>

          <div className="composer-right-actions">
            {/* Voice Microphone Input */}
            <VoiceInput
              disabled={disabled}
              onAudio={onTranscribeAudio}
              onError={onError}
            />

            {/* Send Button */}
            <button
              type="submit"
              className="chat-send-btn"
              aria-label="Send message"
              disabled={disabled || !questionReady}
              title={
                disabled
                  ? "Processing…"
                  : !questionReady
                    ? "Type an answer or question to continue"
                    : "Send message (Enter)"
              }
            >
              {busy ? (
                <RefreshCw size={17} className="spin-icon" />
              ) : (
                <Send size={17} />
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Hidden File Input Handlers */}
      <input
        ref={materialInput}
        type="file"
        className="sr-only"
        multiple
        aria-label="Upload learning materials"
        accept=".pdf,.epub,.docx,.pptx,.txt,.md,.png,.jpg,.jpeg,.webp,.wav,.mp3,.m4a,.mp4,.webm,.mov"
        onChange={(e) => {
          onUploadMaterials(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <input
        ref={file}
        type="file"
        className="sr-only"
        accept="image/*"
        aria-label="Upload image for OCR"
        onChange={(e) => {
          const img = e.target.files?.[0];
          if (img) onExtractImage(img);
          e.target.value = "";
        }}
      />
      <input
        ref={audio}
        type="file"
        className="sr-only"
        accept=".wav,.mp3,.m4a,.webm"
        aria-label="Upload audio recording"
        onChange={(e) => {
          const recording = e.target.files?.[0];
          if (recording) void onTranscribeAudio(recording);
          e.target.value = "";
        }}
      />
    </div>
  );
}
