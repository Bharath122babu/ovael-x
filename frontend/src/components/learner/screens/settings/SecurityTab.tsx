import { KeyRound, LoaderCircle, Lock, RefreshCw } from "lucide-react";
import { MIN_PASSWORD_LENGTH } from "../../../../auth";

interface SecurityTabProps {
  currentPassword: string;
  onCurrentPasswordChange: (value: string) => void;
  newPassword: string;
  onNewPasswordChange: (value: string) => void;
  busy: boolean;
  onChangePassword: () => Promise<void>;
  onRotateRecovery: () => Promise<void>;
  recoveryKey: string;
  authSessions: Array<Record<string, unknown>>;
  onRevokeSession: (id: string) => Promise<void>;
}

export function SecurityTab({
  currentPassword,
  onCurrentPasswordChange,
  newPassword,
  onNewPasswordChange,
  busy,
  onChangePassword,
  onRotateRecovery,
  recoveryKey,
  authSessions,
  onRevokeSession,
}: SecurityTabProps) {
  return (
    <div className="settings-section-panel">
      <div className="section-title-box">
        <span className="eyebrow coral">Access Control</span>
        <h2>Security & Password</h2>
        <p>Update account password, rotate disaster recovery credentials, and audit active sessions.</p>
      </div>

      <div className="security-form-box">
        <div className="form-fields-grid">
          <label className="settings-field-label">
            Current Password
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => onCurrentPasswordChange(e.target.value)}
              className="settings-input"
              placeholder="Enter current password"
            />
          </label>

          <label className="settings-field-label">
            New Password
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => onNewPasswordChange(e.target.value)}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              className="settings-input"
            />
          </label>
        </div>

        <div className="security-buttons-row">
          <button
            type="button"
            className="primary-button"
            disabled={
              busy ||
              !currentPassword ||
              newPassword.length < MIN_PASSWORD_LENGTH
            }
            onClick={() => void onChangePassword()}
          >
            {busy ? (
              <LoaderCircle className="spin-icon" size={15} />
            ) : (
              <KeyRound size={15} />
            )}
            <span>Update Password</span>
          </button>

          <button
            type="button"
            className="secondary-button"
            disabled={busy || !currentPassword}
            onClick={() => void onRotateRecovery()}
          >
            <RefreshCw size={15} />
            <span>Rotate Recovery Key</span>
          </button>
        </div>
      </div>

      {recoveryKey && (
        <div className="recovery-reveal-card" role="alert">
          <Lock size={18} />
          <div>
            <strong>Store this recovery key securely</strong>
            <p>OVAEL-X only displays this key once. You can use it to regain access if you lose your password.</p>
            <code className="recovery-code-view">{recoveryKey}</code>
          </div>
        </div>
      )}

      <hr className="settings-divider" />

      {/* Active Sessions */}
      <div className="auth-sessions-section">
        <h3 className="subheading-title">Active Signed-in Sessions ({authSessions.length})</h3>
        <div className="sessions-list">
          {authSessions.map((item) => (
            <div key={String(item.session_id)} className="session-item-row">
              <div className="session-item-meta">
                <strong>
                  {item.current ? "Current Browser Session" : "Other Device Session"}
                </strong>
                <small>
                  {String(item.user_agent || "Web Browser")} · expires{" "}
                  {new Date(String(item.expires_at)).toLocaleDateString()}
                </small>
              </div>

              <div className="session-item-action">
                {item.revoked ? (
                  <span className="revoked-pill">Revoked</span>
                ) : item.current ? (
                  <span className="current-session-pill">This Device</span>
                ) : (
                  <button
                    type="button"
                    className="quiet-button revoke-btn"
                    onClick={() => void onRevokeSession(String(item.session_id))}
                  >
                    Revoke Access
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
