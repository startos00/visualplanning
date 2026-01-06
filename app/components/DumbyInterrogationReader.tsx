"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Send, Lightbulb, CheckSquare, AlertCircle, MessageSquare, List, Bookmark, Trash2, ChevronDown, FolderPlus } from "lucide-react";
import { useChat, Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import { getHighlights, addHighlight, deleteHighlight } from "@/app/actions/highlights";
import { getBookshelves } from "@/app/actions/bookshelves";
import type { Highlight, Bookshelf } from "@/app/lib/db/schema";
import { AiProviderSelector } from "./ui/AiProviderSelector";
import type { Provider } from "@/app/lib/ai/aiConstants";
import { DEFAULT_MODELS } from "@/app/lib/ai/aiConstants";

// Import from react-pdf-highlighter
// Note: User needs to run `npm install react-pdf-highlighter`
import {
  PdfLoader,
  PdfHighlighter,
  Tip,
  Highlight as PdfHighlight,
  Popup,
  AreaHighlight,
} from "react-pdf-highlighter";

type DumbyInterrogationReaderProps = {
  pdfUrl: string;
  nodeId: string;
  nodeTitle?: string;
  onClose: () => void;
  onExtractTask?: (text: string) => void;
};

type InterrogateIntent = "EXPLAIN" | "CRITIQUE" | "GENERAL";

export function DumbyInterrogationReader({
  pdfUrl,
  nodeId,
  nodeTitle,
  onClose,
  onExtractTask,
}: DumbyInterrogationReaderProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [mountPdfViewer, setMountPdfViewer] = useState(true);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectedText, setSelectedText] = useState<string>("");
  const [pendingIntent, setPendingIntent] = useState<InterrogateIntent | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [focusedSnippet, setFocusedSnippet] = useState<string>("");
  const [focusedHighlightId, setFocusedHighlightId] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<"chat" | "snippets">("chat");
  const [pendingComment, setPendingComment] = useState<string>("");
  const [isSavingHighlight, setIsSavingHighlight] = useState(false);
  const [bookshelves, setBookshelves] = useState<Bookshelf[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<Provider>("openai");
  const [currentModel, setCurrentModel] = useState<string>(DEFAULT_MODELS.openai);
  const scrollViewerTo = useRef<((highlight: any) => void) | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const commentInputRef = useRef<HTMLTextAreaElement>(null);

  function normalizePdfHighlighterPosition(raw: any) {
    if (!raw || typeof raw !== "object") return null;

    const pageNumber =
      typeof raw.pageNumber === "number"
        ? raw.pageNumber
        : typeof raw.pageNumber === "string" && raw.pageNumber.trim()
          ? Number(raw.pageNumber)
          : 1;

    let rects: any[] | null = Array.isArray(raw.rects) ? raw.rects : null;
    let boundingRect: any | null =
      raw.boundingRect && typeof raw.boundingRect === "object" ? raw.boundingRect : null;

    // Some persisted highlights may only have a single bounding rect (no `rects` array).
    // `react-pdf-highlighter` expects `position.rects` to be iterable.
    if (!rects) {
      if (boundingRect) rects = [boundingRect];
      else rects = [];
    }

    if (!boundingRect && rects.length > 0) boundingRect = rects[0];
    if (!boundingRect) return null;

    return {
      ...raw,
      pageNumber: Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1,
      boundingRect,
      rects,
    };
  }

  // This modal is rendered inside a ReactFlow node (which is transformed).
  // Using a portal ensures our "fixed" overlay is truly viewport-fixed and centered.
  useEffect(() => setIsMounted(true), []);

  // Note: react-pdf-highlighter handles pdfjs setup internally using its own bundled version (4.4.168)
  // We don't need to configure it manually - just let it handle everything

  // react-pdf-highlighter currently doesn't remove its per-page highlight layer containers on unmount.
  // In React StrictMode dev (double-mount), those leftover DOM nodes cause:
  // "createRoot() on a container that has already been passed to createRoot()".
  // Cleaning them up on unmount prevents the warning and avoids stale layers.
  useEffect(() => {
    return () => {
      const scope: ParentNode = containerRef.current ?? document;
      scope
        .querySelectorAll?.(".PdfHighlighter__highlight-layer")
        ?.forEach((el) => el.parentNode?.removeChild(el));
    };
  }, []);

  // Prevent "createRoot() called twice" by ensuring any old highlight-layer containers are removed
  // BEFORE mounting PdfHighlighter. (Some versions of react-pdf-highlighter reuse DOM nodes across mounts.)
  useEffect(() => {
    const scope: ParentNode = containerRef.current ?? document;
    scope
      .querySelectorAll?.(".PdfHighlighter__highlight-layer")
      ?.forEach((el) => el.parentNode?.removeChild(el));

    // Unmount + remount viewer next tick so PdfHighlighter creates fresh containers
    setMountPdfViewer(false);
    const t = window.setTimeout(() => setMountPdfViewer(true), 0);
    return () => window.clearTimeout(t);
  }, [pdfUrl]);

  // Clear error when PDF URL changes (new PDF being loaded)
  useEffect(() => {
    setPdfError(null);
  }, [pdfUrl]);


  useEffect(() => {
    async function loadData() {
      try {
        const [loadedHighlights, loadedBookshelves] = await Promise.all([
          getHighlights(nodeId),
          getBookshelves()
        ]);
        setHighlights(loadedHighlights);
        setBookshelves(loadedBookshelves);
      } catch (e) {
        console.error("Failed to load data:", e);
      }
    }
    loadData();
  }, [nodeId]);

  // Fetch user preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await fetch("/api/user/preferences");
        if (response.ok) {
          const data = await response.json();
          const pref = data.dumby;
          if (pref) {
            setCurrentProvider(pref.provider);
            setCurrentModel(pref.model);
          } else {
            setCurrentProvider("openai");
            setCurrentModel(DEFAULT_MODELS.openai);
          }
        }
      } catch (err) {
        console.error("Failed to fetch preferences:", err);
      }
    };
    fetchPreferences();
  }, []);

  const handleSavePreferences = async (provider: Provider, model: string) => {
    const response = await fetch("/api/user/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentType: "dumby", provider, model }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to save preferences");
    }
    setCurrentProvider(provider);
    setCurrentModel(model);
    // Show warning if API key is missing (but preference was saved)
    if (data.warning) {
      setChatError(data.warning);
      setTimeout(() => setChatError(""), 5000); // Clear warning after 5 seconds
    }
  };

  // Listen for highlight deletion events to refresh highlights
  useEffect(() => {
    const handleHighlightDeleted = async () => {
      // Refresh highlights when any highlight is deleted
      try {
        const loadedHighlights = await getHighlights(nodeId);
        setHighlights(loadedHighlights);
        // Clear focused highlight if it was deleted
        if (focusedHighlightId && !loadedHighlights.find(h => h.id === focusedHighlightId)) {
          setFocusedHighlightId(null);
          setFocusedSnippet("");
        }
      } catch (e) {
        console.error("Failed to refresh highlights after deletion:", e);
      }
    };

    window.addEventListener('highlightDeleted', handleHighlightDeleted);
    return () => {
      window.removeEventListener('highlightDeleted', handleHighlightDeleted);
    };
  }, [nodeId, focusedHighlightId]);

  // Debug: Log PDF URL and container dimensions
  useEffect(() => {
    console.log("DumbyInterrogationReader - PDF URL:", pdfUrl);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      console.log("PDF Container dimensions:", { width: rect.width, height: rect.height });
    }
  }, [pdfUrl]);

  // Refs to keep track of focused snippet and intent for the transport
  const focusedSnippetRef = useRef(focusedSnippet);
  const pendingIntentRef = useRef(pendingIntent);

  useEffect(() => {
    focusedSnippetRef.current = focusedSnippet;
  }, [focusedSnippet]);

  useEffect(() => {
    pendingIntentRef.current = pendingIntent;
  }, [pendingIntent]);

  // Chat hook for Dumby interrogation - using Chat class with DefaultChatTransport
  const [chat] = useState(() => {
    const transport = new DefaultChatTransport({
      api: "/api/chat/dumby-interrogate",
      body: () => ({
        context: focusedSnippetRef.current,
        intent: pendingIntentRef.current || "GENERAL",
        documentTitle: nodeTitle || "Unknown PDF",
      }),
    });
    return new Chat({ transport });
  });
  
  const chatHelpers = useChat({ chat });
  const { messages, sendMessage, status } = chatHelpers;
  const [input, setInput] = useState("");
  const isLoading = status === "streaming";
  const [chatError, setChatError] = useState<string>("");

  const safeSendMessage = useCallback(
    async (message: any, options?: any) => {
      setChatError("");
      try {
        await sendMessage(message, options);
      } catch (e) {
        const msg =
          typeof (e as any)?.message === "string" && (e as any).message.trim()
            ? (e as any).message
            : "Dumby failed to respond (check API keys / auth).";
        setChatError(msg);
      }
    },
    [sendMessage],
  );

  // Handle context menu actions
  const handleExplain = useCallback((text: string) => {
    if (!text) return;
    setSelectedText(text);
    setFocusedSnippet(text);
    setFocusedHighlightId(null);
    setPendingIntent("EXPLAIN");
    setActiveSidebarTab("chat");
    void safeSendMessage({
      role: "user",
      parts: [{ type: "text", text: `Dumby, explain this text like I'm 5: ${text}` }],
    } as any, {
      body: {
        context: text,
        intent: "EXPLAIN",
      },
    });
  }, [safeSendMessage]);

  const handleExtractTask = useCallback((text: string) => {
    if (!text || !onExtractTask) return;
    onExtractTask(text);
    // Keep modal open after extracting task (as per FRED: "The modal closes (or remains open)")
    // User can continue analyzing the document
  }, [onExtractTask]);

  const handleCritique = useCallback((text: string) => {
    if (!text) return;
    setSelectedText(text);
    setFocusedSnippet(text);
    setFocusedHighlightId(null);
    setPendingIntent("CRITIQUE");
    setActiveSidebarTab("chat");
    void safeSendMessage({
      role: "user",
      parts: [{ type: "text", text: `Dumby, interrogate this claim: ${text}` }],
    } as any, {
      body: {
        context: text,
        intent: "CRITIQUE",
      },
    });
  }, [safeSendMessage]);

  // Save highlight
  const handleSaveHighlight = useCallback(async (content: string, position: any, comment?: string, categoryId?: string) => {
    if (isSavingHighlight) return; // Prevent double-clicks
    
    setIsSavingHighlight(true);
    try {
      // Ensure position is a plain object for server action serialization
      const cleanPosition = JSON.parse(JSON.stringify(position));
      await addHighlight(nodeId, content, cleanPosition, comment, categoryId);
      
      // Reload highlights
      const loaded = await getHighlights(nodeId);
      setHighlights(loaded);

      // Set the newly saved highlight as focused
      const newHighlight = loaded.find(h => h.content === content);
      if (newHighlight) {
        setFocusedHighlightId(newHighlight.id);
        setFocusedSnippet(newHighlight.content);
      }
      
      // Clear comment input
      setPendingComment("");
    } catch (error) {
      console.error("Failed to save highlight:", error);
    } finally {
      setIsSavingHighlight(false);
    }
  }, [nodeId, isSavingHighlight]);

  const handleDeleteHighlight = useCallback(async (id: string) => {
    try {
      const result = await deleteHighlight(id);
      if (result.success) {
        setHighlights((prev) => prev.filter((h) => h.id !== id));
        if (focusedHighlightId === id) {
          setFocusedHighlightId(null);
          setFocusedSnippet("");
        }
        // Dispatch event so ResourceChamber can refresh
        window.dispatchEvent(new CustomEvent('highlightDeleted', { detail: { highlightId: id } }));
      }
    } catch (error) {
      console.error("Failed to delete highlight:", error);
    }
  }, [focusedHighlightId]);

  // Handle chat submit with context
  const handleChatSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!input.trim()) return;

      const currentIntent = pendingIntent || "GENERAL";
      const currentContext = focusedSnippet || "";

      void safeSendMessage({
        role: "user",
        parts: [{ type: "text", text: input }],
      } as any, {
        body: {
          context: currentContext,
          intent: currentIntent,
        },
      });
      
      setInput("");
    },
    [input, focusedSnippet, pendingIntent, safeSendMessage]
  );

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center p-4">
      <style jsx global>{`
        .PdfHighlighter__tip-container {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          pointer-events: auto !important;
        }
      `}</style>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative z-10 flex h-[90vh] max-h-[calc(100vh-2rem)] w-full max-w-[1600px] flex-col overflow-hidden rounded-3xl border border-orange-500/20 bg-slate-950/90 shadow-[0_0_48px_rgba(249,115,22,0.3)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-orange-500/20 bg-gradient-to-r from-orange-950/30 to-slate-900 px-6 py-4">
          <div>
            <div className="text-xs tracking-widest text-orange-400/80">DUMBY_ANALYSIS_PROTOCOL</div>
            <div className="mt-1 text-lg font-semibold text-orange-50">{nodeTitle || "PDF Document"}</div>
            <div className="mt-1 text-[10px] text-orange-400/50">
              {currentProvider === "openai" ? "OpenAI" : currentProvider === "google" ? "Gemini" : "Claude"} • {currentModel.replace(/-/g, " ")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AiProviderSelector
              agentType="dumby"
              currentProvider={currentProvider}
              currentModel={currentModel}
              onSave={handleSavePreferences}
            />
            <button
              onClick={onClose}
              className="rounded-full border border-orange-500/20 bg-slate-950/40 p-2 text-orange-200 hover:bg-slate-950/60"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Split Layout */}
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row" style={{ minHeight: 0 }}>
          {/* Left Pane: PDF Viewer (70%) */}
          <div
            className="relative w-full overflow-hidden border-b border-orange-500/10 bg-slate-900 md:w-[70%] md:border-b-0 md:border-r"
            ref={containerRef}
            style={{ height: '100%', minHeight: 0 }}
          >
            {!mountPdfViewer ? (
              <div className="flex h-full items-center justify-center text-orange-200">
                Initializing PDF viewer…
              </div>
            ) : (
              <PdfLoader
                url={pdfUrl}
                beforeLoad={
                  <div className="flex h-full items-center justify-center text-orange-200">
                    {pdfError ? (
                      <div className="text-center">
                        <div className="text-red-400 mb-2">Failed to load PDF</div>
                        <div className="text-xs text-orange-200/70">{pdfError}</div>
                      </div>
                    ) : (
                      "Loading PDF Protocol..."
                    )}
                  </div>
                }
                onError={(error) => {
                  console.error("PDF Load Error:", error);
                  setPdfError(error?.message || "Unknown error loading PDF");
                }}
              >
                {(pdfDocument) => {
                  return (
                    <PdfHighlighter
                      pdfDocument={pdfDocument}
                      enableAreaSelection={(event) => event.altKey}
                      onScrollChange={() => {}}
                      scrollRef={(scrollTo) => {
                        scrollViewerTo.current = scrollTo;
                      }}
                      onSelectionFinished={(position, content, hideTipAndSelection, transformSelection) => {
                    const selectedTextContent = content.text || "";
                    // Update states for context in manual chat and visual synchronization
                    setSelectedText(selectedTextContent);
                    setFocusedSnippet(selectedTextContent);
                    setFocusedHighlightId(null);
                    setPendingComment(""); // Reset comment when new selection
                    
                    // Focus comment input after a brief delay to ensure it's rendered
                    setTimeout(() => {
                      commentInputRef.current?.focus();
                    }, 100);
                    
                    const tipContent = (
                      <div 
                        className="flex flex-col overflow-hidden rounded-2xl border border-orange-500/40 bg-slate-950/90 shadow-[0_0_40px_rgba(249,115,22,0.25)] backdrop-blur-xl min-w-[320px] animate-in fade-in zoom-in duration-200"
                        style={{ pointerEvents: "auto" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Header: Selection Metadata */}
                        <div className="flex items-center justify-between border-b border-orange-500/10 bg-orange-500/5 px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400/80">
                              Active Selection
                            </span>
                          </div>
                          <button 
                            onClick={hideTipAndSelection}
                            className="rounded-full p-1 text-orange-400/50 hover:bg-orange-500/10 hover:text-orange-400 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="p-4 space-y-4">
                          {/* Section 1: Interrogation Actions */}
                          <div>
                            <label className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              Interrogate with Dumby
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleExplain(selectedTextContent);
                                  hideTipAndSelection();
                                }}
                                className="flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-950/20 px-3 py-2.5 text-xs font-semibold text-orange-100 transition-all hover:border-orange-500/40 hover:bg-orange-950/40 active:scale-95"
                              >
                                <Lightbulb className="h-4 w-4 text-orange-400" />
                                Explain
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCritique(selectedTextContent);
                                  hideTipAndSelection();
                                }}
                                className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-950/20 px-3 py-2.5 text-xs font-semibold text-red-100 transition-all hover:border-red-500/40 hover:bg-red-950/40 active:scale-95"
                              >
                                <AlertCircle className="h-4 w-4 text-red-400" />
                                Critique
                              </button>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExtractTask(selectedTextContent);
                                hideTipAndSelection();
                              }}
                              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-green-500/20 bg-green-950/20 px-3 py-2.5 text-xs font-semibold text-green-100 transition-all hover:border-green-500/40 hover:bg-green-950/40 active:scale-95"
                            >
                              <CheckSquare className="h-4 w-4 text-green-400" />
                              Extract to Task Board
                            </button>
                          </div>

                          {/* Section 2: Archiving / Saving */}
                          <div className="pt-2 border-t border-orange-500/10">
                            <label className="mb-2 block text-[9px] font-bold uppercase tracking-wider text-slate-500">
                              Archive Snippet
                            </label>
                            <div className="space-y-3">
                              <div className="space-y-1.5">
                                <label className="block text-[8px] font-bold uppercase tracking-widest text-orange-400/40">Shelf Category</label>
                                <div className="relative">
                                  <select 
                                    value={selectedCategoryId || ""}
                                    onChange={(e) => setSelectedCategoryId(e.target.value || null)}
                                    className="w-full appearance-none rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-[10px] text-orange-100 outline-none transition-all focus:border-cyan-500/30"
                                  >
                                    <option value="">General / Uncategorized</option>
                                    {bookshelves.map(shelf => (
                                      <option key={shelf.id} value={shelf.id}>{shelf.name}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-orange-400/30" />
                                </div>
                              </div>
                              <textarea
                                ref={commentInputRef}
                                value={pendingComment}
                                onChange={(e) => {
                                  // No need for stopPropagation here as the native capture listener handles it
                                  setPendingComment(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  // Keep the Cmd+Enter shortcut
                                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                    e.preventDefault();
                                    handleSaveHighlight(selectedTextContent, position, pendingComment.trim() || undefined, selectedCategoryId || undefined);
                                    hideTipAndSelection();
                                  }
                                }}
                                placeholder="Add a thought or tag (optional)..."
                                className="min-h-[70px] w-full resize-none rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs text-orange-50 placeholder:text-slate-600 outline-none transition-all focus:border-cyan-500/30 focus:bg-white/10"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveHighlight(selectedTextContent, position, pendingComment.trim() || undefined, selectedCategoryId || undefined);
                                    hideTipAndSelection();
                                  }}
                                  disabled={isSavingHighlight}
                                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-cyan-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-[0.97] disabled:opacity-50"
                                >
                                  {isSavingHighlight ? "Saving..." : "Save Highlight"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer Hint */}
                        <div className="bg-white/5 px-4 py-2 text-center text-[9px] text-slate-500">
                          Tip: Use <kbd className="rounded bg-slate-800 px-1 font-sans text-slate-300">⌘</kbd> + <kbd className="rounded bg-slate-800 px-1 font-sans text-slate-300">Enter</kbd> to save instantly
                        </div>
                      </div>
                    );
                    
                    // Custom Tip implementation to bypass the library's default white box and emojis
                    const CustomTip = () => {
                      useEffect(() => {
                        transformSelection();
                        
                        const el = commentInputRef.current;
                        if (el) {
                          // Native listener with capture: true is the most aggressive way 
                          // to stop a library from stealing keystrokes
                          const stopEvent = (e: Event) => e.stopPropagation();
                          
                          el.addEventListener("keydown", stopEvent, true);
                          el.addEventListener("keyup", stopEvent, true);
                          el.addEventListener("keypress", stopEvent, true);
                          el.addEventListener("pointerdown", stopEvent, true);
                          el.addEventListener("mousedown", stopEvent, true);

                          // Focus after a short delay to allow the library to finish its own positioning/scrolling
                          const t = setTimeout(() => {
                            el.focus();
                            // Optional: clear any existing selection in the textarea and put cursor at end
                            const val = el.value;
                            el.value = "";
                            el.value = val;
                          }, 150);

                          return () => {
                            el.removeEventListener("keydown", stopEvent, true);
                            el.removeEventListener("keyup", stopEvent, true);
                            el.removeEventListener("keypress", stopEvent, true);
                            el.removeEventListener("pointerdown", stopEvent, true);
                            el.removeEventListener("mousedown", stopEvent, true);
                            clearTimeout(t);
                          };
                        }
                      }, []);

                      return tipContent;
                    };

                    return <CustomTip />;
                      }}
                      highlightTransform={(
                    highlight,
                    index,
                    setTip,
                    hideTip,
                    viewportToScaled,
                    screenshot,
                    isSelectionInProgress
                  ) => {
                    const contentAny = (highlight as any)?.content;
                    const isTextHighlight = !(contentAny && (contentAny as any).image);

                    const component = isTextHighlight ? (
                      <PdfHighlight
                        isScrolledTo={false}
                        position={highlight.position}
                        comment={highlight.comment}
                      />
                    ) : (
                      <AreaHighlight
                        isScrolledTo={false}
                        highlight={highlight}
                        onChange={(boundingRect) => {
                          // Logic for changing area highlight if needed
                        }}
                      />
                    );

                    const isFocused = focusedHighlightId === highlight.id;
                    const highlightIndex = highlights.findIndex(h => h.id === highlight.id);
                    const displayIndex = highlightIndex !== -1 ? highlightIndex + 1 : null;

                    return (
                      <div
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusedSnippet(highlight.content?.text || "");
                          setFocusedHighlightId(highlight.id);
                        }}
                        className={`group relative cursor-pointer transition-all ${
                          isFocused ? "z-10" : "hover:z-10"
                        }`}
                      >
                        {isFocused && (
                          <div className="pointer-events-none absolute -inset-1 rounded border border-orange-500/50 bg-orange-500/5 shadow-[0_0_12px_rgba(249,115,22,0.3)]" />
                        )}
                        {displayIndex !== null && (
                          <div className="absolute -left-6 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-lg transition-transform group-hover:scale-110">
                            {displayIndex}
                          </div>
                        )}
                        <Popup
                          onMouseOver={(popupContent) =>
                            setTip(highlight, (highlight) => popupContent)
                          }
                          onMouseOut={hideTip}
                          popupContent={
                            <div className="flex flex-col gap-3 rounded-xl border border-orange-500/30 bg-slate-950/95 p-3 shadow-[0_0_24px_rgba(249,115,22,0.4)] backdrop-blur-md min-w-[240px]">
                              <div className="flex items-center justify-between border-b border-orange-500/10 pb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400/60">
                                  Saved Highlight
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  P.{(highlight.position as any)?.pageNumber || 1}
                                </span>
                              </div>
                              {highlight.comment?.text && (
                                <div className="text-xs text-orange-50/90 italic line-clamp-3">
                                  &quot;{highlight.comment.text}&quot;
                                </div>
                              )}
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFocusedSnippet(highlight.content?.text || "");
                                    setFocusedHighlightId(highlight.id);
                                    setActiveSidebarTab("chat");
                                    hideTip();
                                  }}
                                  className="flex items-center justify-center gap-2 rounded-lg border border-orange-500/20 bg-orange-950/20 px-3 py-2 text-xs font-semibold text-orange-100 transition-all hover:border-orange-500/40 hover:bg-orange-950/40 active:scale-95"
                                >
                                  <MessageSquare className="h-3.5 w-3.5 text-orange-400" />
                                  Interrogate
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteHighlight(highlight.id);
                                    hideTip();
                                  }}
                                  className="flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-100 transition-all hover:border-red-500/40 hover:bg-red-950/40 active:scale-95"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                                  Delete / Undo
                                </button>
                              </div>
                            </div>
                          }
                        >
                          {component}
                        </Popup>
                      </div>
                    );
                  }}
                  highlights={highlights.flatMap((h) => {
                    const position = normalizePdfHighlighterPosition(h.position);
                    if (!position) return [];
                    return [
                      {
                        id: h.id,
                        content: { text: h.content },
                        position,
                        comment: { text: h.comment || "", emoji: "" },
                      },
                    ];
                  })}
                />
                  );
                }}
              </PdfLoader>
            )}
          </div>

          {/* Right Pane: Dumby Chat (30%) */}
          <div className="flex w-full flex-col bg-gradient-to-b from-orange-950/30 to-slate-900 md:w-[30%]">
            {/* Sidebar Tabs */}
            <div className="flex border-b border-orange-500/20 bg-slate-950/40">
              <button
                onClick={() => setActiveSidebarTab("chat")}
                className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                  activeSidebarTab === "chat"
                    ? "bg-orange-500/10 text-orange-400 shadow-[inset_0_-2px_0_rgba(249,115,22,1)]"
                    : "text-orange-100/40 hover:bg-orange-500/5 hover:text-orange-100/60"
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Interrogate
              </button>
              <button
                onClick={() => setActiveSidebarTab("snippets")}
                className={`flex flex-1 items-center justify-center gap-2 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                  activeSidebarTab === "snippets"
                    ? "bg-orange-500/10 text-orange-400 shadow-[inset_0_-2px_0_rgba(249,115,22,1)]"
                    : "text-orange-100/40 hover:bg-orange-500/5 hover:text-orange-100/60"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                Snippets ({highlights.length})
              </button>
            </div>

            {activeSidebarTab === "chat" ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-orange-500/20 px-4 py-3">
                  <div className="text-xs tracking-widest text-orange-400/80">DUMBY_ANALYSIS_PROTOCOL</div>
                  <div className="mt-1 text-sm text-orange-100/70">
                    Select text in the PDF to analyze
                  </div>
                    {chatError ? (
                      <div className="mt-2 rounded-lg border border-red-500/30 bg-red-950/30 p-2 text-xs text-red-200">
                        {chatError}
                      </div>
                    ) : null}
                </div>

                {/* Context Banner */}
                {focusedSnippet && (
                  <div className="border-b border-orange-500/10 bg-orange-500/5 px-4 py-2 flex items-center justify-between gap-3">
                    <div className="flex-1 overflow-hidden">
                      <div className="text-[10px] uppercase tracking-tighter text-orange-400/60 font-bold mb-0.5 flex items-center gap-1">
                        <div className="h-1 w-1 rounded-full bg-orange-500 animate-pulse" />
                        Focused Context
                      </div>
                      <div className="text-xs text-orange-100/80 truncate italic">
                        &quot;{focusedSnippet}&quot;
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setFocusedSnippet("");
                        setFocusedHighlightId(null);
                      }}
                      className="rounded-lg bg-orange-500/10 p-1.5 text-orange-400 hover:bg-orange-500/20 transition-all hover:scale-110 active:scale-95"
                      title="Clear context"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                  {messages.length === 0 && (
                    <div className="rounded-xl border border-orange-500/20 bg-slate-950/40 p-4 text-sm text-orange-100/70">
                      <p className="mb-2 font-semibold text-orange-200">Welcome to Dumby&apos;s Interrogation Room</p>
                      <p>Select text in the PDF and choose an action:</p>
                      <ul className="mt-2 ml-4 list-disc space-y-1">
                        <li><strong>Explain This:</strong> Simplify complex jargon</li>
                        <li><strong>Extract Task:</strong> Create a task node on the canvas</li>
                        <li><strong>Critique:</strong> Check for logical fallacies</li>
                      </ul>
                    </div>
                  )}

                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`rounded-xl border p-3 ${
                        message.role === "user"
                          ? "border-orange-500/20 bg-orange-950/20 ml-8"
                          : "border-orange-500/30 bg-slate-950/60 mr-8"
                      }`}
                    >
                      <div className="text-xs font-semibold text-orange-300/80 mb-1">
                        {message.role === "user" ? "You" : "Dumby"}
                      </div>
                      <div className="text-sm text-orange-50/90 max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                            ul: ({ children }) => <ul className="mb-2 ml-4 list-disc space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="mb-2 ml-4 list-decimal space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="pl-1">{children}</li>,
                            strong: ({ children }) => <strong className="font-bold text-orange-300">{children}</strong>,
                            code: ({ children }) => <code className="rounded bg-orange-950/40 px-1 py-0.5 font-mono text-xs">{children}</code>,
                            pre: ({ children }) => <pre className="mb-2 overflow-x-auto rounded bg-orange-950/40 p-2 font-mono text-xs">{children}</pre>,
                          }}
                        >
                          {(() => {
                            const msg = message as any;
                            if (typeof msg.content === "string") return msg.content;
                            if (Array.isArray(msg.parts)) {
                              // Only join text parts to avoid protocol JSON in the UI
                              return msg.parts
                                .map((p: any) => (p.type === "text" ? p.text : ""))
                                .filter(Boolean)
                                .join("");
                            }
                            return "";
                          })()}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="rounded-xl border border-orange-500/30 bg-slate-950/60 p-3 mr-8">
                      <div className="text-xs font-semibold text-orange-300/80 mb-1">Dumby</div>
                      <div className="text-sm text-orange-100/70">Analyzing...</div>
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="border-t border-orange-500/20 p-4">
                  <form onSubmit={handleChatSubmit} className="flex gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask Dumby about the selected text..."
                      className="flex-1 rounded-lg border border-orange-500/20 bg-slate-950/60 px-3 py-2 text-sm text-orange-50 placeholder:text-orange-300/40 outline-none focus:border-orange-500/40"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={isLoading || !input.trim()}
                      className="rounded-lg border border-orange-500/30 bg-orange-950/40 px-4 py-2 text-orange-100 transition-all hover:bg-orange-950/60 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {highlights.length === 0 ? (
                  <div className="rounded-xl border border-orange-500/10 bg-slate-950/40 p-6 text-center text-sm text-orange-100/40">
                    No snippets saved yet. Select text in the PDF and click &quot;Save Highlight&quot; to begin your collection.
                  </div>
                ) : (
                  highlights.map((h, i) => (
                    <div
                      key={h.id}
                      onClick={() => {
                        setFocusedSnippet(h.content);
                        setFocusedHighlightId(h.id);
                        setActiveSidebarTab("chat"); // Switch to chat to interrogate
                        
                        // Scroll to highlight
                        if (scrollViewerTo.current) {
                          const position = normalizePdfHighlighterPosition(h.position);
                          if (position) {
                            scrollViewerTo.current({
                              id: h.id,
                              content: { text: h.content },
                              position,
                            });
                          }
                        }
                      }}
                      className={`group cursor-pointer rounded-xl border p-3 transition-all ${
                        focusedHighlightId === h.id
                          ? "border-orange-500/50 bg-orange-500/10"
                          : "border-orange-500/10 bg-slate-950/40 hover:border-orange-500/30 hover:bg-slate-950/60"
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-lg">
                          {i + 1}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] font-bold uppercase tracking-tighter text-orange-400/40 group-hover:text-orange-400/60 transition-colors">
                            P.{ (h.position as any)?.pageNumber || 1 }
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteHighlight(h.id);
                            }}
                            className="rounded-lg p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                            title="Delete snippet"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-orange-50/80 line-clamp-3 italic">
                        &quot;{h.content}&quot;
                      </div>
                      {h.comment && (
                        <div className="mt-2 border-t border-orange-500/10 pt-2 text-[11px] text-orange-300/70">
                          {h.comment}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
