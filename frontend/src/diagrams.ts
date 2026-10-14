import type { CausalGapCase } from "./types";
// Internal Mermaid IDs are generated locally. Backend IDs and labels never become syntax.
function label(value: string) {
  return value
    .slice(0, 160)
    .replaceAll("&", "#38;")
    .replaceAll('"', "#34;")
    .replaceAll("<", "#60;")
    .replaceAll(">", "#62;")
    .replaceAll("`", "#96;")
    .replace(/[\r\n]/g, " ");
}
export function gapMermaid(gap: CausalGapCase) {
  const nodes = gap.micrograph.nodes.slice(0, 40),
    ids = new Map(nodes.map((node, i) => [node.id, `n${i}`]));
  const lines = [
    "flowchart TB",
    ...nodes.map((node, i) => `n${i}["${label(node.label)}"]`),
  ];
  for (const edge of gap.micrograph.edges.slice(0, 80)) {
    const source = ids.get(edge.source),
      target = ids.get(edge.target);
    if (source && target)
      lines.push(
        `${source} -->|"${label(edge.relation.replaceAll("_", " "))}"| ${target}`,
      );
  }
  return lines.join("\n");
}
export function checkedMermaid(source: string) {
  if (source.length > 12000)
    throw new Error("This diagram is too large to display.");
  if (source.includes("%%{") || /^\s*---/.test(source))
    throw new Error("Diagram configuration overrides are not supported.");
  return source;
}
