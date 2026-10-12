import React from 'react';
import { User, FileText, HelpCircle, Send } from 'lucide-react';

export interface LearnerTurnProps {
  username: string;
  text: string;
  fileName?: string;
  intent?: 'answer' | 'need_explanation' | 'example' | string;
}

export const LearnerTurn: React.FC<LearnerTurnProps> = ({
  username,
  text,
  fileName,
  intent = 'answer',
}) => {
  const initial = username ? username.charAt(0).toUpperCase() : 'U';

  const intentLabel =
    intent === 'need_explanation'
      ? 'Requested Explanation'
      : intent === 'example'
      ? 'Requested Example'
      : intent === 'practice'
      ? 'Requested Practice'
      : null;

  return (
    <article className="learner-turn" aria-label={`Learner response by ${username}`}>
      <div className="learner-turn__inner">
        <div className="learner-turn__head">
          <div className="learner-turn__meta">
            <span className="learner-turn__author">You</span>
            {intentLabel && (
              <span className="learner-turn__intent-tag">
                <HelpCircle size={12} aria-hidden="true" />
                {intentLabel}
              </span>
            )}
          </div>
          <div className="learner-turn__avatar" aria-hidden="true">
            {initial}
          </div>
        </div>

        <div className="learner-turn__bubble">
          <p className="learner-turn__text">{text}</p>

          {fileName && (
            <div className="learner-turn__file">
              <FileText size={13} aria-hidden="true" />
              <span>{fileName}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
