"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Sparkles, Target, Wrench, X, Maximize2 } from "lucide-react";
import type { NodeProps } from "reactflow";
import { Handle, Position } from "reactflow";
import type { GrimpoNodeData, ModeSetting, NodeKind } from "@/app/lib/graph";
import ReactMarkdown from "react-markdown";
import { AbyssalCheckbox } from "../components/ui/AbyssalCheckbox";
import { DumbyReader } from "../components/DumbyReader";
import { DumbyInterrogationReader } from "../components/DumbyInterrogationReader";

type EffectiveMode = Exclude<ModeSetting, "auto">;

type GlassNodeData = GrimpoNodeData & {
  // Ephemeral view context (NOT persisted):
  zoom?: number;
  mode?: EffectiveMode;
  theme?: "abyss" | "surface";
  onUpdate?: (id: string, patch: Partial<GrimpoNodeData>) => void;
  onDelete?: (id: string) => void;
  onTaskDone?: (id: string) => void;
  onBathysphereMode?: (nodeId: string, enabled: boolean) => void;
  onExtractTask?: (text: string, sourceNodeId: string) => void;
  isTrace?: boolean;
  sonarOpacity?: number;
};

// Color palette constants
const COLORS = {
  cyan: { hex: "#22d3ee", name: "Cyan" },
  magenta: { hex: "#e879f9", name: "Magenta" },
  lime: { hex: "#a3e635", name: "Lime" },
  amber: { hex: "#fbbf24", name: "Amber" },
  violet: { hex: "#8b5cf6", name: "Violet" },
} as const;

const DEFAULT_COLOR = COLORS.cyan.hex;

// Helper function to check if deadline is overdue
function isOverdue(deadline?: string): boolean {
  if (!deadline) return false;
  const today = new Date().toISOString().split("T")[0]; // Get YYYY-MM-DD format
  return deadline < today;
}

// Helper function to convert hex to rgba for shadow
function hexToRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

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

function getYouTubeEmbedUrl(input: string): string | null {
  if (!input) return null;
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, "");

    // youtu.be/<id>
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    // youtube.com/watch?v=<id>
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        const id = url.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }

      // youtube.com/embed/<id>
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

