import { useMemo, useState } from "react";
import {
  ArrowRight,
  Search,
  Download,
  GitFork,
  X,
  FileCode,
} from "lucide-react";
import { useOvael } from "../../../context/OvaelContext";
import type { LearningLaunch } from "../../../types";
import { MermaidDiagram } from "../../content/MermaidDiagram";
import { topicMermaid } from "../../../learningVisuals";

function uiState(status: string): "stable" | "review" | "uncertain" | string {
  if (status === "verified") return "stable";
  if (
    status === "active_blocker" ||
    status === "needs_review" ||
    status === "stale"
  )
    return "review";
  if (status === "unknown") return "uncertain";
  return status;
}

export function GraphScreen({
  onLearn,
}: {
  onLearn: (launch: LearningLaunch) => void;
}) {
  const { map, subjects, courses } = useOvael();

  const concepts = useMemo(
    () =>
      map.nodes.filter((node) => node.kind === "concept" || node.subject_id),
    [map.nodes]
  );

  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");

  const visible = concepts.filter(
    (node) =>
      (!subject || node.subject_id === subject) &&
      node.label.toLowerCase().includes(query.toLowerCase())
  );

  const selected = visible.find((node) => node.id === selectedId) || visible[0];

  const connected = selected
    ? map.edges
        .filter(
          (edge) => edge.source === selected.id || edge.target === selected.id
        )
        .map((edge) =>
          edge.source === selected.id ? edge.target : edge.source
        )
        .map((id) => map.nodes.find((node) => node.id === id)?.label)
        .filter(Boolean)
    : [];

  const neighborIds = new Set(
    selected
      ? [
          selected.id,
          ...map.edges
            .filter(
              (edge) =>
                edge.source === selected.id || edge.target === selected.id
            )
            .flatMap((edge) => [edge.source, edge.target]),
        ]
      : []
  );

  const diagram = topicMermaid(
    map.nodes.filter((node) => neighborIds.has(node.id)),
    map.edges
  );

  function exportMap(mermaid = false) {
    const value = mermaid
      ? topicMermaid(visible, map.edges)
      : JSON.stringify(
          {
            schema: "ovael-study-map-v1",
            nodes: visible,
            edges: map.edges.filter(
              (edge) =>
                visible.some((node) => node.id === edge.source) &&
                visible.some((node) => node.id === edge.target)
            ),
          },
          null,
          2
        );
    const url = URL.createObjectURL(
      new Blob([value], { type: mermaid ? "text/plain" : "application/json" })
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = mermaid ? "study-map.mmd" : "study-map.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  const selectedSubjectObj = subjects.find(
    (s) => s.subject_id === selected?.subject_id
  );

  return (
    <div className="graph-page">
      {/* Header */}
      <header className="page-heading graph-header">
        <div className="graph-header-info">
          <p className="eyebrow blue">Relational Knowledge Architecture</p>
          <h1>Topic Knowledge Map</h1>
          <p className="page-lead">
            Explore concepts, prerequisite dependencies, and causal relationships across your learning tracks.
          </p>
        </div>

        <div className="graph-tools">
          <div className="graph-subject-wrap">
            <select
              aria-label="Filter map by subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setSelectedId("");
              }}
              className="graph-select"
            >
              <option value="">All Subject Domains</option>
              {subjects.map((item) => (
                <option key={item.subject_id} value={item.subject_id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="graph-search-wrap">
            <Search size={15} />
            <input
              aria-label="Search your knowledge graph"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter concepts…"
              className="graph-search-input"
            />
            {query && (
              <button
                type="button"
                className="icon-button"
                onClick={() => setQuery("")}
                aria-label="Clear concept search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          <div className="graph-export-actions">
            <button
              type="button"
              className="quiet-button export-btn"
              onClick={() => exportMap(false)}
              title="Download machine-readable JSON study map"
            >
              <Download size={14} />
              <span>JSON Map</span>
            </button>
            <button
              type="button"
              className="quiet-button export-btn"
              onClick={() => exportMap(true)}
              title="Download Mermaid syntax diagram"
            >
              <FileCode size={14} />
              <span>Mermaid</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Graph Layout */}
      <div className="graph-layout-container">
        {/* Graph Canvas & Concept Nodes */}
        <section className="graph-canvas-panel" aria-label="Concept relationship map">
          {/* Accessible Status Legend */}
          <div className="graph-legend-bar" aria-label="Map status legend">
            <span className="legend-chip">
              <span className="legend-dot is-stable" />
              <strong>Verified</strong>
            </span>
            <span className="legend-chip">
              <span className="legend-dot is-developing" />
              <strong>Developing</strong>
            </span>
            <span className="legend-chip">
              <span className="legend-dot is-review" />
              <strong>Needs Review</strong>
            </span>
            <span className="legend-chip">
              <span className="legend-dot is-recovered" />
              <strong>Recovered</strong>
            </span>
          </div>

          {/* Interactive Mermaid Diagram View */}
          {selected && (
            <div className="topic-mermaid-container">
              <div className="mermaid-view-header">
                <GitFork size={16} />
                <strong>Neighborhood Graph around {selected.label}</strong>
              </div>
              <div className="mermaid-chart-card">
                <MermaidDiagram
                  source={diagram}
                  title={`Connections around ${selected.label}`}
                />
              </div>
            </div>
          )}

          {/* Concept Nodes Grid */}
          <div className="topic-nodes-grid" role="listbox" aria-label="Mapped concepts">
            {visible.map((node) => {
              const stateClass = uiState(node.status);
              const isSelected = selected?.id === node.id;

              return (
                <button
                  key={node.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`concept-node-tile is-${stateClass} ${isSelected ? "is-selected-node" : ""}`}
                  onClick={() => setSelectedId(node.id)}
                >
                  <span className="node-label">{node.label}</span>
                  <span className="node-status-badge">
                    {node.status.replaceAll("_", " ")}
                  </span>
                </button>
              );
            })}

            {visible.length === 0 && (
              <div className="graph-empty-notice">
                <p>No concepts found matching "<strong>{query}</strong>".</p>
                <button
                  type="button"
                  className="quiet-button"
                  onClick={() => {
                    setQuery("");
                    setSubject("");
                  }}
                >
                  Reset Map Filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Selected Concept Inspector Sidebar */}
        <aside className="concept-inspector-aside" aria-label="Concept detail inspector">
          <div className="inspector-top-block">
            <span className="eyebrow coral">Selected Concept</span>
            <h2 className="selected-concept-title">
              {selected?.label || "No concept selected"}
            </h2>

            {selected && (
              <span className={`status-pill is-${uiState(selected.status)}`}>
                {selected.status.replaceAll("_", " ")}
              </span>
            )}
          </div>

          <dl className="concept-details-list">
            <div className="detail-item">
              <dt>Domain Subject</dt>
              <dd>{selectedSubjectObj?.name || "Not assigned"}</dd>
            </div>

            <div className="detail-item">
              <dt>Connected Concepts ({connected.length})</dt>
              <dd className="connected-chips-wrap">
                {connected.length > 0 ? (
                  connected.map((item, idx) => (
                    <span key={idx} className="connected-topic-chip">
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="no-relations">No relational dependencies mapped</span>
                )}
              </dd>
            </div>

            <div className="detail-item">
              <dt>Verification Status</dt>
              <dd>
                {selected?.status === "verified"
                  ? "Demonstrated mastery with multiple unhinted correct turns."
                  : selected?.status === "needs_review"
                    ? "Concept blocker identified; requires practice reinforcement."
                    : "Formative learning stage; skill checks pending."}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            className="primary-button full learn-concept-btn"
            disabled={!selected?.subject_id}
            onClick={() =>
              selected?.subject_id &&
              onLearn({
                conceptId: selected.id,
                conceptName: selected.label,
                subjectId: selected.subject_id,
                courseId: courses.find(
                  (course) => course.subject_id === selected.subject_id
                )?.course_id,
              })
            }
          >
            <span>Practice Concept Now</span>
            <ArrowRight size={16} />
          </button>
        </aside>
      </div>
    </div>
  );
}
