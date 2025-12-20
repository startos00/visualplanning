export type AbyssalItemId =
  | "abyssal-rock"
  | "neon-sandcastle"
  | "crystalline-spire"
  | "sirens-tail"
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
  zIndex?: number;
};

export const ABYSSAL_EVENT = "abyssal:update";

export const ABYSSAL_ITEMS: AbyssalItemDef[] = [
  { id: "abyssal-rock", name: "Abyssal Rock", descriptor: "Base decoration", unlockAt: 1, cost: 1 },
  { id: "neon-sandcastle", name: "Neon Sandcastle", descriptor: "Structure", unlockAt: 5, cost: 5 },
  { id: "crystalline-spire", name: "Crystalline Spire", descriptor: "The Glass Castle", unlockAt: 10, cost: 10 },
  { id: "sirens-tail", name: "Siren’s Tail", descriptor: "The Mermaid", unlockAt: 20, cost: 20 },
  { id: "lost-bounty", name: "The Lost Bounty", descriptor: "Treasure Chest", unlockAt: 50, cost: 50 },
];

const KEY_SWALLOWED = "swallowedCount";
const KEY_CURRENCY = "abyssalCurrency";
const KEY_INVENTORY = "abyssalInventory";
const KEY_LAYOUT = "abyssalGardenLayout";
const KEY_AWARDED_TASKS = "abyssalAwardedTasks";

const memoryStore = new Map<string, string>();

function canUseWindow(): boolean {
  return typeof window !== "undefined";
}

function getItem(key: string): string | null {
  if (!canUseWindow()) return memoryStore.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryStore.get(key) ?? null;
  }
}

function setItem(key: string, value: string) {
  if (!canUseWindow()) {
    memoryStore.set(key, value);
    return;
  }
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

function safeParseInt(raw: string | null): { value: number; valid: boolean } {
  if (raw === null) return { value: 0, valid: false };
  const trimmed = raw.trim();
  if (!trimmed) return { value: 0, valid: false };
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || Number.isNaN(n)) return { value: 0, valid: false };
  if (n < 0) return { value: 0, valid: false };
  return { value: n, valid: true };
}

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getSwallowedCount(): number {
  const raw = getItem(KEY_SWALLOWED);
  const parsed = safeParseInt(raw);
  if (!parsed.valid) setItem(KEY_SWALLOWED, "0");
  return parsed.value;
}

export function setSwallowedCount(n: number) {
  setItem(KEY_SWALLOWED, String(Math.max(0, Math.floor(n))));
}

export function getAbyssalCurrency(): number {
  const raw = getItem(KEY_CURRENCY);
  const parsed = safeParseInt(raw);
  if (!parsed.valid) setItem(KEY_CURRENCY, "0");
  return parsed.value;
}

export function setAbyssalCurrency(n: number) {
  setItem(KEY_CURRENCY, String(Math.max(0, Math.floor(n))));
}

export function getUnlockedItemIds(swallowedCount: number): AbyssalItemId[] {
  return ABYSSAL_ITEMS.filter((it) => swallowedCount >= it.unlockAt).map((it) => it.id);
}

export function loadInventory(): AbyssalInventory {
  const empty: AbyssalInventory = {
    "abyssal-rock": 0,
    "neon-sandcastle": 0,
    "crystalline-spire": 0,
    "sirens-tail": 0,
    "lost-bounty": 0,
  };

  const parsed = safeJsonParse<Record<string, unknown>>(getItem(KEY_INVENTORY));
  if (!parsed) return empty;

  const next = { ...empty };
  for (const id of Object.keys(empty) as AbyssalItemId[]) {
    const v = parsed[id];
    const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseInt(v, 10) : 0;
    next[id] = Number.isFinite(n) && !Number.isNaN(n) ? Math.max(0, Math.floor(n)) : 0;
  }
  return next;
}

export function saveInventory(inv: AbyssalInventory) {
  const clean: AbyssalInventory = {
    "abyssal-rock": Math.max(0, Math.floor(inv["abyssal-rock"] ?? 0)),
    "neon-sandcastle": Math.max(0, Math.floor(inv["neon-sandcastle"] ?? 0)),
    "crystalline-spire": Math.max(0, Math.floor(inv["crystalline-spire"] ?? 0)),
    "sirens-tail": Math.max(0, Math.floor(inv["sirens-tail"] ?? 0)),
    "lost-bounty": Math.max(0, Math.floor(inv["lost-bounty"] ?? 0)),
  };
  setItem(KEY_INVENTORY, JSON.stringify(clean));
}

export function loadGardenLayout(): AbyssalPlacedItem[] {
  const parsed = safeJsonParse<unknown[]>(getItem(KEY_LAYOUT));
  if (!parsed || !Array.isArray(parsed)) return [];

  const known = new Set<AbyssalItemId>(ABYSSAL_ITEMS.map((i) => i.id));

  const out: AbyssalPlacedItem[] = [];
  for (const row of parsed) {
    if (!row || typeof row !== "object") continue;
    const r = row as Partial<AbyssalPlacedItem>;
    if (!r.id || typeof r.id !== "string") continue;
    if (!r.itemId || typeof r.itemId !== "string") continue;
    if (!known.has(r.itemId as AbyssalItemId)) continue;
    const x = typeof r.x === "number" && Number.isFinite(r.x) ? r.x : null;
    const y = typeof r.y === "number" && Number.isFinite(r.y) ? r.y : null;
    if (x === null || y === null) continue;
    const zIndex = typeof r.zIndex === "number" && Number.isFinite(r.zIndex) ? r.zIndex : undefined;
    out.push({ id: r.id, itemId: r.itemId as AbyssalItemId, x, y, zIndex });
  }
  return out;
}

export function saveGardenLayout(layout: AbyssalPlacedItem[]) {
  const known = new Set<AbyssalItemId>(ABYSSAL_ITEMS.map((i) => i.id));
  const clean = layout
    .filter((p) => p && typeof p.id === "string" && known.has(p.itemId))
    .map((p, idx) => ({
      id: p.id,
      itemId: p.itemId,
      x: Number.isFinite(p.x) ? p.x : 0,
      y: Number.isFinite(p.y) ? p.y : 0,
      zIndex: Number.isFinite(p.zIndex ?? idx) ? (p.zIndex ?? idx) : idx,
    }));
  setItem(KEY_LAYOUT, JSON.stringify(clean));
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
    const awarded = safeJsonParse<Record<string, unknown>>(getItem(KEY_AWARDED_TASKS)) ?? {};
    if (awarded[taskId]) {
      // Already credited for this task; no-op.
      return {
        swallowedCount: getSwallowedCount(),
        abyssalCurrency: getAbyssalCurrency(),
        newlyUnlockedItemIds: [],
      };
    }
    awarded[taskId] = 1;
    setItem(KEY_AWARDED_TASKS, JSON.stringify(awarded));
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


