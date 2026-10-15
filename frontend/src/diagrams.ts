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

// Palette synchronization for frontend/src/diagrams.ts & frontend/src/learningVisuals.ts
export const OVAEL_BRAND_THEME = {
  navy: "#303C6C",
  yellow: "#FBE8A6",
  coral: "#F4976C",
  softBlue: "#B4DFE5",
  paleCyan: "#D2FDFF",
  surface: "#FFFFFF",
} as const;

export const MERMAID_THEME_VARIABLES = {
  primaryColor: "#D2FDFF", // Pale Cyan node fill
  primaryTextColor: "#303C6C", // Navy node text (8.07:1 AAA contrast)
  primaryBorderColor: "#303C6C", // Navy node border
  secondaryColor: "#FBE8A6", // Warm Yellow secondary/milestone node
  secondaryTextColor: "#303C6C", // Navy text on Yellow (7.02:1 AAA contrast)
  tertiaryColor: "#B4DFE5", // Soft Blue supporting cluster
  tertiaryTextColor: "#303C6C", // Navy text on Soft Blue
  lineColor: "#303C6C", // Navy causal edges
  edgeLabelBackground: "#FFFFFF",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif',
};
