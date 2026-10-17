import { Check, GitBranch, LoaderCircle } from "lucide-react";
import { MermaidDiagram } from "../../content/MermaidDiagram";
import type { GraphEdge, GraphNode } from "../types";

export interface CurriculumGraphTabProps {
  courseName: string;
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  latestProposal?: Record<string, unknown>;
  mermaidChartSource: string;
  courseDocumentsCount: number;
  gapCounts: Record<string, number>;
  selectedConceptId: string | null;
  busy: boolean;
  onSelectedConceptChange: (id: string | null) => void;
  onApprove: (revId: string) => void;
  onProposeModalOpen: () => void;
}

export function CurriculumGraphTab({
  courseName,
  graphNodes,
  graphEdges,
  latestProposal,
  mermaidChartSource,
  courseDocumentsCount,
  gapCounts,
  selectedConceptId,
  busy,
  onSelectedConceptChange,
  onApprove,
  onProposeModalOpen,
}: CurriculumGraphTabProps) {
  return (
    <div className="teacher-tab-content graph-layout-view">
      <section className="teacher-card-elevated">
        <div className="section-toolbar-header">
          <div>
            <span className="eyebrow-accent">Ontological Architecture</span>
            <h2>Course Concept Knowledge Graph</h2>
            <p>
              {graphNodes.length > 0
                ? `${graphNodes.length} inferred concepts across ${graphEdges.length} dependency edges.`
                : "No concept graph generated yet."}
            </p>
            {latestProposal && (
              <div className="revision-metadata-tag">
                <span>Revision: <code>{String(latestProposal.revision_id).slice(0, 10)}</code></span>
                <span className={`status-pill ${String(latestProposal.status) === "approved" ? "stable" : "review"}`}>
                  {String(latestProposal.status)}
                </span>
              </div>
            )}
          </div>

          <div className="toolbar-button-group">
            {latestProposal && String(latestProposal.status) !== "approved" && (
              <button
                type="button"
                className="primary-button"
                disabled={busy}
                onClick={() => onApprove(String(latestProposal.revision_id))}
              >
                {busy ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}
                Approve Graph for Cohort
              </button>
            )}
            <button
              type="button"
              className="secondary-button"
              disabled={courseDocumentsCount === 0 || busy}
              onClick={onProposeModalOpen}
            >
              <GitBranch size={16} /> Propose New Revision
            </button>
          </div>
        </div>

        {/* Visual Mermaid Diagram or Empty Placeholder */}
        {mermaidChartSource ? (
          <div className="teacher-mermaid-canvas">
            <MermaidDiagram
              source={mermaidChartSource}
              title={`Concept Graph - ${courseName}`}
            />
          </div>
        ) : (
          <div className="graph-empty-state">
            <GitBranch size={36} className="muted-icon" />
            <h3>No Approved Knowledge Graph</h3>
            <p>
              Upload course materials and generate a graph proposal to build
              a visual dependency network for this cohort.
            </p>
            {courseDocumentsCount > 0 && (
              <button
                type="button"
                className="primary-button"
                onClick={onProposeModalOpen}
              >
                <GitBranch size={16} /> Propose Graph from {courseDocumentsCount} Sources
              </button>
            )}
          </div>
        )}
      </section>

      {/* Concept Inspector & Approval Authority Card */}
      <div className="graph-sidebar-grid">
        <section className="teacher-card-elevated">
          <span className="eyebrow-accent">Concept Directory</span>
          <h3>Inferred Concepts ({graphNodes.length})</h3>
          <div className="concept-chips-container">
            {graphNodes.map((node) => {
              const isSelected = selectedConceptId === node.id;
              const hasGaps = Boolean(gapCounts[node.id]);
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`concept-select-pill ${isSelected ? "selected" : ""} ${hasGaps ? "has-gaps" : ""}`}
                  onClick={() =>
                    onSelectedConceptChange(isSelected ? null : node.id)
                  }
                >
                  <span className="pill-dot" />
                  <strong>{node.label}</strong>
                  {hasGaps && (
                    <span className="pill-gap-counter">
                      {gapCounts[node.id]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="teacher-card-elevated boundary-card">
          <span className="eyebrow-accent">Instructional Safeguards</span>
          <h3>Human-in-the-Loop Governance</h3>
          <p>
            OVAEL-X automates ontology induction from reading materials, but
            never establishes pedagogical authority autonomously.
          </p>
          <ul className="boundary-list">
            <li>
              <Check size={14} className="check-icon" />
              <span>Only approved revisions govern learner progress tracking.</span>
            </li>
            <li>
              <Check size={14} className="check-icon" />
              <span>Prerequisite edges define causal scaffolding orders.</span>
            </li>
            <li>
              <Check size={14} className="check-icon" />
              <span>Educators retain full authority to re-propose or edit.</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
