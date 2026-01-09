"use client";

import { useState } from "react";
import { X, Layers, Image as ImageIcon, Lock, Unlock } from "lucide-react";
import type { NodeProps } from "reactflow";
import { NodeResizer } from "reactflow";
import type { GrimpoNodeData } from "@/app/lib/graph";

type LightboxNodeData = GrimpoNodeData & {
  zoom?: number;
  theme?: "abyss" | "surface";
  onUpdate?: (id: string, patch: Partial<GrimpoNodeData>) => void;
  onDelete?: (id: string) => void;
  isTrace?: boolean;
  sonarOpacity?: number;
};

export function LightboxNode({ id, data, selected }: NodeProps<LightboxNodeData>) {
  const isTrace = !!data.isTrace;
  const sonarOpacity = data.sonarOpacity ?? 0.2;
  const [swallowing, setSwallowing] = useState(false);
  const zoom = data.zoom ?? 1;
  const isSurface = data.theme === "surface";
  const isLocked = !!data.locked;

  const opacity = data.imageOpacity ?? 0.5;

  const containerClasses = isSurface
    ? [
        "bg-white/95 shadow-md border-slate-200",
        selected ? "ring-2 ring-slate-400 ring-offset-2" : "",
        isTrace ? "border-dashed pointer-events-none" : "",
      ].join(" ")
    : [
        "bg-slate-900/50 backdrop-blur-md border-cyan-300/20",
        !selected && !swallowing && !isLocked && !isTrace ? "octo-breath" : "",
        isTrace ? "border-dashed pointer-events-none" : "",
      ].join(" ");

  if (isTrace) {
    return (
      <div 
        className={[
          "relative w-full h-full min-w-[300px] min-h-[200px] rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col",
          containerClasses,
        ].join(" ")}
        style={{
          borderStyle: "dashed",
          borderColor: `rgba(34, 211, 238, ${sonarOpacity})`,
          backgroundColor: `rgba(34, 211, 238, ${sonarOpacity * 0.05})`,
        }}
      >
        <div className="p-3 border-b border-cyan-500/10 flex items-center justify-between bg-black/10">
          <span 
            className="text-[10px] font-bold tracking-widest uppercase truncate"
            style={{ color: `rgba(34, 211, 238, ${Math.max(sonarOpacity * 2, 0.4)})` }}
          >
            Lightbox Trace: {data.title}
          </span>
        </div>
        <div 
          className="relative flex-1 w-full h-full flex items-center justify-center p-4 overflow-hidden"
          style={{ filter: 'grayscale(1) brightness(1.2)' }}
        >
          {data.imageUrl && (
            <img
              src={data.imageUrl}
              alt={data.title}
              className="max-w-full max-h-full w-auto h-auto object-contain pointer-events-none"
            />
          )}
        </div>
      </div>
    );
  }

  const textPrimary = isSurface ? "text-slate-900" : "text-cyan-50";
  const textSecondary = isSurface ? "text-slate-500" : "text-cyan-200/90";
  const inputBg = isSurface ? "bg-slate-100/50" : "bg-slate-950/30";
  const inputBorder = isSurface ? "border-slate-200" : "border-cyan-300/20";

  return (
    <>
      {!isLocked && (
        <NodeResizer
          isVisible={selected}
          minWidth={300}
          minHeight={200}
          handleStyle={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22d3ee", zIndex: 60 }}
          lineStyle={{ border: "2px solid #22d3ee", zIndex: 60 }}
        />
      )}
      <div
        className={[
          "relative w-full h-full min-w-[300px] min-h-[200px] rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col",
          containerClasses,
          swallowing ? "scale-0 opacity-0" : "",
        ].join(" ")}
        style={{
          boxShadow: !isSurface ? `0 0 30px rgba(34,211,238,0.2)` : undefined,
        }}
      >
        {/* Opacity Control Header */}
        <div className={`p-3 border-b ${inputBorder} flex items-center justify-between gap-4 bg-black/20 backdrop-blur-sm z-[60] relative ${!isLocked ? "drag-handle cursor-grab active:cursor-grabbing" : "cursor-default"}`}>
          <div className="flex items-center gap-2 pointer-events-none">
            <Layers className={`h-4 w-4 ${textSecondary}`} />
            <span className={`text-[10px] tracking-widest ${textSecondary}`}>LIGHTBOX</span>
          </div>

          <div className="flex-1 flex items-center gap-3 nodrag">
            <span className={`text-[10px] ${textSecondary}`}>OPACITY</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={opacity}
              onChange={(e) => data.onUpdate?.(id, { imageOpacity: parseFloat(e.target.value) })}
              className="flex-1 h-1.5 bg-cyan-900/50 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <span className={`text-[10px] w-8 ${textSecondary}`}>{Math.round(opacity * 100)}%</span>
          </div>

          <div className="flex items-center gap-1 nodrag">
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onUpdate?.(id, { locked: !isLocked });
              }}
              className={`p-1.5 rounded-full border transition-colors ${
                isLocked 
                  ? "bg-amber-500/20 text-amber-200 border-amber-500/30 hover:bg-amber-500" 
                  : "bg-slate-800/40 text-cyan-200 border-cyan-500/30 hover:bg-slate-700"
              }`}
              title={isLocked ? "Unlock lightbox" : "Lock lightbox position"}
            >
              {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSwallowing(true);
                setTimeout(() => data.onDelete?.(id), 220);
              }}
              className="text-rose-400/60 hover:text-rose-400 p-1 transition-colors"
              title="Delete lightbox"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Image Content */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center p-4 min-h-0 overflow-hidden">
          {data.imageUrl ? (
            <img
              src={data.imageUrl}
              alt={data.title}
              className="max-w-full max-h-full w-auto h-auto object-contain pointer-events-none transition-opacity duration-300"
              style={{ opacity }}
            />
          ) : (
            <div className={`flex flex-col items-center justify-center gap-2 ${textSecondary}`}>
              <ImageIcon className="h-12 w-12 opacity-10" />
              <span className="text-xs">No tracing image</span>
            </div>
          )}
        </div>

        {/* Title (Hidden but editable via props/hook if needed) */}
        <div className="absolute bottom-2 left-4 nodrag z-[60]">
            <input
              value={data.title ?? ""}
              onChange={(e) => data.onUpdate?.(id, { title: e.target.value })}
              placeholder="Lightbox title…"
              className="bg-transparent text-[10px] text-cyan-200/40 outline-none w-32"
            />
        </div>
      </div>
    </>
  );
}
