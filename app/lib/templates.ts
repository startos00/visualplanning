import type { GrimpoEdge, GrimpoNode, NodeKind } from "@/app/lib/graph";

export type ThinkingRole =
  | "General"
  | "Designer/Architect"
  | "Scientist/Academic"
  | "Founder"
  | "Engineer";

export type ThinkingPattern = "blank" | "divergent" | "convergent";

type Point = { x: number; y: number };

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

type NodeSpec = {
  kind: NodeKind;
  title: string;
};

type EdgeSpec = {
  from: number;
  to: number;
};

type TemplateDef = {
  nodes: NodeSpec[];
  edges: EdgeSpec[];
  positions: Point[]; // relative to anchor; must be same length as nodes
};

function mkEdgeChain(count: number): EdgeSpec[] {
  // 0->1->2->...->count-1
  return Array.from({ length: Math.max(0, count - 1) }, (_, i) => ({ from: i, to: i + 1 }));
}

function mkEdgesFromCenter(count: number): EdgeSpec[] {
  // 0 -> 1..count-1
  return Array.from({ length: Math.max(0, count - 1) }, (_, i) => ({ from: 0, to: i + 1 }));
}

function dataFor(kind: NodeKind, title: string) {
  if (kind === "tactical") return { title, notes: "", status: "todo" as const };
  if (kind === "resource") return { title, notes: "", link: "", pdfUrl: "", videoUrl: "" };
  return { title, notes: "" };
}

// Shared coordinate sets (hardcoded) to keep layouts readable.
const RADIAL_POSITIONS: Point[] = [
  { x: 0, y: 0 }, // center
  { x: 0, y: -260 },
  { x: 260, y: 0 },
  { x: 0, y: 260 },
  { x: -260, y: 0 },
  { x: 185, y: -185 },
  { x: 185, y: 185 },
  { x: -185, y: 185 },
  { x: -185, y: -185 },
  { x: 0, y: -360 },
  { x: 360, y: 0 },
  { x: 0, y: 360 },
  { x: -360, y: 0 },
  { x: 325, y: -325 },
  { x: 325, y: 325 },
  { x: -325, y: 325 },
  { x: -325, y: -325 },
  { x: 0, y: -460 },
  { x: 460, y: 0 },
  { x: 0, y: 460 },
  { x: -460, y: 0 },
];

const PIPELINE_POSITIONS: Point[] = [
  { x: 0, y: -360 },
  { x: 0, y: -240 },
  { x: 0, y: -120 },
  { x: 0, y: 0 },
  { x: 0, y: 120 },
  { x: 0, y: 240 },
  { x: 0, y: 360 },
  { x: 0, y: 480 },
  { x: 0, y: 600 },
  { x: 0, y: 720 },
  { x: 0, y: 840 },
  { x: 0, y: 960 },
];

function takePositions(base: Point[], count: number): Point[] {
  if (count <= base.length) return base.slice(0, count);
  // Fallback: extend downward (pipeline) or outward (radial-ish) deterministically.
  const out = base.slice();
  for (let i = base.length; i < count; i++) {
    const prev = out[out.length - 1] ?? { x: 0, y: 0 };
    out.push({ x: prev.x, y: prev.y + 120 });
  }
  return out;
}

