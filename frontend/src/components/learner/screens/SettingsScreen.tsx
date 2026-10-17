import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { MIN_PASSWORD_LENGTH } from "../../../auth";
import { useTeaching } from "../../../context/TeachingContext";
import { ovaelApi } from "../../../api/client";
import { useOvael } from "../../../context/OvaelContext";
import { ConnectionsScreen } from "./ConnectionsScreen";
import { api } from "../../../api";

import type { SettingsTab } from "./settings/types";
import { SettingsSidebar } from "./settings/SettingsSidebar";
import { PersonalizationTab } from "./settings/PersonalizationTab";
import { ProfileTab } from "./settings/ProfileTab";
import { SecurityTab } from "./settings/SecurityTab";
import { AccessibilityTab } from "./settings/AccessibilityTab";
import { DataTab } from "./settings/DataTab";
import { ServicesTab } from "./settings/ServicesTab";

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
    error,
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

  const handleToggleReduceMotion = (enabled: boolean) => {
    setReduceMotion(enabled);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("reduce-motion", enabled);
    }
  };

  return (
    <div className="page settings-page">
      {/* Header */}
      <header className="page-heading settings-header">
        <div>
          <p className="eyebrow blue">Learner Configuration</p>
          <h1>Settings</h1>
          <p className="page-lead">
            Manage your available preferences, study personalization, credentials, and account options.
          </p>
        </div>
      </header>

      {/* Global Status Banner */}
      {notice && (
        <aside className="settings-notice-banner" role="status">
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

      {/* Global Error Banner */}
      {error && (
        <aside className="settings-error-banner" role="alert">
          <AlertCircle size={18} className="notice-icon error-icon" />
          <p>{error}</p>
          <button
            type="button"
            className="icon-button close-notice-btn"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </aside>
      )}

      {/* Settings Grid Layout */}
      <div className="settings-split-layout">
        <SettingsSidebar
          tab={tab}
          onSelectTab={(nextTab) => {
            setTab(nextTab);
            setNotice("");
          }}
        />

        {/* Content Pane */}
        <section className="settings-content-card">
          {tab === "personalization" && (
            <PersonalizationTab
              studyFormat={studyFormat}
              onStudyFormatChange={setStudyFormat}
              studyPace={studyPace}
              onStudyPaceChange={setStudyPace}
              plainLanguage={plainLanguage}
              onPlainLanguageChange={setPlainLanguage}
              busy={busy}
              onSaveStudy={saveStudy}
              personalization={personalization}
              onTogglePersonalization={toggle}
            />
          )}

          {tab === "profile" && <ProfileTab user={user} profile={profile} />}

          {tab === "security" && (
            <SecurityTab
              currentPassword={currentPassword}
              onCurrentPasswordChange={setCurrentPassword}
              newPassword={newPassword}
              onNewPasswordChange={setNewPassword}
              busy={busy}
              onChangePassword={changePassword}
              onRotateRecovery={rotateRecovery}
              recoveryKey={recoveryKey}
              authSessions={authSessions}
              onRevokeSession={revokeSession}
            />
          )}

          {tab === "accessibility" && (
            <AccessibilityTab
              reduceMotion={reduceMotion}
              onToggleReduceMotion={handleToggleReduceMotion}
            />
          )}

          {tab === "data" && (
            <DataTab
              learnerCourses={learnerCourses}
              busy={busy}
              teachingBusy={teaching.busy}
              onShare={share}
              onExportState={exportState}
              onRemoveMemory={remove}
            />
          )}

          {tab === "integrations" && <ConnectionsScreen />}

          {tab === "services" && <ServicesTab health={health} />}
        </section>
      </div>
    </div>
  );
}
