import type { Edge, Node } from "reactflow";

export type NodeKind = "strategy" | "tactical" | "resource";
export type ModeSetting = "auto" | "strategy" | "tactical";
export type TacticalStatus = "todo" | "done";

export type GrimpoNodeData = {
  title: string;
  notes?: string;
  // Resource only:
  link?: string;
  // Tactical only:
  status?: TacticalStatus;
};

export type GrimpoNode = Node<GrimpoNodeData, NodeKind>;
export type GrimpoEdge = Edge;

export function seedGraph(): { nodes: GrimpoNode[]; edges: GrimpoEdge[] } {
  const nodes: GrimpoNode[] = [
    {
      id: "s1",
      type: "strategy",
      position: { x: 0, y: 0 },
      data: {
        title: "Project: Grimpo Lite",
        notes: "Big picture goal + why it matters.",
      },
    },
    {
      id: "s2",
      type: "strategy",
      position: { x: 360, y: -40 },
      data: {
        title: "Milestone: MVP Demo",
        notes: "Strategy map + execution tasks + research sources.",
      },
    },
    {
      id: "t1",
      type: "tactical",
      position: { x: 360, y: 140 },
      data: {
        title: "Build canvas + modes",
        notes: "Zoom out = strategic. Zoom in = tactical.",
        status: "todo",
      },
    },
    {
      id: "t2",
      type: "tactical",
      position: { x: 720, y: 160 },
      data: {
        title: "Add research nodes",
        notes: "Links + summaries so you don’t get lost.",
        status: "done",
      },
    },
    {
      id: "r1",
      type: "resource",
      position: { x: 720, y: -20 },
      data: {
        title: "Research: Dumbo Octopus",
        link: "https://en.wikipedia.org/wiki/Grimpoteuthis",
        notes: "Soft shapes + biolum glow. Cute sci-fi abyss vibe.",
      },
    },
  ];

  const edges: GrimpoEdge[] = [
    { id: "e-s1-s2", source: "s1", target: "s2", animated: true },
    { id: "e-s2-t1", source: "s2", target: "t1", animated: true },
    { id: "e-s2-t2", source: "s2", target: "t2", animated: true },
    { id: "e-r1-s1", source: "r1", target: "s1", animated: true },
  ];

  return { nodes, edges };
}


