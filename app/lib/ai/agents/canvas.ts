/**
 * Canvas Mutation Service — allows Grimpy to create, update, and delete nodes
 * directly on the project canvas.
 *
 * Uses a read-modify-write pattern against the projects table.
 * After mutations, the orchestrator sends a "canvasUpdated" event
 * so the frontend reloads the canvas.
 */

import { db } from "@/app/lib/db";
import { projects } from "@/app/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { GrimpoNode, GrimpoNodeData, NodeKind, TacticalStatus } from "@/app/lib/graph";
import type { Edge } from "reactflow";

// ─── Types ──────────────────────────────────────────────────────

export interface CreateNodeInput {
  projectId: string;
  userId: string;
  type: NodeKind;
  title: string;
  notes?: string;
  status?: TacticalStatus;
  deadline?: string;
  link?: string;
  color?: string;
  position?: { x: number; y: number };
}

export interface UpdateNodeInput {
  projectId: string;
  userId: string;
  nodeId: string;
  title?: string;
  notes?: string;
  status?: TacticalStatus;
  deadline?: string;
  color?: string;
}

export interface DeleteNodeInput {
  projectId: string;
  userId: string;
  nodeId: string;
}

export interface ConnectNodesInput {
  projectId: string;
  userId: string;
  sourceId: string;
  targetId: string;
  label?: string;
  direction?: "vertical" | "horizontal";
}

export interface CreateMultipleNodesInput {
  projectId: string;
  userId: string;
  nodes: Array<{
    type: NodeKind;
    title: string;
    notes?: string;
    status?: TacticalStatus;
    deadline?: string;
    link?: string;
    color?: string;
  }>;
  autoConnect?: boolean; // Connect nodes in sequence
}

// ─── Helpers ────────────────────────────────────────────────────

async function getProjectNodesEdges(projectId: string, userId: string) {
  const [project] = await db
    .select({ nodes: projects.nodes, edges: projects.edges })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  if (!project) throw new Error("Project not found");

  return {
    nodes: (project.nodes || []) as GrimpoNode[],
    edges: (project.edges || []) as Edge[],
  };
}

async function saveProjectNodesEdges(
  projectId: string,
  userId: string,
  nodes: GrimpoNode[],
  edges: Edge[]
) {
  await db
    .update(projects)
    .set({ nodes, edges, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));
}

/**
 * Generate a grid position for new nodes so they don't stack on top of each other.
 * Node width is 340px, so we use 400px horizontal spacing (340 + 60 gap).
 * Vertical spacing is 280px to leave room for content.
 */
function generatePosition(existingCount: number, baseX = 200, baseY = 200): { x: number; y: number } {
  const col = existingCount % 4;
  const row = Math.floor(existingCount / 4);
  return {
    x: baseX + col * 400,
    y: baseY + row * 280,
  };
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Create a single node on the canvas.
 */
export async function createCanvasNode(input: CreateNodeInput): Promise<{
  success: boolean;
  nodeId: string;
  message: string;
}> {
  try {
    const { nodes, edges } = await getProjectNodesEdges(input.projectId, input.userId);

    const nodeId = `${input.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const position = input.position || generatePosition(nodes.length);

    const data: GrimpoNodeData = {
      title: input.title,
      notes: input.notes,
      status: input.type === "tactical" ? (input.status || "todo") : undefined,
      deadline: input.deadline,
      link: input.type === "resource" ? input.link : undefined,
      color: input.color,
    };

    const newNode: GrimpoNode = {
      id: nodeId,
      type: input.type,
      position,
      data,
    };

    nodes.push(newNode);
    await saveProjectNodesEdges(input.projectId, input.userId, nodes, edges);

    return {
      success: true,
      nodeId,
      message: `Created ${input.type} node: "${input.title}"`,
    };
  } catch (error) {
    console.error("Failed to create canvas node:", error);
    return { success: false, nodeId: "", message: String(error) };
  }
}

/**
 * Create multiple nodes at once (e.g., from a plan decomposition).
 * Uses type-aware layout so nodes are grouped by type in rows
 * and never overlap each other.
 */
export async function createMultipleCanvasNodes(input: CreateMultipleNodesInput): Promise<{
  success: boolean;
  nodeIds: string[];
  message: string;
}> {
  try {
    const { nodes, edges } = await getProjectNodesEdges(input.projectId, input.userId);

    // Find a clear area below existing nodes
    let maxY = 200;
    for (const n of nodes) {
      if (n.position && n.position.y > maxY) {
        maxY = n.position.y;
      }
    }
    const baseY = maxY + 300; // Start below existing content
    const baseX = 200;
    const COL_GAP = 400; // 340px node width + 60px gap
    const ROW_GAP = 280;
    const COLS = 3;

    // Group new nodes by type for organized layout
    const typeOrder: NodeKind[] = ["northstar", "vision", "strategy", "operations", "tactical", "resource"];
    const grouped = new Map<NodeKind, typeof input.nodes>();
    for (const n of input.nodes) {
      if (!grouped.has(n.type)) grouped.set(n.type, []);
      grouped.get(n.type)!.push(n);
    }

    const newNodeIds: string[] = [];
    let currentRow = 0;

    for (const type of typeOrder) {
      const group = grouped.get(type);
      if (!group || group.length === 0) continue;

      for (let i = 0; i < group.length; i++) {
        const n = group[i];
        const nodeId = `${n.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const col = i % COLS;
        const rowOffset = Math.floor(i / COLS);

        const position = {
          x: baseX + col * COL_GAP,
          y: baseY + (currentRow + rowOffset) * ROW_GAP,
        };

        const data: GrimpoNodeData = {
          title: n.title,
          notes: n.notes,
          status: n.type === "tactical" ? (n.status || "todo") : undefined,
          deadline: n.deadline,
          link: n.type === "resource" ? n.link : undefined,
          color: n.color,
        };

        nodes.push({ id: nodeId, type: n.type, position, data });
        newNodeIds.push(nodeId);
      }

      // Advance rows past this group
      currentRow += Math.ceil(group.length / COLS);
    }

    // Auto-connect nodes in sequence if requested (using vertical handles)
    if (input.autoConnect && newNodeIds.length > 1) {
      for (let i = 0; i < newNodeIds.length - 1; i++) {
        edges.push({
          id: `edge-${newNodeIds[i]}-${newNodeIds[i + 1]}`,
          source: newNodeIds[i],
          target: newNodeIds[i + 1],
          sourceHandle: "bottom",
          targetHandle: "top",
        });
      }
    }

    await saveProjectNodesEdges(input.projectId, input.userId, nodes, edges);

    return {
      success: true,
      nodeIds: newNodeIds,
      message: `Created ${newNodeIds.length} nodes on the canvas`,
    };
  } catch (error) {
    console.error("Failed to create multiple canvas nodes:", error);
    return { success: false, nodeIds: [], message: String(error) };
  }
}

