import { useMemo, useState } from "react";
import { ArrowRight, Info, Search } from "lucide-react";
import { useOvael } from "../../../context/OvaelContext";
import type { LearningLaunch } from "../../../types";
import { MermaidDiagram } from "../../content/MermaidDiagram";
import { topicMermaid } from "../../../learningVisuals";
function uiState(status: string) {
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
    [map.nodes],
  );
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const visible = concepts.filter(
    (node) =>
      (!subject || node.subject_id === subject) &&
      node.label.toLowerCase().includes(query.toLowerCase()),
  );
  const selected = visible.find((node) => node.id === selectedId) || visible[0];
  const connected = selected
    ? map.edges
        .filter(
          (edge) => edge.source === selected.id || edge.target === selected.id,
        )
        .map((edge) =>
          edge.source === selected.id ? edge.target : edge.source,
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
                edge.source === selected.id || edge.target === selected.id,
            )
            .flatMap((edge) => [edge.source, edge.target]),
        ]
      : [],
  );
  const diagram = topicMermaid(
    map.nodes.filter((node) => neighborIds.has(node.id)),
    map.edges,
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
                visible.some((node) => node.id === edge.target),
            ),
          },
          null,
          2,
        );
    const url = URL.createObjectURL(
      new Blob([value], { type: mermaid ? "text/plain" : "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = mermaid ? "study-map.mmd" : "study-map.json";
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="graph-page">
      <header className="page-heading graph-heading">
        <div>
          <p className="eyebrow blue">Your topics</p>
          <h1>Topic map</h1>
          <p>Explore your topics and the ideas connected to them.</p>
        </div>
        <div className="graph-tools">
          <select
            aria-label="Map subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setSelectedId("");
            }}
          >
            <option value="">All subjects</option>
            {subjects.map((item) => (
              <option key={item.subject_id} value={item.subject_id}>
                {item.name}
              </option>
            ))}
          </select>
          <button className="secondary-button" onClick={() => exportMap()}>
            Export study map
          </button>
          <label>
            <Search size={17} />
            <input
              aria-label="Search your graph"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Find a concept"
            />
          </label>
        </div>
      </header>
      <div className="graph-layout">
        <section className="graph-canvas" aria-label="Concept relationship map">
          <div className="graph-legend">
            <span>
              <i className="stable" /> Verified
            </span>
            <span>
              <i className="developing" /> Developing
            </span>
            <span>
              <i className="review" /> Needs review
            </span>
            <span>
              <i className="recovered" /> Recovered
            </span>
          </div>
          {selected && (
            <div className="topic-connections">
              <MermaidDiagram
                source={diagram}
                title={`Connections around ${selected.label}`}
              />
              <button className="text-button" onClick={() => exportMap(true)}>
                Download Mermaid map
              </button>
            </div>
          )}
          <div className="topic-map-grid">
            {visible.map((node, index) => {
              const column = index % 4;
              const row = Math.floor(index / 4);
              return (
                <button
                  key={node.id}
                  className={`concept-node ${uiState(node.status)} ${selected?.id === node.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(node.id)}
                >
                  <span>{node.label}</span>
                  <small>{node.status.replaceAll("_", " ")}</small>
                </button>
              );
            })}
            {visible.length === 0 && (
              <div className="empty-state">No concept matches “{query}”.</div>
            )}
          </div>
        </section>
        <aside className="concept-inspector">
          <p className="eyebrow">Selected concept</p>
          <h2>{selected?.label || "No concept state yet"}</h2>
          {selected && (
            <span className={`status-pill ${uiState(selected.status)}`}>
              {selected.status.replaceAll("_", " ")}
            </span>
          )}
          <dl>
            <div>
              <dt>Subject</dt>
              <dd>
                {subjects.find((s) => s.subject_id === selected?.subject_id)
                  ?.name || "Not assigned"}
              </dd>
            </div>
            <div>
              <dt>Connected ideas</dt>
              <dd>
                {connected.length
                  ? connected.join(", ")
                  : "No projected relation yet"}
              </dd>
            </div>
          </dl>
          <button
            className="primary-button full"
            disabled={!selected?.subject_id}
            onClick={() =>
              selected?.subject_id &&
              onLearn({
                conceptId: selected.id,
                conceptName: selected.label,
                subjectId: selected.subject_id,
                courseId: courses.find(
                  (course) => course.subject_id === selected.subject_id,
                )?.course_id,
              })
            }
          >
            Learn this now <ArrowRight size={16} />
          </button>
        </aside>
      </div>
    </div>
  );
}
