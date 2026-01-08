"use client";

import { useState } from "react";
import { X, Maximize2, Image as ImageIcon, FileText, Video, Lock, Unlock } from "lucide-react";
import type { NodeProps } from "reactflow";
import { Handle, Position, NodeResizer } from "reactflow";
import type { GrimpoNodeData } from "@/app/lib/graph";
import { DumbyReader } from "../components/DumbyReader";

type MediaNodeData = GrimpoNodeData & {
  zoom?: number;
  theme?: "abyss" | "surface";
  onUpdate?: (id: string, patch: Partial<GrimpoNodeData>) => void;
  onDelete?: (id: string) => void;
  onBathysphereMode?: (nodeId: string, enabled: boolean) => void;
};

function getYouTubeEmbedUrl(input: string): string | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (url.pathname.startsWith("/embed/")) {
        const id = url.pathname.split("/")[2];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function MediaNode({ id, data, selected }: NodeProps<MediaNodeData>) {
  const [swallowing, setSwallowing] = useState(false);
  const zoom = data.zoom ?? 1;
  const isSurface = data.theme === "surface";
  const isLocked = !!data.locked;

  const containerClasses = isSurface
    ? [
        "bg-white/95 shadow-md border-slate-200",
        selected ? "ring-2 ring-slate-400 ring-offset-2" : "",
      ].join(" ")
    : [
        "bg-slate-900/50 backdrop-blur-md border-cyan-300/20",
        !selected && !swallowing && !isLocked ? "octo-breath" : "",
      ].join(" ");

  const textPrimary = isSurface ? "text-slate-900" : "text-cyan-50";
  const textSecondary = isSurface ? "text-slate-500" : "text-cyan-200/90";
  const inputBg = isSurface ? "bg-slate-100/50" : "bg-slate-950/30";
  const inputBorder = isSurface ? "border-slate-200" : "border-cyan-300/20";

  const handleClass = isSurface
    ? "!h-4 !w-4 !border-2 !border-white !bg-slate-400"
    : "!h-4 !w-4 !border-2 !border-cyan-200 !bg-cyan-400 !shadow-[0_0_15px_rgba(34,211,238,0.8)]";

  const handleScale = zoom < 0.8 ? Math.min(2.5, 0.8 / zoom) : 1;
  const handleStyleAttr = {
    transform: `translate(-50%, -50%) scale(${handleScale})`,
    transformOrigin: "center",
  };

  const renderContent = () => {
    if (data.imageUrl) {
      return (
        <div className="relative group w-full h-full flex items-center justify-center min-h-0">
          <img
            src={data.imageUrl}
            alt={data.title}
            className="max-w-full max-h-full w-auto h-auto rounded-xl border border-white/10 shadow-lg object-contain"
          />
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity nodrag z-[60]">
            <button
              onClick={() => data.onUpdate?.(id, { imageUrl: "" })}
              className="bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      );
    }

    if (data.pdfUrl) {
      return (
        <div className={`rounded-2xl border ${inputBorder} ${inputBg} p-2 nodrag z-[60] w-full h-full flex flex-col min-h-0`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className={`text-xs tracking-widest ${textSecondary}`}>PDF</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => data.onBathysphereMode?.(id, true)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${
                  isSurface
                    ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "border-cyan-300/20 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
                }`}
              >
                <Maximize2 className="h-3 w-3" />
                Maximize
              </button>
              <button
                type="button"
                onClick={() => data.onUpdate?.(id, { pdfUrl: "" })}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${
                  isSurface
                    ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "border-rose-300/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                }`}
              >
                <X className="h-3 w-3" />
                Delete
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <DumbyReader pdfUrl={data.pdfUrl} nodeId={id} nodeTitle={data.title} viewMode="inline" />
          </div>
        </div>
      );
    }

    if (data.videoUrl) {
      const ytEmbed = getYouTubeEmbedUrl(data.videoUrl);
      return (
        <div className={`rounded-2xl border ${inputBorder} ${inputBg} p-2 nodrag z-[60] w-full h-full flex flex-col min-h-0`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className={`text-xs tracking-widest ${textSecondary}`}>VIDEO</div>
            <button
              type="button"
              onClick={() => data.onUpdate?.(id, { videoUrl: "" })}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${
                isSurface
                  ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "border-rose-300/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
              }`}
            >
              <X className="h-3 w-3" />
              Delete
            </button>
          </div>
          {ytEmbed ? (
            <iframe
              title="YouTube preview"
              src={ytEmbed}
              className={`flex-1 w-full rounded-xl border ${
                isSurface ? "border-slate-200 bg-slate-100" : "border-cyan-300/10 bg-black/20"
              }`}
              loading="lazy"
              allowFullScreen
            />
          ) : (
            <div className="text-xs text-rose-400 p-4 text-center">Invalid Video URL</div>
          )}
        </div>
      );
    }

    return (
      <div className={`p-8 border-2 border-dashed ${inputBorder} rounded-2xl flex flex-col items-center justify-center gap-2 ${textSecondary} w-full h-full`}>
        <ImageIcon className="h-8 w-8 opacity-20" />
        <span className="text-xs">No media attached</span>
      </div>
    );
  };

  const getBadge = () => {
    if (data.imageUrl) return { label: "IMAGE", Icon: ImageIcon };
    if (data.pdfUrl) return { label: "PDF", Icon: FileText };
    if (data.videoUrl) return { label: "VIDEO", Icon: Video };
    return { label: "MEDIA", Icon: ImageIcon };
  };

  const badge = getBadge();

  return (
    <>
      {!isLocked && (
        <NodeResizer
          isVisible={selected}
          minWidth={200}
          minHeight={150}
          handleStyle={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22d3ee", zIndex: 60 }}
          lineStyle={{ border: "2px solid #22d3ee", zIndex: 60 }}
        />
      )}
      <div
        className={[
          "relative w-full h-full rounded-3xl border transition-all duration-300",
          containerClasses,
          swallowing ? "scale-0 opacity-0" : "",
        ].join(" ")}
        style={{
          boxShadow: !isSurface ? `0 0 20px rgba(34,211,238,0.3)` : undefined,
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          className={`${handleClass} !left-0 !top-1/2 !translate-x-[-50%] !translate-y-[-50%]`}
          style={handleStyleAttr}
        />
        <Handle
          type="source"
          position={Position.Right}
          className={`${handleClass} !right-0 !top-1/2 !translate-x-[50%] !translate-y-[-50%]`}
          style={handleStyleAttr}
        />

        <div className={`relative p-4 h-full flex flex-col ${!isLocked ? "drag-handle cursor-grab active:cursor-grabbing" : "cursor-default"}`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className={`flex items-center gap-2 text-xs tracking-widest ${textSecondary} pointer-events-none`}>
              <badge.Icon className="h-4 w-4" />
              <span className={`rounded-full border px-2 py-1 ${inputBorder} ${inputBg}`}>
                {badge.label}
              </span>
            </div>
            <div className="flex items-center gap-1 nodrag z-[60]">
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
                title={isLocked ? "Unlock node" : "Lock node position"}
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
                title="Delete media node"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <input
            value={data.title ?? ""}
            onChange={(e) => data.onUpdate?.(id, { title: e.target.value })}
            placeholder="Media title…"
            className={[
              "w-full bg-transparent font-semibold outline-none transition-colors mb-3 nodrag z-[60]",
              textPrimary,
              "text-lg",
            ].join(" ")}
          />

          <div className="flex-1 overflow-hidden min-h-0">
            {renderContent()}
          </div>

          {data.notes && (
            <div className={`mt-3 text-sm ${textSecondary} line-clamp-3 nodrag z-[60]`}>
              {data.notes}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
