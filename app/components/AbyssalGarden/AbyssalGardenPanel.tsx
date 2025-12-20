"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Coins, ShoppingBag, Sparkles, X } from "lucide-react";
import {
  ABYSSAL_EVENT,
  ABYSSAL_ITEMS,
  type AbyssalItemId,
  type AbyssalPlacedItem,
  getAbyssalCurrency,
  getSwallowedCount,
  getUnlockedItemIds,
  loadGardenLayout,
  loadInventory,
  removePlacedItem,
  tryPlaceFromInventory,
  tryPurchase,
  updatePlacedItemPosition,
} from "@/app/lib/abyssalGarden";

type Props = {
  open: boolean;
  onClose: () => void;
};

type Toast = { id: string; title: string; subtitle?: string };

function isAbyssalItemId(x: string): x is AbyssalItemId {
  return ABYSSAL_ITEMS.some((it) => it.id === x);
}

function itemArtClass(itemId: AbyssalItemId): string {
  switch (itemId) {
    case "abyssal-rock":
      return "abyssal-art abyssal-rock";
    case "neon-sandcastle":
      return "abyssal-art abyssal-sandcastle";
    case "crystalline-spire":
      return "abyssal-art abyssal-spire";
    case "sirens-tail":
      return "abyssal-art abyssal-tail";
    case "lost-bounty":
      return "abyssal-art abyssal-bounty";
  }
}

