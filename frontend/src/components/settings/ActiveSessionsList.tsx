import React, { useState } from 'react';
import { Laptop, Smartphone, Globe, Shield, Trash2, LogOut } from 'lucide-react';
import { Card, Button, Badge } from '../ui';
import { AuthSessionItem } from './types';

export interface ActiveSessionsListProps {
  sessions: AuthSessionItem[];
  loading: boolean;
  onRevokeSession: (sessionId: string) => Promise<void>;
  onRevokeAllOther: () => Promise<void>;
}

export const ActiveSessionsList: React.FC<ActiveSessionsListProps> = ({
  sessions,
  loading,
  onRevokeSession,
  onRevokeAllOther,
}) => {
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [busyRevokeAll, setBusyRevokeAll] = useState(false);

  const handleRevoke = async (id: string) => {
    setBusySessionId(id);
    try {
      await onRevokeSession(id);
    } finally {
      setBusySessionId(null);
    }
  };

  const handleRevokeAll = async () => {
    setBusyRevokeAll(true);
    try {
      await onRevokeAllOther();
    } finally {
      setBusyRevokeAll(false);
    }
  };

  const otherSessionsCount = sessions.filter((s) => !s.is_current).length;

  return (
    <Card className="settings-card active-sessions-card">
      <div className="active-sessions-card__header">
        <div>
          <h4 className="active-sessions-card__title">Active Login Sessions</h4>
          <p className="active-sessions-card__desc">
            Manage authorized devices and active browser sessions authenticated to your
            account.
          </p>
        </div>
        {otherSessionsCount > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRevokeAll}
            loading={busyRevokeAll}
            leftIcon={<LogOut size={14} />}
          >
            Log Out Other Sessions ({otherSessionsCount})
          </Button>
        )}
      </div>

      <div className="active-sessions-list" role="list">
        {sessions.map((sess) => {
          const isMobile =
            sess.user_agent.toLowerCase().includes('mobile') ||
            sess.user_agent.toLowerCase().includes('android') ||
            sess.user_agent.toLowerCase().includes('iphone');

          const createdDate = sess.created_at
            ? new Date(sess.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Unknown';

          return (
            <div
              key={sess.session_id}
              className={`session-item ${sess.is_current ? 'session-item--current' : ''}`}
              role="listitem"
            >
              <div className="session-item__icon" aria-hidden="true">
                {isMobile ? <Smartphone size={18} /> : <Laptop size={18} />}
              </div>

              <div className="session-item__details">
                <div className="session-item__title-line">
                  <span className="session-item__agent" title={sess.user_agent}>
                    {sess.user_agent.length > 50
                      ? sess.user_agent.slice(0, 50) + '...'
                      : sess.user_agent}
                  </span>
                  {sess.is_current && (
                    <Badge variant="success" size="sm">
                      Current Session
                    </Badge>
                  )}
                </div>
                <div className="session-item__meta">
                  <span>IP: {sess.ip_address || '127.0.0.1'}</span>
                  <span className="meta-sep">·</span>
                  <span>Signed in {createdDate}</span>
                </div>
              </div>

              {!sess.is_current && (
                <div className="session-item__action">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(sess.session_id)}
                    loading={busySessionId === sess.session_id}
                    disabled={loading || Boolean(busySessionId)}
                    leftIcon={<Trash2 size={14} />}
                  >
                    Revoke
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
};
