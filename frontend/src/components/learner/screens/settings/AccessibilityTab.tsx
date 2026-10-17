interface AccessibilityTabProps {
  reduceMotion: boolean;
  onToggleReduceMotion: (enabled: boolean) => void;
}

export function AccessibilityTab({
  reduceMotion,
  onToggleReduceMotion,
}: AccessibilityTabProps) {
  return (
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
              onChange={(e) => onToggleReduceMotion(e.target.checked)}
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
  );
}
