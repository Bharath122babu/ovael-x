import React from 'react';
import { Mic, MicOff } from 'lucide-react';

export interface SpeechInputButtonProps {
  isListening: boolean;
  onToggleListening: () => void;
  disabled?: boolean;
  className?: string;
}

export const SpeechInputButton: React.FC<SpeechInputButtonProps> = ({
  isListening,
  onToggleListening,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      className={`mode-btn speech-btn ${isListening ? 'speech-btn--listening active' : ''} ${className}`}
      onClick={onToggleListening}
      disabled={disabled}
      aria-label={
        isListening
          ? 'Listening... Click to stop speech recognition'
          : 'Speak answer using browser speech recognition'
      }
      aria-pressed={isListening}
      title={
        isListening
          ? 'Listening... Click to stop recording'
          : 'Speak answer'
      }
    >
      <Mic size={18} aria-hidden="true" />
      {isListening && (
        <span className="speech-pulse-indicator" aria-hidden="true" />
      )}
    </button>
  );
};
