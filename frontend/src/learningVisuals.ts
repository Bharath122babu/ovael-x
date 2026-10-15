export function parseLearningVisual(kind: string, source: string) {
  if (source.length > 12000) throw new Error("Visual is too large");
  const data = JSON.parse(source);
  if (
    kind === "steps" &&
    Array.isArray(data) &&
    data.length > 0 &&
    data.length <= 12 &&
    data.every(
      (item) =>
        typeof item.title === "string" &&
        item.title.length <= 160 &&
        typeof item.text === "string" &&
        item.text.length <= 2000,
    )
  )
    return data as Array<{ title: string; text: string }>;
  if (
    kind === "chart" &&
    Array.isArray(data) &&
    data.length > 0 &&
    data.length <= 20 &&
    data.every(
      (item) =>
        typeof item.label === "string" &&
        item.label.length <= 160 &&
        typeof item.value === "number" &&
        Number.isFinite(item.value) &&
        Math.abs(item.value) <= 1e12,
    )
  )
    return data as Array<{ label: string; value: number }>;
  throw new Error("Unsupported visual data");
}

export function topicMermaid(
  nodes: Array<{ id: string; label: string }>,
  edges: Array<{ source: string; target: string; relation: string }>,
) {
  const chosen = nodes.slice(0, 60);
  const ids = new Map(chosen.map((node, index) => [node.id, `topic${index}`]));
  const escape = (text: string) =>
    text
      .slice(0, 160)
      .replaceAll("&", "#38;")
      .replaceAll('"', "#34;")
      .replaceAll("<", "#60;")
      .replaceAll(">", "#62;")
      .replaceAll("`", "#96;")
      .replace(/[\r\n]/g, " ");
  return [
    "flowchart LR",
    ...chosen.map((node, index) => `topic${index}["${escape(node.label)}"]`),
    ...edges
      .slice(0, 100)
      .flatMap((edge) =>
        ids.has(edge.source) && ids.has(edge.target)
          ? [
              `${ids.get(edge.source)} -->|"${escape(edge.relation.replaceAll("_", " ").toLowerCase())}"| ${ids.get(edge.target)}`,
            ]
          : [],
      ),
  ].join("\n");
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
