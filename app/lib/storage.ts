import type { Edge, Viewport } from "reactflow";
import type { GrimpoNode, ModeSetting } from "./graph";

const STORAGE_KEY = "grimpoLite:v1";

export type PersistedState = {
  nodes: GrimpoNode[];
  edges: Edge[];
  modeSetting: ModeSetting;
  viewport?: Viewport;
};

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore (storage full / blocked)
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}


