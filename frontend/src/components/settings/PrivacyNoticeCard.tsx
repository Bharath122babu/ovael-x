import React from 'react';
import { ShieldCheck, EyeOff, Lock, Server, Cpu, Mic } from 'lucide-react';
import { Card } from '../ui';

export const PrivacyNoticeCard: React.FC = () => {
  return (
    <Card className="settings-card privacy-card">
      <div className="privacy-card__header">
        <div className="privacy-card__icon" aria-hidden="true">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h4 className="privacy-card__title">Privacy, Security &amp; Data Boundaries</h4>
          <p className="privacy-card__desc">
            How your learning data, multimodal inputs, and credentials are handled by OVAEL-X.
          </p>
        </div>
      </div>

      <div className="privacy-card__grid">
        <div className="privacy-pillar">
          <div className="privacy-pillar__head">
            <Lock size={16} aria-hidden="true" />
            <h5>Credential &amp; Session Isolation</h5>
          </div>
          <p>
            Authentication uses encrypted, HTTP-only cookie sessions with CSRF tokens
            and random idempotency keys. Passwords and recovery keys use salted Argon2id hashes.
          </p>
        </div>

        <div className="privacy-pillar">
          <div className="privacy-pillar__head">
            <EyeOff size={16} aria-hidden="true" />
            <h5>Multimodal Ephemeral Processing</h5>
          </div>
          <p>
            Drawing pad canvases and handwriting OCR extracts text for answer evaluation.
            Raw media bytes are request-scoped and never stored in long-term evidence records.
          </p>
        </div>

        <div className="privacy-pillar">
          <div className="privacy-pillar__head">
            <Mic size={16} aria-hidden="true" />
            <h5>Speech Recognition Disclaimers</h5>
          </div>
          <p>
            Voice transcription uses native browser SpeechRecognition APIs. Audio is processed
            according to your operating system and browser vendor policies.
          </p>
        </div>

        <div className="privacy-pillar">
          <div className="privacy-pillar__head">
            <Cpu size={16} aria-hidden="true" />
            <h5>Bounded AI Boundaries</h5>
          </div>
          <p>
            The pedagogical engine is deterministic. Foundation models serve as an escalation
            coprocessor for formatting and semantic review, with zero autonomous grading authority.
          </p>
        </div>
      </div>
    </Card>
  );
};
