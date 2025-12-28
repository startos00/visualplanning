export type AbyssalItemId =
  | "abyssal-rock"
  | "seaweed"
  | "bubble"
  | "small-coral"
  | "shrimp"
  | "plankton"
  | "starfish"
  | "sea-flowers"
  | "neon-sandcastle"
  | "big-coral"
  | "dumbo-octopus"
  | "crystalline-spire"
  | "turtle"
  | "shellfish"
  | "michelangelos-david"
  | "roman-ruin"
  | "sirens-tail"
  | "whales"
  | "lost-bounty";

export type AbyssalItemDef = {
  id: AbyssalItemId;
  name: string;
  descriptor: string;
  unlockAt: number;
  cost: number;
};

export type AbyssalInventory = Record<AbyssalItemId, number>;

export type AbyssalPlacedItem = {
  id: string;
  itemId: AbyssalItemId;
  x: number;
  y: number;
  scale?: number; // Size multiplier (0.5 = 50%, 2.0 = 200%), default: 1.0
  color?: string; // Hex color code or color name, optional
  zIndex?: number;
};

export const ABYSSAL_EVENT = "abyssal:update";

export const ABYSSAL_ITEMS: AbyssalItemDef[] = [
  // Unlock at 1 task
  { id: "abyssal-rock", name: "Abyssal Rock", descriptor: "Base decoration", unlockAt: 1, cost: 1 },
  { id: "seaweed", name: "Seaweed", descriptor: "Base decoration", unlockAt: 1, cost: 2 },
  { id: "bubble", name: "Bubble", descriptor: "Base decoration", unlockAt: 1, cost: 3 },
  { id: "small-coral", name: "Small Coral", descriptor: "Base decoration", unlockAt: 1, cost: 2 },
  { id: "shrimp", name: "Shrimp", descriptor: "Base decoration", unlockAt: 1, cost: 2 },
  { id: "plankton", name: "Plankton", descriptor: "Base decoration", unlockAt: 1, cost: 3 },
  { id: "starfish", name: "Starfish", descriptor: "Base decoration", unlockAt: 1, cost: 3 },
  { id: "sea-flowers", name: "Sea Flowers", descriptor: "Base decoration", unlockAt: 1, cost: 3 },
  // Unlock at 5 tasks
  { id: "neon-sandcastle", name: "Neon Sandcastle", descriptor: "Structure", unlockAt: 5, cost: 5 },
  { id: "big-coral", name: "Big Coral", descriptor: "Structure", unlockAt: 5, cost: 5 },
  { id: "dumbo-octopus", name: "Dumbo Octopus", descriptor: "Structure", unlockAt: 5, cost: 5 },
  { id: "whales", name: "Whales", descriptor: "Structure", unlockAt: 5, cost: 5 },
  // Unlock at 10 tasks
  { id: "crystalline-spire", name: "Crystalline Spire", descriptor: "The Glass Castle", unlockAt: 10, cost: 10 },
  { id: "turtle", name: "Turtle", descriptor: "Structure", unlockAt: 10, cost: 5 },
  { id: "shellfish", name: "Shellfish", descriptor: "Structure", unlockAt: 10, cost: 5 },
  // Unlock at 15 tasks
  { id: "michelangelos-david", name: "Michelangelo's David", descriptor: "Classical Sculpture", unlockAt: 15, cost: 10 },
  { id: "roman-ruin", name: "Roman Ruin", descriptor: "Classical Sculpture", unlockAt: 15, cost: 15 },
  // Unlock at 20 tasks
  { id: "sirens-tail", name: "Siren's Tail", descriptor: "The Mermaid", unlockAt: 20, cost: 20 },
  // Unlock at 50 tasks
  { id: "lost-bounty", name: "The Lost Bounty", descriptor: "Treasure Chest", unlockAt: 50, cost: 50 },
];

// Re-export state management functions
import {
  getSwallowedCount as getSwallowedCountFromState,
  setSwallowedCount as setSwallowedCountInState,
  getAbyssalCurrency as getAbyssalCurrencyFromState,
  setAbyssalCurrency as setAbyssalCurrencyInState,
  loadInventory as loadInventoryFromState,
  saveInventory as saveInventoryInState,
  loadGardenLayout as loadGardenLayoutFromState,
  saveGardenLayout as saveGardenLayoutInState,
  getAwardedTasks as getAwardedTasksFromState,
  setAwardedTasks as setAwardedTasksInState,
  loadAbyssalGardenState,
} from "./abyssalGardenState";

