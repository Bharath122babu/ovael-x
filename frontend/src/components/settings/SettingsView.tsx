import React, { useEffect, useState, useCallback } from 'react';
import {
  ShieldCheck,
  LogOut,
  BrainCircuit,
  Laptop,
  AlertTriangle,
  Info,
  Server,
  Cpu,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../layout';
import { Button, Alert, Card, Spinner } from '../ui';
import { AccountProfileCard } from './AccountProfileCard';
import { PersonalizationToggle } from './PersonalizationToggle';
import { ActiveSessionsList } from './ActiveSessionsList';
import { PrivacyNoticeCard } from './PrivacyNoticeCard';
import { ChangePasswordModal } from './ChangePasswordModal';
import { RotateRecoveryKeyModal } from './RotateRecoveryKeyModal';
import { DeleteAccountModal } from './DeleteAccountModal';
import { ClearMemoryModal } from './ClearMemoryModal';
import {
  UserProfile,
  AuthSessionItem,
  SystemHealth,
} from './types';
import { api } from '../../api';

export interface SettingsViewProps {
  user: {
    user_id: string;
    username: string;
    role: string;
  };
  onLogout: () => void;
  onNotice?: (msg: string) => void;
  initialProfile?: UserProfile;
  initialSessions?: AuthSessionItem[];
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onLogout,
  onNotice,
  initialProfile,
  initialSessions,
}) => {
  // Account profile state
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || null);
  const [profileLoading, setProfileLoading] = useState(!initialProfile);

  // Memory personalization state
  const [personalizationEnabled, setPersonalizationEnabled] = useState(true);
  const [memoryLoading, setMemoryLoading] = useState(false);

  // Active sessions state
  const [sessions, setSessions] = useState<AuthSessionItem[]>(initialSessions || []);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // System environment
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);

  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showClearMemoryModal, setShowClearMemoryModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  // Local feedback
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // Load profile
  const loadProfile = useCallback(async () => {
    try {
      setProfileLoading(true);
      const res = await api('/v1/profile');
      setProfile(res);
    } catch (err: any) {
      console.error('Failed to load profile:', err);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Load memory settings
  const loadMemorySettings = useCallback(async () => {
    try {
      const res = await api('/v1/memory/settings');
      if (res && typeof res.personalization_enabled === 'boolean') {
        setPersonalizationEnabled(res.personalization_enabled);
      }
    } catch (err) {
      console.error('Failed to load memory settings:', err);
    }
  }, []);

  // Load active sessions
  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      const res = await api('/v1/auth/sessions');
      if (Array.isArray(res)) {
        setSessions(res);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  // Load system health
  const loadHealth = useCallback(async () => {
    try {
      const res = await api('/v1/health');
      setSystemHealth(res);
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    loadProfile();
    loadMemorySettings();
    loadSessions();
    loadHealth();
  }, [loadProfile, loadMemorySettings, loadSessions, loadHealth]);

  // Handlers
  const handleTogglePersonalization = async (newVal: boolean) => {
    setMemoryLoading(true);
    setError('');
    try {
      await api('/v1/memory/personalization', 'POST', { enabled: newVal });
      setPersonalizationEnabled(newVal);
      setNotice(
        newVal
          ? 'Adaptive memory personalization enabled.'
          : 'Personalization disabled. Active context relays cleared.'
      );
    } catch (err: any) {
      setError(err?.message || 'Failed to update personalization setting.');
    } finally {
      setMemoryLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setError('');
    try {
      await api(`/v1/auth/sessions/${encodeURIComponent(sessionId)}`, 'DELETE');
      setNotice('Session revoked successfully.');
      await loadSessions();
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke session.');
    }
  };

  const handleRevokeAllOther = async () => {
    setError('');
    try {
      const res = await api('/v1/auth/logout-all', 'POST');
      setNotice(`Revoked ${res.revoked_sessions} other active session(s).`);
      await loadSessions();
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke other sessions.');
    }
  };

  return (
    <div className="settings-page">
      {/* 1. Header */}
      <PageHeader
        eyebrow="WORKSPACE PREFERENCES"
        title="Settings &amp; Account"
        description="Manage your profile identity, security credentials, active sessions, and adaptive memory."
        actions={
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onLogout}
            leftIcon={<LogOut size={15} />}
          >
            Sign Out
          </Button>
        }
      />

      {/* Notifications */}
      {notice && (
        <Alert variant="success" onDismiss={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      {error && (
        <Alert variant="error" onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Loading state */}
      {profileLoading && !profile ? (
        <div className="settings-page__loading">
          <Spinner size="lg" />
          <p>Loading account preferences and security state...</p>
        </div>
      ) : (
        <div className="settings-page__content">
          {/* 2. Account Profile Section */}
          <section
            className="settings-section"
            aria-labelledby="account-settings-title"
          >
            <h3 id="account-settings-title" className="settings-section__heading">
              Account Identity
            </h3>
            <AccountProfileCard
              profile={
                profile || {
                  user_id: user.user_id,
                  username: user.username,
                  role: user.role,
                  display_name: user.username,
                  institution: null,
                  preferences: {},
                  synthetic: false,
                  updated_at: null,
                }
              }
              onChangePassword={() => setShowPasswordModal(true)}
              onRotateRecoveryKey={() => setShowRecoveryModal(true)}
            />
          </section>

          {/* 3. Adaptive Memory Section */}
          <section
            className="settings-section"
            aria-labelledby="memory-settings-title"
          >
            <h3 id="memory-settings-title" className="settings-section__heading">
              Learning Memory &amp; Sovereignty
            </h3>
            <PersonalizationToggle
              enabled={personalizationEnabled}
              loading={memoryLoading}
              onToggle={handleTogglePersonalization}
            />
          </section>

          {/* 4. Active Sessions Section */}
          <section
            className="settings-section"
            aria-labelledby="sessions-settings-title"
          >
            <h3 id="sessions-settings-title" className="settings-section__heading">
              Security &amp; Device Access
            </h3>
            <ActiveSessionsList
              sessions={sessions}
              loading={sessionsLoading}
              onRevokeSession={handleRevokeSession}
              onRevokeAllOther={handleRevokeAllOther}
            />
          </section>

          {/* 5. Privacy & Architecture Disclosures */}
          <section
            className="settings-section"
            aria-labelledby="privacy-settings-title"
          >
            <h3 id="privacy-settings-title" className="settings-section__heading">
              Privacy &amp; Data Transparency
            </h3>
            <PrivacyNoticeCard />
          </section>

          {/* 6. Danger Zone */}
          <section
            className="settings-section settings-section--danger"
            aria-labelledby="danger-settings-title"
          >
            <h3 id="danger-settings-title" className="settings-section__heading text-danger">
              Danger Zone
            </h3>
            <Card className="settings-card danger-zone-card">
              <div className="danger-zone-item">
                <div className="danger-zone-item__info">
                  <h4>Clear Adaptive Memory Graph</h4>
                  <p>
                    Reset all historical turn recalls and prerequisite graph weights.
                    Courses and documents remain untouched.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowClearMemoryModal(true)}
                >
                  Clear Memory
                </Button>
              </div>

              <div className="danger-zone-sep" />

              <div className="danger-zone-item">
                <div className="danger-zone-item__info">
                  <h4>Delete Learner Account</h4>
                  <p>
                    Permanently delete your account credentials, uploaded materials,
                    and learning records.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => setShowDeleteAccountModal(true)}
                  leftIcon={<Trash2 size={14} />}
                >
                  Delete Account
                </Button>
              </div>
            </Card>
          </section>

          {/* 7. System & Environment */}
          <section
            className="settings-section"
            aria-labelledby="system-about-title"
          >
            <h3 id="system-about-title" className="settings-section__heading">
              About OVAEL-X
            </h3>
            <Card className="settings-card about-system-card">
              <div className="about-system-grid">
                <div className="about-system-item">
                  <span className="label">Product:</span>
                  <span className="val">{systemHealth?.product || 'OVAEL-X'} v{systemHealth?.version || '5.0.0'}</span>
                </div>
                <div className="about-system-item">
                  <span className="label">Decision Engine:</span>
                  <span className="val">{systemHealth?.decision_runtime || 'DecisionKernel'}</span>
                </div>
                <div className="about-system-item">
                  <span className="label">AI Policy:</span>
                  <span className="val">{systemHealth?.ai_policy || 'Bounded Coprocessor'}</span>
                </div>
                <div className="about-system-item">
                  <span className="label">Database:</span>
                  <span className="val">{systemHealth?.database || 'SQLite Local'}</span>
                </div>
              </div>
            </Card>
          </section>
        </div>
      )}

      {/* Modals */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => setNotice('Password successfully updated.')}
      />

      <RotateRecoveryKeyModal
        isOpen={showRecoveryModal}
        onClose={() => setShowRecoveryModal(false)}
      />

      <ClearMemoryModal
        isOpen={showClearMemoryModal}
        onClose={() => setShowClearMemoryModal(false)}
        onCleared={() => setNotice('Adaptive memory graph cleared successfully.')}
      />

      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        onDeleted={onLogout}
      />
    </div>
  );
};