function templateFor(role: ThinkingRole, pattern: Exclude<ThinkingPattern, "blank">): TemplateDef {
  // Note: these definitions are kept in sync with docs/features/role-specific-thinking-templates.md
  if (pattern === "divergent") {
    switch (role) {
      case "General": {
        const nodes: NodeSpec[] = [
          { kind: "strategy", title: "Main Topic" },
          { kind: "strategy", title: "Sub-Idea A" },
          { kind: "strategy", title: "Sub-Idea B" },
          { kind: "strategy", title: "Sub-Idea C" },
          { kind: "strategy", title: "Sub-Idea D" },
          { kind: "strategy", title: "Constraints" },
          { kind: "strategy", title: "Stakeholders" },
          { kind: "strategy", title: "Success Criteria" },
          { kind: "resource", title: "Reference / Link" },
          { kind: "resource", title: "Examples / Inspiration" },
        ];
        return {
          nodes,
          edges: mkEdgesFromCenter(nodes.length),
          positions: takePositions(RADIAL_POSITIONS, nodes.length),
        };
      }
      case "Designer/Architect": {
        const nodes: NodeSpec[] = [
          { kind: "strategy", title: "Design Direction" },
          { kind: "resource", title: "Reference 1" },
          { kind: "resource", title: "Reference 2" },
          { kind: "resource", title: "Competitors / Comparables" },
          { kind: "resource", title: "Patterns / Design System References" },
          { kind: "strategy", title: "User Needs" },
          { kind: "strategy", title: "Constraints" },
          { kind: "strategy", title: "Design Principles" },
          { kind: "strategy", title: "Moodboard Keywords" },
          { kind: "strategy", title: "Concept Option A" },
          { kind: "strategy", title: "Concept Option B" },
        ];
        return {
          nodes,
          edges: mkEdgesFromCenter(nodes.length),
          positions: takePositions(RADIAL_POSITIONS, nodes.length),
        };
      }
      case "Scientist/Academic": {
        const nodes: NodeSpec[] = [
          { kind: "strategy", title: "Research Question" },
          { kind: "resource", title: "Key Papers / Prior Work" },
          { kind: "resource", title: "Related Work Map" },
          { kind: "resource", title: "Dataset(s)" },
          { kind: "resource", title: "Lab Notes / Notebook" },
          { kind: "strategy", title: "Variables" },
          { kind: "strategy", title: "Methods" },
          { kind: "strategy", title: "Threats to Validity" },
          { kind: "strategy", title: "Assumptions" },
          { kind: "strategy", title: "Expected Outcomes" },
          { kind: "strategy", title: "Open Questions" },
        ];
        return {
          nodes,
          edges: mkEdgesFromCenter(nodes.length),
          positions: takePositions(RADIAL_POSITIONS, nodes.length),
        };
      }
      case "Founder": {
        const nodes: NodeSpec[] = [
          { kind: "strategy", title: "Value Proposition" },
          { kind: "strategy", title: "ICP (Ideal Customer)" },
          { kind: "strategy", title: "Job To Be Done" },
          { kind: "strategy", title: "Pain Points" },
          { kind: "strategy", title: "Solution Ideas" },
          { kind: "strategy", title: "Differentiation" },
          { kind: "strategy", title: "Pricing Hypotheses" },
          { kind: "strategy", title: "Distribution Channels" },
          { kind: "resource", title: "Competitors" },
          { kind: "resource", title: "Competitive Matrix" },
          { kind: "resource", title: "Market Evidence / Links" },
          { kind: "resource", title: "Interview Transcripts / Notes" },
          { kind: "strategy", title: "Risks / Unknowns" },
          { kind: "strategy", title: "Moat / Advantage" },
        ];
        return {
          nodes,
          edges: mkEdgesFromCenter(nodes.length),
          positions: takePositions(RADIAL_POSITIONS, nodes.length),
        };
      }
      case "Engineer": {
        const nodes: NodeSpec[] = [
          { kind: "strategy", title: "System Architecture" },
          { kind: "strategy", title: "Frontend" },
          { kind: "strategy", title: "Backend" },
          { kind: "strategy", title: "Database" },
          { kind: "strategy", title: "DevOps" },
          { kind: "strategy", title: "Data Model" },
          { kind: "strategy", title: "APIs / Contracts" },
          { kind: "strategy", title: "Performance Risks" },
          { kind: "strategy", title: "Security Risks" },
          { kind: "strategy", title: "Observability" },
          { kind: "strategy", title: "Dependencies" },
          { kind: "resource", title: "Existing Docs / ADRs" },
          { kind: "resource", title: "Metrics / Logs" },
          { kind: "resource", title: "Docs / Links" },
        ];
        return {
          nodes,
          edges: mkEdgesFromCenter(nodes.length),
          positions: takePositions(RADIAL_POSITIONS, nodes.length),
        };
      }
    }
  }

  // convergent (pipeline)
  switch (role) {
    case "General": {
      const nodes: NodeSpec[] = [
        { kind: "strategy", title: "Goal / Outcome" },
        { kind: "resource", title: "Requirements / Context" },
        { kind: "resource", title: "Research / Notes" },
        { kind: "strategy", title: "Plan" },
        { kind: "tactical", title: "Task List (tasks)" },
        { kind: "tactical", title: "Blockers / Risks (tasks)" },
        { kind: "tactical", title: "Execution Sprint (tasks)" },
        { kind: "strategy", title: "Review / Next Iteration" },
      ];
      return {
        nodes,
        edges: mkEdgeChain(nodes.length),
        positions: takePositions(PIPELINE_POSITIONS, nodes.length),
      };
    }
    case "Designer/Architect": {
      const nodes: NodeSpec[] = [
        { kind: "resource", title: "User/Domain Research" },
        { kind: "resource", title: "Requirements / Docs" },
        { kind: "strategy", title: "Brief / Strategy" },
        { kind: "strategy", title: "Information Architecture / System" },
        { kind: "resource", title: "Design System / Tokens" },
        { kind: "tactical", title: "Wireframes (tasks)" },
        { kind: "tactical", title: "Prototype (tasks)" },
        { kind: "tactical", title: "Critique + Iterate (tasks)" },
        { kind: "tactical", title: "Ship + Measure (tasks)" },
      ];
      return {
        nodes,
        edges: mkEdgeChain(nodes.length),
        positions: takePositions(PIPELINE_POSITIONS, nodes.length),
      };
    }
    case "Scientist/Academic": {
      const nodes: NodeSpec[] = [
        { kind: "strategy", title: "Hypothesis" },
        { kind: "strategy", title: "Experimental Design" },
        { kind: "resource", title: "Protocol / Pre-Registration" },
        { kind: "resource", title: "Dataset(s) / Materials" },
        { kind: "resource", title: "Code / Notebook" },
        { kind: "tactical", title: "Instrument / Setup (tasks)" },
        { kind: "tactical", title: "Data Collection (tasks)" },
        { kind: "tactical", title: "Analysis (tasks)" },
        { kind: "strategy", title: "Results Summary" },
        { kind: "tactical", title: "Write-up (tasks)" },
        { kind: "strategy", title: "Conclusion / Next Questions" },
      ];
      return {
        nodes,
        edges: mkEdgeChain(nodes.length),
        positions: takePositions(PIPELINE_POSITIONS, nodes.length),
      };
    }
    case "Founder": {
      const nodes: NodeSpec[] = [
        { kind: "strategy", title: "Assumptions to Test" },
        { kind: "resource", title: "Competitor Notes / Links" },
        { kind: "tactical", title: "Interview Script (tasks)" },
        { kind: "tactical", title: "Customer Interviews (tasks)" },
        { kind: "resource", title: "Evidence / Notes" },
        { kind: "strategy", title: "Insights + Decision" },
        { kind: "strategy", title: "MVP Scope" },
        { kind: "tactical", title: "Build MVP (tasks)" },
        { kind: "tactical", title: "Launch (tasks)" },
        { kind: "resource", title: "Metrics / Dashboard" },
        { kind: "tactical", title: "Measure (tasks)" },
        { kind: "strategy", title: "Iterate / Pivot" },
      ];
      return {
        nodes,
        edges: mkEdgeChain(nodes.length),
        positions: takePositions(PIPELINE_POSITIONS, nodes.length),
      };
    }
    case "Engineer": {
      const nodes: NodeSpec[] = [
        { kind: "strategy", title: "Spec" },
        { kind: "strategy", title: "Technical Design" },
        { kind: "resource", title: "RFC / ADR" },
        { kind: "resource", title: "API Docs" },
        { kind: "tactical", title: "Implement (tasks)" },
        { kind: "tactical", title: "Code Review (tasks)" },
        { kind: "tactical", title: "Test (tasks)" },
        { kind: "tactical", title: "Deploy (tasks)" },
        { kind: "resource", title: "Runbook / Ops Notes" },
        { kind: "tactical", title: "Monitor + Alerting (tasks)" },
        { kind: "strategy", title: "Postmortem / Learnings" },
        { kind: "strategy", title: "Backlog / Next Iteration" },
      ];
      return {
        nodes,
        edges: mkEdgeChain(nodes.length),
        positions: takePositions(PIPELINE_POSITIONS, nodes.length),
      };
    }
  }
}

