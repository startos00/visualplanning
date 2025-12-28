"use client";

import { useEffect, useRef, useState } from "react";
import { Minimize2, Maximize2, Send } from "lucide-react";
import type { GrimpoNodeData } from "@/app/lib/graph";
import { addHighlight } from "@/app/actions/highlights";

type ViewMode = "inline" | "bathysphere" | "compact";

type DumbyReaderProps = {
  pdfUrl: string;
  nodeId: string;
  nodeTitle?: string;
  viewMode: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onHighlight?: (content: string, position: any) => void;
  sharedHighlights?: Array<{ content: string; comment?: string }>;
  syncScroll?: boolean;
  onScrollSync?: (scrollPercent: number) => void;
  scrollPercent?: number;
};

export function DumbyReader({
  pdfUrl,
  nodeId,
  nodeTitle,
  viewMode,
  onViewModeChange,
  onHighlight,
  sharedHighlights = [],
  syncScroll = false,
  onScrollSync,
  scrollPercent = 0,
}: DumbyReaderProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [lastSentText, setLastSentText] = useState<string>("");
  const [showSentNotification, setShowSentNotification] = useState(false);
  const [showSaveHighlightPopup, setShowSaveHighlightPopup] = useState(false);
  const [pendingHighlight, setPendingHighlight] = useState<{ text: string; position: any } | null>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<string>("");

  // Handle scroll sync
  useEffect(() => {
    if (!syncScroll || !onScrollSync || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const handleScroll = () => {
      if (isScrolling) return;
      setIsScrolling(true);
      
      // Calculate scroll percentage
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          const scrollTop = iframeDoc.documentElement.scrollTop || iframeDoc.body.scrollTop;
          const scrollHeight = iframeDoc.documentElement.scrollHeight - iframeDoc.documentElement.clientHeight;
          const scrollPercent = scrollHeight > 0 ? scrollTop / scrollHeight : 0;
          onScrollSync(scrollPercent);
        }
      } catch (e) {
        // Cross-origin restrictions
      }
      
      setTimeout(() => setIsScrolling(false), 100);
    };

    iframe.addEventListener("scroll", handleScroll);
    return () => iframe.removeEventListener("scroll", handleScroll);
  }, [syncScroll, onScrollSync, isScrolling]);

  // Receive scroll sync from parent
  useEffect(() => {
    if (!syncScroll || isScrolling || !iframeRef.current) return;

    try {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (iframeDoc) {
        const scrollHeight = iframeDoc.documentElement.scrollHeight - iframeDoc.documentElement.clientHeight;
        const targetScroll = scrollHeight * scrollPercent;
        iframeDoc.documentElement.scrollTop = targetScroll;
        if (iframeDoc.body) iframeDoc.body.scrollTop = targetScroll;
      }
    } catch (e) {
      // Cross-origin restrictions
    }
  }, [syncScroll, isScrolling, scrollPercent]);

  const handleMinimize = () => {
    onViewModeChange?.("inline");
  };

  // Handle text selection for highlighting - automatically send when text is selected
  useEffect(() => {
    if (viewMode !== "compact" && viewMode !== "bathysphere") return;
    if (!onHighlight) return;

    const checkAndSendSelection = () => {
      let text = "";
      
      // First try to get selection from iframe (works for same-origin PDFs)
      if (iframeRef.current) {
        try {
          const iframe = iframeRef.current;
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const iframeSelection = iframeDoc.getSelection();
            text = iframeSelection?.toString().trim() || "";
          }
        } catch (e) {
          // Cross-origin - can't access iframe selection, try main window
          const selection = window.getSelection();
          text = selection?.toString().trim() || "";
        }
      } else {
        // Fallback to main window selection
        const selection = window.getSelection();
        text = selection?.toString().trim() || "";
      }

      // Only send if:
      // 1. Text exists
      // 2. It's different from what we last sent (avoid duplicates)
      // 3. It's at least 3 characters (avoid accidental single character selections)
      if (text.length >= 3 && text !== lastSentRef.current) {
        lastSentRef.current = text;
        setLastSentText(text);
        
        // Save to database (for Resource Chamber)
        addHighlight(nodeId, text, {
          timestamp: Date.now(),
          source: nodeTitle || nodeId,
        }).catch((error) => {
          console.error("Failed to save highlight:", error);
        });
        
        // Send to shared intelligence (for Sonar Array)
        onHighlight?.(text, {
          timestamp: Date.now(),
          source: nodeTitle || nodeId,
        });

        // Show notification
        setShowSentNotification(true);
        setTimeout(() => {
          setShowSentNotification(false);
        }, 2000);

        // Clear selection after a short delay
        setTimeout(() => {
          try {
            const selection = window.getSelection();
            if (selection) {
              selection.removeAllRanges();
            }
            if (iframeRef.current) {
              const iframe = iframeRef.current;
              const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
              if (iframeDoc) {
                const iframeSelection = iframeDoc.getSelection();
                if (iframeSelection) {
                  iframeSelection.removeAllRanges();
                }
              }
            }
          } catch (e) {
            // Ignore errors
          }
        }, 500);
      }
    };

    // Listen for mouseup events (when user finishes selecting)
    const handleMouseUp = () => {
      // Delay to let selection settle
      setTimeout(checkAndSendSelection, 150);
    };

    // Listen for selection changes
    const handleSelectionChange = () => {
      // Debounce to avoid sending multiple times
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
      selectionTimeoutRef.current = setTimeout(checkAndSendSelection, 300);
    };

    // Listen for copy events (user might copy after selecting)
    const handleCopy = () => {
      setTimeout(checkAndSendSelection, 100);
    };

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("selectionchange", handleSelectionChange);
    document.addEventListener("copy", handleCopy);
    
    // Also check periodically (helps catch selections that might be missed)
    const interval = setInterval(() => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim().length >= 3) {
        checkAndSendSelection();
      }
    }, 1000);

    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
      document.removeEventListener("copy", handleCopy);
      clearInterval(interval);
      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [viewMode, onHighlight, nodeTitle, nodeId]);

  if (viewMode === "compact") {
    // Compact mode for Sonar Array - no sidebar, just PDF
    return (
      <div className="relative h-full w-full" ref={containerRef}>
        <iframe
          ref={iframeRef}
          title={nodeTitle || "PDF"}
          src={pdfUrl}
          className="h-full w-full rounded-xl border border-cyan-300/20 bg-black/20"
          loading="lazy"
        />
        {/* Notification when text is automatically sent */}
        {showSentNotification && (
          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
            <div 
              className="flex items-center gap-2 rounded-full border border-cyan-300/30 bg-slate-950/95 px-4 py-2 text-sm font-medium text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.4)] backdrop-blur-md"
              style={{
                animation: "fadeInSlideUp 0.3s ease-in-out",
              }}
            >
              <Send className="h-4 w-4" />
              Sent to Shared Intelligence
            </div>
          </div>
        )}
      </div>
    );
  }

  if (viewMode === "bathysphere") {
    // Bathysphere mode - full screen with glow
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center">
        {/* Dark blurred background */}
        <div
          className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl transition-opacity duration-700"
          onClick={handleMinimize}
        />
        
        {/* PDF container with glow */}
        <div className="relative z-10 flex h-full w-full flex-col">
          {/* Header with minimize button */}
          <div className="flex items-center justify-between border-b border-cyan-300/20 bg-slate-950/50 px-6 py-4">
            <h2 className="text-lg font-semibold text-cyan-50">{nodeTitle || "PDF Document"}</h2>
            <button
              onClick={handleMinimize}
              className="rounded-full border border-cyan-300/20 bg-slate-950/40 p-2 text-cyan-200 hover:bg-slate-950/60"
              title="Minimize"
            >
              <Minimize2 className="h-5 w-5" />
            </button>
          </div>
          
          {/* PDF with glow effect */}
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden p-8"
            style={{
              boxShadow: "0 0 50px rgba(255,255,255,0.1)",
            }}
          >
            <iframe
              ref={iframeRef}
              title={nodeTitle || "PDF"}
              src={pdfUrl}
              className="h-full w-full rounded-xl border border-cyan-300/10 bg-black/20"
              loading="lazy"
            />
            {/* Notification when text is automatically sent */}
            {showSentNotification && (
              <div className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2">
                <div 
                  className="flex items-center gap-2 rounded-full border border-cyan-300/30 bg-slate-950/95 px-4 py-2 text-sm font-medium text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.4)] backdrop-blur-md"
                  style={{
                    animation: "fadeInSlideUp 0.3s ease-in-out",
                  }}
                >
                  <Send className="h-4 w-4" />
                  Sent to Shared Intelligence
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Inline mode - default view in node
  return (
    <div className="relative">
      <iframe
        ref={iframeRef}
        title={nodeTitle || "PDF"}
        src={pdfUrl}
        className="h-[200px] w-full rounded-xl border border-cyan-300/10 bg-black/20"
        loading="lazy"
      />
    </div>
  );
}

