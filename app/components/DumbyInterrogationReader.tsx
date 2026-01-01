"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Send, Lightbulb, CheckSquare, AlertCircle } from "lucide-react";
import { useChat, Chat } from "@ai-sdk/react";
import { getHighlights, addHighlight } from "@/app/actions/highlights";
import type { Highlight } from "@/app/lib/db/schema";

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
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [selectedText, setSelectedText] = useState<string>("");
  const [pendingIntent, setPendingIntent] = useState<InterrogateIntent | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // This modal is rendered inside a ReactFlow node (which is transformed).
  // Using a portal ensures our "fixed" overlay is truly viewport-fixed and centered.
  useEffect(() => setIsMounted(true), []);

  // Load highlights on mount
  useEffect(() => {
    async function loadHighlights() {
      try {
        const loaded = await getHighlights(nodeId);
        setHighlights(loaded);
      } catch (e) {
        console.error("Failed to load highlights:", e);
      }
    }
    loadHighlights();
  }, [nodeId]);

  // Debug: Log PDF URL and container dimensions
  useEffect(() => {
    console.log("DumbyInterrogationReader - PDF URL:", pdfUrl);
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      console.log("PDF Container dimensions:", { width: rect.width, height: rect.height });
    }
  }, [pdfUrl]);

  // Chat hook for Dumby interrogation - using Chat class with custom transport
  const [chat] = useState(() => {
    const transport: any = {
      async sendMessages({ messages, body: requestBody, ...options }: any) {
        const response = await fetch("/api/chat/dumby-interrogate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            context: selectedText,
            intent: pendingIntent || "GENERAL",
            ...(requestBody as object),
          }),
          signal: options.abortSignal,
        });
        if (!response.body) throw new Error("No response body");
        return response.body as ReadableStream<any>;
      },
      async reconnectToStream() {
        return null;
      },
    };
    return new Chat({ transport });
  });
  
  const chatHelpers = useChat({ chat });
  const { messages, sendMessage, status } = chatHelpers;
  const [input, setInput] = useState("");
  const isLoading = status === "streaming";

  // Handle context menu actions
  const handleExplain = useCallback((text: string) => {
    if (!text) return;
    setSelectedText(text);
    setPendingIntent("EXPLAIN");
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: `Dumby, explain this text like I'm 5: ${text}` }],
    } as any, {
      body: {
        context: text,
        intent: "EXPLAIN",
      },
    });
  }, [sendMessage]);

  const handleExtractTask = useCallback((text: string) => {
    if (!text || !onExtractTask) return;
    onExtractTask(text);
    // Keep modal open after extracting task (as per FRED: "The modal closes (or remains open)")
    // User can continue analyzing the document
  }, [onExtractTask]);

  const handleCritique = useCallback((text: string) => {
    if (!text) return;
    setSelectedText(text);
    setPendingIntent("CRITIQUE");
    sendMessage({
      role: "user",
      parts: [{ type: "text", text: `Dumby, interrogate this claim: ${text}` }],
    } as any, {
      body: {
        context: text,
        intent: "CRITIQUE",
      },
    });
  }, [sendMessage]);

  // Save highlight
  const handleSaveHighlight = useCallback(async (content: string, position: any) => {
    try {
      await addHighlight(nodeId, content, position);
      
      // Reload highlights
      const loaded = await getHighlights(nodeId);
      setHighlights(loaded);
    } catch (error) {
      console.error("Failed to save highlight:", error);
    }
  }, [nodeId]);

  // Handle chat submit with context
  const handleChatSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!input.trim()) return;

      const currentIntent = pendingIntent || "GENERAL";
      const currentContext = selectedText || "";

      sendMessage({
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
    [input, selectedText, pendingIntent, sendMessage]
  );

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center p-4">
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
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-orange-500/20 bg-slate-950/40 p-2 text-orange-200 hover:bg-slate-950/60"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Split Layout */}
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row" style={{ minHeight: 0 }}>
          {/* Left Pane: PDF Viewer (70%) */}
          <div
            className="relative w-full overflow-hidden border-b border-orange-500/10 bg-slate-900 md:w-[70%] md:border-b-0 md:border-r"
            ref={containerRef}
            style={{ height: '100%', minHeight: 0 }}
          >
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
                setPdfError(null);
                return (
                  <PdfHighlighter
                    pdfDocument={pdfDocument}
                    enableAreaSelection={(event) => event.altKey}
                    onScrollChange={() => {}}
                    scrollRef={() => {}}
                  onSelectionFinished={(position, content, hideTipAndSelection, transformSelection) => {
                    const selectedTextContent = content.text || "";
                    // Update selected text state for context in manual chat
                    setSelectedText(selectedTextContent);
                    
                    const tipContent = (
                      <div className="flex flex-col gap-1 rounded-xl border border-orange-500/30 bg-slate-950/95 p-2 shadow-[0_0_24px_rgba(249,115,22,0.4)] backdrop-blur-md">
                        <button
                          onClick={() => {
                            handleExplain(selectedTextContent);
                            hideTipAndSelection();
                          }}
                          className="flex items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-950/30 px-3 py-2 text-sm text-orange-100 transition-all hover:bg-orange-950/50 hover:shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                        >
                          <Lightbulb className="h-4 w-4 text-orange-400" />
                          🟠 Explain This
                        </button>
                        <button
                          onClick={() => {
                            handleExtractTask(selectedTextContent);
                            hideTipAndSelection();
                          }}
                          className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-950/30 px-3 py-2 text-sm text-green-100 transition-all hover:bg-green-950/50 hover:shadow-[0_0_12px_rgba(34,197,94,0.3)]"
                        >
                          <CheckSquare className="h-4 w-4 text-green-400" />
                          ✅ Extract Task
                        </button>
                        <button
                          onClick={() => {
                            handleCritique(selectedTextContent);
                            hideTipAndSelection();
                          }}
                          className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-950/30 px-3 py-2 text-sm text-red-100 transition-all hover:bg-red-950/50 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                        >
                          <AlertCircle className="h-4 w-4 text-red-400" />
                          ❓ Critique / Interrogate
                        </button>
                        <button
                          onClick={() => {
                            handleSaveHighlight(selectedTextContent, position);
                            hideTipAndSelection();
                          }}
                          className="mt-1 flex items-center gap-2 rounded-lg border border-cyan-500/20 bg-slate-900/50 px-3 py-2 text-xs text-cyan-200 transition-all hover:bg-slate-800"
                        >
                          <Send className="h-3 w-3" />
                          Save Highlight
                        </button>
                      </div>
                    );
                    
                    // Tip component - using render prop pattern
                    return (
                      <Tip
                        onOpen={transformSelection}
                        onConfirm={(comment) => {
                          handleSaveHighlight(selectedTextContent, position);
                          hideTipAndSelection();
                        }}
                        // @ts-expect-error - Tip may accept children in runtime even if types don't show it
                        children={tipContent}
                      />
                    );
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
                    const isTextHighlight = !(highlight.content as any).image;

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

                    return (
                      <Popup
                        key={index}
                        onMouseOver={(popupContent) =>
                          setTip(highlight, (highlight) => popupContent)
                        }
                        onMouseOut={hideTip}
                        popupContent={<div className="rounded bg-slate-900 p-2 text-xs text-white">{highlight.comment?.text || "Saved Highlight"}</div>}
                      >
                        {component}
                      </Popup>
                    );
                  }}
                  highlights={highlights.map(h => ({
                    id: h.id,
                    content: { text: h.content },
                    position: h.position as any,
                    comment: { text: h.comment || "", emoji: "" }
                  }))}
                />
                );
              }}
            </PdfLoader>
          </div>

          {/* Right Pane: Dumby Chat (30%) */}
          <div className="flex w-full flex-col bg-gradient-to-b from-orange-950/30 to-slate-900 md:w-[30%]">
            {/* Chat Header */}
            <div className="border-b border-orange-500/20 px-4 py-3">
              <div className="text-xs tracking-widest text-orange-400/80">DUMBY_ANALYSIS_PROTOCOL</div>
              <div className="mt-1 text-sm text-orange-100/70">
                Select text in the PDF to analyze
              </div>
            </div>

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
                  <div className="text-sm text-orange-50/90 whitespace-pre-wrap">
                    {(() => {
                      const msg = message as any;
                      if (typeof msg.content === 'string') return msg.content;
                      if (Array.isArray(msg.parts)) {
                        return msg.parts.map((p: any) => p.text || JSON.stringify(p)).join('\n');
                      }
                      return JSON.stringify(msg);
                    })()}
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
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
