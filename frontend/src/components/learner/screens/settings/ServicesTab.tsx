import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { Health } from "../../../../types";

interface ServicesTabProps {
  health: Health | null;
}

export function ServicesTab({ health }: ServicesTabProps) {
  const serviceItems = [
    { label: "Socratic Chat & Inference", enabled: health?.teaching_configured },
    { label: "Image OCR Handwriting Engine", enabled: health?.ocr_configured },
    { label: "Speech Transcription (STT)", enabled: health?.stt_configured },
    { label: "Media & Video Transcoding", enabled: health?.media_configured },
    { label: "Adaptive MCP Protocol", enabled: Boolean(health?.mcp) },
    { label: "Graph Database Engine", enabled: Boolean(health?.database) },
  ];

  return (
    <div className="settings-section-panel">
      <div className="section-title-box">
        <span className="eyebrow blue">Infrastructure</span>
        <h2>Backend Service Status</h2>
        <p>Verifies real-time readiness of multimodal AI pipelines, OCR engines, and speech models.</p>
      </div>

      <div className="services-health-grid">
        {serviceItems.map((item) => (
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
  );
}
