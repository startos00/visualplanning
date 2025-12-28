import type { Edge, Viewport } from "reactflow";
import type { GrimpoNode, ModeSetting } from "./graph";

export type PersistedState = {
  nodes: GrimpoNode[];
  edges: Edge[];
  modeSetting: ModeSetting;
  viewport?: Viewport;
};

/**
 * Load graph state from the database via API route.
 */
export async function loadState(): Promise<PersistedState | null> {
  try {
    const response = await fetch("/api/graph");
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data as PersistedState | null;
  } catch {
    return null;
  }
}

/**
 * Save graph state to the database via API route.
 */
export async function saveState(state: PersistedState): Promise<void> {
  try {
    await fetch("/api/graph", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(state),
    });
  } catch {
    // ignore (network error / server error)
  }
}

/**
 * Clear graph state from the database via API route.
 */
export async function clearState(): Promise<void> {
  try {
    await fetch("/api/graph", {
      method: "DELETE",
    });
  } catch {
    // ignore
  }
}


