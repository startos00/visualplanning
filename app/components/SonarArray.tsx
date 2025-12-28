"use client";

import { useState, useEffect, useRef } from "react";
import { X, RotateCcw, Plus } from "lucide-react";
import { DumbyReader } from "./DumbyReader";
import type { GrimpoNode } from "@/app/lib/graph";
import { addHighlight } from "@/app/actions/highlights";

type SonarArrayProps = {
  nodes: GrimpoNode[];
  isOpen: boolean;
  onClose: () => void;
  onHighlight?: (nodeId: string, content: string, position: any) => void;
};

type SharedHighlight = {
  id: string;
  nodeId: string;
  nodeTitle: string;
  content: string;
  timestamp: number;
};

export function SonarArray({ nodes, isOpen, onClose, onHighlight }: SonarArrayProps) {
  const [syncScroll, setSyncScroll] = useState(false);
  const [scrollPercent, setScrollPercent] = useState(0);
  const [sharedHighlights, setSharedHighlights] = useState<SharedHighlight[]>([]);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState("");
  const [selectedNodeForManual, setSelectedNodeForManual] = useState<string>("");
  const scrollSyncRefs = useRef<Map<string, HTMLIFrameElement>>(new Map());

  // Filter nodes that have PDFs
  const pdfNodes = nodes.filter(
    (node) => node.type === "resource" && node.data.pdfUrl?.trim()
  );

  // Determine grid layout
  const getGridClass = (count: number) => {
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-3";
    if (count === 4) return "grid-cols-2 grid-rows-2";
    return "grid-cols-1";
  };

  // Handle highlight from any document
  const handleHighlight = async (nodeId: string, content: string, position: any) => {
    const node = pdfNodes.find((n) => n.id === nodeId);
    if (!node) return;

    // Save to database (for Resource Chamber)
    try {
      await addHighlight(nodeId, content, position);
    } catch (error) {
      console.error("Failed to save highlight:", error);
    }

    // Also add to local state (for Sonar Array display)
    const highlight: SharedHighlight = {
      id: `highlight-${Date.now()}-${Math.random()}`,
      nodeId,
      nodeTitle: node.data.title || "Untitled Document",
      content,
      timestamp: Date.now(),
    };

    setSharedHighlights((prev) => [highlight, ...prev]);
    onHighlight?.(nodeId, content, position);
  };

  // Handle scroll sync
  const handleScrollSync = (percent: number) => {
    if (!syncScroll) return;
    setScrollPercent(percent);
    
    // Sync all iframes
    scrollSyncRefs.current.forEach((iframe) => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          const scrollHeight = iframeDoc.documentElement.scrollHeight - iframeDoc.documentElement.clientHeight;
          const targetScroll = scrollHeight * percent;
          iframeDoc.documentElement.scrollTop = targetScroll;
          if (iframeDoc.body) iframeDoc.body.scrollTop = targetScroll;
        }
      } catch (e) {
        // Cross-origin restrictions
      }
    });
  };

  if (!isOpen || pdfNodes.length < 2) return null;

  return (
    <div className="fixed inset-0 z-[50] flex">
      {/* Close button - positioned top-left to avoid overlap with mode toggles */}
      <button
        onClick={onClose}
        className="absolute left-4 top-4 z-[60] rounded-full border border-cyan-300/20 bg-slate-950/90 p-2 text-cyan-200/70 backdrop-blur-md transition-colors hover:bg-cyan-500/20 hover:text-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.18)]"
        title="Close Sonar Array"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Main grid area */}
      <div className={`grid flex-1 gap-1 border-r border-cyan-500/20 bg-black p-4 ${getGridClass(pdfNodes.length)}`}>
        {pdfNodes.map((node) => (
          <div key={node.id} className="relative flex flex-col overflow-hidden rounded-xl border border-cyan-300/20 bg-slate-950/50">
            {/* Document header */}
            <div className="flex items-center justify-between border-b border-cyan-300/10 bg-slate-950/40 px-4 py-2">
              <h3 className="truncate text-sm font-medium text-cyan-100">
                {node.data.title || "Untitled Document"}
              </h3>
            </div>
            
            {/* PDF viewer */}
            <div className="flex-1 overflow-hidden">
              <DumbyReader
                pdfUrl={node.data.pdfUrl!}
                nodeId={node.id}
                nodeTitle={node.data.title}
                viewMode="compact"
                onHighlight={(content, position) => handleHighlight(node.id, content, position)}
                syncScroll={syncScroll}
                onScrollSync={handleScrollSync}
                scrollPercent={scrollPercent}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Shared sidebar */}
      <div className="w-[300px] border-l border-cyan-500/20 bg-slate-950/95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-cyan-300/20 bg-gradient-to-r from-cyan-500/10 to-transparent px-4 py-3">
          <div>
            <h2 className="text-xs font-bold tracking-[0.2em] text-cyan-100 uppercase">Sonar Array</h2>
            <p className="text-[10px] text-cyan-300/60 uppercase tracking-widest">Cross-reference mode</p>
          </div>
        </div>

        {/* Document badges */}
        <div className="border-b border-cyan-300/10 p-4">
          <div className="mb-2 text-[10px] font-bold text-cyan-400/50 uppercase tracking-widest">
            Loaded Documents ({pdfNodes.length})
          </div>
          <div className="space-y-2">
            {pdfNodes.map((node) => (
              <div
                key={node.id}
                className="rounded-lg border border-cyan-300/10 bg-slate-950/40 px-3 py-2"
              >
                <div className="truncate text-xs text-cyan-100">
                  {node.data.title || "Untitled Document"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="border-b border-cyan-300/10 p-4">
          <button
            onClick={() => setSyncScroll(!syncScroll)}
            className={`w-full rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              syncScroll
                ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-100"
                : "border-cyan-300/20 bg-slate-950/40 text-cyan-200/70 hover:bg-slate-950/60"
            }`}
          >
            <RotateCcw className="mr-2 inline h-4 w-4" />
            {syncScroll ? "Sync Scroll: ON" : "Sync Scroll: OFF"}
          </button>
        </div>

        {/* Shared Intelligence - Highlights */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="border-b border-cyan-300/10 p-4">
            <div className="text-[10px] font-bold text-cyan-400/50 uppercase tracking-widest mb-2">
              Shared Intelligence
            </div>
            {sharedHighlights.length === 0 ? (
              <div className="rounded-lg border border-cyan-300/10 bg-slate-950/40 p-4 text-xs text-cyan-200/60">
                <p className="mb-2 font-medium">How to highlight:</p>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-cyan-300/70 ml-2">
                  <li>Select text in any PDF document</li>
                  <li>Click the "Send Selection" button that appears</li>
                  <li>Or use "Add Selection Manually" below</li>
                </ol>
                <p className="mt-2 text-[10px] text-cyan-300/40">Cross-document queries coming soon.</p>
              </div>
            ) : (
              <div className="text-xs text-cyan-300/60">
                {sharedHighlights.length} highlight{sharedHighlights.length !== 1 ? "s" : ""} captured
              </div>
            )}
          </div>

          {/* Manual input for cross-origin PDFs */}
          {showManualInput && (
            <div className="border-b border-cyan-300/10 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold text-cyan-400/50 uppercase tracking-widest">
                  Add Selection Manually
                </div>
                <button
                  onClick={() => {
                    setShowManualInput(false);
                    setManualText("");
                    setSelectedNodeForManual("");
                  }}
                  className="text-cyan-300/40 hover:text-cyan-300/70"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <select
                value={selectedNodeForManual}
                onChange={(e) => setSelectedNodeForManual(e.target.value)}
                className="w-full rounded-lg border border-cyan-300/20 bg-slate-950/40 px-3 py-2 text-xs text-cyan-100 outline-none focus:border-cyan-400/50"
              >
                <option value="">Select document...</option>
                {pdfNodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.data.title || "Untitled Document"}
                  </option>
                ))}
              </select>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste selected text here..."
                className="w-full rounded-lg border border-cyan-300/20 bg-slate-950/40 px-3 py-2 text-xs text-cyan-100 placeholder:text-cyan-300/40 outline-none focus:border-cyan-400/50 min-h-[60px]"
              />
              <button
                onClick={() => {
                  if (manualText.trim() && selectedNodeForManual) {
                    handleHighlight(selectedNodeForManual, manualText.trim(), {});
                    setManualText("");
                    setSelectedNodeForManual("");
                    setShowManualInput(false);
                  }
                }}
                disabled={!manualText.trim() || !selectedNodeForManual}
                className="w-full rounded-lg border border-cyan-300/30 bg-cyan-500/10 px-3 py-2 text-xs font-medium text-cyan-100 transition-all hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Shared Intelligence
              </button>
            </div>
          )}

          {/* Highlights list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {sharedHighlights.length === 0 && !showManualInput && (
              <div className="rounded-lg border border-cyan-300/10 bg-slate-950/40 p-4 text-xs text-cyan-200/60 text-center">
                <p className="mb-3">No highlights yet.</p>
                <button
                  onClick={() => setShowManualInput(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/20 bg-slate-950/60 px-3 py-2 text-xs text-cyan-100 hover:bg-slate-950/80 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add Selection Manually
                </button>
              </div>
            )}
            {sharedHighlights.map((highlight) => (
              <div
                key={highlight.id}
                className="rounded-lg border border-cyan-300/20 bg-slate-950/40 p-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-[10px] font-bold text-cyan-400/70 uppercase tracking-wider">
                    {highlight.nodeTitle}
                  </div>
                  <button
                    onClick={() => {
                      setSharedHighlights((prev) => prev.filter((h) => h.id !== highlight.id));
                    }}
                    className="text-cyan-300/40 hover:text-cyan-300/70 transition-colors"
                    title="Remove highlight"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <p className="text-xs text-cyan-100/90 leading-relaxed italic">
                  "{highlight.content}"
                </p>
              </div>
            ))}
            {sharedHighlights.length > 0 && (
              <button
                onClick={() => setShowManualInput(true)}
                className="w-full rounded-lg border border-cyan-300/20 bg-slate-950/40 px-3 py-2 text-xs text-cyan-200/70 hover:bg-slate-950/60 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="h-3 w-3" />
                Add More
              </button>
            )}
          </div>

          {/* Query input (placeholder for future AI integration) */}
          {sharedHighlights.length > 0 && (
            <div className="border-t border-cyan-300/10 p-4">
              <div className="text-[10px] font-bold text-cyan-400/50 uppercase tracking-widest mb-2">
                Cross-Document Query
              </div>
              <div className="rounded-lg border border-cyan-300/10 bg-slate-950/40 p-3 text-xs text-cyan-200/60">
                Ask questions about the highlighted content. AI integration coming soon.
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(34, 211, 238, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(34, 211, 238, 0.3);
        }
      `}</style>
    </div>
  );
}