export function AbyssalGardenPanel({ open, onClose }: Props) {
  const [swallowedCount, setSwallowedCount] = useState(() => getSwallowedCount());
  const [currency, setCurrency] = useState(() => getAbyssalCurrency());
  const [inventory, setInventory] = useState(() => loadInventory());
  const [layout, setLayout] = useState<AbyssalPlacedItem[]>(() => loadGardenLayout());
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<
    | {
        id: string;
        offsetX: number;
        offsetY: number;
        lastX: number;
        lastY: number;
      }
    | null
  >(null);

  const unlocked = useMemo(() => new Set(getUnlockedItemIds(swallowedCount)), [swallowedCount]);

  const refreshFromStorage = useCallback(() => {
    setSwallowedCount(getSwallowedCount());
    setCurrency(getAbyssalCurrency());
    setInventory(loadInventory());
    setLayout(loadGardenLayout());
  }, []);

  useEffect(() => {
    const onAbyssalUpdate = (evt: Event) => {
      refreshFromStorage();

      const ce = evt as CustomEvent<{ newlyUnlockedItemIds?: AbyssalItemId[] }>;
      const newly = ce.detail?.newlyUnlockedItemIds ?? [];
      if (newly.length) {
        const toastItems = newly
          .map((id) => ABYSSAL_ITEMS.find((it) => it.id === id))
          .filter(Boolean)
          .map((it) => ({
            id: `unlock-${it!.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            title: `Unlocked: ${it!.name}`,
            subtitle: it!.descriptor,
          }));
        setToasts((prev) => prev.concat(toastItems));
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === "swallowedCount" || e.key === "abyssalCurrency" || e.key === "abyssalInventory" || e.key === "abyssalGardenLayout") {
        refreshFromStorage();
      }
    };

    window.addEventListener(ABYSSAL_EVENT, onAbyssalUpdate as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(ABYSSAL_EVENT, onAbyssalUpdate as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshFromStorage]);

  useEffect(() => {
    if (!toasts.length) return;
    const t = window.setTimeout(() => setToasts((prev) => prev.slice(1)), 3800);
    return () => window.clearTimeout(t);
  }, [toasts]);

  const onBuy = useCallback((itemId: AbyssalItemId) => {
    tryPurchase(itemId);
  }, []);

  const onCanvasDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Helps some browsers correctly indicate a droppable target.
    try {
      e.dataTransfer.dropEffect = "copy";
    } catch {
      // ignore
    }
  }, []);

  const onCanvasDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Note: Safari is unreliable with custom MIME types, so also support text/plain.
    const raw =
      e.dataTransfer.getData("application/x-abyssal-item") ||
      e.dataTransfer.getData("text/plain") ||
      "";
    const itemId = raw.trim();
    if (!itemId || !isAbyssalItemId(itemId)) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    tryPlaceFromInventory({ itemId, x, y });
  }, []);

  const beginMovePlaced = useCallback((e: React.PointerEvent, id: string) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const p = layout.find((x) => x.id === id);
    if (!p) return;
    setSelectedPlacedId(id);

    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    dragStateRef.current = {
      id,
      offsetX: pointerX - p.x,
      offsetY: pointerY - p.y,
      lastX: p.x,
      lastY: p.y,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [layout]);

  const onCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragStateRef.current) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const { id, offsetX, offsetY } = dragStateRef.current;
      const nextX = e.clientX - rect.left - offsetX;
      const nextY = e.clientY - rect.top - offsetY;

      dragStateRef.current = { ...dragStateRef.current, lastX: nextX, lastY: nextY };

      setLayout((prev) =>
        prev.map((p) => (p.id === id ? { ...p, x: nextX, y: nextY, zIndex: Date.now() } : p)),
      );
    },
    [setLayout],
  );

  const endMovePlaced = useCallback(() => {
    const dragging = dragStateRef.current;
    dragStateRef.current = null;
    if (!dragging) return;
    updatePlacedItemPosition({ id: dragging.id, x: dragging.lastX, y: dragging.lastY });
  }, []);

  const totals = useMemo(() => {
    const owned = Object.values(inventory).reduce((a, b) => a + b, 0);
    return { owned, placed: layout.length };
  }, [inventory, layout.length]);

  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div className="pointer-events-auto absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="pointer-events-auto absolute inset-x-3 inset-y-3 mx-auto flex max-w-[1180px] flex-col overflow-hidden rounded-[28px] border border-cyan-300/15 bg-slate-950/40 shadow-[0_0_40px_rgba(34,211,238,0.18)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-cyan-300/10 bg-gradient-to-r from-slate-950/40 via-slate-950/30 to-slate-950/40 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] tracking-[0.22em] text-cyan-100/70">
              <Sparkles className="h-4 w-4 text-cyan-200/70" />
              ABYSSAL GARDEN
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-cyan-50/90">
              <span className="rounded-full border border-cyan-300/15 bg-slate-950/30 px-3 py-1">
                Swallowed: <span className="text-cyan-50">{swallowedCount}</span>
              </span>
              <span className="flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-500/10 px-3 py-1">
                <Coins className="h-4 w-4 text-emerald-200/80" />
                <span className="text-emerald-50">{currency}</span>
              </span>
              <span className="rounded-full border border-cyan-300/15 bg-slate-950/30 px-3 py-1 text-cyan-100/70">
                Inventory: {totals.owned} • Placed: {totals.placed}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full border border-cyan-300/15 bg-slate-950/40 p-2 text-cyan-50/80 hover:bg-slate-950/60"
            title="Close Abyssal Garden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="grid flex-1 grid-cols-1 gap-4 p-4 md:grid-cols-[360px_1fr]">
          {/* Left rail: shop + inventory */}
          <div className="flex flex-col gap-4">
            {/* Shop */}
            <div className="rounded-3xl border border-cyan-300/12 bg-slate-950/30 p-4 shadow-[0_0_18px_rgba(34,211,238,0.12)]">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs tracking-widest text-cyan-100/70">
                  <ShoppingBag className="h-4 w-4 text-cyan-200/70" />
                  SHOP
                </div>
                <div className="text-[11px] text-cyan-100/45">Costs are in Abyssal Currency</div>
              </div>

              <div className="space-y-2">
                {ABYSSAL_ITEMS.map((it) => {
                  const isUnlocked = unlocked.has(it.id);
                  const canAfford = currency >= it.cost;
                  return (
                    <div
                      key={it.id}
                      className={[
                        "flex items-center justify-between gap-3 rounded-2xl border px-3 py-2",
                        isUnlocked ? "border-cyan-300/12 bg-slate-950/25" : "border-cyan-300/10 bg-slate-950/15 opacity-70",
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`${itemArtClass(it.id)} h-7 w-7 shrink-0`} aria-hidden="true" />
                          <div className="min-w-0">
                            <div className="truncate text-sm text-cyan-50/90">{it.name}</div>
                            <div className="text-[11px] text-cyan-100/50">
                              Unlock at {it.unlockAt} • {it.descriptor}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <div className="rounded-full border border-emerald-300/15 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-50/90">
                          {it.cost}
                        </div>
                        <button
                          onClick={() => onBuy(it.id)}
                          disabled={!isUnlocked || !canAfford}
                          className={[
                            "rounded-full px-3 py-1 text-xs transition-colors",
                            isUnlocked && canAfford
                              ? "bg-cyan-400/20 text-cyan-50 shadow-[0_0_12px_rgba(34,211,238,0.22)] hover:bg-cyan-400/25"
                              : "cursor-not-allowed bg-slate-950/40 text-cyan-100/35",
                          ].join(" ")}
                          title={!isUnlocked ? "Locked (complete more tasks)" : !canAfford ? "Insufficient currency" : "Purchase"}
                        >
                          Buy
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Inventory */}
            <div className="rounded-3xl border border-cyan-300/12 bg-slate-950/30 p-4 shadow-[0_0_18px_rgba(34,211,238,0.12)]">
              <div className="mb-3 text-xs tracking-widest text-cyan-100/70">INVENTORY</div>
              <div className="space-y-2">
                {ABYSSAL_ITEMS.map((it) => {
                  const qty = inventory[it.id] ?? 0;
                  return (
                    <div
                      key={it.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-cyan-300/10 bg-slate-950/20 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <div
                          className={`${itemArtClass(it.id)} h-8 w-8 shrink-0`}
                          aria-hidden="true"
                          draggable={qty > 0}
                          onDragStart={(e) => {
                            // Custom type for Chromium/Firefox, plus text/plain for Safari reliability.
                            e.dataTransfer.setData("application/x-abyssal-item", it.id);
                            e.dataTransfer.setData("text/plain", it.id);
                            e.dataTransfer.effectAllowed = "copy";
                          }}
                          title={qty > 0 ? "Drag to seabed to place" : "Buy in shop to own"}
                        />
                        <div className="min-w-0">
                          <div className="truncate text-sm text-cyan-50/90">{it.name}</div>
                          <div className="text-[11px] text-cyan-100/45">Drag the icon onto the seabed to place</div>
                        </div>
                      </div>
                      <div className="rounded-full border border-cyan-300/12 bg-slate-950/30 px-3 py-1 text-xs text-cyan-50/80">
                        × {qty}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Seabed Canvas */}
          <div className="relative overflow-hidden rounded-3xl border border-cyan-300/12 bg-slate-950/25 shadow-[0_0_22px_rgba(34,211,238,0.12)]">
            {/* Caustic-ish gradients */}
            <div className="pointer-events-none absolute inset-0 abyssal-seabed" />

            <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-cyan-300/12 bg-slate-950/35 px-3 py-1 text-xs text-cyan-100/65">
              Drag inventory icons here • Drag placed items to move • Click a placed item to remove
            </div>

            <div
              ref={canvasRef}
              className="absolute inset-0"
              // Use capture so drops still work even if the cursor is over a placed item.
              onDragOverCapture={onCanvasDragOver}
              onDropCapture={onCanvasDrop}
              onPointerMove={onCanvasPointerMove}
              onPointerUp={endMovePlaced}
              onPointerCancel={endMovePlaced}
              onPointerLeave={endMovePlaced}
              onPointerDown={() => setSelectedPlacedId(null)}
            >
              {layout
                .slice()
                .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
                .map((p) => {
                  const isSelected = selectedPlacedId === p.id;
                  return (
                    <div
                      key={p.id}
                      className={[
                        "absolute select-none",
                        isSelected ? "ring-1 ring-cyan-200/30" : "",
                      ].join(" ")}
                      style={{
                        left: p.x,
                        top: p.y,
                        transform: "translate(-50%, -50%)",
                        zIndex: p.zIndex ?? 0,
                      }}
                      onPointerDown={(e) => beginMovePlaced(e, p.id)}
                      onPointerUp={endMovePlaced}
                      onPointerCancel={endMovePlaced}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPlacedId(p.id);
                      }}
                    >
                      <div className={`${itemArtClass(p.itemId)} abyssal-placed`} aria-hidden="true" />
                      {isSelected ? (
                        <button
                          className="absolute -right-2 -top-2 rounded-full border border-rose-300/20 bg-rose-500/20 p-1 text-rose-50 shadow-[0_0_12px_rgba(244,63,94,0.22)] hover:bg-rose-500/30"
                          title="Remove (returns to inventory)"
                          onClick={(e) => {
                            e.stopPropagation();
                            removePlacedItem(p.id);
                            setSelectedPlacedId(null);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Toasts */}
      <div className="pointer-events-none absolute right-5 top-5 z-[70] flex w-[320px] flex-col gap-2">
        {toasts.slice(0, 3).map((t) => (
          <div
            key={t.id}
            className="pointer-events-none rounded-2xl border border-cyan-300/16 bg-slate-950/55 p-3 shadow-[0_0_22px_rgba(34,211,238,0.14)] backdrop-blur-md"
          >
            <div className="text-sm text-cyan-50/90">{t.title}</div>
            {t.subtitle ? <div className="text-[11px] text-cyan-100/55">{t.subtitle}</div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}


