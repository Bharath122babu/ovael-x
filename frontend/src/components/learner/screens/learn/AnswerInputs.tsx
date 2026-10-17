import { BookOpen, Check, CheckCircle2, HelpCircle, Sparkles } from "lucide-react";
import type { TeachingMove } from "../../../../types";

export interface AnswerInputsProps {
  evaluation?: {
    status?: string;
    needs_review_reason?: string;
    feedback?: string;
    correct?: boolean | null;
    score?: number | null;
  };
  move?: TeachingMove;
  choice: number | null;
  disabled: boolean;
  onSelectChoice: (index: number) => void;
}

export function AnswerInputs({
  evaluation,
  move,
  choice,
  disabled,
  onSelectChoice,
}: AnswerInputsProps) {
  return (
    <>
      {/* Assessment Evaluation Banner */}
      {evaluation && (
        <div
          className={`chat-feedback-card ${
            evaluation.status === "graded"
              ? evaluation.correct
                ? "is-correct"
                : "needs-review"
              : "is-saved"
          }`}
          role="status"
        >
          <div className="feedback-badge">
            {evaluation.status === "graded" ? (
              evaluation.correct ? (
                <>
                  <CheckCircle2 size={16} className="feedback-icon" />
                  <strong>Verified Correct</strong>
                </>
              ) : (
                <>
                  <HelpCircle size={16} className="feedback-icon" />
                  <strong>Let's Review This Idea</strong>
                </>
              )
            ) : (
              <>
                <Sparkles size={16} className="feedback-icon" />
                <strong>Response Saved</strong>
              </>
            )}
          </div>
          {(evaluation.feedback || evaluation.needs_review_reason) && (
            <p className="feedback-explanation">
              {evaluation.feedback || evaluation.needs_review_reason}
            </p>
          )}
        </div>
      )}

      {/* Assessment Question Options (MCQ) */}
      {(move?.options?.length || 0) > 0 && (
        <fieldset className="chat-options-container">
          <legend className="options-legend">Choose your answer:</legend>
          <div className="options-grid">
            {move?.options?.map((option, index) => {
              const isSelected = choice === index;
              const letter = String.fromCharCode(65 + index);
              return (
                <label
                  key={index}
                  className={`option-card ${isSelected ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="assessment-choice"
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => onSelectChoice(index)}
                  />
                  <span className="option-letter">{letter}</span>
                  <span className="option-text">{option}</span>
                  {isSelected && (
                    <span className="option-check-indicator" aria-hidden="true">
                      <Check size={14} />
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Source Citations Disclosure */}
      {move?.citations?.length ? (
        <details className="chat-sources-disclosure">
          <summary>
            <BookOpen size={14} />
            <span>Verified Sources ({move.citations.length})</span>
          </summary>
          <ul>
            {move.citations.map((citation, index) => (
              <li key={index}>{citation}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}
