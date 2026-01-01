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
  onUpdate?: (id: string, patch: Partial<GrimpoNodeData>) => void;
  onDelete?: (id: string) => void;
  onTaskDone?: (id: string) => void;
  onBathysphereMode?: (nodeId: string, enabled: boolean) => void;
  onExtractTask?: (text: string, sourceNodeId: string) => void;
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
  const [showInterrogationReader, setShowInterrogationReader] = useState(false);

  const zoom = data.zoom ?? 1;
  const mode = data.mode ?? "tactical";

  // Semantic zoom: zoomed out means "title-only" (big picture).
  const titleOnly = mode === "strategy" || zoom < 1;

  const nodeKind = type as NodeKind;
  const badge = typeBadge(nodeKind);
  const done = nodeKind === "tactical" && data.status === "done";

  // Deadline and color logic
  const overdue = isOverdue(data.deadline);
  const selectedColor = data.color || DEFAULT_COLOR;
  // Overdue takes priority: use red border, otherwise use selected color
  const borderColor = overdue ? "#ef4444" : selectedColor;
  const glowColor = overdue ? "#ef4444" : selectedColor;
  // Increased glow intensity for better visibility, especially when zoomed out
  const isZoomedOut = zoom < 1;
  const baseIntensity = selected ? 0.9 : 0.7;
  const zoomedOutIntensity = selected ? 1.0 : 0.85;
  const glowIntensity = isZoomedOut ? zoomedOutIntensity : baseIntensity;
  // Increase spread when zoomed out for better visibility
  const baseSpread = selected ? "32px" : "24px";
  const zoomedOutSpread = selected ? "40px" : "32px";
  const glowSpread = isZoomedOut ? zoomedOutSpread : baseSpread;

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

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf");
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
    const worker = await tesseract.createWorker({
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
      await worker.loadLanguage("eng");
      await worker.initialize("eng");

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
  const borderRgba = hexToRgba(borderColor, 0.3);
  const glowRgba = hexToRgba(glowColor, glowIntensity);
  const borderStyle = { borderColor: borderRgba };
  const shadowStyle = { boxShadow: `0 0 ${glowSpread} ${glowRgba}` };

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
          "relative w-[320px] rounded-3xl border bg-slate-900/50 backdrop-blur-md",
          "transition-all duration-200",
          done ? "opacity-60" : "",
          !selected && !done && !swallowing ? "octo-breath" : "",
          swallowing ? "scale-0 opacity-0" : "",
          type === "resource" && data.pdfUrl ? "cursor-pointer" : "",
        ].join(" ")}
        style={{ ...borderStyle, ...shadowStyle }}
        onDoubleClick={handleDoubleClick}
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
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={data.deadline ?? ""}
                  onChange={(e) => {
                    const value = e.target.value || undefined;
                    data.onUpdate?.(id, { deadline: value });
                  }}
                  className="h-7 rounded-full border border-cyan-300/15 bg-slate-950/30 px-3 text-[10px] text-cyan-50/80 outline-none transition-all hover:bg-slate-950/50 hover:border-cyan-300/30 focus:border-cyan-300/50 focus:ring-1 focus:ring-cyan-300/20"
                  title="Set deadline"
                />
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
                <div className="space-y-2">
                  <input
                    value={data.link ?? ""}
                    onChange={(e) => data.onUpdate?.(id, { link: e.target.value })}
                    placeholder="Link (URL)…"
                    className="w-full rounded-2xl border border-cyan-300/20 bg-slate-950/30 px-3 py-2 text-sm text-cyan-50 outline-none placeholder:text-cyan-200/30 focus:border-cyan-200/40"
                  />
                  <div className="relative">
                    <input
                      value={data.pdfUrl ?? ""}
                      onChange={(e) => data.onUpdate?.(id, { pdfUrl: e.target.value })}
                      placeholder="PDF URL…"
                      className="w-full rounded-2xl border border-cyan-300/20 bg-slate-950/30 px-3 py-2 pr-8 text-sm text-cyan-50 outline-none placeholder:text-cyan-200/30 focus:border-cyan-200/40"
                    />
                    {data.pdfUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          data.onUpdate?.(id, { pdfUrl: "" });
                          setPersistedPdfName("");
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-cyan-200/60 hover:bg-slate-800/50 hover:text-cyan-200"
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
                      className="w-full rounded-2xl border border-cyan-300/20 bg-slate-950/30 px-3 py-2 pr-8 text-sm text-cyan-50 outline-none placeholder:text-cyan-200/30 focus:border-cyan-200/40"
                    />
                    {data.videoUrl ? (
                      <button
                        type="button"
                        onClick={() => data.onUpdate?.(id, { videoUrl: "" })}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-cyan-200/60 hover:bg-slate-800/50 hover:text-cyan-200"
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
                      className="rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.18)] hover:bg-rose-500/20"
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
                        className="rounded-full border border-cyan-300/20 bg-slate-950/30 px-3 py-1 text-xs text-cyan-100/80 hover:bg-slate-950/45"
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>

                  {localPdfName ? (
                    <div className="text-xs text-cyan-100/60">
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
                      className={[
                        "rounded-full border border-cyan-300/20 bg-slate-950/30 px-3 py-1 text-xs text-cyan-100/80 hover:bg-slate-950/45",
                        pdfUploading || ocrRunning || summarising ? "opacity-50" : "",
                      ].join(" ")}
                    >
                      {pdfUploading ? "Uploading…" : "Upload PDF (save)"}
                    </button>
                    {aiStatus ? <div className="text-xs text-cyan-100/60">{aiStatus}</div> : null}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => summarisePersistedPdf()}
                      disabled={pdfUploading || ocrRunning || summarising}
                      className={[
                        "rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.18)] hover:bg-rose-500/20",
                        pdfUploading || ocrRunning || summarising ? "opacity-50" : "",
                      ].join(" ")}
                    >
                      {summarising ? "Summarising…" : "Summarise"}
                    </button>
                    {(data.pdfUrl ?? "").trim() ? (
                      <div className="text-xs text-cyan-100/60">
                        PDF: {persistedPdfName || "ready"}
                      </div>
                    ) : (
                      <div className="text-xs text-cyan-100/60">No saved PDF yet</div>
                    )}
                  </div>

                  {aiError ? <div className="text-xs text-rose-200/90">{aiError}</div> : null}

                  {(() => {
                    const pdfSrc = localPdfPreviewUrl || (data.pdfUrl ?? "").trim();
                    const ytEmbed = getYouTubeEmbedUrl((data.videoUrl ?? "").trim());

                    return (
                      <div className="space-y-2">
                        {pdfSrc ? (
                          <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/20 p-2">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="text-xs tracking-widest text-cyan-100/70">PDF</div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => data.onBathysphereMode?.(id, true)}
                                  className="inline-flex items-center gap-1 rounded-full border border-cyan-300/20 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
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
                                  className="inline-flex items-center gap-1 rounded-full border border-rose-300/20 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
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
                          <div className="rounded-2xl border border-cyan-300/20 bg-slate-950/20 p-2">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="text-xs tracking-widest text-cyan-100/70">VIDEO</div>
                              <button
                                type="button"
                                onClick={() => data.onUpdate?.(id, { videoUrl: "" })}
                                className="inline-flex items-center gap-1 rounded-full border border-rose-300/20 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                              >
                                <X className="h-3 w-3" />
                                Delete
                              </button>
                            </div>
                            {ytEmbed ? (
                              <iframe
                                title="YouTube preview"
                                src={ytEmbed}
                                className="h-[200px] w-full rounded-xl border border-cyan-300/10 bg-black/20"
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
                    className="min-h-[88px] min-w-[200px] w-full resize rounded-2xl border border-cyan-300/20 bg-slate-950/30 px-3 py-2 text-sm text-cyan-50 outline-none placeholder:text-cyan-200/30 focus:border-cyan-200/40"
                  />
                ) : (
                  <div className="group relative min-h-[88px] min-w-[200px] w-full rounded-2xl border border-cyan-300/20 bg-slate-950/30 px-3 py-2 overflow-auto resize">
                    <div className="markdown-content text-sm text-cyan-100">
                      <ReactMarkdown>{data.notes}</ReactMarkdown>
                    </div>
                    <button
                      onClick={() => setNotesEditMode(true)}
                      className="absolute right-2 top-2 hidden rounded bg-slate-800/80 px-2 py-1 text-xs text-cyan-200 opacity-0 transition-opacity hover:bg-slate-700/80 group-hover:opacity-100"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {type === "tactical" ? (
                <div className="flex items-center justify-between">
                  <AbyssalCheckbox
                    label="Done"
                    checked={data.status === "done"}
                    onChange={(checked) => {
                      data.onUpdate?.(id, { status: checked ? "done" : "todo" });
                      if (checked) data.onTaskDone?.(id);
                    }}
                  />
                  <button
                    onClick={() => {
                      setSwallowing(true);
                      setTimeout(() => data.onDelete?.(id), 220);
                    }}
                    className="rounded-full border border-rose-300/20 bg-rose-500/10 px-3 py-1 text-xs text-rose-200 hover:bg-rose-500/20"
                  >
                    Swallow
                  </button>
                </div>
              ) : null}

              <div className="flex items-center justify-center gap-2 pt-2">
                {Object.values(COLORS).map((color) => {
                  const isSelected = (data.color || DEFAULT_COLOR) === color.hex;
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
                        isSelected ? "scale-125 border-white shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "border-transparent hover:scale-110 hover:border-white/50",
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
