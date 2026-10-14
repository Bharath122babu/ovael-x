import { useEffect, useState } from "react";
import {
  Check,
  Download,
  HardDrive,
  KeyRound,
  LoaderCircle,
  PauseCircle,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { MIN_PASSWORD_LENGTH } from "../../../auth";
import { useTeaching } from "../../../context/TeachingContext";
import { ovaelApi } from "../../../api/client";
import { useOvael } from "../../../context/OvaelContext";
import { ConnectionsScreen } from "./ConnectionsScreen";
import { api } from "../../../api";

type SettingsTab =
  | "personalization"
  | "profile"
  | "security"
  | "accessibility"
  | "data"
  | "integrations"
  | "services";
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
    document.documentElement.classList.contains("reduce-motion"),
  );
  const [busy, setBusy] = useState(false);
  const [authSessions, setAuthSessions] = useState<
    Array<Record<string, unknown>>
  >([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [sharedCourses, setSharedCourses] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const prefs = profile?.preferences?.study as
    { format?: string; pace?: string; plain_language?: boolean } | undefined;
  const [studyFormat, setStudyFormat] = useState(prefs?.format || "mixed"),
    [studyPace, setStudyPace] = useState(prefs?.pace || "standard"),
    [plainLanguage, setPlainLanguage] = useState(
      prefs?.plain_language !== false,
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
        "Your explanation preferences are saved for future teaching replies.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save preferences.");
    } finally {
      setBusy(false);
    }
  }
  const personalization = memory?.personalization_enabled !== false;
  const learnerCourses = courses.filter(
    (course) => course.course_kind === "class" && course.membership !== "owner",
  );
  useEffect(() => {
    if (tab === "security")
      void ovaelApi
        .authSessions()
        .then(setAuthSessions)
        .catch((e) => setError(e.message));
  }, [tab]);
  const toggle = async (enabled: boolean) => {
    setBusy(true);
    try {
      await ovaelApi.setPersonalization(enabled);
      await refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Setting could not be changed",
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
      }),
    );
    link.download = "ovael-learner-state.json";
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const remove = async () => {
    if (
      !window.confirm(
        "Delete all server-side learning memory for this account? Local state in this tab will also be cleared.",
      )
    )
      return;
    setBusy(true);
    try {
      await ovaelApi.deleteMemory(true);
      clearLocalState();
      teaching.clearAfterDeletion();
      await refresh();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Memory could not be deleted",
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
        "Password changed. Other sessions were revoked by the backend.",
      );
      setAuthSessions(await ovaelApi.authSessions());
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Password could not be changed",
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
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Recovery key could not be rotated",
      );
    } finally {
      setBusy(false);
    }
  };
  const revokeSession = async (id: string) => {
    try {
      await ovaelApi.revokeAuthSession(id);
      setAuthSessions(await ovaelApi.authSessions());
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
              courses.find((c) => c.course_id === courseId)?.subject_id,
          )
          .map((node) => ({ concept_id: node.id, status: node.status })),
        gap_summary: map.nodes
          .filter(
            (node) =>
              node.subject_id ===
              courses.find((c) => c.course_id === courseId)?.subject_id,
          )
          .filter(
            (node) =>
              node.status === "active_blocker" ||
              node.status === "needs_review",
          )
          .map((node) => ({ concept_id: node.id, state: node.status })),
        shared_with_teacher: enabled,
      });
      setSharedCourses((current) => {
        const next = new Set(current);
        if (enabled) next.add(courseId);
        else next.delete(courseId);
        return next;
      });
      setNotice(
        enabled
          ? "A privacy-minimized progress snapshot was shared."
          : "Teacher sharing was stopped.",
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Sharing preference could not be changed",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page settings-page">
      <header className="page-heading">
        <p className="eyebrow blue">Settings & privacy</p>
        <h1>Settings</h1>
      </header>
      <div className="settings-layout">
        <nav aria-label="Settings sections">
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
          ).map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => {
                setTab(item);
                setNotice("");
              }}
            >
              {item === "data" ? "Sharing & data" : item}
            </button>
          ))}
        </nav>
        <section className="settings-content">
          {notice && (
            <p className="inline-success" role="status">
              <Check size={15} /> {notice}
            </p>
          )}
          {tab === "services" && (
            <div>
              <h2>Learning services</h2>
              <p>
                Live replies and media reading use the services configured on
                your backend.
              </p>
              <ul className="service-list">
                {[
                  ["Chat", health?.teaching_configured],
                  ["Image reading", health?.ocr_configured],
                  ["Speech transcription", health?.stt_configured],
                  ["Audio/video processing", health?.media_configured],
                ].map(([label, enabled]) => (
                  <li key={String(label)}>
                    <strong>{label}</strong>
                    <span>{enabled ? "Configured" : "Needs setup"}</span>
                  </li>
                ))}
              </ul>
              <details>
                <summary>Backend setup</summary>
                <p>
                  For OpenRouter, set OPENROUTER_API_KEY and OPENROUTER_MODEL.
                  For images, also select OPENROUTER_VISION_MODEL. Restart the
                  backend with live models enabled. Audio requires a
                  transcription service and FFmpeg.
                </p>
                <p>
                  External MCP servers must be enabled with
                  ADAPTIVE_MCP_ALLOWED_HOSTS.
                </p>
              </details>
            </div>
          )}
          {tab === "integrations" && <ConnectionsScreen />}
          {tab === "personalization" && (
            <>
              <section className="study-preferences">
                <h2>How would you like explanations?</h2>
                <p>
                  You can change these at any time. Practice evidence guides
                  difficulty; these choices guide presentation.
                </p>
                <label>
                  Explanation format
                  <select
                    value={studyFormat}
                    onChange={(e) => setStudyFormat(e.target.value)}
                  >
                    <option value="mixed">Visuals with short text</option>
                    <option value="visual">More diagrams and examples</option>
                    <option value="text">Text first</option>
                  </select>
                </label>
                <label>
                  Pace
                  <select
                    value={studyPace}
                    onChange={(e) => setStudyPace(e.target.value)}
                  >
                    <option value="standard">Standard</option>
                    <option value="small_steps">
                      One small step at a time
                    </option>
                  </select>
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={plainLanguage}
                    onChange={(e) => setPlainLanguage(e.target.checked)}
                  />{" "}
                  Use plain language
                </label>
                <button
                  className="primary-button"
                  disabled={busy}
                  onClick={() => void saveStudy()}
                >
                  Save learning preferences
                </button>
              </section>
              <div className="setting-title">
                <div>
                  <p className="eyebrow">Personalization</p>
                  <h2>Learning memory</h2>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={personalization}
                    disabled={busy}
                    onChange={(event) => void toggle(event.target.checked)}
                  />
                  <span />
                  <em>{personalization ? "On" : "Paused"}</em>
                </label>
              </div>
              <div className="settings-actions">
                <button
                  className="secondary-button"
                  disabled={busy || !personalization}
                  onClick={() => void toggle(false)}
                >
                  <PauseCircle size={16} /> Pause personalization
                </button>
              </div>
            </>
          )}
          {tab === "profile" && (
            <>
              <div className="setting-title">
                <div>
                  <p className="eyebrow">Profile</p>
                  <h2>
                    {String(
                      profile?.display_name || user?.username || "Learner",
                    )}
                  </h2>
                </div>
              </div>
              <dl className="profile-facts">
                <div>
                  <dt>Account ID</dt>
                  <dd>{user?.username}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{user?.role}</dd>
                </div>
                <div>
                  <dt>Institution</dt>
                  <dd>{String(profile?.institution || "Not set")}</dd>
                </div>
                <div>
                  <dt>Profile source</dt>
                  <dd>
                    {profile?.synthetic
                      ? "Synthetic demonstration data"
                      : "Authenticated learner profile"}
                  </dd>
                </div>
              </dl>
            </>
          )}
          {tab === "security" && (
            <>
              <div className="setting-title">
                <div>
                  <p className="eyebrow">Security</p>
                  <h2>Password and sessions</h2>
                </div>
              </div>
              <div className="security-form">
                <label>
                  Current password
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                  />
                </label>
                <label>
                  New password
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  />
                </label>
                <div>
                  <button
                    className="primary-button"
                    disabled={
                      busy ||
                      !currentPassword ||
                      newPassword.length < MIN_PASSWORD_LENGTH
                    }
                    onClick={() => void changePassword()}
                  >
                    {busy ? (
                      <LoaderCircle className="spin" size={15} />
                    ) : (
                      <KeyRound size={15} />
                    )}{" "}
                    Change password
                  </button>
                  <button
                    className="secondary-button"
                    disabled={busy || !currentPassword}
                    onClick={() => void rotateRecovery()}
                  >
                    Rotate recovery key
                  </button>
                </div>
              </div>
              {recoveryKey && (
                <div className="token-reveal">
                  <strong>Copy your new recovery key now</strong>
                  <p>OVAEL-X only returns it once.</p>
                  <code>{recoveryKey}</code>
                </div>
              )}
              <h3 className="settings-subheading">Signed-in sessions</h3>
              <div className="auth-session-list">
                {authSessions.map((item) => (
                  <div key={String(item.session_id)}>
                    <div>
                      <strong>
                        {item.current ? "This browser" : "Another session"}
                      </strong>
                      <small>
                        {String(item.user_agent || "Unknown device")} · expires{" "}
                        {new Date(String(item.expires_at)).toLocaleDateString()}
                      </small>
                    </div>
                    <span>
                      {item.revoked ? (
                        "Revoked"
                      ) : item.current ? (
                        "Current"
                      ) : (
                        <button
                          onClick={() =>
                            void revokeSession(String(item.session_id))
                          }
                        >
                          Revoke
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === "accessibility" && (
            <>
              <div className="setting-title">
                <div>
                  <p className="eyebrow">Accessibility</p>
                  <h2>Display preferences</h2>
                </div>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Reduce motion</strong>
                  <p>
                    Minimize nonessential transitions and teaching cues on this
                    device.
                  </p>
                </div>
                <label className="switch small">
                  <input
                    type="checkbox"
                    checked={reduceMotion}
                    onChange={(event) => {
                      setReduceMotion(event.target.checked);
                      document.documentElement.classList.toggle(
                        "reduce-motion",
                        event.target.checked,
                      );
                    }}
                  />
                  <span />
                  <em>{reduceMotion ? "On" : "Off"}</em>
                </label>
              </div>
              <div className="setting-row">
                <div>
                  <strong>Keyboard operation</strong>
                  <p>
                    Navigation, teaching responses, Chat, and Call transcript
                    controls are keyboard reachable.
                  </p>
                </div>
                <span className="status-pill stable">Built in</span>
              </div>
            </>
          )}
          {tab === "data" && (
            <>
              <div className="setting-title">
                <div>
                  <p className="eyebrow">Sharing & data</p>
                  <h2>Teacher visibility</h2>
                </div>
              </div>
              {learnerCourses.length ? (
                <div className="sharing-list">
                  {learnerCourses.map((course) => (
                    <div key={course.course_id}>
                      <div>
                        <strong>{course.name}</strong>
                        <p>
                          Only concept states and gap labels are shared—never
                          answers or transcripts.
                        </p>
                      </div>
                      <button
                        className="secondary-button compact"
                        disabled={busy}
                        onClick={() => void share(course.course_id, true)}
                      >
                        Share latest snapshot
                      </button>
                      <button
                        className="quiet-button"
                        disabled={busy}
                        onClick={() => void share(course.course_id, false)}
                      >
                        Stop sharing
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">
                  No class course currently requests a progress snapshot.
                </p>
              )}
              <hr />
              <div className="settings-actions">
                <button className="secondary-button" onClick={exportState}>
                  <Download size={16} /> Export learner state
                </button>
              </div>
              <div className="danger-zone">
                <div>
                  <Trash2 size={19} />
                  <div>
                    <strong>Delete learning memory</strong>
                    <p>
                      Remove server-side concept state, gaps, sessions, and
                      derived learner memory. This cannot be undone.
                    </p>
                  </div>
                </div>
                <button
                  disabled={busy || teaching.busy}
                  onClick={() => void remove()}
                >
                  Delete memory
                </button>
              </div>
              <p className="settings-footnote">
                <ShieldCheck size={15} /> External clients receive context only
                through active, scoped MCP tokens.
              </p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
