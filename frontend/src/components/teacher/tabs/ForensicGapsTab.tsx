import { ShieldCheck, Users } from "lucide-react";

export interface ForensicGapsTabProps {
  sharingCount: number;
  totalLearners: number;
  gapCounts: Record<string, number>;
  cohortActions: Array<Record<string, unknown>>;
  topInterventions: Array<Record<string, unknown>>;
  authorityText: string;
}

export function ForensicGapsTab({
  sharingCount,
  totalLearners,
  gapCounts,
  cohortActions,
  topInterventions,
  authorityText,
}: ForensicGapsTabProps) {
  return (
    <div className="teacher-tab-content gaps-view-layout">
      {/* Top Aggregated Gaps Table */}
      <section className="teacher-card-elevated">
        <div className="section-toolbar-header">
          <div>
            <span className="eyebrow-accent">Aggregated Telemetry</span>
            <h2>Class-Level Learning Gap Forensics</h2>
            <p>
              Concepts where enrolled learners have encountered verified
              blockers or requested scaffolding support.
            </p>
          </div>

          <div className="gap-kpi-badge">
            <Users size={16} />
            <span>{sharingCount} student{sharingCount === 1 ? "" : "s"} sharing data</span>
          </div>
        </div>

        <div className="teacher-data-table-wrap">
          <table className="teacher-data-table" aria-label="Aggregated gaps table">
            <thead>
              <tr>
                <th scope="col">Concept</th>
                <th scope="col">Course Signal</th>
                <th scope="col">Students Affected</th>
                <th scope="col">Evidence Basis</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(gapCounts).map(([conceptId, count]) => {
                const ratio = totalLearners > 0 ? (count / totalLearners) * 100 : 0;
                return (
                  <tr key={conceptId}>
                    <td>
                      <div className="concept-gap-cell">
                        <strong>{conceptId}</strong>
                        <small className="muted-id">Privacy-minimized projection</small>
                      </div>
                    </td>
                    <td>
                      <span className="badge-status-gap">Active Gap Evidence</span>
                    </td>
                    <td>
                      <div className="affected-students-bar">
                        <Users size={14} />
                        <strong>{count}</strong>
                        <div className="bar-track">
                          <div
                            className="bar-fill-coral"
                            style={{ width: `${Math.min(ratio, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="evidence-basis-tag">
                        Learner-authorized progress snapshot
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {Object.keys(gapCounts).length === 0 && (
            <div className="table-empty-notice">
              {sharingCount === 0
                ? "No student has shared a course progress snapshot yet. Gap forensics populate as students practice and grant sharing consent."
                : "Excellent! No active concept blockers detected in current student snapshots."}
            </div>
          )}
        </div>
      </section>

      {/* Cohort Interventions & Decision Support */}
      {cohortActions.length > 0 && (
        <section className="teacher-card-elevated">
          <div className="section-toolbar-header">
            <div>
              <span className="eyebrow-accent">Pedagogical Decision Support</span>
              <h2>Recommended Cohort Interventions</h2>
              <p>
                Algorithmic group clustering based on shared causal gaps to
                assist instructor office hours and small-group recitations.
              </p>
            </div>
          </div>

          <div className="cohort-action-cards-grid">
            {cohortActions.map((action, i) => (
              <div key={i} className="cohort-action-card">
                <div className="cohort-card-top">
                  <span className="cohort-intervention-tag">
                    {String(action.intervention).replaceAll("_", " ")}
                  </span>
                  <span className="cohort-count-pill">
                    <Users size={13} /> {Number(action.learner_count)} Students
                  </span>
                </div>

                <h4 className="cohort-concept-title">
                  {String(action.concept_id)}
                </h4>

                <p className="cohort-recommendation">
                  {String(action.recommendation)}
                </p>

                <div className="cohort-student-tags">
                  {Array.isArray(action.learners) &&
                    action.learners.map((uname, j) => (
                      <span key={j} className="student-name-chip">
                        {String(uname)}
                      </span>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Priority Interventions Queue */}
      {topInterventions.length > 0 && (
        <section className="teacher-card-elevated">
          <div className="section-toolbar-header">
            <div>
              <span className="eyebrow-accent">Actionable Queue</span>
              <h2>Top Diagnostic Interventions ({topInterventions.length})</h2>
              <p>
                Ranked pedagogical recommendations grounded in 4-dimensional
                mastery proof (independent, transfer, retention, and scaffolding gap).
              </p>
            </div>
          </div>

          <div className="intervention-queue-list">
            {topInterventions.slice(0, 10).map((item, idx) => {
              const evidence = (item.evidence || {}) as Record<string, unknown>;
              return (
                <div key={idx} className="intervention-queue-card">
                  <div className="queue-priority-badge">
                    <span>Priority</span>
                    <strong>{Number(item.priority || 0)}</strong>
                  </div>

                  <div className="queue-body">
                    <div className="queue-header-row">
                      <span className="queue-intervention-type">
                        {String(item.intervention).replaceAll("_", " ")}
                      </span>
                      <span className="queue-student-tag">
                        Student: <strong>{String(item.learner_username)}</strong>
                      </span>
                      <span className="queue-concept-tag">
                        Concept: <strong>{String(item.concept_id)}</strong>
                      </span>
                    </div>

                    <p className="queue-rationale">{String(item.rationale)}</p>

                    <div className="queue-metrics-strip">
                      <span>Independent: {Math.round(Number(evidence.independent || 0) * 100)}%</span>
                      <span>Transfer: {Math.round(Number(evidence.transfer || 0) * 100)}%</span>
                      <span>Retention: {Math.round(Number(evidence.retention || 0) * 100)}%</span>
                      {evidence.assistance_gap !== undefined && evidence.assistance_gap !== null && (
                        <span>Assistance Gap: {Math.round(Number(evidence.assistance_gap) * 100)}%</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Privacy Disclaimer */}
      <div className="teacher-privacy-strip">
        <ShieldCheck size={20} className="privacy-icon" />
        <div>
          <strong>Decision Support Safeguards</strong>
          <p>
            {authorityText ||
              "Decision support only; the teacher remains the instructional authority. Interventions are heuristics over shared progress snapshots and do not disclose raw conversations."}
          </p>
        </div>
      </div>
    </div>
  );
}
