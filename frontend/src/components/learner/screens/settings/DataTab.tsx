import { Download, ShieldCheck, Trash2 } from "lucide-react";
import type { Course } from "../../../../types";

interface DataTabProps {
  learnerCourses: Course[];
  busy: boolean;
  teachingBusy: boolean;
  onShare: (courseId: string, enabled: boolean) => Promise<void>;
  onExportState: () => void;
  onRemoveMemory: () => Promise<void>;
}

export function DataTab({
  learnerCourses,
  busy,
  teachingBusy,
  onShare,
  onExportState,
  onRemoveMemory,
}: DataTabProps) {
  return (
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
                    onClick={() => void onShare(course.course_id, true)}
                  >
                    Share Snapshot
                  </button>
                  <button
                    type="button"
                    className="quiet-button compact"
                    disabled={busy}
                    onClick={() => void onShare(course.course_id, false)}
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
          onClick={onExportState}
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
          disabled={busy || teachingBusy}
          onClick={() => void onRemoveMemory()}
        >
          Delete Memory
        </button>
      </div>

      <p className="privacy-footnote">
        <ShieldCheck size={14} />
        <span>External clients and MCP integrations access context only through active, scoped tokens.</span>
      </p>
    </div>
  );
}
