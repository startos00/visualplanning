"use client";

import type { NodeProps } from "reactflow";
import { NodeResizer } from "reactflow";
import { useMemo } from "react";
import type { GrimpoNodeData, MindMapData } from "@/app/lib/graph";

type MindMapNodeData = GrimpoNodeData & {
  zoom?: number;
  theme?: "abyss" | "surface";
  onUpdate?: (id: string, patch: Partial<GrimpoNodeData>) => void;
  onDelete?: (id: string) => void;
  isTrace?: boolean;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getNodeTitle(map: MindMapData | undefined, id: string): string {
  const found = map?.nodes?.find((n) => n.id === id);
  return found?.title || id;
}

export function MindMapNode({ data, selected }: NodeProps<MindMapNodeData>) {
  const isSurface = data.theme === "surface";
  const zoom = data.zoom ?? 1;

  const map = data.mindmap;
  const rootTitle = map?.root?.title || data.title || "Mind Map";
  const nodes = map?.nodes ?? [];
  const edges = map?.edges ?? [];

  const maxItems = 18;
  const viewNodes = nodes.slice(0, maxItems);

  // A simple radial layout inside the node container (no DOM measuring required).
  const points = useMemo(() => {
    const count = viewNodes.length;
    const radius = clamp(140 * (zoom < 1 ? 1.1 : 1), 110, 200);
    return viewNodes.map((n, i) => {
      const angle = (Math.PI * 2 * i) / Math.max(1, count);
      const x = 50 + (Math.cos(angle) * radius) / 6; // percent-ish
      const y = 50 + (Math.sin(angle) * radius) / 6;
      return { id: n.id, title: n.title, x, y };
    });
  }, [viewNodes, zoom]);

  const bg = isSurface ? "bg-white/95 text-slate-900" : "bg-slate-900/50 text-cyan-50";
  const border = isSurface ? "border-slate-200" : "border-cyan-300/20";
  const panel = isSurface ? "bg-slate-100/60 border-slate-200" : "bg-black/25 border-cyan-300/15";

  return (
    <div className={`relative h-full w-full rounded-3xl border ${bg} ${border} overflow-hidden`}>
      <NodeResizer
        isVisible={selected}
        minWidth={360}
        minHeight={240}
        handleStyle={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22d3ee" }}
        lineStyle={{ border: "2px solid #22d3ee" }}
      />

      <div className="p-4">
        <div className="drag-handle cursor-grab active:cursor-grabbing flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <div className={`text-[10px] font-bold tracking-widest ${isSurface ? "text-slate-500" : "text-cyan-200/70"}`}>
              MIND MAP
            </div>
            <div className="truncate text-lg font-semibold">{rootTitle}</div>
          </div>
          <div className={`text-[10px] ${isSurface ? "text-slate-500" : "text-cyan-100/60"}`}>
            {nodes.length} nodes • {edges.length} edges
          </div>
        </div>

        <div className={`relative mt-3 h-[220px] rounded-2xl border ${panel}`}>
          {/* Center root */}
          <div
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border px-4 py-2 text-xs font-semibold ${
              isSurface
                ? "border-slate-300 bg-white text-slate-900 shadow-sm"
                : "border-rose-300/25 bg-rose-500/10 text-rose-50 shadow-[0_0_18px_rgba(244,63,94,0.18)]"
            }`}
          >
            {rootTitle}
          </div>

          {/* Satellites */}
          {points.map((p) => (
            <div
              key={p.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-1 text-[11px] ${
                isSurface
                  ? "border-slate-300 bg-white/90 text-slate-800"
                  : "border-cyan-300/20 bg-slate-950/55 text-cyan-50"
              }`}
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
              title={p.title}
            >
              <span className="max-w-[160px] truncate block">{p.title}</span>
            </div>
          ))}
        </div>

        {map?.summary ? (
          <div className={`mt-3 rounded-2xl border px-3 py-2 text-xs ${panel} ${isSurface ? "text-slate-600" : "text-cyan-100/70"}`}>
            {map.summary}
          </div>
        ) : null}

        {/* Relationship list (compact) */}
        {edges.length ? (
          <div className={`mt-3 text-[11px] ${isSurface ? "text-slate-600" : "text-cyan-100/60"}`}>
            {edges.slice(0, 6).map((e, idx) => (
              <div key={`${e.fromId}-${e.toId}-${idx}`} className="truncate">
                {getNodeTitle(map, e.fromId)} → {getNodeTitle(map, e.toId)}
                {e.label ? ` (${e.label})` : ""}
              </div>
            ))}
            {edges.length > 6 ? <div className="opacity-70">…and {edges.length - 6} more</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