export function GlassNode(props: NodeProps<GlassNodeData>) {
  const { id, data, type, selected } = props;
  const isTrace = !!data.isTrace;
  const sonarOpacity = data.sonarOpacity ?? 0.2;

  const [swallowing, setSwallowing] = useState(false);
  const [localPdfPreviewUrl, setLocalPdfPreviewUrl] = useState<string | null>(null);
  const [localPdfName, setLocalPdfName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const persistFileInputRef = useRef<HTMLInputElement | null>(null);

  // Persisted PDF + summarisation UI state (resource nodes)
  const [pdfUploading, setPdfUploading] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [summarising, setSummarising] = useState(false);
  const [aiStatus, setAiStatus] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");
  const [persistedPdfName, setPersistedPdfName] = useState<string>("");
  const [notesEditMode, setNotesEditMode] = useState(false);
  const [showMarkdownView, setShowMarkdownView] = useState(true);
  const [showInterrogationReader, setShowInterrogationReader] = useState(false);

  const zoom = data.zoom ?? 1;
  const mode = data.mode ?? "tactical";
  const isSurface = data.theme === "surface";

  // Semantic zoom: zoomed out means "title-only" (big picture).
  const titleOnly = mode === "strategy" || zoom < 1;

  const nodeKind = type as NodeKind;
  const badge = typeBadge(nodeKind);
  const done = nodeKind === "tactical" && data.status === "done";

  // Deadline and color logic
  const overdue = isOverdue(data.deadline);
  const selectedColor = isTrace ? `rgba(34, 211, 238, ${sonarOpacity})` : (data.color || (isSurface ? "#94a3b8" : DEFAULT_COLOR));
  
  // Container styling
  const containerClasses = isSurface
    ? [
        "bg-white/95 shadow-md border-slate-200",
        selected ? "ring-2 ring-slate-400 ring-offset-2" : "",
        isTrace ? "border-dashed pointer-events-none" : "",
      ].join(" ")
    : [
        "bg-slate-900/50 backdrop-blur-md",
        !selected && !done && !swallowing && !isTrace ? "octo-breath" : "",
        isTrace ? "border-dashed pointer-events-none" : "",
      ].join(" ");

  const textPrimary = isSurface ? "text-slate-900" : "text-cyan-50";
  const textSecondary = isSurface ? "text-slate-500" : "text-cyan-200/90";
  const placeholderColor = isSurface ? "placeholder:text-slate-400" : "placeholder:text-cyan-200/40";
  const inputBg = isSurface ? "bg-slate-100/50" : "bg-slate-950/30";
  const inputBorder = isTrace ? `rgba(34, 211, 238, ${sonarOpacity})` : (isSurface ? "border-slate-200" : "border-cyan-300/20");

  // Overdue takes priority: use red border, otherwise use selected color
  const borderColor = isTrace ? `rgba(34, 211, 238, ${sonarOpacity})` : (overdue ? "#ef4444" : selectedColor);
  const glowColor = isTrace ? `rgba(34, 211, 238, ${sonarOpacity * 0.5})` : (overdue ? "#ef4444" : selectedColor);
  // Increased glow intensity for better visibility, especially when zoomed out
  const isZoomedOut = zoom < 1;
  const baseIntensity = selected ? 0.9 : 0.7;
  const zoomedOutIntensity = selected ? 1.0 : 0.85;
  const glowIntensity = isTrace ? sonarOpacity * 0.5 : (isZoomedOut ? zoomedOutIntensity : baseIntensity);
  // Increase spread when zoomed out for better visibility
  const baseSpread = selected ? "32px" : "24px";
  const zoomedOutSpread = selected ? "40px" : "32px";
  const glowSpread = isTrace ? "4px" : (isZoomedOut ? zoomedOutSpread : baseSpread);

  // Cleanup object URL when it changes or node unmounts.
  useEffect(() => {
    return () => {
      if (localPdfPreviewUrl) URL.revokeObjectURL(localPdfPreviewUrl);
    };
  }, [localPdfPreviewUrl]);

  async function uploadPersistedPdf(file: File) {
    setAiError("");
    setAiStatus("Uploading PDF…");
    setPdfUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/pdf/upload", {
        method: "POST",
        body: formData,
      });

      if (res.status === 401) {
        setAiError("Sign in required to upload PDFs.");
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setAiError(body?.error || "Upload failed.");
        return;
      }

      const body = (await res.json()) as { blobUrl: string; filename?: string };
      data.onUpdate?.(id, { pdfUrl: body.blobUrl });
      setPersistedPdfName(body.filename || file.name || "");
      setAiStatus("Uploaded.");
    } catch (e) {
      console.error(e);
      setAiError("Upload failed.");
    } finally {
      setPdfUploading(false);
      setTimeout(() => setAiStatus(""), 1200);
    }
  }

  async function summarisePersistedPdf() {
    const pdfUrl = (data.pdfUrl ?? "").trim();
    if (!pdfUrl) {
      setAiError("Add a PDF URL or upload a PDF first.");
      return;
    }

    setAiError("");
    setSummarising(true);
    try {
      setAiStatus("Extracting text…");
      const extractedText = await extractPdfTextWithOcr(pdfUrl);

      if (!extractedText.trim()) {
        setAiError("Could not extract any text from this PDF (even with OCR).");
        return;
      }

      setAiStatus("Summarising…");
      const res = await fetch("/api/pdf/summarise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeId: id,
          pdfBlobUrl: pdfUrl,
          filename: persistedPdfName || undefined,
          extractedText,
        }),
      });

      if (res.status === 401) {
        setAiError("Sign in required to summarise PDFs.");
        return;
      }

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        setAiError(body?.error || "Summarisation failed.");
        return;
      }

      const providerLabel =
        body?.provider === "google" ? "Gemini" : body?.provider === "anthropic" ? "Claude" : null;
      const modelLabel = typeof body?.model === "string" && body.model.trim() ? body.model : null;
      if (providerLabel) {
        setAiStatus(`Summarised with ${providerLabel}${modelLabel ? ` (${modelLabel})` : ""}.`);
      }

      data.onUpdate?.(id, { notes: body.summaryMarkdown });
      setShowMarkdownView(true);
      setNotesEditMode(false);
      setAiStatus("Saved summary.");
    } catch (e) {
      console.error(e);
      setAiError("Summarisation failed.");
    } finally {
      setSummarising(false);
      setTimeout(() => setAiStatus(""), 1400);
    }
  }

  async function extractPdfTextWithOcr(pdfUrl: string) {
    const MAX_PAGES = 5;
    const OCR_MIN_TEXT_CHARS = 300;

    setAiError("");
    setAiStatus("Downloading PDF…");

    let pdfBytes: ArrayBuffer;
    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error("Failed to fetch PDF");
      pdfBytes = await res.arrayBuffer();
    } catch {
      setAiStatus("Downloading PDF (proxy)…");
      const proxyRes = await fetch(`/api/pdf/fetch?url=${encodeURIComponent(pdfUrl)}`);
      if (proxyRes.status === 401) {
        throw new Error("Sign in required to fetch PDFs.");
      }
      if (!proxyRes.ok) {
        throw new Error("Failed to fetch PDF (proxy).");
      }
      pdfBytes = await proxyRes.arrayBuffer();
    }

    // pdfjs-dist v4 exposes ESM entrypoints as `.mjs`
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    // @ts-ignore
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    // @ts-ignore
    const doc = await pdfjs.getDocument({ data: pdfBytes }).promise;
    const pageCount = Math.min(doc.numPages, MAX_PAGES);

    setAiStatus(`Extracting text (pages 1-${pageCount})…`);
    let extractedText = "";
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      type PdfjsTextItem = { str?: string };
      const strings = (textContent.items as unknown as PdfjsTextItem[])
        .map((it) => it.str ?? "")
        .filter(Boolean);
      const pageText = strings.join(" ").replace(/\s+/g, " ").trim();
      if (pageText) extractedText += pageText + "\n\n";
    }

    if (extractedText.trim().length >= OCR_MIN_TEXT_CHARS) {
      return extractedText.trim();
    }

    setOcrRunning(true);
    setAiStatus(`OCR running (pages 1-${pageCount})…`);

    const tesseract = await import("tesseract.js");
    const worker = await tesseract.createWorker("eng", 1, {
      logger: (m: any) => {
        if (!m || typeof m !== "object") return;
        const status = m.status;
        const progress = m.progress;
        if (typeof status === "string" && typeof progress === "number") {
          const pct = Math.round(progress * 100);
          setAiStatus(`OCR: ${status} (${pct}%)`);
        }
      },
    });

    try {
      let ocrText = "";
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        setAiStatus(`Rendering page ${pageNum}/${pageCount}…`);
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport }).promise;

        setAiStatus(`OCR page ${pageNum}/${pageCount}…`);
        const result = await worker.recognize(canvas);
        const text = (result?.data?.text || "").trim();
        if (text) ocrText += text + "\n\n";
      }

      const combined = `${extractedText}\n\n${ocrText}`.trim();
      return combined || "";
    } finally {
      setOcrRunning(false);
      await worker.terminate().catch(() => null);
    }
  }

  // Build dynamic border and shadow styles
  const borderRgba = hexToRgba(borderColor, isSurface ? 0.8 : 0.3);
  const glowRgba = isTrace ? `rgba(34, 211, 238, ${glowIntensity})` : hexToRgba(glowColor, glowIntensity);
  const borderStyle = { 
    borderColor: isTrace ? `rgba(34, 211, 238, ${sonarOpacity})` : (isSurface && data.color ? borderColor : borderRgba),
    borderWidth: isTrace ? '1px' : (isSurface && data.color ? '2px' : '1px'),
    borderStyle: isTrace ? 'dashed' as const : 'solid' as const,
  };
  
  const surfaceBgStyle = isTrace ? { backgroundColor: `rgba(34, 211, 238, ${sonarOpacity * 0.15})` } : (isSurface && data.color 
    ? { backgroundColor: hexToRgba(selectedColor, 0.05) } 
    : {});

  const shadowStyle = isTrace ? { boxShadow: 'none' } : (isSurface 
    ? { boxShadow: selected ? `0 0 20px rgba(0,0,0,0.1)` : '0 4px 6px -1px rgb(0 0 0 / 0.1)' }
    : { boxShadow: `0 0 ${glowSpread} ${glowRgba}` });

  const handleDoubleClick = () => {
    if (type === "resource" && data.pdfUrl && data.pdfUrl.trim()) {
      setShowInterrogationReader(true);
    }
  };

  const handleExtractTask = (text: string) => {
    if (data.onExtractTask) {
      data.onExtractTask(text, id);
    }
  };

  const handleClass = isSurface
    ? "!h-4 !w-4 !border-2 !border-white !bg-slate-400"
    : "!h-4 !w-4 !border-2 !border-cyan-200 !bg-cyan-400 !shadow-[0_0_15px_rgba(34,211,238,0.8)]";

  // Dynamic handle scaling for better accessibility at low zoom levels
  const handleScale = zoom < 0.8 ? Math.min(2.5, 0.8 / zoom) : 1;
  const handleStyleAttr = {
    transform: `translate(-50%, -50%) scale(${handleScale})`,
    transformOrigin: 'center',
    transition: 'transform 0.1s ease-out',
  };

  return (
    <>
      {showInterrogationReader && data.pdfUrl && (
        <DumbyInterrogationReader
          pdfUrl={data.pdfUrl}
          nodeId={id}
          nodeTitle={data.title}
          onClose={() => setShowInterrogationReader(false)}
          onExtractTask={handleExtractTask}
        />
      )}
      <div
        className={[
          "relative w-[320px] rounded-3xl border transition-all duration-300",
          containerClasses,
          done ? "opacity-60" : "",
          swallowing ? "scale-0 opacity-0" : "",
          type === "resource" && data.pdfUrl ? "cursor-pointer" : "",
        ].join(" ")}
        style={{ ...borderStyle, ...shadowStyle, ...surfaceBgStyle }}
        onDoubleClick={handleDoubleClick}
      >
        {/* top accent bar (Surface Mode only) */}
        {isSurface && data.color && (
          <div 
            className="absolute top-0 left-0 right-0 h-1.5 rounded-t-[22px]" 
            style={{ backgroundColor: selectedColor }}
          />
        )}

        {/* sheen (Abyss only) */}
        {!isSurface && !isTrace && (
          <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-gradient-to-b from-white/10 to-transparent" />
        )}

        {!isTrace && (
          <>
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
          </>
        )}

        <div className={`relative p-4 ${isTrace ? "" : "drag-handle cursor-grab active:cursor-grabbing"}`}>
          <div className="mb-3 flex items-center justify-between gap-3 pointer-events-none">
            <div className={`flex items-center gap-2 text-xs tracking-widest ${isSurface && data.color ? '' : textSecondary} ${isTrace ? "opacity-50" : ""}`}>
              {badge && <badge.Icon className={`h-4 w-4 ${isSurface && data.color ? '' : textSecondary}`} style={isSurface && data.color ? { color: selectedColor } : {}} />}
              <span 
                className={`rounded-full border px-2 py-1 transition-colors ${inputBorder} ${inputBg}`}
                style={isSurface && data.color && !isTrace ? { 
                  backgroundColor: hexToRgba(selectedColor, 0.15),
                  borderColor: hexToRgba(selectedColor, 0.3),
                  color: selectedColor,
                  fontWeight: 'bold'
                } : {}}
              >
                {badge?.label} {isTrace && "(Trace)"}
              </span>
            </div>
            {!isTrace && (
              <div className="flex items-center gap-2 pointer-events-auto">
                {/* Plan deadline badge (e.g., "Day 1", "Week 1") */}
                {type === "tactical" && data.planDeadline && (
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                      isSurface
                        ? "bg-amber-100 text-amber-700"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                    title="Plan timeline"
                  >
                    {data.planDeadline}
                  </span>
                )}
                <div className="relative flex items-center">
                  <input
                    type="date"
                    value={data.deadline ?? ""}
                    onChange={(e) => {
                      const value = e.target.value || undefined;
                      data.onUpdate?.(id, { deadline: value });
                    }}
                    className={`h-7 rounded-full border ${inputBorder} ${inputBg} px-3 text-[10px] ${isSurface ? 'text-slate-700' : 'text-cyan-50/80'} outline-none transition-all hover:opacity-80 focus:ring-1 focus:ring-cyan-300/20`}
                    title="Set deadline"
                  />
                </div>
                {type === "resource" && !titleOnly && data.link ? (
                  <button
                    onClick={() => window.open(data.link, "_blank", "noopener,noreferrer")}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors ${
                      isSurface 
                        ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200" 
                        : "border-rose-300/20 bg-rose-500/10 text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.18)] hover:bg-rose-500/20"
                    }`}
                    title="Open link"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open
                  </button>
                ) : null}
              </div>
            )}
          </div>

          <input
            value={data.title ?? ""}
            onChange={(e) => data.onUpdate?.(id, { title: e.target.value })}
            placeholder="Title…"
            readOnly={isTrace}
            className={[
              "w-full bg-transparent font-semibold outline-none transition-colors",
              textPrimary,
              placeholderColor,
              titleOnly ? "text-2xl" : "text-lg",
              isSurface ? "font-bold" : "font-semibold",
              isTrace ? "pointer-events-none" : "",
            ].join(" ")}
          />

          {!titleOnly && !isTrace ? (
            <div className="mt-3 space-y-3">
              {type === "resource" ? (
                <div className="space-y-2">
                  <input
                    value={data.link ?? ""}
                    onChange={(e) => data.onUpdate?.(id, { link: e.target.value })}
                    placeholder="Link (URL)…"
                    className={`w-full rounded-2xl border ${inputBorder} ${inputBg} px-3 py-2 text-sm ${textPrimary} outline-none ${placeholderColor} focus:border-cyan-200/40`}
                  />
                  <div className="relative">
                    <input
                      value={data.pdfUrl ?? ""}
                      onChange={(e) => data.onUpdate?.(id, { pdfUrl: e.target.value })}
                      placeholder="PDF URL…"
                      className={`w-full rounded-2xl border ${inputBorder} ${inputBg} px-3 py-2 pr-8 text-sm ${textPrimary} outline-none ${placeholderColor} focus:border-cyan-200/40`}
                    />
                    {data.pdfUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          data.onUpdate?.(id, { pdfUrl: "" });
                          setPersistedPdfName("");
                        }}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-colors ${
                          isSurface ? "text-slate-400 hover:text-slate-600" : "text-cyan-200/60 hover:text-cyan-200"
                        }`}
                        title="Clear PDF URL"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <div className="relative">
                    <input
                      value={data.videoUrl ?? ""}
                      onChange={(e) => data.onUpdate?.(id, { videoUrl: e.target.value })}
                      placeholder="YouTube URL…"
                      className={`w-full rounded-2xl border ${inputBorder} ${inputBg} px-3 py-2 pr-8 text-sm ${textPrimary} outline-none ${placeholderColor} focus:border-cyan-200/40`}
                    />
                    {data.videoUrl ? (
                      <button
                        type="button"
                        onClick={() => data.onUpdate?.(id, { videoUrl: "" })}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 transition-colors ${
                          isSurface ? "text-slate-400 hover:text-slate-600" : "text-cyan-200/60 hover:text-cyan-200"
                        }`}
                        title="Clear video URL"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setLocalPdfPreviewUrl((prev) => {
                          if (prev) URL.revokeObjectURL(prev);
                          return URL.createObjectURL(file);
                        });
                        setLocalPdfName(file.name);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`rounded-full border px-3 py-1 text-xs transition-all ${
                        isSurface
                          ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                          : "border-rose-300/20 bg-rose-500/10 text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.18)] hover:bg-rose-500/20"
                      }`}
                      title="Upload a PDF for session-only preview"
                    >
                      Upload PDF (preview)
                    </button>
                    {localPdfPreviewUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          setLocalPdfPreviewUrl((prev) => {
                            if (prev) URL.revokeObjectURL(prev);
                            return null;
                          });
                          setLocalPdfName("");
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className={`rounded-full border ${inputBorder} ${inputBg} px-3 py-1 text-xs ${isSurface ? 'text-slate-600' : 'text-cyan-100/80'} hover:opacity-80`}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>

                  {localPdfName ? (
                    <div className={`text-xs ${isSurface ? 'text-slate-500' : 'text-cyan-100/60'}`}>
                      Preview-only: {localPdfName}
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-2">
                    <input
                      ref={persistFileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        uploadPersistedPdf(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => persistFileInputRef.current?.click()}
                      disabled={pdfUploading || ocrRunning || summarising}
                      className={`rounded-full border ${inputBorder} ${inputBg} px-3 py-1 text-xs transition-all ${
                        isSurface ? 'text-slate-600 hover:bg-slate-200' : 'text-cyan-100/80 hover:bg-slate-950/45'
                      } ${pdfUploading || ocrRunning || summarising ? "opacity-50" : ""}`}
                    >
                      {pdfUploading ? "Uploading…" : "Upload PDF (save)"}
                    </button>
                    {aiStatus ? <div className={`text-xs ${isSurface ? 'text-slate-500' : 'text-cyan-100/60'}`}>{aiStatus}</div> : null}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => summarisePersistedPdf()}
                      disabled={pdfUploading || ocrRunning || summarising}
                      className={`rounded-full border px-3 py-1 text-xs transition-all ${
                        isSurface
                          ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                          : "border-rose-300/20 bg-rose-500/10 text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.18)] hover:bg-rose-500/20"
                      } ${pdfUploading || ocrRunning || summarising ? "opacity-50" : ""}`}
                    >
                      {summarising ? "Summarising…" : "Summarise"}
                    </button>
                    {(data.pdfUrl ?? "").trim() ? (
                      <div className={`text-xs ${isSurface ? 'text-slate-500' : 'text-cyan-100/60'}`}>
                        PDF: {persistedPdfName || "ready"}
                      </div>
                    ) : (
                      <div className={`text-xs ${isSurface ? 'text-slate-500' : 'text-cyan-100/60'}`}>No saved PDF yet</div>
                    )}
                  </div>

                  {aiError ? <div className={`text-xs ${isSurface ? 'text-rose-600' : 'text-rose-200/90'}`}>{aiError}</div> : null}

                  {(() => {
                    const pdfSrc = localPdfPreviewUrl || (data.pdfUrl ?? "").trim();
                    const ytEmbed = getYouTubeEmbedUrl((data.videoUrl ?? "").trim());

                    return (
                      <div className="space-y-2">
                        {pdfSrc ? (
                          <div className={`rounded-2xl border ${inputBorder} ${inputBg} p-2`}>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className={`text-xs tracking-widest ${isSurface ? 'text-slate-500' : 'text-cyan-100/70'}`}>PDF</div>
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
                                  onClick={() => {
                                    if (localPdfPreviewUrl) {
                                      setLocalPdfPreviewUrl(null);
                                      setLocalPdfName("");
                                    } else {
                                      data.onUpdate?.(id, { pdfUrl: "" });
                                    }
                                  }}
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
                            <DumbyReader
                              pdfUrl={pdfSrc}
                              nodeId={id}
                              nodeTitle={data.title}
                              viewMode="inline"
                            />
                          </div>
                        ) : null}

                        {(data.videoUrl ?? "").trim() ? (
                          <div className={`rounded-2xl border ${inputBorder} ${inputBg} p-2`}>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className={`text-xs tracking-widest ${isSurface ? 'text-slate-500' : 'text-cyan-100/70'}`}>VIDEO</div>
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
                                className={`h-[200px] w-full rounded-xl border ${isSurface ? 'border-slate-200 bg-slate-100' : 'border-cyan-300/10 bg-black/20'}`}
                                loading="lazy"
                                allowFullScreen
                              />
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              ) : null}

              <div className="relative">
                {type === "tactical" || notesEditMode || !data.notes ? (
                  <textarea
                    value={data.notes ?? ""}
                    onChange={(e) => data.onUpdate?.(id, { notes: e.target.value })}
                    onBlur={() => {
                      if (type === "resource" && data.notes && (data.notes.includes("##") || data.notes.includes("**"))) {
                        setTimeout(() => setNotesEditMode(false), 300);
                      }
                    }}
                    placeholder={type === "resource" ? "Summary / notes…" : "Next step…"}
                    className={`min-h-[88px] min-w-[200px] w-full resize rounded-2xl border ${inputBorder} ${inputBg} px-3 py-2 text-sm ${textPrimary} outline-none ${placeholderColor} focus:border-cyan-200/40`}
                  />
                ) : type === "resource" && data.notes && showMarkdownView && !notesEditMode ? (
                  <div className={`group relative min-h-[88px] min-w-[200px] w-full rounded-2xl border ${inputBorder} ${inputBg} px-3 py-2 overflow-auto resize`}>
                    <div className={`markdown-content text-sm ${isSurface ? 'text-slate-700' : 'text-cyan-100'}`}>
                      <ReactMarkdown>{data.notes}</ReactMarkdown>
                    </div>
                    <div className="absolute right-2 top-2 flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMarkdownView(false);
                        }}
                        className={`rounded px-2 py-1 text-xs transition-all ${
                          isSurface ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-slate-800/80 text-cyan-200 opacity-70 hover:bg-slate-700/80 hover:opacity-100"
                        }`}
                        title="View raw text"
                      >
                        Raw
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotesEditMode(true);
                        }}
                        className={`rounded px-2 py-1 text-xs transition-all ${
                          isSurface ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-slate-800/80 text-cyan-200 opacity-70 hover:bg-slate-700/80 hover:opacity-100"
                        }`}
                        title="Edit"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ) : type === "resource" && data.notes && !showMarkdownView && !notesEditMode ? (
                  <div className={`group relative min-h-[88px] min-w-[200px] w-full rounded-2xl border ${inputBorder} ${inputBg} px-3 py-2 overflow-auto resize`}>
                    <div className={`text-sm ${isSurface ? 'text-slate-700' : 'text-cyan-100'} whitespace-pre-wrap`}>
                      {data.notes}
                    </div>
                    <div className="absolute right-2 top-2 flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMarkdownView(true);
                        }}
                        className={`rounded px-2 py-1 text-xs transition-all ${
                          isSurface ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-slate-800/80 text-cyan-200 opacity-70 hover:bg-slate-700/80 hover:opacity-100"
                        }`}
                        title="View markdown"
                      >
                        Markdown
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotesEditMode(true);
                        }}
                        className={`rounded px-2 py-1 text-xs transition-all ${
                          isSurface ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-slate-800/80 text-cyan-200 opacity-70 hover:bg-slate-700/80 hover:opacity-100"
                        }`}
                        title="Edit"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className={`group relative min-h-[88px] min-w-[200px] w-full rounded-2xl border ${inputBorder} ${inputBg} px-3 py-2 overflow-auto resize cursor-text`}
                    onClick={() => setNotesEditMode(true)}
                  >
                    <div className={`markdown-content text-sm ${isSurface ? 'text-slate-700' : 'text-cyan-100'} whitespace-pre-wrap`}>
                      {data.notes}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNotesEditMode(true);
                      }}
                      className={`absolute right-2 top-2 rounded px-2 py-1 text-xs transition-all ${
                        isSurface ? "bg-slate-200 text-slate-700 hover:bg-slate-300" : "bg-slate-800/80 text-cyan-200 opacity-70 hover:bg-slate-700/80 hover:opacity-100"
                      }`}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex items-center justify-between pt-2">
                {type === "tactical" ? (
                  <AbyssalCheckbox
                    label="Done"
                    checked={data.status === "done"}
                    theme={data.theme}
                    onChange={(checked) => {
                      data.onUpdate?.(id, { status: checked ? "done" : "todo" });
                      if (checked) data.onTaskDone?.(id);
                    }}
                  />
                ) : <div />}
                <button
                  onClick={() => {
                    setSwallowing(true);
                    setTimeout(() => data.onDelete?.(id), 220);
                  }}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    isSurface 
                      ? "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200" 
                      : "border-rose-300/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20"
                  }`}
                  title="Remove node from canvas"
                >
                  Swallow
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2 border-t border-white/5 mt-2">
                {Object.values(COLORS).map((color) => {
                  const isSelected = (data.color || (isSurface ? "#94a3b8" : DEFAULT_COLOR)) === color.hex;
                  return (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => {
                        const newColor = color.hex === DEFAULT_COLOR ? undefined : color.hex;
                        data.onUpdate?.(id, { color: newColor });
                      }}
                      className={[
                        "h-5 w-5 rounded-full border-2 transition-all duration-200",
                        isSelected 
                          ? `scale-125 ${isSurface ? 'border-slate-500' : 'border-white'} shadow-sm` 
                          : "border-transparent hover:scale-110 hover:border-white/50",
                      ].join(" ")}
                      style={{ backgroundColor: color.hex }}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
