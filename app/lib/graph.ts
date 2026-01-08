import type { Edge, Node } from "reactflow";

export type NodeKind = "strategy" | "tactical" | "resource" | "sketch" | "media" | "lightbox";
export type ModeSetting = "auto" | "strategy" | "tactical";
export type TacticalStatus = "todo" | "done";

export type GrimpoNodeData = {
  title: string;
  notes?: string;
  // Resource only:
  link?: string;
  pdfUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  imageOpacity?: number;
  isLightbox?: boolean;
  // Tactical only:
  status?: TacticalStatus;
  // Visual customization:
  deadline?: string; // ISO date string: "YYYY-MM-DD"
  color?: string; // Hex color string: "#22d3ee"
  locked?: boolean;
};

// React Flow's `useNodesState` currently types node `type` as `string | undefined`,
// so we align our app-level node type with that to avoid TS incompatibilities.
export type GrimpoNode = Node<GrimpoNodeData, string | undefined>;
export type GrimpoEdge = Edge;

export function seedGraph(): { nodes: GrimpoNode[]; edges: GrimpoEdge[] } {
  // Default: blank canvas (no nodes/edges). Users can spawn templates via the
  // TemplateSpawner overlay.
  return { nodes: [], edges: [] };
}


