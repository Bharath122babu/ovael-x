export type TeacherTab = "overview" | "roster" | "materials" | "graph" | "gaps";

export interface GraphNode {
  id: string;
  label: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface UnenrollTarget {
  id: string;
  username: string;
}
