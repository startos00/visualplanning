"use client";

import { useEffect, useRef, useState } from "react";
import { Minimize2, Maximize2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { GrimpoNodeData } from "@/app/lib/graph";
import { addHighlight } from "@/app/actions/highlights";
import { getBookshelves } from "@/app/actions/bookshelves";
import type { Bookshelf } from "@/app/lib/db/schema";
import { ChevronDown, FolderPlus } from "lucide-react";

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
  nodePosition?: { x: number; y: number };
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
  nodePosition,
}: DumbyReaderProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [lastSentText, setLastSentText] = useState<string>("");
  const [showSentNotification, setShowSentNotification] = useState(false);
  const [showSaveHighlightPopup, setShowSaveHighlightPopup] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualText, setManualText] = useState("");
  const [pendingHighlight, setPendingHighlight] = useState<{ text: string; position: any } | null>(null);
  const [bookshelves, setBookshelves] = useState<Bookshelf[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<string>("");

  useEffect(() => {
    if (showSaveHighlightPopup) {
      getBookshelves().then(setBookshelves);
    }
  }, [showSaveHighlightPopup]);

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

  const handleSaveHighlight = async () => {
    if (!pendingHighlight) return;

    try {
      // Save to database (for Resource Chamber)
      await addHighlight(nodeId, pendingHighlight.text, pendingHighlight.position, undefined, selectedCategoryId || undefined);
      
      // Send to shared intelligence (for Sonar Array)
      onHighlight?.(pendingHighlight.text, pendingHighlight.position);

      // Show notification
      setShowSentNotification(true);
      setTimeout(() => {
        setShowSentNotification(false);
      }, 2000);
    } catch (error) {
      console.error("Failed to save highlight:", error);
    }

    // Clear popup and selection
    setShowSaveHighlightPopup(false);
    setPendingHighlight(null);
    
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
    }, 100);
  };

  const handleCancelHighlight = () => {
    setShowSaveHighlightPopup(false);
    setPendingHighlight(null);
    lastSentRef.current = ""; // Allow re-selecting the same text
    
    // Clear selection
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
    }, 100);
  };

  const tryCaptureSelection = () => {
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
        // Cross-origin - can't access iframe selection
      }
    }

    // Fallback to main window selection
    if (!text) {
      const selection = window.getSelection();
      text = selection?.toString().trim() || "";
    }

    if (text.length >= 3) {
      setPendingHighlight({
        text,
        position: {
          timestamp: Date.now(),
          source: nodeTitle || nodeId,
        },
      });
      setShowSaveHighlightPopup(true);
      return true;
    }
    return false;
  };

  const handleManualHighlightClick = async () => {
    // 1. Try to capture current selection (works for same-origin or main window)
    const captured = tryCaptureSelection();
    if (captured) return;

    // 2. Try to read from clipboard (requires user permission prompt)
    try {
      // This will trigger a browser permission prompt the first time
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length >= 3) {
        setPendingHighlight({
          text: text.trim(),
          position: {
            timestamp: Date.now(),
            source: nodeTitle || nodeId,
          },
        });
        setShowSaveHighlightPopup(true);
        return;
      }
    } catch (e) {
      // Permission denied or not supported - proceed to manual input
      console.warn("Clipboard access denied:", e);
    }

    // 3. Fallback to manual input modal
    setShowManualInput(true);
  };

  const handleManualSubmit = () => {
    if (manualText.trim().length >= 3) {
      setPendingHighlight({
        text: manualText.trim(),
        position: {
          timestamp: Date.now(),
          source: nodeTitle || nodeId,
        },
      });
      setShowManualInput(false);
      setManualText("");
      setShowSaveHighlightPopup(true);
    }
  };

  // Handle global paste event as a shortcut
  useEffect(() => {
    if (viewMode !== "compact" && viewMode !== "bathysphere") return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      // If we're already showing a popup, don't interrupt
      if (showSaveHighlightPopup || showManualInput) return;

      // Don't trigger if user is pasting into an input/textarea (like a code editor)
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      // Only trigger if the container is focused/active or if the paste target is within our container
      try {
        const isWithinContainer = containerRef.current?.contains(target);
        if (!isWithinContainer && document.activeElement !== containerRef.current) {
          // Check if iframe is focused (cross-origin safe check)
          if (iframeRef.current && document.activeElement !== iframeRef.current) {
            return;
          }
        }
      } catch (e) {
        // Cross-origin restrictions - be conservative and don't auto-trigger
        return;
      }

      const text = e.clipboardData?.getData("text");
      if (text && text.trim().length >= 3) {
        // Skip auto-trigger for SQL-looking content (likely accidental paste)
        const trimmedText = text.trim();
        if (trimmedText.startsWith("CREATE TABLE") || 
            trimmedText.startsWith("--") && trimmedText.includes("CREATE TABLE") ||
            trimmedText.includes("PRIMARY KEY") && trimmedText.includes("DEFAULT")) {
          return; // Don't auto-trigger for SQL code
        }

        setPendingHighlight({
          text: trimmedText,
          position: {
            timestamp: Date.now(),
            source: nodeTitle || nodeId,
          },
        });
        setShowSaveHighlightPopup(true);
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [viewMode, showSaveHighlightPopup, showManualInput, nodeTitle, nodeId]);

  // Handle text selection for highlighting - keep automatic check for same-origin
  useEffect(() => {
    if (viewMode !== "compact" && viewMode !== "bathysphere") return;

    const checkSelection = () => {
      // Automatic detection for same-origin/main window
      let text = "";
      if (iframeRef.current) {
        try {
          const iframe = iframeRef.current;
          const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
          if (iframeDoc) {
            const iframeSelection = iframeDoc.getSelection();
            text = iframeSelection?.toString().trim() || "";
          }
        } catch (e) {}
      }
      if (!text) {
        const selection = window.getSelection();
        text = selection?.toString().trim() || "";
      }

      if (text.length >= 3 && text !== lastSentRef.current) {
        // Only trigger popup if we're not already showing one
        if (!showSaveHighlightPopup && !showManualInput) {
          lastSentRef.current = text;
          setPendingHighlight({
            text,
            position: {
              timestamp: Date.now(),
              source: nodeTitle || nodeId,
            },
          });
          setShowSaveHighlightPopup(true);
        }
      }
    };

    const handleMouseUp = () => setTimeout(checkSelection, 200);
    document.addEventListener("mouseup", handleMouseUp);
    
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [viewMode, showSaveHighlightPopup, showManualInput, nodeTitle, nodeId]);

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
        
        {/* Floating Save Button - Always visible as a trigger */}
        <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
          {!showSaveHighlightPopup && !showManualInput && (
            <button
              onClick={handleManualHighlightClick}
              className="flex items-center gap-2 rounded-full border border-cyan-300/30 bg-slate-950/95 px-4 py-2 text-sm font-medium text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.4)] backdrop-blur-md transition-all hover:bg-cyan-500/20 hover:shadow-[0_0_32px_rgba(34,211,238,0.5)]"
              title="Tip: Select text and Copy (Ctrl+C) first if it's an external PDF"
            >
              <Send className="h-4 w-4" />
              Save Selection
            </button>
          )}
        </div>

        {/* Manual Input Modal - Fallback for CORS iframes */}
        {showManualInput && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="mx-4 w-full max-w-md rounded-2xl border border-cyan-300/30 bg-slate-950/95 p-6 shadow-[0_0_32px_rgba(34,211,238,0.4)] backdrop-blur-md">
              <h3 className="mb-3 text-lg font-semibold text-cyan-50">Capture Highlight</h3>
              <p className="mb-4 text-xs text-cyan-300/60 leading-relaxed">
                Browser security prevents automatic detection for this document. 
                <br /><br />
                <strong>Simple Step:</strong> Select your text, <strong>Copy it (Ctrl+C)</strong>, then click <strong>Confirm & Save</strong> below:
              </p>
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Paste text here..."
                className="mb-4 w-full min-h-[100px] rounded-xl border border-cyan-300/20 bg-slate-900/60 p-3 text-sm text-cyan-50 placeholder:text-cyan-300/30 outline-none focus:border-cyan-400/50"
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setManualText(text);
                    } catch (e) {}
                  }}
                  className="rounded-lg border border-cyan-300/20 bg-slate-800/60 px-4 py-2 text-xs text-cyan-200"
                >
                  Paste from Clipboard
                </button>
                <button
                  onClick={handleManualSubmit}
                  disabled={manualText.trim().length < 3}
                  className="flex-1 rounded-lg border border-cyan-300/30 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-50 transition-all hover:bg-cyan-500/30"
                >
                  Confirm & Save
                </button>
                <button
                  onClick={() => {
                    setShowManualInput(false);
                    setManualText("");
                  }}
                  className="rounded-lg border border-cyan-300/20 bg-slate-950/60 px-4 py-2 text-sm text-cyan-300/70"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Save Highlight Popup - Confirmation */}
        {showSaveHighlightPopup && pendingHighlight && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div 
              className="mx-4 w-full max-w-md rounded-2xl border border-cyan-300/30 bg-slate-950/95 p-6 shadow-[0_0_32px_rgba(34,211,238,0.4)] backdrop-blur-md"
              style={{
                animation: "fadeInSlideUp 0.3s ease-in-out",
              }}
            >
              <h3 className="mb-3 text-lg font-semibold text-cyan-50">Save Highlight?</h3>
              <div className="mb-4 rounded-lg border border-cyan-300/20 bg-slate-900/60 p-3 max-h-[200px] overflow-y-auto">
                <p className="text-sm italic text-cyan-100/90 leading-relaxed whitespace-pre-wrap break-words">
                  {pendingHighlight.text.length > 500 
                    ? `"${pendingHighlight.text.substring(0, 500)}..."` 
                    : `"${pendingHighlight.text}"`}
                </p>
                {pendingHighlight.text.length > 500 && (
                  <p className="mt-2 text-xs text-cyan-300/50">
                    (Showing first 500 characters of {pendingHighlight.text.length} total)
                  </p>
                )}
              </div>

              {/* Category Selection */}
              <div className="mb-4">
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-cyan-400/60">Save to Bookshelf</label>
                <div className="relative">
                  <select 
                    value={selectedCategoryId || ""}
                    onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                    className="w-full appearance-none rounded-xl border border-cyan-300/20 bg-slate-900/60 px-4 py-2 text-xs text-cyan-50 outline-none focus:border-cyan-400/50"
                  >
                    <option value="">General / Uncategorized</option>
                    {bookshelves.map(shelf => (
                      <option key={shelf.id} value={shelf.id}>{shelf.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300/40" />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveHighlight}
                  className="flex-1 rounded-lg border border-cyan-300/30 bg-cyan-500/20 px-4 py-2 text-sm font-medium text-cyan-50 transition-all hover:bg-cyan-500/30 hover:shadow-[0_0_16px_rgba(34,211,238,0.3)]"
                >
                  Save Highlight
                </button>
                <button
                  onClick={handleCancelHighlight}
                  className="rounded-lg border border-cyan-300/20 bg-slate-950/60 px-4 py-2 text-sm text-cyan-300/70 transition-all hover:bg-slate-950/80"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Notification */}
        {showSentNotification && (
          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 pointer-events-none">
            <div 
              className="flex items-center gap-2 rounded-full border border-cyan-300/30 bg-slate-950/95 px-4 py-2 text-sm font-medium text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.4)] backdrop-blur-md"
              style={{
                animation: "fadeInSlideUp 0.3s ease-in-out",
              }}
            >
              <Send className="h-4 w-4" />
              Saved to Resource Chamber
            </div>
          </div>
        )}
      </div>
    );
  }

  if (viewMode === "bathysphere") {
    // Bathysphere mode - full screen with glow
    // Calculate initial animation state
    const getInitialState = () => {
      if (nodePosition && typeof window !== "undefined") {
        return {
          scale: 0.3,
          x: nodePosition.x - window.innerWidth / 2,
          y: nodePosition.y - window.innerHeight / 2,
          opacity: 0.8,
        };
      }
      return {
        scale: 0.8,
        opacity: 0,
      };
    };

    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dark blurred background */}
          <motion.div
            className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            onClick={handleMinimize}
          />
          
          {/* PDF container with glow */}
          <motion.div
            className="relative z-10 flex h-full w-full flex-col"
            initial={getInitialState()}
            animate={{
              scale: 1,
              x: 0,
              y: 0,
              opacity: 1,
            }}
            exit={{
              scale: nodePosition ? 0.3 : 0.8,
              opacity: 0,
            }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
          >
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
            
            {/* PDF container with glow effect */}
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
              
              {/* Floating Save Button - Always visible */}
              <div className="absolute bottom-12 left-1/2 z-20 -translate-x-1/2">
                {!showSaveHighlightPopup && !showManualInput && (
                  <button
                    onClick={handleManualHighlightClick}
                    className="flex items-center gap-2 rounded-full border border-cyan-300/30 bg-slate-950/95 px-6 py-3 text-base font-medium text-cyan-50 shadow-[0_0_32px_rgba(34,211,238,0.5)] backdrop-blur-md transition-all hover:bg-cyan-500/20 hover:shadow-[0_0_48px_rgba(34,211,238,0.6)]"
                  >
                    <Send className="h-5 w-5" />
                    Save Selection
                  </button>
                )}
              </div>

              {/* Manual Input Modal */}
              {showManualInput && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-md">
                  <div className="mx-4 w-full max-w-lg rounded-2xl border border-cyan-300/30 bg-slate-950/95 p-8 shadow-[0_0_48px_rgba(34,211,238,0.5)] backdrop-blur-md">
                    <h3 className="mb-4 text-xl font-semibold text-cyan-50">Capture Highlight</h3>
                    <p className="mb-6 text-sm text-cyan-300/60 leading-relaxed">
                      Browser security prevents automatic detection for this document. 
                      <br /><br />
                      <strong>Simple Step:</strong> Select your text, <strong>Copy it (Ctrl+C)</strong>, then click <strong>Confirm & Save</strong> below:
                    </p>
                    <textarea
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      placeholder="Paste text here..."
                      className="mb-6 w-full min-h-[150px] rounded-xl border border-cyan-300/20 bg-slate-900/60 p-4 text-sm text-cyan-50 placeholder:text-cyan-300/30 outline-none focus:border-cyan-400/50"
                      autoFocus
                    />
                    <div className="flex gap-4">
                      <button
                        onClick={async () => {
                          try {
                            const text = await navigator.clipboard.readText();
                            if (text) setManualText(text);
                          } catch (e) {}
                        }}
                        className="rounded-xl border border-cyan-300/20 bg-slate-800/60 px-6 py-3 text-sm text-cyan-200"
                      >
                        Paste Text
                      </button>
                      <button
                        onClick={handleManualSubmit}
                        disabled={manualText.trim().length < 3}
                        className="flex-1 rounded-xl border border-cyan-300/30 bg-cyan-500/20 px-6 py-3 text-sm font-medium text-cyan-50 transition-all hover:bg-cyan-500/30"
                      >
                        Confirm & Save
                      </button>
                      <button
                        onClick={() => {
                          setShowManualInput(false);
                          setManualText("");
                        }}
                        className="rounded-xl border border-cyan-300/20 bg-slate-950/60 px-6 py-3 text-sm text-cyan-300/70"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Highlight Popup - Confirmation */}
              {showSaveHighlightPopup && pendingHighlight && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-md">
                  <div 
                    className="mx-4 w-full max-w-lg rounded-2xl border border-cyan-300/30 bg-slate-950/95 p-8 shadow-[0_0_48px_rgba(34,211,238,0.5)] backdrop-blur-md"
                    style={{
                      animation: "fadeInSlideUp 0.3s ease-in-out",
                    }}
                  >
                    <h3 className="mb-4 text-xl font-semibold text-cyan-50">Save Highlight?</h3>
                    <div className="mb-6 rounded-xl border border-cyan-300/20 bg-slate-900/60 p-4 max-h-[300px] overflow-y-auto">
                      <p className="text-sm italic text-cyan-100/90 leading-relaxed">
                        "{pendingHighlight.text}"
                      </p>
                    </div>

                    {/* Category Selection */}
                    <div className="mb-6">
                      <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-cyan-400/60">Save to Bookshelf</label>
                      <div className="relative">
                        <select 
                          value={selectedCategoryId || ""}
                          onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                          className="w-full appearance-none rounded-xl border border-cyan-300/20 bg-slate-900/60 px-5 py-3 text-sm text-cyan-50 outline-none focus:border-cyan-400/50"
                        >
                          <option value="">General / Uncategorized</option>
                          {bookshelves.map(shelf => (
                            <option key={shelf.id} value={shelf.id}>{shelf.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-300/40" />
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={handleSaveHighlight}
                        className="flex-1 rounded-xl border border-cyan-300/30 bg-cyan-500/20 px-6 py-3 text-sm font-medium text-cyan-50 transition-all hover:bg-cyan-500/30 hover:shadow-[0_0_24px_rgba(34,211,238,0.4)]"
                      >
                        Save Highlight
                      </button>
                      <button
                        onClick={handleCancelHighlight}
                        className="rounded-xl border border-cyan-300/20 bg-slate-950/60 px-6 py-3 text-sm text-cyan-300/70 transition-all hover:bg-slate-950/80"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Notification when text is saved */}
              {showSentNotification && (
                <div className="absolute bottom-12 left-1/2 z-20 -translate-x-1/2 pointer-events-none">
                  <div 
                    className="flex items-center gap-2 rounded-full border border-cyan-300/30 bg-slate-950/95 px-6 py-3 text-base font-medium text-cyan-50 shadow-[0_0_32px_rgba(34,211,238,0.5)] backdrop-blur-md"
                    style={{
                      animation: "fadeInSlideUp 0.3s ease-in-out",
                    }}
                  >
                    <Send className="h-4 w-4" />
                    Saved to Resource Chamber
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
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
