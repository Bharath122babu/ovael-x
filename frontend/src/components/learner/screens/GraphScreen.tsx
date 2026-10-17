import { useMemo, useState } from "react";
import {
  ArrowRight,
  Search,
  Download,
  GitFork,
  X,
  FileCode,
  ZoomIn,
  ZoomOut,
  RotateCcw,
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
  const [zoom, setZoom] = useState(1);
  const [viewScope, setViewScope] = useState<"neighborhood" | "all">("neighborhood");

  const visible = useMemo(
    () =>
      concepts.filter(
        (node) =>
          (!subject || node.subject_id === subject) &&
          node.label.toLowerCase().includes(query.toLowerCase())
      ),
    [concepts, subject, query]
  );

  const selected = visible.find((node) => node.id === selectedId) || visible[0];

  const connectedNodes = useMemo(() => {
    if (!selected) return [];
    return map.edges
      .filter((edge) => edge.source === selected.id || edge.target === selected.id)
      .map((edge) => {
        const isOutgoing = edge.source === selected.id;
        const targetId = isOutgoing ? edge.target : edge.source;
        const targetNode = map.nodes.find((n) => n.id === targetId);
        return {
          id: targetId,
          label: targetNode?.label || targetId,
          status: targetNode?.status || "unknown",
          relation: edge.relation.replaceAll("_", " "),
          direction: isOutgoing ? ("outgoing" as const) : ("incoming" as const),
        };
      });
  }, [selected, map.edges, map.nodes]);

  const diagramNodes = useMemo(() => {
    if (!selected) return [];
    if (viewScope === "all") {
      return [selected, ...visible.filter((n) => n.id !== selected.id).slice(0, 40)];
    }
    const neighborIdSet = new Set(
      map.edges
        .filter((edge) => edge.source === selected.id || edge.target === selected.id)
        .flatMap((edge) => [edge.source, edge.target])
    );
    neighborIdSet.add(selected.id);
    const neighbors = map.nodes.filter(
      (n) => neighborIdSet.has(n.id) && n.id !== selected.id
    );
    return [selected, ...neighbors];
  }, [selected, visible, viewScope, map.edges, map.nodes]);

  const diagram = useMemo(() => {
    if (diagramNodes.length === 0) return "";
    return topicMermaid(diagramNodes, map.edges);
  }, [diagramNodes, map.edges]);

  const handleDiagramClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const nodeEl = (e.target as HTMLElement).closest(".node");
    if (!nodeEl) return;
    const match = (nodeEl.id || "").match(/topic(\d+)/);
    if (match) {
      const idx = parseInt(match[1], 10);
      const targetNode = diagramNodes[idx];
      if (targetNode && targetNode.id !== selected?.id) {
        setSelectedId(targetNode.id);
      }
    }
  };

  const handleZoomIn = () =>
    setZoom((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 1.5));
  const handleZoomOut = () =>
    setZoom((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.7));
  const handleResetZoom = () => setZoom(1);

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
      {/* Compact Editorial Header */}
      <header className="graph-header">
        <div className="graph-header-info">
          <span className="graph-eyebrow">KNOWLEDGE GRAPH</span>
          <h2 className="graph-title">Topic Map</h2>
          <p className="graph-description">
            Explore relationships between concepts in your learning journey.
          </p>
        </div>

        <div className="graph-tools">
          <div className="graph-filter-group">
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
                <option value="">All Subjects ({concepts.length})</option>
                {subjects.map((item) => (
                  <option key={item.subject_id} value={item.subject_id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="graph-search-wrap">
              <Search size={14} className="search-icon" aria-hidden="true" />
              <input
                aria-label="Search your knowledge graph"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search concepts…"
                className="graph-search-input"
              />
              {query && (
                <button
                  type="button"
                  className="graph-clear-search-btn"
                  onClick={() => setQuery("")}
                  aria-label="Clear concept search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="graph-export-actions">
            <button
              type="button"
              className="graph-export-btn"
              onClick={() => exportMap(false)}
              title="Download machine-readable JSON study map"
              aria-label="Export JSON Study Map"
            >
              <Download size={14} />
              <span>JSON</span>
            </button>
            <button
              type="button"
              className="graph-export-btn"
              onClick={() => exportMap(true)}
              title="Download Mermaid syntax diagram"
              aria-label="Export Mermaid Diagram"
            >
              <FileCode size={14} />
              <span>Mermaid</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Graph Layout */}
      <div className="graph-layout-container">
        {/* Graph Canvas & Concept Nodes Panel */}
        <section className="graph-canvas-panel" aria-label="Concept relationship map">
          {/* Canvas Sub-Header & Controls */}
          <div className="graph-canvas-header">
            <div className="canvas-header-title">
              <GitFork size={16} className="canvas-icon" aria-hidden="true" />
              <span className="canvas-title-text">
                {viewScope === "neighborhood" ? (
                  <>
                    Neighborhood: <strong>{selected?.label || "None"}</strong>
                  </>
                ) : (
                  <>
                    Domain Map: <strong>{selectedSubjectObj?.name || "All Subjects"}</strong>
                  </>
                )}
              </span>
              <span className="canvas-node-count-badge">
                {diagramNodes.length} {diagramNodes.length === 1 ? "node" : "nodes"}
              </span>
            </div>

            <div className="canvas-controls-toolbar">
              {/* Scope Switcher */}
              <div className="scope-toggle-group" role="group" aria-label="Graph scope">
                <button
                  type="button"
                  className={`scope-toggle-btn ${viewScope === "neighborhood" ? "active" : ""}`}
                  onClick={() => setViewScope("neighborhood")}
                  title="Show direct dependencies and neighbor concepts"
                >
                  Neighborhood
                </button>
                <button
                  type="button"
                  className={`scope-toggle-btn ${viewScope === "all" ? "active" : ""}`}
                  onClick={() => setViewScope("all")}
                  title="Show all concepts in current subject domain"
                >
                  Cluster
                </button>
              </div>

              {/* Zoom Controls */}
              <div className="zoom-controls-group" role="group" aria-label="Graph zoom controls">
                <button
                  type="button"
                  className="graph-canvas-btn"
                  onClick={handleZoomOut}
                  disabled={zoom <= 0.7}
                  title="Zoom out (-15%)"
                  aria-label="Zoom out"
                >
                  <ZoomOut size={14} />
                </button>
                <span className="zoom-level-indicator" aria-live="polite">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  className="graph-canvas-btn"
                  onClick={handleZoomIn}
                  disabled={zoom >= 1.5}
                  title="Zoom in (+15%)"
                  aria-label="Zoom in"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  type="button"
                  className="graph-canvas-btn reset-btn"
                  onClick={handleResetZoom}
                  disabled={zoom === 1}
                  title="Reset zoom to 100%"
                  aria-label="Reset zoom to 100%"
                >
                  <RotateCcw size={13} />
                  <span>Reset</span>
                </button>
              </div>
            </div>
          </div>

          {/* Accessible Status Legend */}
          <div className="graph-legend-bar" aria-label="Map status legend">
            <span className="legend-label">STATUS KEY:</span>
            <span className="legend-chip">
              <span className="legend-dot is-stable" />
              <span>Verified</span>
            </span>
            <span className="legend-chip">
              <span className="legend-dot is-developing" />
              <span>Developing</span>
            </span>
            <span className="legend-chip">
              <span className="legend-dot is-review" />
              <span>Needs Review</span>
            </span>
            <span className="legend-chip">
              <span className="legend-dot is-recovered" />
              <span>Recovered</span>
            </span>
          </div>

          {/* Interactive Mermaid Diagram Viewport */}
          {selected && diagram ? (
            <div
              className="topic-mermaid-canvas"
              onClick={handleDiagramClick}
              tabIndex={0}
              role="region"
              aria-label={`Interactive graph visualization around ${selected.label}. Click a node to inspect.`}
            >
              <div
                className="mermaid-transform-stage"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: "center top",
                }}
              >
                <MermaidDiagram
                  source={diagram}
                  title={`Connections around ${selected.label}`}
                />
              </div>
            </div>
          ) : (
            <div className="graph-empty-canvas">
              <p>No graph connections to display.</p>
            </div>
          )}

          {/* Concept Inventory Section */}
          <div className="topic-inventory-section">
            <div className="topic-inventory-header">
              <h3 className="inventory-title">Concept Inventory</h3>
              <span className="inventory-count">
                Showing {visible.length} of {concepts.length} concepts
              </span>
            </div>

            <div className="topic-nodes-grid" role="listbox" aria-label="Mapped concepts">
              {visible.map((node) => {
                const stateClass = uiState(node.status);
                const isSelected = selected?.id === node.id;
                const relCount = map.edges.filter(
                  (e) => e.source === node.id || e.target === node.id
                ).length;

                return (
                  <button
                    key={node.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={0}
                    className={`concept-node-tile is-${stateClass} ${isSelected ? "is-selected-node" : ""}`}
                    onClick={() => setSelectedId(node.id)}
                  >
                    <div className="tile-top-row">
                      <span className="node-label">{node.label}</span>
                      {isSelected && (
                        <span className="selected-indicator-dot" title="Active selection" />
                      )}
                    </div>
                    <div className="tile-bottom-row">
                      <span className="node-status-badge">
                        <span className={`status-dot-sm is-${stateClass}`} />
                        {node.status.replaceAll("_", " ")}
                      </span>
                      <span className="node-rel-count">
                        {relCount} {relCount === 1 ? "relation" : "relations"}
                      </span>
                    </div>
                  </button>
                );
              })}

              {visible.length === 0 && (
                <div className="graph-empty-notice">
                  <p>
                    No concepts found matching "<strong>{query}</strong>"
                    {subject ? ` in selected subject` : ""}.
                  </p>
                  <button
                    type="button"
                    className="quiet-button reset-filter-btn"
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
          </div>
        </section>

        {/* Selected Concept Inspector Sidebar */}
        <aside className="concept-inspector-aside" aria-label="Concept detail inspector">
          <div className="inspector-card">
            <div className="inspector-top-block">
              <span className="inspector-eyebrow">SELECTED CONCEPT</span>
              <h3 className="selected-concept-title">
                {selected?.label || "No concept selected"}
              </h3>

              {selected && (
                <div className="inspector-status-badge">
                  <span className={`legend-dot is-${uiState(selected.status)}`} />
                  <span className="status-badge-text">
                    {selected.status.replaceAll("_", " ")}
                  </span>
                </div>
              )}
            </div>

            <div className="inspector-divider" />

            <dl className="concept-details-list">
              <div className="detail-item">
                <dt>Domain Subject</dt>
                <dd>{selectedSubjectObj?.name || "General / Unassigned"}</dd>
              </div>

              <div className="detail-item">
                <dt>Connected Concepts ({connectedNodes.length})</dt>
                <dd className="connected-chips-wrap">
                  {connectedNodes.length > 0 ? (
                    connectedNodes.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="connected-topic-chip"
                        onClick={() => setSelectedId(item.id)}
                        title={`Focus on ${item.label} (${item.relation})`}
                      >
                        <span className="chip-label">{item.label}</span>
                        <span className="chip-relation">{item.relation}</span>
                      </button>
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
                      : selected?.status === "recovered"
                        ? "Previous misconception resolved through targeted practice."
                        : "Formative learning stage; skill reinforcement checks pending."}
                </dd>
              </div>
            </dl>
          </div>

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
