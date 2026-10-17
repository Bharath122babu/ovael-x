import { Check, PauseCircle, RefreshCw } from "lucide-react";

interface PersonalizationTabProps {
  studyFormat: string;
  onStudyFormatChange: (value: string) => void;
  studyPace: string;
  onStudyPaceChange: (value: string) => void;
  plainLanguage: boolean;
  onPlainLanguageChange: (value: boolean) => void;
  busy: boolean;
  onSaveStudy: () => Promise<void>;
  personalization: boolean;
  onTogglePersonalization: (enabled: boolean) => Promise<void>;
}

export function PersonalizationTab({
  studyFormat,
  onStudyFormatChange,
  studyPace,
  onStudyPaceChange,
  plainLanguage,
  onPlainLanguageChange,
  busy,
  onSaveStudy,
  personalization,
  onTogglePersonalization,
}: PersonalizationTabProps) {
  return (
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
            onChange={(e) => onStudyFormatChange(e.target.value)}
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
            onChange={(e) => onStudyPaceChange(e.target.value)}
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
            onChange={(e) => onPlainLanguageChange(e.target.checked)}
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
          onClick={() => void onSaveStudy()}
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
            onClick={() => void onTogglePersonalization(!personalization)}
          >
            <PauseCircle size={15} />
            <span>{personalization ? "Pause Memory Updates" : "Resume Memory Updates"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