/**
 * Update an existing node's data.
 */
export async function updateCanvasNode(input: UpdateNodeInput): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { nodes, edges } = await getProjectNodesEdges(input.projectId, input.userId);

    const nodeIdx = nodes.findIndex((n) => n.id === input.nodeId);
    if (nodeIdx === -1) {
      return { success: false, message: `Node ${input.nodeId} not found` };
    }

    const node = nodes[nodeIdx];
    if (input.title !== undefined) node.data.title = input.title;
    if (input.notes !== undefined) node.data.notes = input.notes;
    if (input.status !== undefined) node.data.status = input.status;
    if (input.deadline !== undefined) node.data.deadline = input.deadline;
    if (input.color !== undefined) node.data.color = input.color;

    nodes[nodeIdx] = node;
    await saveProjectNodesEdges(input.projectId, input.userId, nodes, edges);

    return { success: true, message: `Updated node: "${node.data.title}"` };
  } catch (error) {
    console.error("Failed to update canvas node:", error);
    return { success: false, message: String(error) };
  }
}

/**
 * Delete a node and its connected edges.
 */
export async function deleteCanvasNode(input: DeleteNodeInput): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { nodes, edges } = await getProjectNodesEdges(input.projectId, input.userId);

    const nodeIdx = nodes.findIndex((n) => n.id === input.nodeId);
    if (nodeIdx === -1) {
      return { success: false, message: `Node ${input.nodeId} not found` };
    }

    const deletedTitle = nodes[nodeIdx].data.title;
    const filteredNodes = nodes.filter((n) => n.id !== input.nodeId);
    const filteredEdges = edges.filter(
      (e) => e.source !== input.nodeId && e.target !== input.nodeId
    );

    await saveProjectNodesEdges(input.projectId, input.userId, filteredNodes, filteredEdges);

    return { success: true, message: `Deleted node: "${deletedTitle}"` };
  } catch (error) {
    console.error("Failed to delete canvas node:", error);
    return { success: false, message: String(error) };
  }
}

/**
 * Connect two nodes with an edge.
 */
export async function connectCanvasNodes(input: ConnectNodesInput): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const { nodes, edges } = await getProjectNodesEdges(input.projectId, input.userId);

    const sourceExists = nodes.some((n) => n.id === input.sourceId);
    const targetExists = nodes.some((n) => n.id === input.targetId);
    if (!sourceExists || !targetExists) {
      return { success: false, message: "Source or target node not found" };
    }

    // Check if edge already exists
    const edgeExists = edges.some(
      (e) => e.source === input.sourceId && e.target === input.targetId
    );
    if (edgeExists) {
      return { success: true, message: "Connection already exists" };
    }

    const isVertical = input.direction !== "horizontal";
    edges.push({
      id: `edge-${input.sourceId}-${input.targetId}`,
      source: input.sourceId,
      target: input.targetId,
      sourceHandle: isVertical ? "bottom" : "right",
      targetHandle: isVertical ? "top" : "left",
      label: input.label,
    });

    await saveProjectNodesEdges(input.projectId, input.userId, nodes, edges);

    return { success: true, message: `Connected nodes` };
  } catch (error) {
    console.error("Failed to connect canvas nodes:", error);
    return { success: false, message: String(error) };
  }
}
