import { Plus, RefreshCw } from "lucide-react";

export interface LearnHeaderProps {
  courseName?: string;
  title: string;
  hasSession: boolean;
  disabled: boolean;
  notice?: string;
  pending: boolean;
  busy: boolean;
  onNewChat: () => void;
  onRecover: () => void;
}

export function LearnHeader({
  courseName,
  title,
  hasSession,
  disabled,
  notice,
  pending,
  busy,
  onNewChat,
  onRecover,
}: LearnHeaderProps) {
  return (
    <>
      {/* Workspace Header - rendered during active session */}
      {hasSession && (
        <header className="chat-heading">
          <div className="chat-heading-info">
            <span className="chat-heading-eyebrow">
              {courseName || "Evidence-Grounded Learning"}
            </span>
            <h2 className="chat-heading-title">{title}</h2>
          </div>

          <div className="chat-heading-actions">
            <button
              type="button"
              className="secondary-button compact new-chat-btn"
              disabled={disabled}
              onClick={onNewChat}
              title="Start a new learning session"
            >
              <Plus size={16} />
              <span>New chat</span>
            </button>
          </div>
        </header>
      )}

      {/* Recoverable Notice Banner */}
      {notice && (
        <div className="chat-notice-pill" role="status">
          <span>{notice}</span>
        </div>
      )}

      {/* Pending Unconfirmed Turn Recovery */}
      {pending && (
        <div className="chat-recovery-banner" role="alert">
          <div className="recovery-copy">
            <strong>Unconfirmed Message:</strong>
            <span>Your previous turn needs confirmation to be safely stored in local memory.</span>
          </div>
          <button
            type="button"
            className="secondary-button compact"
            disabled={busy}
            onClick={onRecover}
          >
            <RefreshCw size={14} className={busy ? "spin-icon" : ""} />
            <span>Retry message</span>
          </button>
        </div>
      )}
    </>
  );
}
