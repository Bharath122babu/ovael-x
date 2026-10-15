import { useEffect, useState } from "react";
import {
  Check,
  Download,
  KeyRound,
  LoaderCircle,
  PauseCircle,
  ShieldCheck,
  Trash2,
  Sliders,
  User,
  Eye,
  Database,
  Plug,
  Activity,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  RefreshCw,
} from "lucide-react";
import { MIN_PASSWORD_LENGTH } from "../../../auth";
import { useTeaching } from "../../../context/TeachingContext";
import { ovaelApi } from "../../../api/client";
import { useOvael } from "../../../context/OvaelContext";
import { ConnectionsScreen } from "./ConnectionsScreen";
import { api } from "../../../api";

import type { LucideIcon } from "lucide-react";

type SettingsTab =
  | "personalization"
  | "profile"
  | "security"
  | "accessibility"
  | "data"
  | "integrations"
  | "services";

const TAB_CONFIG: Record<
  SettingsTab,
  { label: string; icon: LucideIcon }
> = {
  personalization: { label: "Personalization", icon: Sliders },
  profile: { label: "Profile", icon: User },
  security: { label: "Security & Sessions", icon: ShieldCheck },
  accessibility: { label: "Accessibility & Display", icon: Eye },
  data: { label: "Sharing & Data", icon: Database },
  integrations: { label: "MCP Connections", icon: Plug },
  services: { label: "System Health", icon: Activity },
};