export function buildThinkingPatternTemplate(args: {
  role: ThinkingRole;
  pattern: Exclude<ThinkingPattern, "blank">;
  anchor: Point;
}): { nodes: GrimpoNode[]; edges: GrimpoEdge[] } {
  const { role, pattern, anchor } = args;

  const stamp = Date.now();
  const nonce = Math.random().toString(16).slice(2, 8);
  const roleSlug = slugify(role);
  const patternSlug = slugify(pattern);

  const makeNodeId = (index: number) => `tp-${roleSlug}-${patternSlug}-${stamp}-${nonce}-${index}`;
  const makeEdgeId = (source: string, target: string, index: number) =>
    `e-${source}-${target}-${stamp}-${nonce}-${index}`;

  const def = templateFor(role, pattern);
  const nodes: GrimpoNode[] = def.nodes.map((n, i) => ({
    id: makeNodeId(i),
    type: n.kind,
    position: add(anchor, def.positions[i] ?? { x: 0, y: 0 }),
    data: dataFor(n.kind, n.title),
  }));

  const edges: GrimpoEdge[] = def.edges.map((e, i) => {
    const source = nodes[e.from]?.id ?? makeNodeId(e.from);
    const target = nodes[e.to]?.id ?? makeNodeId(e.to);
    return {
      id: makeEdgeId(source, target, i),
      source,
      target,
      animated: true,
    };
  });

  return { nodes, edges };
}