// Initialize state on module load (client-side only)
if (typeof window !== "undefined") {
  loadAbyssalGardenState().catch(() => {
    // Ignore initialization errors
  });
}

function canUseWindow(): boolean {
  return typeof window !== "undefined" && typeof window.dispatchEvent === "function";
}

export function getSwallowedCount(): number {
  return getSwallowedCountFromState();
}

export function setSwallowedCount(n: number) {
  setSwallowedCountInState(n).catch(() => {
    // Ignore errors
  });
}

export function getAbyssalCurrency(): number {
  return getAbyssalCurrencyFromState();
}

export function setAbyssalCurrency(n: number) {
  setAbyssalCurrencyInState(n).catch(() => {
    // Ignore errors
  });
}

export function getUnlockedItemIds(swallowedCount: number): AbyssalItemId[] {
  return ABYSSAL_ITEMS.filter((it) => swallowedCount >= it.unlockAt).map((it) => it.id);
}

export function loadInventory(): AbyssalInventory {
  return loadInventoryFromState();
}

export function saveInventory(inv: AbyssalInventory) {
  saveInventoryInState(inv).catch(() => {
    // Ignore errors
  });
}

export function loadGardenLayout(): AbyssalPlacedItem[] {
  return loadGardenLayoutFromState();
}

export function saveGardenLayout(layout: AbyssalPlacedItem[]) {
  const known = new Set<AbyssalItemId>(ABYSSAL_ITEMS.map((i) => i.id));
  const clean = layout
    .filter((p) => p && typeof p.id === "string" && known.has(p.itemId))
    .map((p, idx) => {
      // Validate and clamp scale (0.5 to 2.0)
      const scale = p.scale !== undefined && Number.isFinite(p.scale) 
        ? Math.max(0.5, Math.min(2.0, p.scale)) 
        : 1.0;
      
      // Validate color (hex format or known color names)
      let color = p.color;
      if (color && typeof color === "string") {
        // Basic validation: hex format or known color names
        const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        const knownColors = ["amber", "cyan", "teal", "pink", "magenta", "purple", "green", "gold", "coral"];
        if (!hexPattern.test(color) && !knownColors.includes(color.toLowerCase())) {
          color = undefined; // Invalid color, use default
        }
      } else {
        color = undefined;
      }

      return {
        id: p.id,
        itemId: p.itemId,
        x: Number.isFinite(p.x) ? p.x : 0,
        y: Number.isFinite(p.y) ? p.y : 0,
        scale,
        color,
        zIndex: Number.isFinite(p.zIndex ?? idx) ? (p.zIndex ?? idx) : idx,
      };
    });
  saveGardenLayoutInState(clean).catch(() => {
    // Ignore errors
  });
}

export function dispatchAbyssalUpdate(detail?: { newlyUnlockedItemIds?: AbyssalItemId[] }) {
  if (!canUseWindow()) return;
  try {
    window.dispatchEvent(new CustomEvent(ABYSSAL_EVENT, { detail }));
  } catch {
    // ignore
  }
}

export function awardForTaskCompletion(): {
  swallowedCount: number;
  abyssalCurrency: number;
  newlyUnlockedItemIds: AbyssalItemId[];
} {
  // If we can identify a task id, prevent awarding multiple times for the same task
  // (supports "undo complete" without enabling re-toggle farming).
  return awardForTaskCompletionForTaskId(null);
}

export function awardForTaskCompletionForTaskId(taskId: string | null): {
  swallowedCount: number;
  abyssalCurrency: number;
  newlyUnlockedItemIds: AbyssalItemId[];
} {
  if (taskId) {
    const awarded = getAwardedTasksFromState();
    if (awarded[taskId]) {
      // Already credited for this task; no-op.
      return {
        swallowedCount: getSwallowedCount(),
        abyssalCurrency: getAbyssalCurrency(),
        newlyUnlockedItemIds: [],
      };
    }
    const updated = { ...awarded, [taskId]: 1 };
    setAwardedTasksInState(updated).catch(() => {
      // Ignore errors
    });
  }

  const prevSwallowed = getSwallowedCount();
  const prevUnlocked = new Set(getUnlockedItemIds(prevSwallowed));

  const nextSwallowed = prevSwallowed + 1;
  const nextCurrency = getAbyssalCurrency() + 1;

  setSwallowedCount(nextSwallowed);
  setAbyssalCurrency(nextCurrency);

  const nextUnlocked = getUnlockedItemIds(nextSwallowed);
  const newlyUnlocked = nextUnlocked.filter((id) => !prevUnlocked.has(id));

  dispatchAbyssalUpdate({ newlyUnlockedItemIds: newlyUnlocked });

  return { swallowedCount: nextSwallowed, abyssalCurrency: nextCurrency, newlyUnlockedItemIds: newlyUnlocked };
}

