/**
 * Client-side state cache for Abyssal Garden data.
 * This cache is populated from the database and kept in sync via API calls.
 */

import type {
  AbyssalInventory,
  AbyssalPlacedItem,
  AbyssalItemId,
} from "./abyssalGarden";

type AbyssalGardenState = {
  swallowedCount: number;
  abyssalCurrency: number;
  inventory: AbyssalInventory;
  gardenLayout: AbyssalPlacedItem[];
  awardedTasks: Record<string, unknown>;
};

let stateCache: AbyssalGardenState | null = null;
let isLoading = false;
let loadPromise: Promise<void> | null = null;

const defaultInventory: AbyssalInventory = {
  "abyssal-rock": 0,
  "neon-sandcastle": 0,
  "crystalline-spire": 0,
  "sirens-tail": 0,
  "lost-bounty": 0,
};

const defaultState: AbyssalGardenState = {
  swallowedCount: 0,
  abyssalCurrency: 0,
  inventory: defaultInventory,
  gardenLayout: [],
  awardedTasks: {},
};

/**
 * Load state from the database and populate the cache.
 */
export async function loadAbyssalGardenState(): Promise<void> {
  if (isLoading && loadPromise) {
    return loadPromise;
  }

  isLoading = true;
  loadPromise = (async () => {
    try {
      const response = await fetch("/api/abyssal-garden");
      if (response.ok) {
        const data = await response.json();
        stateCache = {
          swallowedCount: data.swallowedCount ?? 0,
          abyssalCurrency: data.abyssalCurrency ?? 0,
          inventory: data.inventory ?? defaultInventory,
          gardenLayout: data.gardenLayout ?? [],
          awardedTasks: data.awardedTasks ?? {},
        };
      } else {
        stateCache = { ...defaultState };
      }
    } catch {
      stateCache = { ...defaultState };
    } finally {
      isLoading = false;
      loadPromise = null;
    }
  })();

  return loadPromise;
}

/**
 * Get the current state cache (synchronous).
 * Returns default state if cache hasn't been loaded yet.
 */
function getState(): AbyssalGardenState {
  if (!stateCache) {
    // Return default state if not loaded yet
    return { ...defaultState };
  }
  return stateCache;
}

/**
 * Update a field in the database and cache.
 */
async function updateField(field: string, value: unknown): Promise<void> {
  try {
    await fetch("/api/abyssal-garden", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ field, value }),
    });

    // Update cache optimistically
    if (stateCache) {
      (stateCache as Record<string, unknown>)[field] = value;
    }
  } catch {
    // Ignore errors
  }
}

/**
 * Get swallowed count (synchronous, from cache).
 */
export function getSwallowedCount(): number {
  return getState().swallowedCount;
}

/**
 * Set swallowed count (async, updates database).
 */
export async function setSwallowedCount(n: number): Promise<void> {
  const value = Math.max(0, Math.floor(n));
  await updateField("swallowedCount", value);
}

/**
 * Get abyssal currency (synchronous, from cache).
 */
export function getAbyssalCurrency(): number {
  return getState().abyssalCurrency;
}

/**
 * Set abyssal currency (async, updates database).
 */
export async function setAbyssalCurrency(n: number): Promise<void> {
  const value = Math.max(0, Math.floor(n));
  await updateField("abyssalCurrency", value);
}

/**
 * Load inventory (synchronous, from cache).
 */
export function loadInventory(): AbyssalInventory {
  return getState().inventory;
}

/**
 * Save inventory (async, updates database).
 */
export async function saveInventory(inv: AbyssalInventory): Promise<void> {
  const clean: AbyssalInventory = {
    "abyssal-rock": Math.max(0, Math.floor(inv["abyssal-rock"] ?? 0)),
    "neon-sandcastle": Math.max(0, Math.floor(inv["neon-sandcastle"] ?? 0)),
    "crystalline-spire": Math.max(0, Math.floor(inv["crystalline-spire"] ?? 0)),
    "sirens-tail": Math.max(0, Math.floor(inv["sirens-tail"] ?? 0)),
    "lost-bounty": Math.max(0, Math.floor(inv["lost-bounty"] ?? 0)),
  };
  await updateField("inventory", clean);
}

/**
 * Load garden layout (synchronous, from cache).
 */
export function loadGardenLayout(): AbyssalPlacedItem[] {
  return getState().gardenLayout;
}

/**
 * Save garden layout (async, updates database).
 */
export async function saveGardenLayout(layout: AbyssalPlacedItem[]): Promise<void> {
  await updateField("gardenLayout", layout);
}

/**
 * Get awarded tasks (synchronous, from cache).
 */
export function getAwardedTasks(): Record<string, unknown> {
  return getState().awardedTasks;
}

/**
 * Set awarded tasks (async, updates database).
 */
export async function setAwardedTasks(tasks: Record<string, unknown>): Promise<void> {
  await updateField("awardedTasks", tasks);
}

