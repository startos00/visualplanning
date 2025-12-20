"use client";

import { useState } from "react";
import { ExternalLink, Sparkles, Target, Wrench } from "lucide-react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import type { GrimpoNodeData, ModeSetting, NodeKind } from "@/app/lib/graph";

type EffectiveMode = Exclude<ModeSetting, "auto">;

type GlassNodeData = GrimpoNodeData & {
  // Ephemeral view context (NOT persisted):
  zoom?: number;
  mode?: EffectiveMode;
  onUpdate?: (id: string, patch: Partial<GrimpoNodeData>) => void;
  onDelete?: (id: string) => void;
  onTaskDone?: (id: string) => void;
};

function typeBadge(type: NodeKind) {
  switch (type) {
    case "strategy":
      return { label: "STRATEGY", Icon: Target };
    case "tactical":
      return { label: "TACTICAL", Icon: Wrench };
    case "resource":
      return { label: "RESOURCE", Icon: Sparkles };
  }
}

export function GlassNode(props: NodeProps<GlassNodeData, NodeKind>) {
  const { id, data, type, selected } = props;

  const [swallowing, setSwallowing] = useState(false);

  const zoom = data.zoom ?? 1;
  const mode = data.mode ?? "tactical";

  // Semantic zoom: zoomed out means "title-only" (big picture).
  const titleOnly = mode === "strategy" || zoom < 1;

  const badge = typeBadge(type);
  const done = type === "tactical" && data.status === "done";

  return (
    <div
      className={[
        "relative w-[320px] rounded-3xl border bg-slate-900/50 backdrop-blur-md",
        "transition-all duration-200",
        "border-cyan-300/30",
        selected ? "shadow-[0_0_22px_rgba(34,211,238,0.45)]" : "shadow-[0_0_14px_rgba(34,211,238,0.18)]",
        done ? "opacity-60" : "",
        !selected && !done && !swallowing ? "octo-breath" : "",
        swallowing ? "scale-0 opacity-0" : "",
      ].join(" ")}
    >
      {/* sheen */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-b from-white/10 to-transparent" />

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-0 !bg-cyan-300/70 !shadow-[0_0_10px_rgba(34,211,238,0.55)]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-0 !bg-cyan-300/70 !shadow-[0_0_10px_rgba(34,211,238,0.55)]"
      />

      <div className="relative p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs tracking-widest text-cyan-200/90">
            <badge.Icon className="h-4 w-4 text-cyan-200/90" />
            <span className="rounded-full border border-cyan-300/20 bg-slate-950/40 px-2 py-1">
              {badge.label}
            </span>
          </div>
          {type === "resource" && !titleOnly && data.link ? (
            <button
              onClick={() => window.open(data.link, "_blank", "noopener,noreferrer")}
              className="inline-flex items-center gap-1 rounded-full border border-rose-300/20 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.18)] hover:bg-rose-500/20"
              title="Open link"
            >
              <ExternalLink className="h-3 w-3" />
              Open
            </button>
          ) : null}
        </div>

        <input
          value={data.title ?? ""}
          onChange={(e) => data.onUpdate?.(id, { title: e.target.value })}
          placeholder="Title…"
          className={[
            "w-full bg-transparent font-semibold outline-none",
            "text-cyan-50 placeholder:text-cyan-200/40",
            titleOnly ? "text-2xl" : "text-lg",
          ].join(" ")}
        />

        {!titleOnly ? (
          <div className="mt-3 space-y-3">
            {type === "resource" ? (
              <input
                value={data.link ?? ""}
                onChange={(e) => data.onUpdate?.(id, { link: e.target.value })}
                placeholder="Link (URL)…"
                className="w-full rounded-2xl border border-cyan-300/20 bg-slate-950/30 px-3 py-2 text-sm text-cyan-50 outline-none placeholder:text-cyan-200/30 focus:border-cyan-200/40"
              />
            ) : null}

            <textarea
              value={data.notes ?? ""}
              onChange={(e) => data.onUpdate?.(id, { notes: e.target.value })}
              placeholder={type === "resource" ? "Summary / notes…" : "Notes…"}
              className="min-h-[88px] w-full resize-none rounded-2xl border border-cyan-300/20 bg-slate-950/30 px-3 py-2 text-sm text-cyan-50 outline-none placeholder:text-cyan-200/30 focus:border-cyan-200/40"
            />

            {type === "tactical" ? (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-cyan-100/80">
                  <input
                    type="checkbox"
                    checked={data.status === "done"}
                    onChange={(e) => {
                      const wasDone = data.status === "done";
                      const isNowDone = e.target.checked;
                      data.onUpdate?.(id, { status: isNowDone ? "done" : "todo" });
                      // Trigger octopus celebration only when marking as done (not when unchecking)
                      if (!wasDone && isNowDone) {
                        data.onTaskDone?.(id);
                      }
                    }}
                    className="h-4 w-4 accent-cyan-300"
                  />
                  Done
                </label>
                <button
                  onClick={() => {
                    if (swallowing) return;
                    setSwallowing(true);
                    window.setTimeout(() => data.onDelete?.(id), 220);
                  }}
                  className="rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.18)] hover:bg-rose-500/20"
                  title="Swallow (delete)"
                >
                  Swallow
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}


