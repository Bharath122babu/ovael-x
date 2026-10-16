import {
  Check,
  CheckCircle2,
  LoaderCircle,
  Lock,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type { UnenrollTarget } from "../types";

export interface RosterTabProps {
  learnersCount: number;
  filteredLearners: Array<Record<string, unknown>>;
  learnerName: string;
  rosterQuery: string;
  busy: boolean;
  onLearnerNameChange: (val: string) => void;
  onRosterQueryChange: (val: string) => void;
  onEnroll: () => void;
  onUnenrollSelect: (target: UnenrollTarget) => void;
}

export function RosterTab({
  learnersCount,
  filteredLearners,
  learnerName,
  rosterQuery,
  busy,
  onLearnerNameChange,
  onRosterQueryChange,
  onEnroll,
  onUnenrollSelect,
}: RosterTabProps) {
  return (
    <section className="teacher-card-elevated teacher-tab-content">
      <div className="section-toolbar-header">
        <div>
          <span className="eyebrow-accent">Cohort Management</span>
          <h2>Enrolled Students ({learnersCount})</h2>
          <p>
            Manage class access, verify student telemetry sharing status,
            and remove learners who have completed or dropped the course.
          </p>
        </div>

        <form
          className="inline-enroll-box"
          onSubmit={(e) => {
            e.preventDefault();
            onEnroll();
          }}
        >
          <input
            aria-label="Student username"
            value={learnerName}
            onChange={(e) => onLearnerNameChange(e.target.value)}
            placeholder="Student username..."
            disabled={busy}
          />
          <button
            type="submit"
            className="primary-button compact"
            disabled={busy || !learnerName.trim()}
          >
            {busy ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />}
            Add Student
          </button>
        </form>
      </div>

      {/* Search Bar */}
      <div className="table-search-bar">
        <div className="input-with-icon">
          <Search size={16} className="field-icon" />
          <input
            value={rosterQuery}
            onChange={(e) => onRosterQueryChange(e.target.value)}
            placeholder="Search enrolled students..."
          />
        </div>
        {rosterQuery && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => onRosterQueryChange("")}
          >
            Clear
          </button>
        )}
      </div>

      {/* Roster Table */}
      <div className="teacher-data-table-wrap">
        <table className="teacher-data-table" aria-label="Enrolled learners table">
          <thead>
            <tr>
              <th scope="col">Student</th>
              <th scope="col">Enrollment Status</th>
              <th scope="col">Telemetry Sharing</th>
              <th scope="col">Enrolled Date</th>
              <th scope="col" className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLearners.map((learner) => {
              const uid = String(learner.user_id);
              const username = String(learner.username);
              const isShared = Boolean(learner.progress_shared);
              const enrolledAt = learner.enrolled_at
                ? new Date(String(learner.enrolled_at)).toLocaleDateString()
                : "Active";

              return (
                <tr key={uid}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar-chip">{username.charAt(0).toUpperCase()}</div>
                      <div>
                        <strong>{username}</strong>
                        <small className="muted-id">ID: {uid.slice(0, 8)}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge-status-active">
                      <Check size={13} /> {String(learner.status || "enrolled")}
                    </span>
                  </td>
                  <td>
                    {isShared ? (
                      <span className="telemetry-pill shared">
                        <CheckCircle2 size={13} /> Authorized Snapshot
                      </span>
                    ) : (
                      <span className="telemetry-pill private">
                        <Lock size={13} /> Private (Default)
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="date-cell">{enrolledAt}</span>
                  </td>
                  <td className="text-right">
                    <button
                      type="button"
                      className="table-action-danger"
                      title={`Unenroll ${username}`}
                      onClick={() => onUnenrollSelect({ id: uid, username })}
                    >
                      <Trash2 size={15} /> Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredLearners.length === 0 && (
          <div className="table-empty-notice">
            {rosterQuery
              ? `No students matching "${rosterQuery}".`
              : "No students currently enrolled in this cohort."}
          </div>
        )}
      </div>
    </section>
  );
}