export function tryPurchase(itemId: AbyssalItemId): { ok: true } | { ok: false; reason: "locked" | "insufficient" } {
  const swallowed = getSwallowedCount();
  const def = ABYSSAL_ITEMS.find((i) => i.id === itemId);
  if (!def) return { ok: false, reason: "locked" };
  if (swallowed < def.unlockAt) return { ok: false, reason: "locked" };

  const currency = getAbyssalCurrency();
  if (currency < def.cost) return { ok: false, reason: "insufficient" };

  setAbyssalCurrency(currency - def.cost);
  const inv = loadInventory();
  inv[itemId] = (inv[itemId] ?? 0) + 1;
  saveInventory(inv);

  dispatchAbyssalUpdate();
  return { ok: true };
}

export function tryPlaceFromInventory(args: {
  itemId: AbyssalItemId;
  x: number;
  y: number;
}): { ok: true; placed: AbyssalPlacedItem } | { ok: false; reason: "none-owned" } {
  const inv = loadInventory();
  if ((inv[args.itemId] ?? 0) <= 0) return { ok: false, reason: "none-owned" };

  inv[args.itemId] = Math.max(0, Math.floor((inv[args.itemId] ?? 0) - 1));
  saveInventory(inv);

  const placed: AbyssalPlacedItem = {
    id: `abyssal-${args.itemId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    itemId: args.itemId,
    x: args.x,
    y: args.y,
    scale: 1.0, // Default scale
    zIndex: Date.now(),
  };

  const layout = loadGardenLayout();
  layout.push(placed);
  saveGardenLayout(layout);

  dispatchAbyssalUpdate();
  return { ok: true, placed };
}

export function removePlacedItem(id: string): { ok: true } | { ok: false } {
  const layout = loadGardenLayout();
  const idx = layout.findIndex((p) => p.id === id);
  if (idx < 0) return { ok: false };
  const [removed] = layout.splice(idx, 1);
  saveGardenLayout(layout);

  const inv = loadInventory();
  inv[removed.itemId] = (inv[removed.itemId] ?? 0) + 1;
  saveInventory(inv);

  dispatchAbyssalUpdate();
  return { ok: true };
}

export function updatePlacedItemPosition(args: { id: string; x: number; y: number }) {
  const layout = loadGardenLayout();
  const idx = layout.findIndex((p) => p.id === args.id);
  if (idx < 0) return;
  layout[idx] = { ...layout[idx], x: args.x, y: args.y, zIndex: Date.now() };
  saveGardenLayout(layout);
  dispatchAbyssalUpdate();
}

export function updatePlacedItemScale(args: { id: string; scale: number }) {
  const layout = loadGardenLayout();
  const idx = layout.findIndex((p) => p.id === args.id);
  if (idx < 0) return;
  const clampedScale = Math.max(0.5, Math.min(2.0, args.scale));
  layout[idx] = { ...layout[idx], scale: clampedScale, zIndex: Date.now() };
  saveGardenLayout(layout);
  dispatchAbyssalUpdate();
}

export function updatePlacedItemColor(args: { id: string; color?: string }) {
  const layout = loadGardenLayout();
  const idx = layout.findIndex((p) => p.id === args.id);
  if (idx < 0) return;
  
  // Validate color
  let color = args.color;
  if (color && typeof color === "string") {
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const knownColors = ["amber", "cyan", "teal", "pink", "magenta", "purple", "green", "gold", "coral"];
    if (!hexPattern.test(color) && !knownColors.includes(color.toLowerCase())) {
      color = undefined; // Invalid color, use default
    }
  } else {
    color = undefined;
  }
  
  layout[idx] = { ...layout[idx], color, zIndex: Date.now() };
  saveGardenLayout(layout);
  dispatchAbyssalUpdate();
}