export function SettingsScreen() {
  const {
    user,
    health,
    profile,
    map,
    sessions,
    courses,
    memory,
    localState,
    refresh,
    setError,
    clearLocalState,
  } = useOvael();
  const teaching = useTeaching();

  const [tab, setTab] = useState<SettingsTab>("personalization");
  const [reduceMotion, setReduceMotion] = useState(() =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("reduce-motion")
  );
  const [busy, setBusy] = useState(false);
  const [authSessions, setAuthSessions] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [notice, setNotice] = useState("");

  const prefs = profile?.preferences?.study as
    | { format?: string; pace?: string; plain_language?: boolean }
    | undefined;

  const [studyFormat, setStudyFormat] = useState(prefs?.format || "mixed");
  const [studyPace, setStudyPace] = useState(prefs?.pace || "standard");
  const [plainLanguage, setPlainLanguage] = useState(
    prefs?.plain_language !== false
  );

  async function saveStudy() {
    setBusy(true);
    setError("");
    try {
      await api("/v1/profile/study-preferences", "PATCH", {
        format: studyFormat,
        pace: studyPace,
        plain_language: plainLanguage,
      });
      await refresh();
      setNotice(
        "Your pedagogical explanation preferences have been saved."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save preferences.");
    } finally {
      setBusy(false);
    }
  }

  const personalization = memory?.personalization_enabled !== false;
  const learnerCourses = courses.filter(
    (course) => course.course_kind === "class" && course.membership !== "owner"
  );

  useEffect(() => {
    if (tab === "security") {
      void ovaelApi
        .authSessions()
        .then(setAuthSessions)
        .catch((e) => setError(e.message));
    }
  }, [tab, setError]);

  const toggle = async (enabled: boolean) => {
    setBusy(true);
    try {
      await ovaelApi.setPersonalization(enabled);
      await refresh();
      setNotice(
        enabled
          ? "Learning memory and personalization enabled."
          : "Personalization paused. New evidence will not update your memory model."
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Setting could not be changed"
      );
    } finally {
      setBusy(false);
    }
  };

  const exportState = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      user: { user_id: user?.user_id, username: user?.username, profile },
      learning_map: map,
      session_summaries: sessions,
      local_state_deltas: localState,
    };
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      })
    );
    link.download = "ovael-learner-state.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const remove = async () => {
    if (
      !window.confirm(
        "Delete all server-side learning memory for this account? Local state in this tab will also be cleared. This action cannot be undone."
      )
    )
      return;
    setBusy(true);
    try {
      await ovaelApi.deleteMemory(true);
      clearLocalState();
      teaching.clearAfterDeletion();
      await refresh();
      setNotice("All learner memory and diagnostic evidence has been deleted.");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Memory could not be deleted"
      );
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    if (!currentPassword || newPassword.length < MIN_PASSWORD_LENGTH) return;
    setBusy(true);
    setNotice("");
    try {
      await ovaelApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setNotice(
        "Password changed successfully. Other active sessions were invalidated."
      );
      setAuthSessions(await ovaelApi.authSessions());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Password could not be changed"
      );
    } finally {
      setBusy(false);
    }
  };

  const rotateRecovery = async () => {
    if (!currentPassword) return;
    setBusy(true);
    try {
      const result = await ovaelApi.rotateRecoveryKey(currentPassword);
      setRecoveryKey(result.recovery_key);
      setNotice("New account recovery key generated.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Recovery key could not be rotated"
      );
    } finally {
      setBusy(false);
    }
  };

  const revokeSession = async (id: string) => {
    try {
      await ovaelApi.revokeAuthSession(id);
      setAuthSessions(await ovaelApi.authSessions());
      setNotice("Signed-in session revoked.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Session revocation failed.");
    }
  };

  const share = async (courseId: string, enabled: boolean) => {
    setBusy(true);
    try {
      await ovaelApi.shareProgress(courseId, {
        graph_version: new Date().toISOString(),
        concept_states: map.nodes
          .filter(
            (node) =>
              node.subject_id ===
              courses.find((c) => c.course_id === courseId)?.subject_id
          )
          .map((node) => ({ concept_id: node.id, status: node.status })),
        gap_summary: map.nodes
          .filter(
            (node) =>
              node.subject_id ===
              courses.find((c) => c.course_id === courseId)?.subject_id
          )
          .filter(
            (node) =>
              node.status === "active_blocker" ||
              node.status === "needs_review"
          )
          .map((node) => ({ concept_id: node.id, state: node.status })),
        shared_with_teacher: enabled,
      });
      setNotice(
        enabled
          ? "A privacy-minimized progress snapshot was shared with the class instructor."
          : "Instructor progress sharing was stopped."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Sharing preference could not be changed"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page settings-page">
      {/* Header */}
      <header className="page-heading settings-header">
        <div>
          <p className="eyebrow blue">Platform Configuration</p>
          <h1>Settings & Preferences</h1>
          <p className="page-lead">
            Manage your AI tutor personalization, display settings, credentials, and data privacy boundaries.
          </p>
        </div>
      </header>

      {/* Global Status Banner */}
      {notice && (
        <aside className="chat-notice-card" role="status">
          <CheckCircle2 size={18} className="notice-icon" />
          <p>{notice}</p>
          <button
            type="button"
            className="icon-button close-notice-btn"
            onClick={() => setNotice("")}
            aria-label="Dismiss notice"
          >
            <X size={15} />
          </button>
        </aside>
      )}

      {/* Settings Grid Layout */}
      <div className="settings-split-layout">
        {/* Navigation Sidebar */}
        <nav className="settings-sidebar-nav" aria-label="Settings categories">
          {(
            [
              "personalization",
              "profile",
              "security",
              "accessibility",
              "data",
              "integrations",
              "services",
            ] as SettingsTab[]
          ).map((item) => {
            const cfg = TAB_CONFIG[item];
            const IconComponent = cfg.icon;
            const isActive = tab === item;

            return (
              <button
                key={item}
                type="button"
                className={`settings-nav-pill ${isActive ? "active" : ""}`}
                onClick={() => {
                  setTab(item);
                  setNotice("");
                }}
              >
                <IconComponent size={16} />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Content Pane */}
        <section className="settings-content-card">
          {/* TAB: Personalization */}
          {tab === "personalization" && (
            <div className="settings-section-panel">
              <div className="section-title-box">
                <span className="eyebrow coral">Adaptive Learning Engine</span>
                <h2>Study & Pedagogical Preferences</h2>
                <p>Configure how the AI tutor paces questions, generates worked examples, and balances visual diagrams.</p>
              </div>

              <div className="settings-form-grid">
                <label className="settings-field-label">
                  Explanation Format
                  <select
                    value={studyFormat}
                    onChange={(e) => setStudyFormat(e.target.value)}
                    className="settings-select"
                    disabled={busy}
                  >
                    <option value="mixed">Mixed (Visual diagrams with concise text)</option>
                    <option value="visual">Visual Emphasis (Flowcharts, code blocks, and diagrams first)</option>
                    <option value="text">Editorial Text (In-depth text explanations with KaTeX math)</option>
                  </select>
                  <small className="field-hint">Determines the visual rendering density of Socratic replies.</small>
                </label>

                <label className="settings-field-label">
                  Instructional Pace
                  <select
                    value={studyPace}
                    onChange={(e) => setStudyPace(e.target.value)}
                    className="settings-select"
                    disabled={busy}
                  >
                    <option value="standard">Standard (Balanced concept depth per turn)</option>
                    <option value="small_steps">Micro-Steps (One atomic prerequisite check at a time)</option>
                  </select>
                  <small className="field-hint">Controls the chunk size of new material before assessment checks.</small>
                </label>

                <label className="checkbox-toggle-card">
                  <input
                    type="checkbox"
                    checked={plainLanguage}
                    onChange={(e) => setPlainLanguage(e.target.checked)}
                    disabled={busy}
                  />
                  <div>
                    <strong>Plain-Language Explanations</strong>
                    <small>Prefers accessible analogies and direct language before introducing technical jargon.</small>
                  </div>
                </label>
              </div>

              <div className="settings-action-row">
                <button
                  type="button"
                  className="primary-button"
                  disabled={busy}
                  onClick={() => void saveStudy()}
                >
                  {busy ? <RefreshCw size={15} className="spin-icon" /> : <Check size={15} />}
                  <span>Save Explanation Preferences</span>
                </button>
              </div>

              <hr className="settings-divider" />

              {/* Memory Model Controls */}
              <div className="memory-toggle-card">
                <div className="memory-info">
                  <strong>Adaptive Knowledge Memory</strong>
                  <p>
                    When enabled, your assessment results update concept mastery beliefs and identify causal misconceptions.
                  </p>
                </div>
                <div className="memory-toggle-actions">
                  <button
                    type="button"
                    className={`secondary-button ${!personalization ? "active-paused" : ""}`}
                    disabled={busy}
                    onClick={() => void toggle(!personalization)}
                  >
                    <PauseCircle size={15} />
                    <span>{personalization ? "Pause Memory Updates" : "Resume Memory Updates"}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Profile */}
          {tab === "profile" && (
            <div className="settings-section-panel">
              <div className="section-title-box">
                <span className="eyebrow blue">Learner Identity</span>
                <h2>Account Profile</h2>
                <p>Identity metadata used for institutional course enrollment and certification.</p>
              </div>

              <dl className="profile-details-grid">
                <div className="profile-item-box">
                  <dt>Account Username</dt>
                  <dd>{user?.username || "Authenticated User"}</dd>
                </div>
                <div className="profile-item-box">
                  <dt>Platform Role</dt>
                  <dd className="role-tag">{user?.role || "Learner"}</dd>
                </div>
                <div className="profile-item-box">
                  <dt>Educational Institution</dt>
                  <dd>{String(profile?.institution || "Not specified")}</dd>
                </div>
                <div className="profile-item-box">
                  <dt>Profile Data Mode</dt>
                  <dd>
                    {profile?.synthetic
                      ? "Synthetic demonstration data"
                      : "Verified production account"}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* TAB: Security & Sessions */}
          {tab === "security" && (
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
                      onChange={(e) => setCurrentPassword(e.target.value)}
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
                      onChange={(e) => setNewPassword(e.target.value)}
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
                    onClick={() => void changePassword()}
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
                    onClick={() => void rotateRecovery()}
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
                            onClick={() => void revokeSession(String(item.session_id))}
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
          )}

          {/* TAB: Accessibility & Display */}
          {tab === "accessibility" && (
            <div className="settings-section-panel">
              <div className="section-title-box">
                <span className="eyebrow blue">User Experience</span>
                <h2>Display & Accessibility</h2>
                <p>Tailor motion animations, visual contrast, and keyboard navigation.</p>
              </div>

              <div className="settings-toggle-list">
                <div className="toggle-row-card">
                  <div>
                    <strong>Reduce Motion</strong>
                    <p>Minimize non-essential UI transitions, card entrances, and background graph animations.</p>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={reduceMotion}
                      onChange={(e) => {
                        setReduceMotion(e.target.checked);
                        if (typeof document !== "undefined") {
                          document.documentElement.classList.toggle(
                            "reduce-motion",
                            e.target.checked
                          );
                        }
                      }}
                    />
                    <span className="slider" />
                  </label>
                </div>

                <div className="toggle-row-card">
                  <div>
                    <strong>Full Keyboard Navigation</strong>
                    <p>Chat responses, options selection (A–D, True/False), and graph inspector shortcuts are accessible via standard Tab and Enter keys.</p>
                  </div>
                  <span className="badge-pill is-active">Active</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Sharing & Data */}
          {tab === "data" && (
            <div className="settings-section-panel">
              <div className="section-title-box">
                <span className="eyebrow coral">Data Ownership</span>
                <h2>Sharing & Data Export</h2>
                <p>Control what evidence is shared with class instructors and export your complete learning trajectory.</p>
              </div>

              {/* Class Sharing */}
              <div className="sharing-controls-box">
                <h3 className="subheading-title">Class Instructor Visibility</h3>
                {learnerCourses.length > 0 ? (
                  <div className="sharing-courses-list">
                    {learnerCourses.map((course) => (
                      <div key={course.course_id} className="sharing-course-item">
                        <div>
                          <strong>{course.name}</strong>
                          <p>Only verified concept states and high-level gap counts are shared—never individual responses or transcripts.</p>
                        </div>
                        <div className="sharing-actions">
                          <button
                            type="button"
                            className="secondary-button compact"
                            disabled={busy}
                            onClick={() => void share(course.course_id, true)}
                          >
                            Share Snapshot
                          </button>
                          <button
                            type="button"
                            className="quiet-button compact"
                            disabled={busy}
                            onClick={() => void share(course.course_id, false)}
                          >
                            Stop Sharing
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-sharing-note">No class courses are currently requesting progress snapshots.</p>
                )}
              </div>

              <div className="export-data-row">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={exportState}
                >
                  <Download size={15} />
                  <span>Export Complete Learner State (JSON)</span>
                </button>
              </div>

              {/* Danger Zone */}
              <div className="danger-zone-card">
                <div className="danger-zone-info">
                  <Trash2 size={20} className="danger-icon" />
                  <div>
                    <strong>Delete Learner Memory</strong>
                    <p>
                      Permanently wipe server-side concept graphs, evidence signals, session logs, and local state deltas. This cannot be undone.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="danger-button"
                  disabled={busy || teaching.busy}
                  onClick={() => void remove()}
                >
                  Delete Memory
                </button>
              </div>

              <p className="privacy-footnote">
                <ShieldCheck size={14} />
                <span>External clients and MCP integrations access context only through active, scoped tokens.</span>
              </p>
            </div>
          )}

          {/* TAB: Integrations (MCP Connections) */}
          {tab === "integrations" && <ConnectionsScreen />}

          {/* TAB: Services / System Health */}
          {tab === "services" && (
            <div className="settings-section-panel">
              <div className="section-title-box">
                <span className="eyebrow blue">Infrastructure</span>
                <h2>Backend Service Status</h2>
                <p>Verifies real-time readiness of multimodal AI pipelines, OCR engines, and speech models.</p>
              </div>

              <div className="services-health-grid">
                {[
                  { label: "Socratic Chat & Inference", enabled: health?.teaching_configured },
                  { label: "Image OCR Handwriting Engine", enabled: health?.ocr_configured },
                  { label: "Speech Transcription (STT)", enabled: health?.stt_configured },
                  { label: "Media & Video Transcoding", enabled: health?.media_configured },
                  { label: "Adaptive MCP Protocol", enabled: Boolean(health?.mcp) },
                  { label: "Graph Database Engine", enabled: Boolean(health?.database) },
                ].map((item) => (
                  <div key={item.label} className="service-health-card">
                    <span className="service-name">{item.label}</span>
                    <span
                      className={`health-badge ${item.enabled ? "is-online" : "is-offline"}`}
                    >
                      {item.enabled ? (
                        <>
                          <CheckCircle2 size={12} /> Configured & Online
                        </>
                      ) : (
                        <>
                          <AlertCircle size={12} /> Requires Setup
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>

              <details className="backend-setup-details">
                <summary>Backend Configuration Reference</summary>
                <div className="setup-help-content">
                  <p>
                    Set <code>OPENROUTER_API_KEY</code> and <code>OPENROUTER_MODEL</code> in your backend environment to enable live LLM reasoning. For multimodal OCR, configure <code>OPENROUTER_VISION_MODEL</code>.
                  </p>
                  <p>
                    Audio transcription requires FFmpeg and Whisper STT. External MCP tools require <code>ADAPTIVE_MCP_ALLOWED_HOSTS</code>.
                  </p>
                </div>
              </details>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
