import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  GitBranch,
  LoaderCircle,
  Lock,
  Plus,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { AnimatedProgressBar, RadialGauge } from "../../content/MotionPrimitives";
import type { DocumentRecord } from "../../../types";
import type { GraphNode, TeacherTab } from "../types";

export interface OverviewTabProps {
  isProposalPending: boolean;
  latestProposal?: Record<string, unknown>;
  courseDocuments: DocumentRecord[];
  totalLearners: number;
  sharingCount: number;
  sharingRatio: number;
  gapCounts: Record<string, number>;
  learners: Array<Record<string, unknown>>;
  graphNodes: GraphNode[];
  proposals: Array<Record<string, unknown>>;
  learnerName: string;
  busy: boolean;
  privacyText: string;
  onLearnerNameChange: (val: string) => void;
  onEnroll: () => void;
  onTabChange: (tab: TeacherTab) => void;
  onProposeModalOpen: () => void;
}

export function OverviewTab({
  isProposalPending,
  latestProposal,
  courseDocuments,
  totalLearners,
  sharingCount,
  sharingRatio,
  gapCounts,
  learners,
  graphNodes,
  proposals,
  learnerName,
  busy,
  privacyText,
  onLearnerNameChange,
  onEnroll,
  onTabChange,
  onProposeModalOpen,
}: OverviewTabProps) {
  return (
    <div className="teacher-tab-content overview-layout">
      {/* Attention Banner if Unapproved Proposal exists */}
      {isProposalPending && latestProposal && (
        <div className="teacher-attention-banner">
          <div className="banner-alert-left">
            <AlertTriangle size={20} className="alert-icon-warning" />
            <div>
              <strong>Curriculum Knowledge Graph Revision Pending Approval</strong>
              <p>
                A new revision (
                <code>{String(latestProposal.revision_id).slice(0, 8)}</code>
                ) was inferred from {courseDocuments.length} course sources. Human review
                is required before it governs student progression.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="primary-button compact"
            onClick={() => onTabChange("graph")}
          >
            Review Revision <ArrowRight size={15} />
          </button>
        </div>
      )}

      {/* Metric KPI Cards Grid */}
      <div className="teacher-kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Enrolled Cohort</span>
            <Users size={18} className="kpi-icon navy" />
          </div>
          <div className="kpi-value">{totalLearners}</div>
          <div className="kpi-subtext">
            {sharingCount} student{sharingCount === 1 ? "" : "s"} sharing telemetry
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Progress Signal</span>
            <UserCheck size={18} className="kpi-icon coral" />
          </div>
          <div className="kpi-value">{sharingRatio}%</div>
          <div className="kpi-subtext">
            Learner-authorized progress snapshots
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Curriculum Sources</span>
            <BookOpen size={18} className="kpi-icon blue" />
          </div>
          <div className="kpi-value">{courseDocuments.length}</div>
          <div className="kpi-subtext">
            {courseDocuments.filter((d) => d.status === "ready").length} ready for graph inference
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card-header">
            <span className="kpi-label">Causal Gap Concepts</span>
            <TrendingUp size={18} className="kpi-icon amber" />
          </div>
          <div className="kpi-value">{Object.keys(gapCounts).length}</div>
          <div className="kpi-subtext">
            Aggregated concept blockers detected
          </div>
        </div>
      </div>

      {/* Progress Sharing Telemetry Section */}
      <section className="teacher-card-elevated telemetry-summary-card">
        <div className="card-heading-split">
          <div>
            <span className="eyebrow-accent">Progress Telemetry Signal</span>
            <h2>Learner-Authorized Diagnostic Coverage</h2>
            <p>
              Educator insights are generated exclusively from explicit learner
              consent. Private conversations, conversational turns, and unshared
              transcripts never leave the student device.
            </p>
          </div>
          <div className="telemetry-gauge-wrap">
            <RadialGauge
              value={sharingRatio}
              max={100}
              size={100}
              strokeWidth={9}
              variant="coral"
              label="Coverage"
            />
          </div>
        </div>

        {totalLearners > 0 && (
          <div className="telemetry-progress-container">
            <AnimatedProgressBar
              value={sharingCount}
              max={totalLearners}
              variant="coral"
              label="Enrolled learners actively sharing snapshots"
            />
          </div>
        )}
      </section>

      {/* 2-Column Split: Quick Enrollment & Material Readiness */}
      <div className="teacher-overview-split">
        {/* Quick Enrollment Card */}
        <section className="teacher-card-elevated">
          <div className="card-heading-split">
            <div>
              <span className="eyebrow-accent">Roster Administration</span>
              <h3>Quick Student Enrollment</h3>
            </div>
            <button
              type="button"
              className="link-button"
              onClick={() => onTabChange("roster")}
            >
              View All ({totalLearners}) <ChevronRight size={15} />
            </button>
          </div>

          <form
            className="enrollment-inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              onEnroll();
            }}
          >
            <div className="input-with-icon">
              <Users size={16} className="field-icon" />
              <input
                aria-label="Learner username to enroll"
                value={learnerName}
                onChange={(event) => onLearnerNameChange(event.target.value)}
                placeholder="Enter learner username..."
                disabled={busy}
              />
            </div>
            <button
              type="submit"
              className="primary-button compact"
              disabled={busy || !learnerName.trim()}
            >
              {busy ? <LoaderCircle className="spin" size={15} /> : <Plus size={15} />}
              Enroll
            </button>
          </form>

          <div className="roster-preview-list">
            {learners.slice(0, 4).map((learner) => (
              <div key={String(learner.user_id)} className="roster-preview-item">
                <div className="avatar-chip">
                  {String(learner.username).charAt(0).toUpperCase()}
                </div>
                <div className="roster-item-info">
                  <strong>{String(learner.username)}</strong>
                  <span className="roster-status-line">
                    {learner.progress_shared ? (
                      <span className="status-dot-active">
                        <Check size={11} /> Progress Shared
                      </span>
                    ) : (
                      <span className="status-dot-private">
                        <Lock size={11} /> Private (Default)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            ))}
            {learners.length === 0 && (
              <p className="empty-subtext">No students enrolled yet. Add your first learner above.</p>
            )}
          </div>
        </section>

        {/* Quick Material Readiness & Proposal */}
        <section className="teacher-card-elevated">
          <div className="card-heading-split">
            <div>
              <span className="eyebrow-accent">Knowledge Architecture</span>
              <h3>Curriculum Pipeline</h3>
            </div>
            <button
              type="button"
              className="link-button"
              onClick={() => onTabChange("materials")}
            >
              Manage Sources ({courseDocuments.length}) <ChevronRight size={15} />
            </button>
          </div>

          <p className="pipeline-desc">
            OVAEL-X digests textbooks, lecture slides, and notes to propose an
            adaptive causal knowledge graph for this cohort.
          </p>

          <div className="pipeline-status-box">
            <div className="pipeline-stat">
              <strong>{courseDocuments.length}</strong>
              <span>Syllabus Sources</span>
            </div>
            <div className="pipeline-stat">
              <strong>{graphNodes.length}</strong>
              <span>Inferred Concepts</span>
            </div>
            <div className="pipeline-stat">
              <strong>{proposals.length}</strong>
              <span>Graph Revisions</span>
            </div>
          </div>

          <div className="pipeline-actions">
            <button
              type="button"
              className="secondary-button"
              disabled={courseDocuments.length === 0 || busy}
              onClick={onProposeModalOpen}
            >
              <GitBranch size={16} /> Propose New Graph
            </button>
            {latestProposal && (
              <button
                type="button"
                className="primary-button"
                onClick={() => onTabChange("graph")}
              >
                Inspect Graph <ArrowRight size={15} />
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Privacy Minimization Banner */}
      <div className="teacher-privacy-strip">
        <ShieldCheck size={20} className="privacy-icon" />
        <div>
          <strong>Differential Privacy by Backend Contract</strong>
          <p>
            {privacyText ||
              "Aggregated derived progress only; zero raw learner answers, private prompts, or hidden transcripts are accessible."}
          </p>
        </div>
      </div>
    </div>
  );
}
